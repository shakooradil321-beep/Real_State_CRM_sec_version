# Logic Engine

## 1. Lead Status Transitions

### Current truth

- A new deal always starts in `new_lead`.
- Valid stages are:
  - `new_lead`
  - `visit`
  - `negotiation`
  - `closed`
- The current product already supports moving deals between stages.
- The database sets `closed_at` when a deal enters `closed`.
- The database clears `closed_at` when a deal leaves `closed`.
- The close route now delegates the terminal close workflow to the database RPC `close_deal_and_sync_financials(...)`.

### Target rule set

- Direct Supabase updates remain allowed for these stage moves:
  - `new_lead <-> visit`
  - `visit <-> negotiation`
  - `new_lead <-> negotiation`
- Entering `closed` is no longer a direct client mutation.
- Reopening a closed deal is also a server-managed mutation because property, payment, and commission side effects must be reconciled together.

### Close workflow requirements

When a deal is moved to `closed`, the server workflow must:

1. verify actor authorization
2. require `closing_amount`
3. require `closing_disposition` when `property_id` exists
4. update the deal row to:
   - `stage = closed`
   - `closing_amount = request.closing_amount`
   - `closing_disposition = request.closing_disposition`
5. let the `closed_at` trigger set the timestamp
6. sync the linked property state if a property is attached
7. calculate commission if agency settings enable it

Current status:

- this workflow is implemented now through the close route plus the atomic RPC in migration `006`

## 2. Commission Calculation

### Activation rules

- Solo deals never create commission rows.
- Agency deals only create commission rows when:
  - `deals.agency_id` is not `null`
  - `agency_settings.commission_enabled = true`

### Source of truth

Only `agency_settings` defines commission behavior:

- `commission_basis`
- `commission_percentage_value`
- `commission_flat_fee_value`
- `agent_share_percentage`
- `agency_share_percentage`
- `commission_earned_trigger`

### Calculation base

- Use `deals.closing_amount`.
- Do not use `deals.budget` for commission math.
- Reason: the current app uses `budget` as the lead estimate captured early in the pipeline, not as a guaranteed closed transaction amount.

### Gross commission formula

If `commission_basis = percentage`:

```text
gross_commission_amount = round(closing_amount * commission_percentage_value / 100)
```

If `commission_basis = flat_fee`:

```text
gross_commission_amount = commission_flat_fee_value
```

### Split formula

Use the stored agency settings snapshot captured at calculation time.

```text
agent_commission_amount = round(gross_commission_amount * agent_share_percentage / 100)
agency_commission_amount = gross_commission_amount - agent_commission_amount
```

This keeps the final sum exact even after rounding.

### Commission lifecycle

If `commission_earned_trigger = on_close`:

- create or update `deal_commissions`
- set `status = earned`
- set `earned_at = deals.closed_at`
- leave `trigger_payment_id = null`

If `commission_earned_trigger = on_payment`:

- create or update `deal_commissions`
- set `status = pending`
- keep `earned_at = null`
- wait for an explicit qualifying payment event

### Why payment earning is explicit

The legacy context does not define whether `token_money` or `bayana` should automatically count as the payment that earns commission.

Because that rule is missing, the API must not assume.

Instead:

- `POST /api/deals/[dealId]/payments` accepts `mark_commission_as_earned`
- when true, the payment becomes the `trigger_payment_id`
- when false, the payment is recorded but the commission stays pending

## 3. Property Availability Rules

### Property linkage

- A deal may have `property_id = null`
- A property may have `deal_id = null`
- Not every deal needs a linked property
- Not every property must already be committed to a deal

### Allowed property states

- `available`
- `under_offer`
- `sold`
- `rented`

### Direct client behavior

Direct Supabase property updates may set:

- `available`
- `under_offer`

Direct Supabase updates may not set:

- `sold`
- `rented`
- `deal_id`

Those terminal states are owned by the close workflow.

### Close-time property behavior

When a deal enters `closed` and has a `property_id`:

1. the close payload must include `closing_disposition`
2. the linked property is updated to:
   - `status = closing_disposition`
   - `deal_id = deals.id`
3. any attempt to close against a property already linked to another closed deal is rejected

Current status:

- this sync is now implemented through the DB trigger path used by the atomic close workflow

### Reopen or unlink behavior

If a closed deal is reopened or its linked property changes:

- the previously linked property is reset to:
  - `status = available`
  - `deal_id = null`

This keeps `deals` and `properties` from drifting out of sync.

## 4. Agency and Solo Visibility

### Solo mode

- `agency_id = null`
- user sees only own deals, activities, and properties
- no agency settings UI
- no commission UI
- only the configured admin solo user can create an agency

### Agency owner mode

- owner can read and manage all agency-scoped rows
- owner can edit `agency_settings`
- owner can calculate or recalculate commissions for agency deals

### Agent mode

- agent can read and manage only rows where `user_id = auth.uid()`
- agent may read agency settings if the frontend needs that for display
- agent cannot see another agent's deals or properties

## 5. Activity Logging

### Current truth

- `deal_activities` exists now
- manual `note` entries are implemented now
- automatic activity creation is partially wired now:
  - `deal_created`
  - `stage_changed`
  - `followup_set`
- call, WhatsApp, payment, and document activity events are still not wired

### Target event rules

The close and payment APIs should also create timeline entries:

- `stage_changed` when a deal enters or leaves `closed`
- `followup_set` when a follow-up date changes in future server-managed workflows
- `deal_created` if server-side creation is added later
- `note` remains manual

Token money, bayana, and document generation events should be logged through `meta` until dedicated activity types are formally added.
