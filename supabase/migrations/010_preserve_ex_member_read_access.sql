-- Migration 010: preserve read access to own historical rows after agency removal
-- Keeps write policies unchanged while widening only read access.

create or replace function public.can_read_user_scoped_row(p_user_id uuid, p_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_agency_id is null then p_user_id = auth.uid()
    when p_user_id = auth.uid() then true
    when public.is_agency_owner(p_agency_id) then true
    else false
  end;
$$;

drop policy if exists "Users can view accessible deals" on public.deals;
create policy "Users can view accessible deals"
on public.deals
for select
using (public.can_read_user_scoped_row(user_id, agency_id));

drop policy if exists "Users can view accessible properties" on public.properties;
create policy "Users can view accessible properties"
on public.properties
for select
using (public.can_read_user_scoped_row(user_id, agency_id));

drop policy if exists "Users can view readable deal activities" on public.deal_activities;
create policy "Users can view readable deal activities"
on public.deal_activities
for select
using (
  exists (
    select 1
    from public.deals deal
    where deal.id = deal_id
      and public.can_read_user_scoped_row(deal.user_id, deal.agency_id)
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
      and public.can_read_user_scoped_row(deal.user_id, deal.agency_id)
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
      and public.can_read_user_scoped_row(deal.user_id, deal.agency_id)
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
      and public.can_read_user_scoped_row(deal.user_id, deal.agency_id)
  )
);
