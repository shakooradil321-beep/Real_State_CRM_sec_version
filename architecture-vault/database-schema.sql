-- Status note as of April 19, 2026:
-- This file remains the broader target/reference schema.
-- The shipped migration path currently runs through `006_financial_foundation_and_admin_controls.sql`.
-- Some structures in this file are ahead of the shipped migrations and app code.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'agency_role') then
    create type public.agency_role as enum ('owner', 'agent');
  end if;

  if not exists (select 1 from pg_type where typname = 'deal_stage') then
    create type public.deal_stage as enum ('new_lead', 'visit', 'negotiation', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'property_type') then
    create type public.property_type as enum ('House', 'Apartment', 'Plot', 'Commercial', 'Office');
  end if;

  if not exists (select 1 from pg_type where typname = 'lead_source') then
    create type public.lead_source as enum (
      'whatsapp',
      'referral',
      'olx',
      'zameen',
      'facebook',
      'instagram',
      'walk_in',
      'cold_call',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'activity_type') then
    create type public.activity_type as enum (
      'note',
      'stage_changed',
      'deal_created',
      'followup_set',
      'called',
      'whatsapped'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'property_status') then
    create type public.property_status as enum ('available', 'under_offer', 'sold', 'rented');
  end if;

  if not exists (select 1 from pg_type where typname = 'property_disposition') then
    create type public.property_disposition as enum ('sold', 'rented');
  end if;

  if not exists (select 1 from pg_type where typname = 'commission_basis') then
    create type public.commission_basis as enum ('percentage', 'flat_fee');
  end if;

  if not exists (select 1 from pg_type where typname = 'commission_earned_trigger') then
    create type public.commission_earned_trigger as enum ('on_close', 'on_payment');
  end if;

  if not exists (select 1 from pg_type where typname = 'commission_status') then
    create type public.commission_status as enum ('pending', 'earned');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_kind') then
    create type public.payment_kind as enum ('token_money', 'bayana');
  end if;

  if not exists (select 1 from pg_type where typname = 'document_type') then
    create type public.document_type as enum ('receipt', 'agreement');
  end if;
end
$$;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
$$;

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agency_memberships (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.agency_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, user_id)
);

create table if not exists public.agency_settings (
  agency_id uuid primary key references public.agencies(id) on delete cascade,
  commission_enabled boolean not null default false,
  commission_basis public.commission_basis,
  commission_percentage_value numeric(5, 2),
  commission_flat_fee_value bigint,
  agent_share_percentage numeric(5, 2),
  agency_share_percentage numeric(5, 2),
  commission_earned_trigger public.commission_earned_trigger not null default 'on_close',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agency_settings_commission_shape_check check (
    (
      commission_enabled = false
      and commission_basis is null
      and commission_percentage_value is null
      and commission_flat_fee_value is null
      and agent_share_percentage is null
      and agency_share_percentage is null
    )
    or (
      commission_enabled = true
      and (
        (commission_basis = 'percentage' and commission_percentage_value is not null and commission_flat_fee_value is null)
        or
        (commission_basis = 'flat_fee' and commission_flat_fee_value is not null and commission_percentage_value is null)
      )
      and agent_share_percentage is not null
      and agency_share_percentage is not null
      and (agent_share_percentage + agency_share_percentage) = 100.00
    )
  )
);

create or replace function public.is_agency_member(p_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agency_memberships membership
    where membership.agency_id = p_agency_id
      and membership.user_id = auth.uid()
  );
$$;

create or replace function public.is_agency_owner(p_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agency_memberships membership
    where membership.agency_id = p_agency_id
      and membership.user_id = auth.uid()
      and membership.role = 'owner'
  );
$$;

create or replace function public.is_user_in_agency(p_user_id uuid, p_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agency_memberships membership
    where membership.agency_id = p_agency_id
      and membership.user_id = p_user_id
  );
$$;

create or replace function public.can_access_user_scoped_row(p_user_id uuid, p_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_agency_id is null then p_user_id = auth.uid()
    when public.is_agency_owner(p_agency_id) then true
    else p_user_id = auth.uid() and public.is_agency_member(p_agency_id)
  end;
$$;

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid,
  client_name text not null,
  phone text not null,
  budget bigint not null check (budget > 0),
  area text not null,
  property_type public.property_type not null default 'House',
  stage public.deal_stage not null default 'new_lead',
  notes text,
  followup_date date,
  sort_order integer not null default 0,
  source public.lead_source,
  closing_amount bigint,
  closing_disposition public.property_disposition,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deals_property_close_requirements_check check (
    property_id is null
    or stage <> 'closed'
    or closing_disposition is not null
  )
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  address text not null,
  area text not null,
  size text not null,
  price bigint not null check (price > 0),
  status public.property_status not null default 'available',
  deal_id uuid references public.deals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_status_deal_link_check check (
    (deal_id is null and status in ('available', 'under_offer'))
    or
    (deal_id is not null and status in ('sold', 'rented'))
  )
);

alter table public.deals
  drop constraint if exists deals_property_id_fkey;

alter table public.deals
  add constraint deals_property_id_fkey
  foreign key (property_id) references public.properties(id) on delete set null;

create table if not exists public.deal_activities (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.activity_type not null,
  content text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.deal_payments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  agency_id uuid references public.agencies(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  recorded_by_user_id uuid not null references auth.users(id) on delete cascade,
  payment_kind public.payment_kind not null,
  amount bigint not null check (amount > 0),
  received_on date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deal_commissions (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null unique references public.deals(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  calculated_by_user_id uuid not null references auth.users(id) on delete cascade,
  calculation_base_amount bigint not null check (calculation_base_amount > 0),
  basis public.commission_basis not null,
  percentage_value numeric(5, 2),
  flat_fee_value bigint,
  agent_share_percentage numeric(5, 2) not null,
  agency_share_percentage numeric(5, 2) not null,
  gross_commission_amount bigint not null,
  agent_commission_amount bigint not null,
  agency_commission_amount bigint not null,
  earned_trigger public.commission_earned_trigger not null,
  status public.commission_status not null default 'pending',
  earned_at timestamptz,
  trigger_payment_id uuid references public.deal_payments(id) on delete set null,
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

create table if not exists public.deal_documents (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  agency_id uuid references public.agencies(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  payment_id uuid references public.deal_payments(id) on delete set null,
  generated_by_user_id uuid not null references auth.users(id) on delete cascade,
  document_type public.document_type not null,
  storage_bucket text not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null default 'application/pdf',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agencies_owner_user_id_idx
  on public.agencies(owner_user_id);

create index if not exists agency_memberships_user_id_idx
  on public.agency_memberships(user_id);

create index if not exists agency_memberships_agency_role_idx
  on public.agency_memberships(agency_id, role);

create index if not exists deals_user_id_idx
  on public.deals(user_id);

create index if not exists deals_agency_id_idx
  on public.deals(agency_id);

create index if not exists deals_stage_idx
  on public.deals(stage);

create index if not exists deals_followup_date_idx
  on public.deals(followup_date);

create index if not exists deals_sort_order_idx
  on public.deals(user_id, stage, sort_order);

create index if not exists deals_agency_stage_sort_idx
  on public.deals(agency_id, stage, sort_order);

create index if not exists deals_property_id_idx
  on public.deals(property_id);

create index if not exists deals_source_idx
  on public.deals(source);

create index if not exists deals_closed_at_idx
  on public.deals(closed_at);

create index if not exists properties_user_status_idx
  on public.properties(user_id, status);

create index if not exists properties_agency_status_idx
  on public.properties(agency_id, status);

create unique index if not exists properties_deal_id_unique_idx
  on public.properties(deal_id)
  where deal_id is not null;

create index if not exists deal_activities_deal_created_at_idx
  on public.deal_activities(deal_id, created_at desc);

create index if not exists deal_payments_deal_created_at_idx
  on public.deal_payments(deal_id, created_at desc);

create index if not exists deal_payments_agency_created_at_idx
  on public.deal_payments(agency_id, created_at desc);

create index if not exists deal_commissions_agency_status_idx
  on public.deal_commissions(agency_id, status);

create index if not exists deal_documents_deal_created_at_idx
  on public.deal_documents(deal_id, created_at desc);

create or replace function public.create_default_agency_records()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.agency_memberships (agency_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner')
  on conflict (agency_id, user_id) do nothing;

  insert into public.agency_settings (
    agency_id,
    commission_enabled,
    commission_basis,
    commission_percentage_value,
    commission_flat_fee_value,
    agent_share_percentage,
    agency_share_percentage,
    commission_earned_trigger
  )
  values (
    new.id,
    false,
    null,
    null,
    null,
    null,
    null,
    'on_close'
  )
  on conflict (agency_id) do nothing;

  return new;
end;
$$;

drop trigger if exists agencies_default_records_trigger on public.agencies;
create trigger agencies_default_records_trigger
after insert on public.agencies
for each row execute function public.create_default_agency_records();

create or replace function public.handle_closed_at()
returns trigger
language plpgsql
as $$
begin
  if new.stage = 'closed' and coalesce(old.stage::text, '') <> 'closed' then
    new.closed_at = now();
  end if;

  if new.stage <> 'closed' then
    new.closed_at = null;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_server_managed_close_flow()
returns trigger
language plpgsql
as $$
begin
  if public.is_service_role() then
    return new;
  end if;

  if tg_op = 'INSERT' and (
    new.stage = 'closed'
    or new.closing_amount is not null
    or new.closing_disposition is not null
  ) then
    raise exception 'Closing workflows must run through the server-managed API.';
  end if;

  if tg_op = 'UPDATE' and (
    (new.stage = 'closed' and coalesce(old.stage::text, '') <> 'closed')
    or new.closing_amount is distinct from old.closing_amount
    or new.closing_disposition is distinct from old.closing_disposition
  ) then
    raise exception 'Closing workflows must run through the server-managed API.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_server_managed_terminal_property_state()
returns trigger
language plpgsql
as $$
begin
  if public.is_service_role() then
    return new;
  end if;

  if tg_op = 'INSERT' and (
    new.status in ('sold', 'rented')
    or new.deal_id is not null
  ) then
    raise exception 'Sold or rented property state must be set by the server-managed close workflow.';
  end if;

  if tg_op = 'UPDATE' and (
    new.status in ('sold', 'rented')
    or new.deal_id is distinct from old.deal_id
  ) then
    raise exception 'Sold or rented property state must be set by the server-managed close workflow.';
  end if;

  return new;
end;
$$;

create or replace function public.sync_property_status_from_deal()
returns trigger
language plpgsql
as $$
begin
  if old.property_id is not null and (
    new.property_id is distinct from old.property_id
    or new.stage <> 'closed'
  ) then
    update public.properties
    set
      status = 'available',
      deal_id = null,
      updated_at = now()
    where id = old.property_id
      and deal_id = new.id;
  end if;

  if new.stage = 'closed' and new.property_id is not null then
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

drop trigger if exists agencies_updated_at on public.agencies;
create trigger agencies_updated_at
before update on public.agencies
for each row execute function public.handle_updated_at();

drop trigger if exists agency_memberships_updated_at on public.agency_memberships;
create trigger agency_memberships_updated_at
before update on public.agency_memberships
for each row execute function public.handle_updated_at();

drop trigger if exists agency_settings_updated_at on public.agency_settings;
create trigger agency_settings_updated_at
before update on public.agency_settings
for each row execute function public.handle_updated_at();

drop trigger if exists deals_updated_at on public.deals;
create trigger deals_updated_at
before update on public.deals
for each row execute function public.handle_updated_at();

drop trigger if exists deals_closed_at on public.deals;
create trigger deals_closed_at
before update on public.deals
for each row execute function public.handle_closed_at();

drop trigger if exists deals_server_managed_close_guard on public.deals;
create trigger deals_server_managed_close_guard
before insert or update on public.deals
for each row execute function public.enforce_server_managed_close_flow();

drop trigger if exists properties_updated_at on public.properties;
create trigger properties_updated_at
before update on public.properties
for each row execute function public.handle_updated_at();

drop trigger if exists properties_terminal_state_guard on public.properties;
create trigger properties_terminal_state_guard
before insert or update on public.properties
for each row execute function public.enforce_server_managed_terminal_property_state();

drop trigger if exists deal_payments_updated_at on public.deal_payments;
create trigger deal_payments_updated_at
before update on public.deal_payments
for each row execute function public.handle_updated_at();

drop trigger if exists deal_commissions_updated_at on public.deal_commissions;
create trigger deal_commissions_updated_at
before update on public.deal_commissions
for each row execute function public.handle_updated_at();

drop trigger if exists deals_property_sync_trigger on public.deals;
create trigger deals_property_sync_trigger
after update of stage, property_id, closing_disposition on public.deals
for each row execute function public.sync_property_status_from_deal();

alter table public.agencies enable row level security;
alter table public.agency_memberships enable row level security;
alter table public.agency_settings enable row level security;
alter table public.deals enable row level security;
alter table public.properties enable row level security;
alter table public.deal_activities enable row level security;
alter table public.deal_payments enable row level security;
alter table public.deal_commissions enable row level security;
alter table public.deal_documents enable row level security;

drop policy if exists "Members can view agencies" on public.agencies;
create policy "Members can view agencies"
on public.agencies
for select
using (public.is_agency_member(id));

drop policy if exists "Users can create agencies they own" on public.agencies;
create policy "Users can create agencies they own"
on public.agencies
for insert
with check (owner_user_id = auth.uid());

drop policy if exists "Owners can update agencies" on public.agencies;
create policy "Owners can update agencies"
on public.agencies
for update
using (public.is_agency_owner(id))
with check (public.is_agency_owner(id));

drop policy if exists "Owners can delete agencies" on public.agencies;
create policy "Owners can delete agencies"
on public.agencies
for delete
using (public.is_agency_owner(id));

drop policy if exists "Owners or self can view memberships" on public.agency_memberships;
create policy "Owners or self can view memberships"
on public.agency_memberships
for select
using (public.is_agency_owner(agency_id) or user_id = auth.uid());

drop policy if exists "Owners can insert memberships" on public.agency_memberships;
create policy "Owners can insert memberships"
on public.agency_memberships
for insert
with check (
  public.is_agency_owner(agency_id)
  and public.is_user_in_agency(user_id, agency_id) = false
);

drop policy if exists "Owners can update memberships" on public.agency_memberships;
create policy "Owners can update memberships"
on public.agency_memberships
for update
using (public.is_agency_owner(agency_id))
with check (public.is_agency_owner(agency_id));

drop policy if exists "Owners can delete memberships" on public.agency_memberships;
create policy "Owners can delete memberships"
on public.agency_memberships
for delete
using (public.is_agency_owner(agency_id));

drop policy if exists "Members can view agency settings" on public.agency_settings;
create policy "Members can view agency settings"
on public.agency_settings
for select
using (public.is_agency_member(agency_id));

drop policy if exists "Owners can update agency settings" on public.agency_settings;
create policy "Owners can update agency settings"
on public.agency_settings
for update
using (public.is_agency_owner(agency_id))
with check (public.is_agency_owner(agency_id));

drop policy if exists "Users can view accessible deals" on public.deals;
create policy "Users can view accessible deals"
on public.deals
for select
using (public.can_access_user_scoped_row(user_id, agency_id));

drop policy if exists "Users can insert scoped deals" on public.deals;
create policy "Users can insert scoped deals"
on public.deals
for insert
with check (
  (
    agency_id is null
    and user_id = auth.uid()
  )
  or
  (
    agency_id is not null
    and (
      (
        public.is_agency_owner(agency_id)
        and public.is_user_in_agency(user_id, agency_id)
      )
      or
      (
        user_id = auth.uid()
        and public.is_agency_member(agency_id)
      )
    )
  )
);

drop policy if exists "Users can update accessible deals" on public.deals;
create policy "Users can update accessible deals"
on public.deals
for update
using (public.can_access_user_scoped_row(user_id, agency_id))
with check (
  (
    agency_id is null
    and user_id = auth.uid()
  )
  or
  (
    agency_id is not null
    and (
      (
        public.is_agency_owner(agency_id)
        and public.is_user_in_agency(user_id, agency_id)
      )
      or
      (
        user_id = auth.uid()
        and public.is_agency_member(agency_id)
      )
    )
  )
);

drop policy if exists "Users can delete accessible deals" on public.deals;
create policy "Users can delete accessible deals"
on public.deals
for delete
using (public.can_access_user_scoped_row(user_id, agency_id));

drop policy if exists "Users can view accessible properties" on public.properties;
create policy "Users can view accessible properties"
on public.properties
for select
using (public.can_access_user_scoped_row(user_id, agency_id));

drop policy if exists "Users can insert scoped properties" on public.properties;
create policy "Users can insert scoped properties"
on public.properties
for insert
with check (
  (
    agency_id is null
    and user_id = auth.uid()
  )
  or
  (
    agency_id is not null
    and (
      (
        public.is_agency_owner(agency_id)
        and public.is_user_in_agency(user_id, agency_id)
      )
      or
      (
        user_id = auth.uid()
        and public.is_agency_member(agency_id)
      )
    )
  )
);

drop policy if exists "Users can update accessible properties" on public.properties;
create policy "Users can update accessible properties"
on public.properties
for update
using (public.can_access_user_scoped_row(user_id, agency_id))
with check (
  (
    agency_id is null
    and user_id = auth.uid()
  )
  or
  (
    agency_id is not null
    and (
      (
        public.is_agency_owner(agency_id)
        and public.is_user_in_agency(user_id, agency_id)
      )
      or
      (
        user_id = auth.uid()
        and public.is_agency_member(agency_id)
      )
    )
  )
);

drop policy if exists "Users can delete accessible properties" on public.properties;
create policy "Users can delete accessible properties"
on public.properties
for delete
using (public.can_access_user_scoped_row(user_id, agency_id));

drop policy if exists "Users can manage accessible deal activities" on public.deal_activities;
create policy "Users can manage accessible deal activities"
on public.deal_activities
for all
using (
  public.can_access_user_scoped_row(
    user_id,
    (select deal.agency_id from public.deals deal where deal.id = deal_id)
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.deals deal
    where deal.id = deal_id
      and public.can_access_user_scoped_row(deal.user_id, deal.agency_id)
  )
);

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

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'deals'
  ) then
    alter publication supabase_realtime add table public.deals;
  end if;
end
$$;
