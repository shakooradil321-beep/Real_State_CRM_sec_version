# AI Website Context: DealFlow

Codebase inspected on April 19, 2026.

## Why this file exists

This is the project handoff document for humans and AI assistants.

Its goals are:

- explain what the app already does
- separate implemented behavior from planned architecture
- reduce hallucination when future edits are made
- highlight important truth checks and hidden edge cases

## One sentence summary

DealFlow is a mobile-first Karachi real estate CRM built on Next.js App Router, with solo-agent lead tracking plus an optional agency/team foundation and server-side close workflow support.

## Plain-English product explanation

At its core, this app is still a deal pipeline for real estate agents.

The user can:

- sign in with email and password
- add, edit, search, filter, and reorder leads
- move leads through a 4-stage pipeline
- review follow-ups grouped by urgency
- review closed deals on a separate page
- open a deal detail sheet and keep an activity timeline
- create an agency profile if they are the configured admin account
- configure commission rules for that agency if they are the owner

## Confirmed feature snapshot

These features are implemented in the current codebase:

- email/password authentication with protected routes
- 4-stage deal pipeline: `new_lead`, `visit`, `negotiation`, `closed`
- drag-and-drop deal movement and reordering
- optimistic deal create/update/delete/move behavior
- realtime subscription for `deals`
- pipeline stats summary
- pipeline/charts tab switch on the main page
- dashboard charts:
  - Deals by Stage bar chart
  - Budget Distribution donut chart
  - Lead Sources donut chart
- pipeline filters:
  - client name search
  - area filter
  - property type filter
  - lead source filter
  - budget range filter
- follow-up page grouped into overdue, today, and next 7 days
- closed deals page with search and month grouping
- deal detail sheet with `Details` and `Activity` tabs
- manual activity note creation
- automatic activity logging for:
  - `deal_created`
  - `stage_changed`
  - `followup_set`
- optional agency context loading after login
- agency creation flow for the admin solo user
- agency owner-only pages for team overview and agency settings
- commission settings form for agency owners
- server-managed close-deal client flow in the frontend store and close dialog UI
- database foundations for `deal_payments` and `deal_documents`

## Important truth checks to avoid hallucination

These details are easy to overstate and should be treated carefully:

- `deal_activities` is real and used in the UI.
- Manual note creation is implemented.
- Automatic activity logging is only partially implemented.
- I found automatic logging for:
  - deal creation
  - stage changes
  - follow-up updates
- I did **not** find automatic logging for:
  - `called`
  - `whatsapped`
- The activity timeline knows how to display `called` and `whatsapped`, but current quick-action links do not create those rows.
- Activities still do not have a realtime subscription.
- When pipeline filters are active, drag-and-drop is intentionally disabled.
- Closed-stage entry is now guarded:
  - the normal update/move flows refuse to move an open deal into `closed`
  - the UI pushes users into a separate close workflow instead
- The app now runs on Next.js App Router.
- The repo contains a live route handler at `app/api/deals/[dealId]/close/route.ts`.
- The frontend calls `/api/deals/:dealId/close`, and that route is now part of the actual app runtime.
- The missing `deal_commissions` table is now added in `supabase/migrations/005_deal_commissions_and_property_sync.sql`.
- Linked property terminal status is now expected to sync from the database trigger added in migration `005`.
- The close route now calls a database RPC so deal close, property sync, and commission upsert happen atomically.
- Agency creation is restricted to the configured admin email:
  - `shakooradil321@gmail.com`
- Team membership management is not finished in the UI:
  - owners can view the team page
  - owners cannot invite/add members from the app yet

## Product scope

The product is no longer purely solo-only in architecture, but it is still mostly a solo CRM in day-to-day feature depth.

Current shipped focus:

- lead tracking
- follow-up management
- pipeline management
- quick contact actions
- dashboard visibility
- lightweight activity notes
- initial agency setup
- agency commission-rule configuration
- server-managed atomic close workflow

Foundation exists, but not yet finished as a complete product area:

- shared agency tenancy
- team workspace management
- payment-triggered commission lifecycle and commission reporting
- property inventory workflow

Not currently implemented as a finished user-facing feature:

- invite/manage team members from UI
- property inventory screens
- payments workflow
- commission reporting screens
- document uploads
- email/SMS campaigns
- calendar sync
- AI workflows inside the product

## Routes and page flow

### `/login`

Login/signup page.

What it does:

- sign in with email and password
- sign up with email and password
- redirect authenticated users to `/pipeline`

### `/pipeline`

Primary working screen.

What it does:

- loads deals from the store
- shows top stats cards
- switches between:
  - `Pipeline`
  - `Charts`
- shows filters and stage columns in the pipeline tab
- shows dashboard charts in the charts tab

### `/followups`

Follow-up management screen.

What it does:

- groups deals into overdue, today, and next 7 days
- provides quick phone and WhatsApp actions
- opens the deal detail sheet

### `/closed`

Closed-deals archive screen.

What it does:

- filters closed deals only
- searches by client name or area
- groups results by month
- opens the deal detail sheet in read-only mode

### `/agency/create`

Admin-only solo-user setup screen for creating an agency.

What it does:

- allows the configured admin solo user to create one agency
- explains that existing personal deals remain personal unless migrated later
- redirects successful creation to `/agency/team`

### `/agency/team`

Agency owner page.

What it does:

- shows agency summary cards
- lists current membership rows
- warns that member management is not enabled yet

### `/agency/settings`

Agency owner page.

What it does:

- loads agency settings
- allows the owner to configure commission settings
- supports percentage or flat-fee commissions
- supports agent/agency split percentages
- supports earned trigger:
  - `on_close`
  - `on_payment`

### `/`

Root redirect.

Behavior:

- goes to `/pipeline` if authenticated
- goes to `/login` if unauthenticated

### Protected routes

Protected:

- `/pipeline`
- `/followups`
- `/closed`
- `/agency/create`
- `/agency/team`
- `/agency/settings`

Extra route guards:

- `/agency/create` is solo-user only and admin-email only
- `/agency/team` is owner only
- `/agency/settings` is owner only

If auth is not initialized yet, the app shows a full-screen spinner.

## Core data model

### Deal

Current `Deal` fields in code:

- `id`
- `agency_id`
- `user_id`
- `property_id`
- `client_name`
- `phone`
- `budget`
- `area`
- `property_type`
- `stage`
- `notes`
- `followup_date`
- `sort_order`
- `created_at`
- `updated_at`
- `closed_at`
- `source`
- `closing_amount`
- `closing_disposition`

### DealActivity

Current `DealActivity` fields in code:

- `id`
- `deal_id`
- `user_id`
- `type`
- `content`
- `meta`
- `created_at`

Current activity types:

- `note`
- `stage_changed`
- `deal_created`
- `followup_set`
- `called`
- `whatsapped`

### Agency

Current `Agency` fields in code:

- `id`
- `name`
- `owner_user_id`
- `created_at`
- `updated_at`

### AgencyMembership

Current `AgencyMembership` fields in code:

- `id`
- `agency_id`
- `user_id`
- `role`
- `created_at`
- `updated_at`

Current agency roles:

- `owner`
- `agent`

### AgencySettings

Current `AgencySettings` fields in code:

- `agency_id`
- `commission_enabled`
- `commission_basis`
- `commission_percentage_value`
- `commission_flat_fee_value`
- `agent_share_percentage`
- `agency_share_percentage`
- `commission_earned_trigger`
- `created_at`
- `updated_at`

### Property

Current `Property` fields in code:

- `id`
- `agency_id`
- `user_id`
- `title`
- `address`
- `area`
- `size`
- `price`
- `status`
- `deal_id`
- `created_at`
- `updated_at`

Important truth check:

- the `Property` type exists in app code and the `properties` table exists in migration `004`
- I did **not** find property inventory UI pages yet

### DealPayment

Current `DealPayment` schema exists in migration `006`.

Important truth check:

- the payment table now exists in the database plan
- I did **not** find payment-management UI screens yet

### DealDocument

Current `DealDocument` schema exists in migration `006`.

Important truth check:

- the document table now exists in the database plan
- I did **not** find document-generation or document-management UI screens yet

## Fields editable in the UI

The deal form currently asks for:

- client name
- phone number
- budget
- area
- property type
- lead source
- follow-up date
- notes

When editing an open deal, the user can also change:

- stage, but only among active pipeline stages

Closed-stage rule:

- users cannot directly edit a live deal into `closed` through the normal edit form
- they must use the separate close workflow

The close dialog currently asks for:

- closing amount
- closing disposition, but only if the deal already has a linked property
- optional close notes

The agency settings form currently allows:

- enable/disable commission tracking
- choose commission basis:
  - percentage
  - flat fee
- enter commission value
- enter agent share percentage
- enter agency share percentage
- choose earned trigger:
  - on close
  - on payment

## Current business rules

- new deals are created in `new_lead`
- stage must be one of `new_lead`, `visit`, `negotiation`, `closed`
- the normal edit and drag flows cannot close a deal directly
- reopening a closed deal is blocked in the normal client store flows
- property type must be one of `House`, `Apartment`, `Plot`, `Commercial`, `Office`
- phone validation expects Pakistani mobile numbers
- budget must be positive
- area is required
- source is optional
- follow-up date is optional
- notes are optional
- when a deal enters `closed`, `closed_at` is still expected to be set by the database trigger from the earlier schema
- when a deal leaves `closed`, `closed_at` is expected to be cleared by DB trigger logic
- if the signed-in user belongs to an agency, new deals are created with that `agency_id`
- existing personal deals are not automatically migrated into an agency

## Follow-up logic

Follow-up urgency is derived from `followup_date`:

- overdue if before today
- today if today
- upcoming if after today

The follow-up page only shows upcoming items for the next 7 days.

The top stat card `Follow-ups Due` counts overdue and today items.

## Pipeline filters

The pipeline filter system currently supports:

- search by client name
- filter by area
- filter by property type
- filter by lead source
- filter by budget range

Current budget buckets used by the filter/chart code:

- `Under 50L`
- `50L - 1Cr`
- `1Cr - 2Cr`
- `2Cr - 5Cr`
- `Above 5Cr`

## Charts currently implemented

### Deals by Stage

- bar chart
- counts deals in each pipeline stage

### Budget Distribution

- donut chart
- groups deals into budget buckets

### Lead Sources

- donut chart
- counts deals by `source`
- shows an empty state if no deals have a source yet

## Contact actions

The app includes quick contact actions in cards and detail views:

- `tel:` call links
- WhatsApp deep links with a prefilled message

WhatsApp message pattern:

`Hi [client name], following up regarding the [property type] in [area].`

Important truth check:

- these actions currently open links only
- they do not automatically log `called` or `whatsapped` activities

## Authentication and security

Auth is handled by Supabase Auth.

Current client-side security model:

- email/password auth
- persistent browser session
- protected pages in Next.js App Router with client-side auth guards

Current database security model from migrations:

- RLS on `deals`
- RLS on `deal_activities`
- RLS on `agencies`
- RLS on `agency_memberships`
- RLS on `agency_settings`
- RLS on `properties`

Agency access model from the migration:

- solo rows remain user-scoped with `agency_id = null`
- agency owners can access agency-scoped rows
- agency agents can access their own rows inside the agency

## Database and backend architecture

This repo is now a Next.js full-stack app.

Confirmed frontend data access:

- auth
- direct reads/writes to Supabase tables
- realtime on `deals`

Confirmed runtime layers:

- Next.js App Router for pages and layouts
- Next route handlers for server-side workflows
- direct Supabase browser reads/writes for most client CRUD
- realtime on `deals`

Current migrations:

- `supabase/migrations/001_initial_schema.sql`
  - creates `public.deals`
  - adds indices
  - creates `updated_at` trigger
  - creates `closed_at` trigger
  - enables RLS
  - adds deals table to Supabase realtime publication
- `supabase/migrations/002_initial_schema.sql`
  - adds `source` column to `public.deals`
- `supabase/migrations/003_initial_schema.sql`
  - creates `public.deal_activities`
  - enables RLS
  - adds per-deal activity index
- `supabase/migrations/004_phase1_architecture_foundation.sql`
  - creates agency foundation tables
  - creates `properties`
  - adds `agency_id`, `property_id`, `closing_amount`, and `closing_disposition` to `deals`
  - adds agency-aware RLS helper functions and policies
  - creates default membership/settings trigger for new agencies
- `supabase/migrations/005_deal_commissions_and_property_sync.sql`
  - creates `deal_commissions`
  - adds commission read policy
  - adds the deal-to-property sync trigger used by the close workflow
- `supabase/migrations/006_financial_foundation_and_admin_controls.sql`
  - creates `deal_payments`
  - creates `deal_documents`
  - adds `trigger_payment_id` to `deal_commissions`
  - restricts agency creation to the admin email via RLS
  - adds the atomic close RPC used by the route handler

Important mismatch to remember:

- there is a more complete planned schema in `architecture-vault/database-schema.sql`, but that is not the same thing as an applied migration

## Frontend stack

The app is built with:

- React 18
- TypeScript
- Next.js App Router
- Tailwind CSS
- Zustand
- Supabase JS client
- React Hook Form
- Zod
- dnd-kit
- date-fns
- react-hot-toast
- Radix UI primitives
- Lucide icons
- Chart.js
- react-chartjs-2

Also present in the repo:

- Next route handler source under `app/api`

## State management summary

There are currently four important stores:

- `authStore`
- `dealsStore`
- `activitiesStore`
- `agencyStore`

### `authStore`

Handles:

- session initialization
- auth state subscription
- sign in
- sign up
- sign out

### `dealsStore`

Handles:

- fetch deals
- add/update/delete/restore deals
- move and reorder deals
- optimistic UI updates
- stats selectors
- follow-up selectors
- realtime subscription
- partial automatic activity logging
- close-deal client call into `/api/deals/:id/close`

### `activitiesStore`

Handles:

- fetch activities for one deal
- add one activity row
- ingest activity rows into local cache
- local in-memory cache keyed by `deal_id`

It does not currently:

- subscribe to activities in realtime
- automatically log phone/WhatsApp quick actions

### `agencyStore`

Handles:

- fetch agency context for current user
- fetch agency members
- fetch agency settings
- create agency
- update agency settings
- reset agency state on logout

## File-by-file code flow

This section is intentionally compact and practical.

- `app/layout.tsx`
  - global Next layout that imports global CSS and mounts the app providers
- `src/components/app/AppProviders.tsx`
  - boots auth, subscribes/unsubscribes deals realtime by auth state, fetches agency context after login, resets stores on logout, and shows config error UI if Supabase env vars are missing
- `app/(protected)/layout.tsx`
  - client-side auth gate for protected Next routes and shared `AppLayout`
- `src/lib/supabase.ts`
  - creates the browser Supabase client using Next/public env vars and exports a readable config error string
- `src/store/authStore.ts`
  - handles auth session lifecycle
- `src/store/dealsStore.ts`
  - central deal logic: optimistic CRUD, stage movement, sorting, selectors, realtime subscription, partial activity logging, and close-flow client call
- `src/store/activitiesStore.ts`
  - fetches and inserts `deal_activities`, with a local per-deal cache and ingestion helper
- `src/store/agencyStore.ts`
  - loads agency/membership/settings state and exposes create/update actions
- `src/lib/agency.ts`
  - thin Supabase table helpers for agency data
- `src/lib/activityLogger.ts`
  - shared helper for inserting deal activities
- `src/lib/api/closeDeal.ts`
  - frontend fetch wrapper for `/api/deals/:dealId/close`
- `app/api/deals/[dealId]/close/route.ts`
  - server-style close workflow with auth check, access checks, validation, deal update, optional commission upsert, and close activity logging
- `supabase/migrations/005_deal_commissions_and_property_sync.sql`
  - adds the `deal_commissions` table and property-sync trigger that complete the close workflow backend
- `supabase/migrations/006_financial_foundation_and_admin_controls.sql`
  - adds payments/documents/admin agency policy and the atomic close RPC
- `app/(protected)/pipeline/page.tsx`
  - fetches deals, shows stats, and toggles between pipeline and chart views
- `src/components/pipeline/PipelineBoard.tsx`
  - owns filter state, groups filtered deals by stage, renders columns, and disables DnD when filters are active
- `src/components/deals/DealFormFields.tsx`
  - defines the Zod form schema and converts form values into insert/update payloads, including `agency_id`
- `src/components/deals/CloseDealDialog.tsx`
  - prompts for closing amount/disposition/notes and triggers the server-managed close request
- `src/components/deals/ActivityTimeline.tsx`
  - loads activities for a deal and allows manual note creation
- `src/components/agency/AgencyCreateForm.tsx`
  - validates and creates an agency
- `src/components/agency/AgencySettingsForm.tsx`
  - validates and updates commission settings
- `src/components/layout/TopBar.tsx`
  - shows agency-aware navigation options in the account menu
- `supabase/migrations/004_phase1_architecture_foundation.sql`
  - adds phase-one agency and property foundations plus agency-aware policies

## Key technical files another AI should read first

If another AI is time-constrained, these are the highest-value files to read first:

- `src/types/index.ts`
- `src/store/dealsStore.ts`
- `src/store/activitiesStore.ts`
- `src/store/agencyStore.ts`
- `app/layout.tsx`
- `app/(protected)/layout.tsx`
- `app/(protected)/pipeline/page.tsx`
- `src/components/deals/DealFormFields.tsx`
- `src/components/deals/CloseDealDialog.tsx`
- `src/components/deals/ActivityTimeline.tsx`
- `src/components/pipeline/PipelineBoard.tsx`
- `src/components/agency/AgencySettingsForm.tsx`
- `src/lib/activityLogger.ts`
- `src/lib/api/closeDeal.ts`
- `app/api/deals/[dealId]/close/route.ts`
- `supabase/migrations/005_deal_commissions_and_property_sync.sql`
- `supabase/migrations/006_financial_foundation_and_admin_controls.sql`
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/003_initial_schema.sql`
- `supabase/migrations/004_phase1_architecture_foundation.sql`

## Environment variables

Required for the current app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

If those are missing, the app shows a configuration-error screen instead of the normal product.

Additional server-side variables required for the close API route:

- `SUPABASE_SERVICE_ROLE_KEY`
- one of:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_URL`

Important truth check:

- `.env.example` now documents both the browser keys and the service role key
- the close workflow needs the service role key in server runtime

## Scripts

Current package scripts:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

## Known limitations and small issues

Current gaps or quirks:

- activity realtime is still not implemented
- quick phone/WhatsApp actions do not log corresponding activity rows
- agency member invite/manage flow is not implemented in the UI
- property inventory data model exists, but property UI does not
- deal payments and documents now exist in schema, but still have no user-facing workflows
- some UI strings still contain encoding artifacts like `Creating...` / `Saving...` rendering incorrectly in a few files

## Best short explanation for another person

This is a mobile-first real estate CRM for Karachi agents. It already handles leads, follow-ups, pipeline movement, closed deals, charts, and activity notes. The codebase has also started an agency/team architecture with owner-only settings and commission rules, but that newer layer is still only partially complete.

## Best short context block for another AI

Use this if you need a compressed, accurate handoff:

`DealFlow is a React + TypeScript + Next.js App Router + Tailwind + Zustand + Supabase CRM for Karachi real estate agents. Core shipped UX: auth, deal pipeline, follow-ups, closed deals, charts, filters, detail sheet, and activity timeline. dealsStore does optimistic CRUD plus realtime on deals. Automatic activity logging now exists for deal_created, stage_changed, and followup_set, but not called/whatsapped, and activities still have no realtime subscription. The codebase also has phase-one agency foundations: agencies, agency_memberships, agency_settings, properties, new agency routes (/agency/create, /agency/team, /agency/settings), and deals now include agency_id, property_id, closing_amount, and closing_disposition. The close workflow now runs through a real Next route handler at /api/deals/[dealId]/close, with migrations for commissions/payments/documents and an atomic close RPC that syncs property and commission state together. Agency creation is restricted to the configured admin email.`

## Suggested next upgrades

The strongest next improvements from the current code state would be:

- add UI for team member invitations/management
- add UI for property inventory and linking properties to deals
- add automatic activity logging for call and WhatsApp actions
- add realtime updates for activities if needed
- clean up the remaining encoding artifacts in UI text
