-- ============================================================
-- DealFlow - Deal commissions + property sync on close
-- Goals:
--   1. Add the missing deal_commissions table used by the close API.
--   2. Keep linked property status in sync when a deal closes.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'commission_status') then
    create type public.commission_status as enum ('pending', 'earned');
  end if;
end
$$;

create table if not exists public.deal_commissions (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid not null unique references public.deals(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  calculated_by_user_id uuid not null references auth.users(id) on delete cascade,
  calculation_base_amount bigint not null check (calculation_base_amount > 0),
  basis public.commission_basis not null,
  percentage_value numeric(5, 2),
  flat_fee_value bigint,
  agent_share_percentage numeric(5, 2) not null,
  agency_share_percentage numeric(5, 2) not null,
  gross_commission_amount bigint not null check (gross_commission_amount > 0),
  agent_commission_amount bigint not null check (agent_commission_amount >= 0),
  agency_commission_amount bigint not null check (agency_commission_amount >= 0),
  earned_trigger public.commission_earned_trigger not null,
  status public.commission_status not null default 'pending',
  earned_at timestamptz,
  settings_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deal_commissions_basis_shape_check check (
    (basis = 'percentage' and percentage_value is not null and flat_fee_value is null)
    or
    (basis = 'flat_fee' and flat_fee_value is not null and percentage_value is null)
  ),
  constraint deal_commissions_share_sum_check check (
    (agent_share_percentage + agency_share_percentage) = 100.00
  ),
  constraint deal_commissions_status_check check (
    (status = 'pending' and earned_at is null)
    or
    (status = 'earned' and earned_at is not null)
  )
);

create index if not exists deal_commissions_agency_status_idx
  on public.deal_commissions(agency_id, status);

create or replace function public.sync_property_status_from_deal()
returns trigger
language plpgsql
as $$
begin
  if old.property_id is not null and (
    new.property_id is distinct from old.property_id
    or new.stage <> 'closed'
    or new.closing_disposition is distinct from old.closing_disposition
  ) then
    update public.properties
    set
      status = 'available',
      deal_id = null,
      updated_at = now()
    where id = old.property_id
      and deal_id = new.id;
  end if;

  if new.stage = 'closed' and new.property_id is not null and new.closing_disposition is not null then
    update public.properties
    set
      status = new.closing_disposition::text::public.property_status,
      deal_id = new.id,
      updated_at = now()
    where id = new.property_id;
  end if;

  return new;
end;
$$;

drop trigger if exists deal_commissions_updated_at on public.deal_commissions;
create trigger deal_commissions_updated_at
before update on public.deal_commissions
for each row execute function public.handle_updated_at();

drop trigger if exists deals_property_sync_trigger on public.deals;
create trigger deals_property_sync_trigger
after update of stage, property_id, closing_disposition on public.deals
for each row execute function public.sync_property_status_from_deal();

alter table public.deal_commissions enable row level security;

drop policy if exists "Users can view accessible deal commissions" on public.deal_commissions;
create policy "Users can view accessible deal commissions"
on public.deal_commissions
for select
using (
  exists (
    select 1
    from public.deals deal
    where deal.id = deal_id
      and public.can_access_user_scoped_row(deal.user_id, deal.agency_id)
  )
);
