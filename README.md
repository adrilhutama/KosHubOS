# KosHubOS — Roommate & Shared House Management SaaS
Production-grade multi-tenant app for Vercel + Supabase Free tier.

## Stack
Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui + Supabase (@supabase/ssr)

## Setup
1. Copy env: `cp .env.example .env.local` and fill values.
2. Run SQL: copy `supabase/schema.sql` into Supabase Dashboard > SQL Editor > Run.
3. Enable Realtime: `alter publication supabase_realtime add table public.expenses, public.expense_splits, public.chores, public.guest_logs;`
4. Install + dev:
```bash
npm install
npm run dev
```
5. Deploy to Vercel with `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Structure
- `supabase/schema.sql` — full migration (tables, RLS, triggers, storage)
- `src/app/(dashboard)` — protected shell + dashboard/expenses/chores/guests/settings
- `src/app/(auth)/login` — password + magic link
- `src/app/onboarding` — create/join house
