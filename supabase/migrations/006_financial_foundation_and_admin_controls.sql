-- ============================================================
-- DealFlow - Financial foundation + admin agency controls
-- Goals:
--   1. Add the remaining financial tables used by the intended architecture.
--   2. Restrict agency creation to the designated admin account.
--   3. Make close-deal side effects atomic through a database function.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_kind') then
    create type public.payment_kind as enum ('token_money', 'bayana');
  end if;

  if not exists (select 1 from pg_type where typname = 'document_type') then
    create type public.document_type as enum ('receipt', 'agreement');
  end if;
end
$$;

create table if not exists public.deal_payments (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  agency_id uuid references public.agencies(id) on delete set null,
  recorded_by_user_id uuid not null references auth.users(id) on delete cascade,
  payment_kind public.payment_kind not null,
  amount bigint not null check (amount > 0),
  received_on date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deal_documents (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  document_type public.document_type not null,
  storage_path text not null unique,
  file_name text not null,
  created_at timestamptz not null default now()
);

alter table public.deal_commissions
  add column if not exists trigger_payment_id uuid references public.deal_payments(id) on delete set null;

create index if not exists deal_payments_deal_created_at_idx
  on public.deal_payments(deal_id, created_at desc);

create index if not exists deal_documents_deal_created_at_idx
  on public.deal_documents(deal_id, created_at desc);

drop trigger if exists deal_payments_updated_at on public.deal_payments;
create trigger deal_payments_updated_at
before update on public.deal_payments
for each row execute function public.handle_updated_at();

alter table public.deal_payments enable row level security;
alter table public.deal_documents enable row level security;

drop policy if exists "Users can view accessible deal payments" on public.deal_payments;
create policy "Users can view accessible deal payments"
on public.deal_payments
for select
using (
  exists (
    select 1
    from public.deals deal
    where deal.id = deal_id
      and public.can_access_user_scoped_row(deal.user_id, deal.agency_id)
  )
);

drop policy if exists "Users can view accessible deal documents" on public.deal_documents;
create policy "Users can view accessible deal documents"
on public.deal_documents
for select
using (
  exists (
    select 1
    from public.deals deal
    where deal.id = deal_id
      and public.can_access_user_scoped_row(deal.user_id, deal.agency_id)
  )
);

drop policy if exists "Users can create agencies they own" on public.agencies;
drop policy if exists "Only admin can create agencies" on public.agencies;
create policy "Only admin can create agencies"
on public.agencies
for insert
with check (
  owner_user_id = auth.uid()
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'shakooradil321@gmail.com'
);

create or replace function public.close_deal_and_sync_financials(
  p_deal_id uuid,
  p_acting_user_id uuid,
  p_closing_amount bigint,
  p_closing_disposition public.property_disposition default null,
  p_close_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deal public.deals%rowtype;
  v_updated_deal public.deals%rowtype;
  v_property public.properties%rowtype;
  v_settings public.agency_settings%rowtype;
  v_commission public.deal_commissions%rowtype;
  v_trimmed_close_notes text;
  v_percentage_value numeric(5, 2);
  v_flat_fee_value bigint;
  v_agent_share numeric(5, 2);
  v_agency_share numeric(5, 2);
  v_gross_commission bigint;
  v_agent_commission bigint;
  v_agency_commission bigint;
  v_commission_status public.commission_status;
begin
  select *
  into v_deal
  from public.deals
  where id = p_deal_id
  for update;

  if not found then
    raise exception 'Deal not found.';
  end if;

  if v_deal.stage = 'closed' then
    raise exception 'This deal is already closed.';
  end if;

  if p_closing_amount is null or p_closing_amount <= 0 then
    raise exception 'closing_amount must be a positive integer.';
  end if;

  if v_deal.property_id is not null and p_closing_disposition is null then
    raise exception 'closing_disposition is required when the deal has a linked property.';
  end if;

  if v_deal.property_id is null and p_closing_disposition is not null then
    raise exception 'closing_disposition must be omitted when no property is linked.';
  end if;

  if v_deal.property_id is not null and exists (
    select 1
    from public.deals other_deal
    where other_deal.property_id = v_deal.property_id
      and other_deal.stage = 'closed'
      and other_deal.id <> v_deal.id
  ) then
    raise exception 'The linked property is already tied to another closed deal.';
  end if;

  v_trimmed_close_notes := nullif(btrim(coalesce(p_close_notes, '')), '');

  update public.deals
  set
    stage = 'closed',
    closing_amount = p_closing_amount,
    closing_disposition = p_closing_disposition,
    notes = case
      when v_trimmed_close_notes is null then v_deal.notes
      when nullif(btrim(coalesce(v_deal.notes, '')), '') is null then v_trimmed_close_notes
      else btrim(v_deal.notes) || E'\n\n' || v_trimmed_close_notes
    end
  where id = v_deal.id
  returning *
  into v_updated_deal;

  if v_updated_deal.property_id is not null then
    select *
    into v_property
    from public.properties
    where id = v_updated_deal.property_id;
  end if;

  if v_deal.agency_id is not null then
    select *
    into v_settings
    from public.agency_settings
    where agency_id = v_deal.agency_id;

    if v_settings.commission_enabled then
      v_percentage_value := v_settings.commission_percentage_value;
      v_flat_fee_value := v_settings.commission_flat_fee_value;
      v_agent_share := v_settings.agent_share_percentage;
      v_agency_share := v_settings.agency_share_percentage;

      if v_settings.commission_basis is null or v_agent_share is null or v_agency_share is null then
        raise exception 'Agency commission settings are incomplete.';
      end if;

      if v_settings.commission_basis = 'percentage' and v_percentage_value is null then
        raise exception 'Agency commission percentage is missing.';
      end if;

      if v_settings.commission_basis = 'flat_fee' and v_flat_fee_value is null then
        raise exception 'Agency commission flat fee is missing.';
      end if;

      v_gross_commission :=
        case
          when v_settings.commission_basis = 'percentage' then round((p_closing_amount * v_percentage_value) / 100.0)
          else v_flat_fee_value
        end;
      v_agent_commission := round((v_gross_commission * v_agent_share) / 100.0);
      v_agency_commission := v_gross_commission - v_agent_commission;
      v_commission_status :=
        case
          when v_settings.commission_earned_trigger = 'on_close' then 'earned'::public.commission_status
          else 'pending'::public.commission_status
        end;

      insert into public.deal_commissions (
        deal_id,
        agency_id,
        calculated_by_user_id,
        calculation_base_amount,
        basis,
        percentage_value,
        flat_fee_value,
        agent_share_percentage,
        agency_share_percentage,
        gross_commission_amount,
        agent_commission_amount,
        agency_commission_amount,
        earned_trigger,
        status,
        earned_at,
        trigger_payment_id,
        settings_snapshot
      )
      values (
        v_updated_deal.id,
        v_deal.agency_id,
        p_acting_user_id,
        p_closing_amount,
        v_settings.commission_basis,
        case when v_settings.commission_basis = 'percentage' then v_percentage_value else null end,
        case when v_settings.commission_basis = 'flat_fee' then v_flat_fee_value else null end,
        v_agent_share,
        v_agency_share,
        v_gross_commission,
        v_agent_commission,
        v_agency_commission,
        v_settings.commission_earned_trigger,
        v_commission_status,
        case when v_commission_status = 'earned' then v_updated_deal.closed_at else null end,
        null,
        jsonb_build_object(
          'commission_enabled', v_settings.commission_enabled,
          'commission_basis', v_settings.commission_basis,
          'commission_percentage_value', v_settings.commission_percentage_value,
          'commission_flat_fee_value', v_settings.commission_flat_fee_value,
          'agent_share_percentage', v_settings.agent_share_percentage,
          'agency_share_percentage', v_settings.agency_share_percentage,
          'commission_earned_trigger', v_settings.commission_earned_trigger
        )
      )
      on conflict (deal_id) do update
      set
        agency_id = excluded.agency_id,
        calculated_by_user_id = excluded.calculated_by_user_id,
        calculation_base_amount = excluded.calculation_base_amount,
        basis = excluded.basis,
        percentage_value = excluded.percentage_value,
        flat_fee_value = excluded.flat_fee_value,
        agent_share_percentage = excluded.agent_share_percentage,
        agency_share_percentage = excluded.agency_share_percentage,
        gross_commission_amount = excluded.gross_commission_amount,
        agent_commission_amount = excluded.agent_commission_amount,
        agency_commission_amount = excluded.agency_commission_amount,
        earned_trigger = excluded.earned_trigger,
        status = excluded.status,
        earned_at = excluded.earned_at,
        trigger_payment_id = excluded.trigger_payment_id,
        settings_snapshot = excluded.settings_snapshot
      returning *
      into v_commission;
    end if;
  end if;

  return jsonb_build_object(
    'deal', to_jsonb(v_updated_deal),
    'property', case when v_updated_deal.property_id is not null then to_jsonb(v_property) else null end,
    'commission', case when v_commission.id is not null then to_jsonb(v_commission) else null end
  );
end;
$$;
