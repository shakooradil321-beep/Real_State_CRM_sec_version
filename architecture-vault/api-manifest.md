# API Manifest

## Current Truth

- The current app is `React + TypeScript + Next.js App Router`.
- The current frontend still talks directly to Supabase for auth, reads, writes, and realtime on `deals`.
- The current server API layer is intentionally narrow.
- Implemented server workflow today:
  - closing a deal
- Schema foundations exist for:
  - calculating commission
  - processing token money or bayana
  - generating official receipts or agreements
- Planned server workflows not yet implemented as routes:
  - manual commission recalculation
  - payment recording
  - receipt generation
  - agreement generation
- All non-sensitive CRUD stays direct to Supabase for now:
  - auth
  - normal deal create/update/delete
  - non-closed stage changes between `new_lead`, `visit`, and `negotiation`
  - property CRUD except terminal `sold` and `rented` state
  - activity note CRUD

## Route Handler Scope

- Runtime model: Next.js App Router route handlers under `app/api/.../route.ts`
- Auth model: route handlers currently read the Supabase access token from the `Authorization` header
- Data model access: route handlers use a service-role Supabase client for server-managed workflows
- Tenant model:
  - solo user: `agency_id = null`, access only own rows
  - agency owner: access every row in the agency
  - agent: access only rows where `user_id = auth.uid()`

## Middleware Contract

Every server route uses the same gate sequence:

1. Resolve the authenticated user from the Supabase access token.
2. Load the target deal and its related `agency_id`, `user_id`, and optional `property_id`.
3. Authorize:
   - if `agency_id` is `null`, the acting user must equal `deal.user_id`
   - if `agency_id` is not `null` and the actor is an owner, allow
   - if `agency_id` is not `null` and the actor is an agent, `deal.user_id` must equal the actor
4. Reject direct ownership mismatches with `403`.
5. Execute writes with the service-role client so the workflow can update `deals`, `properties`, `deal_payments`, `deal_commissions`, and `deal_documents` atomically.

## Implemented And Planned Endpoints

### `POST /api/deals/[dealId]/close` `[implemented]`

Purpose:
- Move a deal into `closed`
- store close-only fields
- update linked property status when `property_id` exists
- calculate commission when agency commission is enabled

Request body:

```json
{
  "closing_amount": 25000000,
  "closing_disposition": "sold",
  "notes": "Closed after final seller confirmation."
}
```

Rules:
- `closing_amount` is required for the close workflow because the current `budget` field is a lead estimate, not a trustworthy commission base.
- `closing_disposition` is required when the deal already has a `property_id`.
- `closing_disposition` must be omitted or `null` when the deal has no linked property.
- If the linked property is already tied to another closed deal, return `409`.
- The current implementation delegates the write bundle to the database RPC `close_deal_and_sync_financials(...)` so the deal update, property sync, and commission upsert happen atomically.
- If agency commission is enabled:
  - create or update `deal_commissions`
  - mark it `earned` immediately when `commission_earned_trigger = on_close`
  - mark it `pending` when `commission_earned_trigger = on_payment`

Response body:

```json
{
  "deal": {},
  "property": {},
  "commission": {}
}
```

### `POST /api/deals/[dealId]/commission/calculate` `[planned]`

Purpose:
- Calculate or recalculate commission for an agency deal
- persist the current settings snapshot onto `deal_commissions`

Current status:

- not implemented yet
- current commission calculation happens through the close workflow

Request body:

```json
{
  "closing_amount": 25000000
}
```

Rules:
- reject when `deal.agency_id` is `null`
- reject when `agency_settings.commission_enabled = false`
- use `agency_settings` as the only source of truth
- never hardcode percentages or flat fees in code
- this endpoint may be called by the close workflow or manually by an owner to recompute after settings changes

Response body:

```json
{
  "commission": {}
}
```

### `GET /api/deals/[dealId]/payments` `[planned]`

Purpose:
- return payment history for token money and bayana

Current status:

- not implemented yet
- `deal_payments` table foundation exists

Response body:

```json
{
  "payments": []
}
```

### `POST /api/deals/[dealId]/payments` `[planned]`

Purpose:
- record token money or bayana
- optionally mark a pending commission as earned when the agency uses `on_payment`
- optionally generate a receipt immediately

Request body:

```json
{
  "payment_kind": "token_money",
  "amount": 1000000,
  "received_on": "2026-04-18",
  "notes": "Received in office.",
  "mark_commission_as_earned": true,
  "generate_receipt": true
}
```

Rules:
- `payment_kind` must be `token_money` or `bayana`
- `mark_commission_as_earned` is explicit on purpose
  - the legacy context does not define whether token money or bayana should automatically qualify as the commission-earned payment
  - the API must therefore require the caller to make that intent explicit
- when `mark_commission_as_earned = true`:
  - the deal must already have a `deal_commissions` row
  - `earned_trigger` must equal `on_payment`
  - set `status = earned`
  - set `earned_at` to the payment timestamp
  - set `trigger_payment_id` to the created payment row

Current status:

- not implemented yet
- `deal_payments` and `trigger_payment_id` schema foundation exists

Response body:

```json
{
  "payment": {},
  "commission": {},
  "receipt": {}
}
```

### `GET /api/deals/[dealId]/documents` `[planned]`

Purpose:
- list generated receipts and agreements for a deal

Current status:

- not implemented yet
- `deal_documents` table foundation exists

Response body:

```json
{
  "documents": []
}
```

### `POST /api/deals/[dealId]/documents/receipt` `[planned]`

Purpose:
- generate and store an official payment receipt

Request body:

```json
{
  "payment_id": "uuid"
}
```

Rules:
- `payment_id` must belong to the same `deal_id`
- the route generates a PDF, stores it in Supabase Storage, and inserts one `deal_documents` row with `document_type = receipt`

Current status:

- not implemented yet

Response body:

```json
{
  "document": {}
}
```

### `POST /api/deals/[dealId]/documents/agreement` `[planned]`

Purpose:
- generate and store an official agreement for a closed deal

Request body:

```json
{}
```

Rules:
- the deal must already be in `closed`
- if the deal has a linked property, the agreement template is chosen from `deals.closing_disposition`
  - `sold` -> sale agreement template
  - `rented` -> rental agreement template
- if the deal has no linked property, use a generic closed-deal agreement template
- the route inserts one `deal_documents` row with `document_type = agreement`

Current status:

- not implemented yet

Response body:

```json
{
  "document": {}
}
```

## Error Model

- `401`: no authenticated session
- `403`: authenticated but not allowed to act on this deal
- `404`: deal, payment, or document target does not exist
- `409`: linked property is already reserved by another closed deal
- `422`: request is structurally valid JSON but fails business rules

## Client Rules

- Direct Supabase mutations must never set:
  - `deals.stage = closed`
  - `deals.closing_amount`
  - `deals.closing_disposition`
  - `properties.status = sold | rented`
  - `properties.deal_id`
  - any row in `deal_payments`
  - any row in `deal_commissions`
  - any row in `deal_documents`
- Frontend code should wrap these endpoints in a dedicated API client module, not call `fetch` inline from components.
