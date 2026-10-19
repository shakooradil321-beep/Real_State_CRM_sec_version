# DealFlow - Karachi Real Estate CRM

A mobile-first Next.js CRM for Karachi real estate agents.

## Quick Start

### 1. Clone the repo
```bash
git clone [repo-url]
cd dealflow
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Supabase

1. Go to https://supabase.com and create a free account
2. Create a new project
3. Run the Supabase migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_initial_schema.sql`
   - `supabase/migrations/003_initial_schema.sql`
   - `supabase/migrations/004_phase1_architecture_foundation.sql`
   - `supabase/migrations/005_deal_commissions_and_property_sync.sql`
   - `supabase/migrations/006_financial_foundation_and_admin_controls.sql`
4. Go to Settings -> API and copy:
   - Project URL
   - anon/public key
   - service role key

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and paste your Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### 5. Run the app
```bash
npm run dev
```

Open http://localhost:3000

### 6. Create your account
Register with your email and password on the login screen.

## Architecture notes

- The app now runs on Next.js App Router.
- Client-side auth, pipeline UI, Zustand stores, and Supabase browser access stay in the React app.
- Server-only workflows such as `POST /api/deals/[dealId]/close` run through Next route handlers.
- `SUPABASE_SERVICE_ROLE_KEY` is required for the close-deal workflow.
- Agency creation is restricted to `shakooradil321@gmail.com` by both frontend visibility and database policy.

## Build for production
```bash
npm run build
```

## Start production locally
```bash
npm run start
```

Deploy the app to a Next.js-capable host such as Vercel, Netlify, or a Node server that runs `next start`.
