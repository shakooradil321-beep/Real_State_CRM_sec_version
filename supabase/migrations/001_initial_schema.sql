-- ============================================================
-- DealFlow - Initial Database Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

create table if not exists public.deals (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  client_name   text not null,
  phone         text not null,
  budget        bigint not null default 0,
  area          text not null,
  property_type text not null default 'House',
  stage         text not null default 'new_lead'
                  check (stage in ('new_lead', 'visit', 'negotiation', 'closed')),
  notes         text,
  followup_date date,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  closed_at     timestamptz
);

create index if not exists deals_user_id_idx on public.deals(user_id);
create index if not exists deals_stage_idx on public.deals(stage);
create index if not exists deals_followup_date_idx on public.deals(followup_date);
create index if not exists deals_sort_order_idx on public.deals(user_id, stage, sort_order);

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.handle_closed_at()
returns trigger as $$
begin
  if new.stage = 'closed' and coalesce(old.stage, '') <> 'closed' then
    new.closed_at = now();
  end if;

  if new.stage <> 'closed' then
    new.closed_at = null;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists deals_updated_at on public.deals;
create trigger deals_updated_at
  before update on public.deals
  for each row execute function public.handle_updated_at();

drop trigger if exists deals_closed_at on public.deals;
create trigger deals_closed_at
  before update on public.deals
  for each row execute function public.handle_closed_at();

alter table public.deals enable row level security;

drop policy if exists "Users can view own deals" on public.deals;
create policy "Users can view own deals"
  on public.deals for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own deals" on public.deals;
create policy "Users can insert own deals"
  on public.deals for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own deals" on public.deals;
create policy "Users can update own deals"
  on public.deals for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own deals" on public.deals;
create policy "Users can delete own deals"
  on public.deals for delete
  using (auth.uid() = user_id);

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
end $$;
