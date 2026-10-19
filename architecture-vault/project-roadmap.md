# Project Roadmap

Status updated October 19, 2026.

## MVP Baseline Already Confirmed

- [x] email and password auth
- [x] protected routes
- [x] single-agent deal pipeline
- [x] stages: `new_lead`, `visit`, `negotiation`, `closed`
- [x] drag and drop pipeline movement
- [x] optimistic deal CRUD
- [x] realtime on `deals`
- [x] dashboard charts
- [x] lead source tracking
- [x] follow-up grouping
- [x] closed deals archive
- [x] manual activity notes

## MVP Architecture Upgrade

- [x] add `agencies`, `agency_memberships`, and `agency_settings`
- [x] keep agency support optional so solo users stay clean
- [x] add nullable `agency_id` to agency-scoped tables
- [x] add `properties` table and optional `deals.property_id`
- [x] add close-only deal fields: `closing_amount`, `closing_disposition`
- [x] move only the close workflow to server-managed API
- [x] add configurable commission engine per agency
- [x] add `deal_payments` schema foundation for token money and bayana
- [x] add `deal_documents` schema foundation for receipts and agreements
- [x] hide agency and commission UI when `agency_id = null`
- [x] enforce owner sees all and agents see only own rows
- [x] restrict agency creation to the configured admin account

## Phase 2

- [x] owner-facing agency overview and settings UI
- [x] invitation or member onboarding flow
- [x] basic automatic non-note activity logging for create, stage, and follow-up events
- [x] call, WhatsApp, and payment activity logging
- [x] realtime subscriptions for activities if needed
- [ ] property list screens, filters, and search
- [x] payment recording routes and UI
- [ ] receipt and agreement generation routes and UI
- [ ] closed-deal analytics
- [ ] stronger dashboard analytics
- [ ] reminders and notifications

## Phase 3

- [ ] export and reporting
- [ ] email and SMS campaigns
- [ ] calendar sync
- [ ] broader file uploads outside generated receipts and agreements
- [ ] AI assistant workflows inside the product
- [ ] AI call and chat assitant/Ai reseptionest
- [ ] making an graph based realtion of poltical ctivty and peoplprecepetion agent preception and diifrent varibles and nodes to predict the market 

## Scope Guardrails

- Do not build full team collaboration beyond the owner and agent tenancy model yet.
- Do not move all CRUD behind Next.js APIs.
- Do not hardcode commission rules in frontend code.
- Do not force agency concepts into solo onboarding.
- Do not add shared inventory visibility for agents unless the product explicitly changes that rule.
