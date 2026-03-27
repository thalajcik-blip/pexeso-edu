# Architecture
_Last updated: 2026-03-27_

## Summary

Pexedu is a single-page application (SPA) deployed on Vercel. It is a React + TypeScript frontend-only codebase with no custom backend — all persistence and server-side logic is handled by Supabase (PostgreSQL + Realtime + Auth + Storage + Edge Functions). The app has three distinct render contexts served from a single `index.html`: a player-facing game app (root `/`), a teacher/admin dashboard (`/admin`), and public player profile pages (`/profile/:id`). The game itself is entirely client-side state managed via Zustand stores; Supabase Realtime channels drive multiplayer synchronization.

---

## High-Level System Design

**Pattern:** SPA monolith with BaaS (Backend-as-a-Service)

- No custom API server. All data operations go directly from the React client to Supabase via its JS client.
- Server-side logic lives exclusively in Supabase Edge Functions (Deno runtime).
- Deployment: Vercel SPA with a catch-all rewrite (`vercel.json` redirects `/*` → `/index.html`).

**Three render contexts (selected in `src/main.tsx`):**

| Path prefix | Component | Description |
|---|---|---|
| `/` (default) | `src/App.tsx` | Player game interface |
| `/admin*` | `src/admin/AdminApp.tsx` | Teacher/superadmin CMS with React Router |
| `/profile/:id` | `src/components/profile/ProfilePage.tsx` | Public profile viewer |

---

## Key Architectural Patterns

**Phase-driven UI (game app):**
The game app renders components conditionally based on `phase` from `gameStore`. No router is used for the game UI.

```
GamePhase = 'setup' | 'lobby' | 'playing' | 'quiz' | 'win'
          | 'lightning_playing' | 'lightning_reveal' | 'lightning_results'
```

`src/App.tsx` maps each phase to a rendered component:
- `setup` → `SetupScreen`
- `lobby` → `LobbyScreen`
- `playing` / `win` → `GameBoard`
- `quiz` → `QuizModal`
- `lightning_*` → `LightningGame`

**Zustand global state:**
Two stores carry all application state:
- `src/store/gameStore.ts` — game lifecycle, board state, multiplayer, settings
- `src/store/authStore.ts` — auth session, user profile, modal visibility, XP/levels

Both stores call Supabase directly. `gameStore` dynamically imports `authStore` to avoid circular references.

**Supabase Realtime for multiplayer:**
All multiplayer actions are broadcast over a single Supabase Realtime channel per room. `src/services/multiplayerService.ts` wraps channel creation, presence tracking, and broadcast. The host generates game state and broadcasts `game_start` / `state_snapshot` action objects to all players.

---

## Data Flow

**Solo game flow:**
1. User selects deck/settings in `SetupScreen` → `gameStore.startGame()`
2. `gameStore` builds card array locally from static `src/data/decks.ts` or fetches custom deck via `src/services/supabase.ts:fetchCustomDeckFull()`
3. Game phase transitions drive UI renders in `App.tsx`
4. On game end, `src/services/gameService.ts:saveGameResult()` writes to `game_history` table and awards XP via `authStore.addXP()`

**Multiplayer flow:**
1. Host creates a room → `createRoomInDb()` inserts a row in `rooms` table
2. Joiner fetches room via `fetchRoomFromDb()`, joins Realtime channel
3. Host broadcasts `game_start` action with shuffled cards and player list
4. Each player action (`flip_card`, `quiz_vote`, etc.) is broadcast; all clients apply the same deterministic logic to keep state in sync
5. Host broadcasts `state_snapshot` when a late joiner connects

**Auth flow:**
1. `App.tsx` calls `supabase.auth.getSession()` on mount → `authStore._setUser()`
2. `authStore.loadProfile()` fetches `profiles` row; sets `isOnboarding = true` if no username yet
3. Realtime subscription on `profiles` table fires `loadProfile()` when `teacher_request_status` changes
4. Admin app uses a local `useAuth` hook (`src/admin/useAuth.ts`) that reads from `user_roles` table instead of `profiles`

---

## Frontend / Backend Split

**Frontend (this repo, `src/`):**
- All game logic, UI, state management
- Direct Supabase client calls for CRUD
- Realtime channel management

**Backend (Supabase-hosted):**
- PostgreSQL database with RLS policies
- Supabase Auth (email/password, magic link, Google OAuth)
- Supabase Storage (`card-images` bucket — public read, authenticated write)
- Edge Functions (Deno):
  - `generate-quiz` — calls Claude/Gemini/OpenAI to generate quiz questions for custom deck cards
  - `translate-quiz` — translates quiz content
  - `send-notification` — pushes notifications
  - `delete-account` — deletes user account (requires service role)
  - `delete-user` — admin user deletion

---

## Database Schema Overview

**`profiles`** (one per auth user)
- `id` uuid PK → references `auth.users`
- `username` text
- `avatar_id` integer
- `xp` integer, `level` integer
- `locale` text
- `show_stats`, `show_favorites`, `show_activity` boolean
- `roles` text[] default `['player']` — values: `player`, `teacher`, `superadmin`
- `teacher_request_status` text — `null | 'pending' | 'approved' | 'rejected'`

**`user_roles`** (legacy admin role table, still used by admin app)
- `user_id` uuid, `role` text — `teacher | superadmin`

**`teacher_requests`**
- `id` uuid PK
- `user_id` uuid → `profiles.id`
- `school` text, `reason` text
- `status` text — `pending | approved | rejected`
- `reviewed_by` uuid, `reviewed_at` timestamptz

**`custom_decks`**
- `id` uuid PK
- `language` text, `deck_type` text — `image | audio`
- `results_config` JSONB — 6-tier scoring config

**`custom_cards`**
- `deck_id` uuid → `custom_decks.id`
- `image_url`, `audio_url`, `label`, `quiz_question`
- `answers` JSONB — flexible answer pool `[{text, correct}]`
- `display_count` integer (default 4)
- `quiz_options`, `quiz_correct` — legacy fields
- `fun_fact`, `translations` JSONB, `sort_order`

**`rooms`** (ephemeral multiplayer sessions)
- `id` text PK (6-char room code)
- `host_id` text, `settings` JSONB
- `created_at` timestamptz

**`game_history`**
- `user_id` uuid, `set_slug`, `set_title`, `custom_deck_id`
- `game_mode`, `score`, `quiz_correct`, `quiz_total`, `total_pairs`
- `duration_sec`, `is_multiplayer`, `played_at`

**`admin_settings`**
- `key` text PK, `value` JSONB — e.g., `ai_provider` config

**Storage bucket: `card-images`** — public read, authenticated write/delete

---

## Auth and Session Architecture

**Player app (`src/store/authStore.ts`):**
- Uses `supabase.auth` JS client directly
- Supports: email+password, magic link (OTP), Google OAuth
- Google OAuth for players sets `localStorage['pexedu_oauth_player'] = '1'` to distinguish from admin OAuth redirects
- Session token stored by Supabase client (localStorage)
- Profile loaded from `profiles` table after auth; onboarding flow triggered if no `username`
- Role check: `profile.roles` array — `player`, `teacher`, `superadmin`

**Admin app (`src/admin/useAuth.ts`):**
- Separate local React hook, not Zustand
- Reads role from legacy `user_roles` table
- Supports: email+password, Google OAuth, password recovery
- `AdminRole` type: `'superadmin' | 'teacher' | null`
- Password recovery redirects to `/admin` hash route

**Two independent auth contexts** — the player Zustand store and the admin hook do not share state.

---

## API Design Patterns

There is no REST or GraphQL API layer. All data access uses:

1. **Supabase PostgREST** — direct table queries via `supabase.from('table').select/insert/update/upsert/delete`
2. **Supabase RPC** — used for operations requiring elevated logic (e.g., getting email from `auth.users`)
3. **Supabase Edge Functions** — called via `fetch()` with `Authorization: Bearer <anon_key>` header. Used for: AI quiz generation, account deletion, notifications
4. **Supabase Realtime** — Broadcast channel for game actions; Postgres Changes listener for profile updates

---

## State Management Approach

**Zustand** (v5) is the sole state management library.

- `src/store/gameStore.ts` — persisted with `zustand/middleware:persist` (localStorage key `pexedu-storage`). Contains all game state, multiplayer logic, phase transitions.
- `src/store/authStore.ts` — not persisted. Re-hydrated on mount from Supabase session.

No React Context, Redux, or other state libraries are used. Components read from stores via hooks (`useGameStore`, `useAuthStore`) with selector functions.

Static game data (built-in decks, translations, themes) lives in `src/data/` as plain TypeScript objects — no store needed.

---

## Gaps / Unknowns

- The full schema for `user_roles` table is not confirmed in migrations (legacy table, pre-dates the migration files in this repo).
- It is unclear whether `teacher_requests.status` is kept in sync with `profiles.teacher_request_status` by a DB trigger or manually by the admin UI.
- The `send-notification` and `translate-quiz` Edge Functions were not read in detail; their full invocation contexts are unknown.
- No database trigger definitions are included in the migration files — a `profiles` row insert trigger is referenced in code comments ("Profile created by DB trigger") but not confirmed in the migrations directory.
