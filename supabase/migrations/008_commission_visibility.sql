-- Migration 008: commission visibility preference
-- Wave 2-B: adds show_commission_to_agents to agency_settings.
--
-- Default is false — commission details are owner-only by default.
-- Owners can toggle this on via the agency settings form to allow agents
-- to see the commission breakdown on their own closed deals.
--
-- This is enforced in the frontend only (no RLS change needed because
-- deal_commissions RLS already gates on deal ownership). The column is
-- the source of truth for what the UI renders.

alter table public.agency_settings
  add column if not exists show_commission_to_agents boolean not null default false;