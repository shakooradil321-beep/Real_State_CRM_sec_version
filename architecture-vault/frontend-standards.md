# Frontend Standards

## 1. Architecture Boundary

- Keep the UI in `.tsx`.
- Keep all sensitive business mutations out of components.
- Use direct Supabase access only for low-risk CRUD:
  - auth
  - non-closed deal CRUD
  - non-terminal property CRUD
  - activity note CRUD
- Use API client modules for sensitive workflows:
  - deal closing
  - commission calculation
  - token money or bayana processing
  - receipt or agreement generation

## 2. Recommended Folder Shape

```text
src/
  components/
    ui/
  features/
    auth/
    deals/
    properties/
    agencies/
    commissions/
    payments/
    documents/
  hooks/
  lib/
    api/
    supabase/
    formatters/
    validators/
  stores/
  types/
```

Rules:

- `components/ui`: primitive reusable UI only
- `features/*`: domain-specific UI and feature logic
- `lib/api/*`: wrappers around route handlers
- `lib/supabase/*`: client creation and direct-query helpers
- `stores/*`: cross-route state only
- `types/*`: database-backed types, API payload types, and UI view models

## 3. Component Modularity

- One file, one primary responsibility.
- Page components assemble sections; they do not own deep business logic.
- Modal, sheet, and form components stay feature-local unless shared by two or more domains.
- Use presentational child components for repeated card, row, and badge patterns.
- Keep route pages thin:
  - fetch or subscribe
  - compose sections
  - wire user actions to stores or API modules

## 4. State Management

### Authentication

- Keep a single auth source of truth.
- Expose auth through a top-level provider or wrapper hook around Supabase session state.
- Every feature reads actor context from one place:
  - `user.id`
  - `agency_id | null`
  - `agency_role | null`

### Local UI state

Use component state for:

- open or closed UI
- tab switches
- search input drafts
- optimistic field toggles that do not need cross-page reuse

### Shared client state

Use Zustand for:

- authenticated user state
- active deals collection
- activity cache
- properties collection if it becomes cross-page

### Sensitive workflow state

Do not store close, commission, payment, or document business rules inside Zustand stores.

Instead:

- call `lib/api/*`
- let the server return the authoritative record
- merge the response into the client store after success

## 5. Forms

- Use React Hook Form + Zod for every form.
- Match Zod enums to the database enums exactly.
- Keep `toInsertPayload` and `toUpdatePayload` converters outside JSX markup.
- For close workflows, use dedicated payload types:
  - close deal form
  - payment form
  - document generation form

## 6. Agency-Aware UI Rules

- Solo users must never see empty agency panels, disabled agency controls, or irrelevant commission settings.
- When `agency_id = null`, hide:
  - agency settings
  - commission summaries
  - membership management
- When `agency_role = agent`, hide owner-only controls:
  - agency settings edit
  - membership admin
  - manual commission recalculation for another agent's deal

## 7. Naming Conventions

- React components: `PascalCase.tsx`
- Hooks: `useThing.ts`
- Zustand stores: `thingStore.ts`
- Schema-backed type files: `thing.types.ts` or `type-definitions.ts`
- API wrappers: `thingApi.ts`
- Validation schemas: `thing.schema.ts`
- Avoid generic names like `helpers.ts` inside feature folders

## 8. Tailwind Standards

- Use Tailwind utility classes, but keep repeated class sets behind variants or shared components.
- Prefer semantic wrappers for common patterns:
  - section shells
  - stat cards
  - pipeline badges
  - empty states
- Keep color meaning consistent:
  - stage colors never change meaning between pages
  - `closed` should always read as terminal success
  - `under_offer` should always read as provisional
- Do not leak agency complexity into solo flows.

## 9. Data Fetching Rules

- Direct Supabase selectors live in hooks or stores, not inside UI components.
- API route calls live in `lib/api/*`.
- Components receive ready-to-render data, not raw PostgREST query builders.
- Every optimistic update must have a rollback path.

## 10. Migration Guidance

- The current app is Vite, not Next.js.
- Until a full framework migration happens, treat the target API layer as a boundary contract.
- That means the frontend can stay React-first, but the sensitive workflow shape should already match the route handler design in `api-manifest.md`.
