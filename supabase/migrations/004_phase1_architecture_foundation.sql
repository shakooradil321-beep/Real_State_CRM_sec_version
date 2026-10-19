-- ============================================================
-- DealFlow - Phase 1 Architecture Foundation
-- Safe rollout goals:
--   1. Preserve existing solo-agent behavior.
--   2. Add optional agency tenancy foundations.
--   3. Add property inventory foundations.
--   4. Add close-related deal fields without changing current close UX yet.
--
-- Intentionally deferred to the API phase:
--   - deal_payments
--   - deal_commissions
--   - deal_documents
--   - server-managed close guards
--   - automatic property terminal-state sync on close
-- ============================================================

create extension if not exists "uuid-ossp";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'agency_role') then
    create type public.agency_role as enum ('owner', 'agent');
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

create table if not exists public.agencies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agency_memberships (
  id uuid primary key default uuid_generate_v4(),
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

create table if not exists public.properties (
  id uuid primary key default uuid_generate_v4(),
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

alter table public.deals add column if not exists agency_id uuid;
alter table public.deals add column if not exists property_id uuid;
alter table public.deals add column if not exists closing_amount bigint;
alter table public.deals add column if not exists closing_disposition public.property_disposition;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'deals_agency_id_fkey'
      and conrelid = 'public.deals'::regclass
  ) then
    alter table public.deals
      add constraint deals_agency_id_fkey
      foreign key (agency_id) references public.agencies(id) on delete set null;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'deals_property_id_fkey'
      and conrelid = 'public.deals'::regclass
  ) then
    alter table public.deals
      add constraint deals_property_id_fkey
      foreign key (property_id) references public.properties(id) on delete set null;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'deals_property_type_check'
      and conrelid = 'public.deals'::regclass
  ) then
    alter table public.deals
      add constraint deals_property_type_check
      check (property_type in ('House', 'Apartment', 'Plot', 'Commercial', 'Office')) not valid;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'deals_budget_positive_check'
      and conrelid = 'public.deals'::regclass
  ) then
    alter table public.deals
      add constraint deals_budget_positive_check
      check (budget > 0) not valid;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'deals_closing_amount_positive_check'
      and conrelid = 'public.deals'::regclass
  ) then
    alter table public.deals
      add constraint deals_closing_amount_positive_check
      check (closing_amount is null or closing_amount > 0);
  end if;
end
$$;

create index if not exists agencies_owner_user_id_idx
  on public.agencies(owner_user_id);

create index if not exists agency_memberships_user_id_idx
  on public.agency_memberships(user_id);

create index if not exists agency_memberships_agency_role_idx
  on public.agency_memberships(agency_id, role);

create index if not exists deals_agency_id_idx
  on public.deals(agency_id);

create index if not exists deals_agency_stage_sort_idx
  on public.deals(agency_id, stage, sort_order);

create index if not exists deals_property_id_idx
  on public.deals(property_id);

create index if not exists deals_closed_at_idx
  on public.deals(closed_at);

create index if not exists properties_user_status_idx
  on public.properties(user_id, status);

create index if not exists properties_agency_status_idx
  on public.properties(agency_id, status);

create unique index if not exists properties_deal_id_unique_idx
  on public.properties(deal_id)
  where deal_id is not null;

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

drop trigger if exists properties_updated_at on public.properties;
create trigger properties_updated_at
before update on public.properties
for each row execute function public.handle_updated_at();

alter table public.agencies enable row level security;
alter table public.agency_memberships enable row level security;
alter table public.agency_settings enable row level security;
alter table public.properties enable row level security;
alter table public.deals enable row level security;
alter table public.deal_activities enable row level security;

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

drop policy if exists "Users can view own deals" on public.deals;
drop policy if exists "Users can insert own deals" on public.deals;
drop policy if exists "Users can update own deals" on public.deals;
drop policy if exists "Users can delete own deals" on public.deals;
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

drop policy if exists "Users can manage own activities" on public.deal_activities;
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
