-- Migration 007: agency_invitations
-- Wave 1-A: Team invitation flow.
--
-- Design decisions recorded here for future reference:
--
-- 1. MANUAL INVITE LINK (current implementation)
--    The owner copies an invite link from the UI and sends it to the agent
--    manually (WhatsApp, email, etc.). This was chosen because it requires
--    zero email provider configuration and works immediately.
--
-- FUTURE: To make invitations automatic (Supabase Auth email or SMS):
--    a. Configure a Supabase Auth email template for invitations.
--    b. In the POST /api/agency/invitations route handler, replace the
--       manual token generation with a call to
--       admin.auth.admin.inviteUserByEmail({ email, data: { token } }).
--    c. The accept flow stays the same — the agent still POSTs the token
--       to /api/agency/invitations/[token]/accept.
--    d. No schema change is required here; the table shape supports both.
--
-- 2. SIGN-UP FIRST
--    Agents must create a DealFlow account before accepting an invite.
--    The accept route validates that the accepting user's email matches
--    the invited_email on the row. This keeps auth simple and avoids
--    creating unverified auth users from the owner side.

create table if not exists public.agency_invitations (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references public.agencies(id) on delete cascade,
  invited_by   uuid not null references auth.users(id) on delete cascade,
  invited_email text not null,
  -- role is always 'agent' for now. If you add more roles later, this column
  -- is already here to carry that value.
  role         public.agency_role not null default 'agent',
  token        text not null unique default encode(gen_random_bytes(32), 'hex'),
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'revoked')),
  -- expires_at defaults to 7 days from creation. The accept route checks this.
  expires_at   timestamptz not null default (now() + interval '7 days'),
  accepted_at  timestamptz,
  accepted_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),

  -- One pending invite per email per agency at a time.
  -- Re-inviting after acceptance or revocation is allowed because the
  -- unique constraint only applies to pending rows (partial unique index below).
  constraint agency_invitations_agency_email_unique
    unique (agency_id, invited_email, status)
);

-- Partial unique index: only one pending invite per email per agency.
-- This replaces the table constraint above which would block re-invites
-- after acceptance. Drop the table constraint and use this index instead.
alter table public.agency_invitations
  drop constraint if exists agency_invitations_agency_email_unique;

create unique index if not exists agency_invitations_pending_unique_idx
  on public.agency_invitations(agency_id, invited_email)
  where status = 'pending';

create index if not exists agency_invitations_agency_id_idx
  on public.agency_invitations(agency_id);

create index if not exists agency_invitations_token_idx
  on public.agency_invitations(token);

-- RLS
alter table public.agency_invitations enable row level security;

-- Owners can view all invitations for their agency.
drop policy if exists "Owners can view agency invitations" on public.agency_invitations;
create policy "Owners can view agency invitations"
  on public.agency_invitations
  for select
  using (public.is_agency_owner(agency_id));

-- Owners can create invitations.
drop policy if exists "Owners can create invitations" on public.agency_invitations;
create policy "Owners can create invitations"
  on public.agency_invitations
  for insert
  with check (
    public.is_agency_owner(agency_id)
    and invited_by = auth.uid()
  );

-- Owners can revoke (update status) invitations.
drop policy if exists "Owners can revoke invitations" on public.agency_invitations;
create policy "Owners can revoke invitations"
  on public.agency_invitations
  for update
  using (public.is_agency_owner(agency_id))
  with check (public.is_agency_owner(agency_id));

-- The accept route uses the service-role client so no user-facing UPDATE
-- policy is needed for the accepting agent. The route handler validates
-- email match and then updates via admin client.