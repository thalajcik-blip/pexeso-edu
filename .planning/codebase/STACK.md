# Technology Stack
_Last updated: 2026-03-27_

## Summary
Pexeso-edu is a React 19 single-page application written in TypeScript, bundled with Vite 7, and styled with Tailwind CSS v4. It runs on Node 20 (locked via `.nvmrc`). Backend logic is handled entirely by Supabase (PostgreSQL database, Auth, Storage, Realtime, and Deno Edge Functions). The app is deployed to Vercel as a static SPA with a single catch-all rewrite rule for client-side routing.

## Languages

**Primary:**
- TypeScript ~5.9.3 — all frontend source in `src/`
- TypeScript (Deno runtime) — Supabase Edge Functions in `supabase/functions/`

**Secondary:**
- SQL — database migrations in `supabase/migrations/` and `supabase/schema.sql`
- CSS — `src/index.css` (Tailwind entry)

## Runtime

**Frontend:**
- Browser (ES2022 target, `lib: ["ES2022", "DOM", "DOM.Iterable"]`)
- Node 20 (development tooling, locked by `.nvmrc`)

**Edge Functions:**
- Deno (Supabase-managed runtime, `https://deno.land/std@0.177.0/`)

**Package Manager:**
- npm (lockfile: `package-lock.json` present)

## Frameworks

**Core:**
- React 19.2.0 — UI framework (`src/`)
- React DOM 19.2.3 — DOM renderer

**Routing:**
- React Router DOM 7.13.1 — client-side routing; used for `/admin` and `/profile/:id` sub-apps, configured via `BrowserRouter` in `src/main.tsx`

**Styling:**
- Tailwind CSS 4.2.1 — utility-first CSS, loaded via `@tailwindcss/vite` Vite plugin
- `tailwind-merge` 3.5.0 — merges Tailwind class conflicts
- `tw-animate-css` 1.4.0 (dev) — animation utilities
- `class-variance-authority` 0.7.1 — component variant management (used with shadcn/ui)

**Component Library:**
- shadcn/ui (via `shadcn` 4.0.3 dev CLI, `components.json` config) — component scaffolding with Radix UI primitives
- Radix UI 1.4.3 — accessible headless primitives
- Lucide React 0.577.0 — icon library

**State Management:**
- Zustand 5.0.11 — client state; stores at `src/store/authStore.ts` and `src/store/gameStore.ts`

**Build/Dev:**
- Vite 7.3.1 — dev server and bundler (`vite.config.ts`)
- `@vitejs/plugin-react` 5.1.1 — React Fast Refresh and JSX transform
- `tsc -b` — TypeScript compilation step before `vite build`

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.98.0 — database, auth, storage, and realtime client; initialized in `src/services/supabase.ts`
- `zustand` 5.0.11 — global state management for auth and game state
- `react-router-dom` 7.13.1 — routing between player, admin, and profile views

**UI / UX:**
- `react-easy-crop` 5.5.6 — image cropping for card image uploads
- `react-qr-code` 2.0.18 — QR code generation for game room sharing
- `sonner` 2.0.7 — toast notifications
- `canvas-confetti` 1.9.4 — win celebration animations
- `@dicebear/core` 9.4.0 + `@dicebear/collection` 9.4.0 — procedural avatar generation (`src/utils/avatar.ts`)

**Analytics:**
- `@vercel/analytics` 1.6.1 — Vercel Analytics, injected in `src/main.tsx`

## Configuration

**TypeScript:**
- `tsconfig.json` — project references to `tsconfig.app.json` and `tsconfig.node.json`
- `tsconfig.app.json` — strict mode, ES2022 target, bundler module resolution, `@/*` alias → `./src/*`

**Vite:**
- `vite.config.ts` — plugins: React + Tailwind CSS; path alias `@` → `./src`; defines `__APP_VERSION__` from `package.json`

**ESLint:**
- `eslint.config.js` — ESLint 9 flat config; rules: `@eslint/js` recommended, `typescript-eslint` recommended, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

**shadcn/ui:**
- `components.json` — style: `new-york`, base color: `neutral`, CSS variables enabled, icons: lucide

**Environment:**
- `.env.local` — local development secrets (not committed)
- `.env.production.local` — production secrets (not committed)
- Required frontend env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Platform Requirements

**Development:**
- Node 20 (`.nvmrc` specifies `20`)
- npm

**Production:**
- Vercel — static hosting; `vercel.json` configures a single SPA rewrite (`"/(.*)" → "/index.html"`)
- Supabase project — database, auth, storage, realtime, edge functions

## Gaps / Unknowns
- Exact Node patch version not pinned beyond major `20` in `.nvmrc`.
- No explicit browser support / browserslist config detected.
- Deno version for edge functions is determined by Supabase infrastructure and not pinned in the repo.
