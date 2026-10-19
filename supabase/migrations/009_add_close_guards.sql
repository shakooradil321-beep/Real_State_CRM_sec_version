-- Migration 009: add server-managed close/property guards
-- Blocks direct client-side closing writes and terminal property mutations.

create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
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

drop trigger if exists deals_server_managed_close_guard on public.deals;
create trigger deals_server_managed_close_guard
before insert or update on public.deals
for each row execute function public.enforce_server_managed_close_flow();

drop trigger if exists properties_terminal_state_guard on public.properties;
create trigger properties_terminal_state_guard
before insert or update on public.properties
for each row execute function public.enforce_server_managed_terminal_property_state();
