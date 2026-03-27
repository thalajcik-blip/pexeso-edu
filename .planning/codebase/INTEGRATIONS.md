# External Integrations
_Last updated: 2026-03-27_

## Summary
The app integrates with Supabase as its primary backend (database, auth, storage, realtime), three competing AI providers (OpenAI, Anthropic Claude, Google Gemini) selectable at runtime for quiz generation and translation, Resend for transactional email, and Vercel Analytics for page-level tracking. All AI and email calls happen inside Supabase Edge Functions (Deno); the frontend only talks directly to Supabase.

---

## Authentication

**Provider:** Supabase Auth (built-in to the Supabase project)

**Methods supported:**
- Email + password (`supabase.auth.signInWithPassword`)
- Email magic link / OTP (`supabase.auth.signInWithOtp`)
- Google OAuth (`supabase.auth.signInWithOAuth`, provider: `'google'`, redirect to `window.location.origin`)
- Email sign-up (`supabase.auth.signUp`)

**Implementation:**
- Client: `@supabase/supabase-js` 2.98.0, initialized in `src/services/supabase.ts`
- Auth state managed in `src/store/authStore.ts` via Zustand
- Admin panel uses a separate auth flow in `src/admin/useAuth.ts` (password recovery flow detected via URL hash)
- Account deletion handled by the `delete-account` edge function (`supabase/functions/delete-account/index.ts`)

**Auth env vars (frontend):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Database

**Provider:** Supabase (managed PostgreSQL)

**Client:** `@supabase/supabase-js` 2.98.0

**Key tables (from `supabase/schema.sql` and migrations):**
- `profiles` — user profiles, XP, level, roles, locale, teacher_request_status
- `custom_decks` — teacher-created card decks (language, deck_type: image/audio, results_config)
- `custom_cards` — individual cards (image_url, audio_url, label, quiz data, translations)
- `teacher_requests` — pending teacher approval records
- `card_sets`, `cards`, `game_sessions`, `game_players`, `game_moves` — original game schema (may be legacy; `schema.sql`)
- `ai_settings` — runtime AI provider config table read by edge functions

**RLS:** Enabled on all tables.

**Extensions:** `pgcrypto`

**Connection (frontend):**
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — public anon key

**Connection (edge functions):**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — used by admin operations (delete-user, send-notification, translate-quiz)
- `SUPABASE_ANON_KEY` — used for caller verification in delete-account

---

## File Storage

**Provider:** Supabase Storage

**Buckets:**
- `card-images` — public bucket; stores card images (JPEG) and audio files (WAV, at path `audio/{deckId}/{timestamp}.wav`)
  - Policy: authenticated users can upload/update/delete; public read
  - Used in `src/admin/BulkUploadModal.tsx`, `src/admin/DeckEditor.tsx`, `src/admin/CardModal.tsx`

**Note:** Audio files are stored in the same `card-images` bucket under the `audio/` prefix despite the bucket name.

---

## Realtime

**Provider:** Supabase Realtime

**Usage:**
- Multiplayer room presence and broadcast: `supabase.channel('room:{code}')` with `.on('broadcast', ...)` and `.presenceState()` in `src/services/multiplayerService.ts`
- Profile change listening: `supabase.channel('profile:{userId}')` in `src/App.tsx`

---

## AI / LLM Providers

All AI calls occur inside Supabase Edge Functions. The active provider is determined at runtime by reading the `ai_settings` table (supports primary + optional fallback provider).

**Edge functions using AI:**
- `supabase/functions/generate-quiz/index.ts` — generates quiz question options and fun facts for card images
- `supabase/functions/translate-quiz/index.ts` — translates quiz card content between Czech, Slovak, and English

**Supported providers (configurable):**

| Provider | API Endpoint | Env Var | Model |
|---|---|---|---|
| OpenAI | `https://api.openai.com/v1/chat/completions` | `OPENAI_API_KEY` | Not hardcoded (from API) |
| Anthropic (Claude) | `https://api.anthropic.com/v1/messages` | `ANTHROPIC_API_KEY` | Uses `anthropic-version: 2023-06-01` |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` | `GEMINI_API_KEY` | `gemini-2.5-flash` |

**Fallback logic:** If the primary provider fails, the function retries with a configured fallback provider. Config is stored in the `ai_settings` Supabase table and read via service role.

---

## Email / Notifications

**Provider:** Resend (`https://api.resend.com/emails`)

**Usage:** `supabase/functions/send-notification/index.ts`

**Triggered for:**
- Teacher approval — sends confirmation email to the teacher user
- New teacher request INSERT — sends notification email to admin (`thalajcik@gmail.com`)
- Teacher rejection — sends rejection email to the teacher user

**Env vars (edge function):**
- `RESEND_API_KEY`

**Sender address:** `hello@pexedu.com`

---

## Analytics

**Provider:** Vercel Analytics (`@vercel/analytics` 1.6.1)

**Usage:** `inject()` called once in `src/main.tsx`

**Scope:** Page-level analytics only; no custom event tracking detected in source.

---

## QR Code Generation

**Library:** `react-qr-code` 2.0.18 — client-side, no external API call; renders SVG QR codes for game room share links in `src/services/shareService.ts` and related components.

---

## Avatar Generation

**Library:** `@dicebear/core` 9.4.0 + `@dicebear/collection` 9.4.0

**Usage:** `src/utils/avatar.ts` — generates deterministic SVG avatars from a numeric `avatar_id`. Runs fully client-side; no network call.

---

## Gaps / Unknowns
- The `ai_settings` table schema is not present in committed migrations; its structure (columns for primary/fallback provider, keys) can only be confirmed by inspecting the live Supabase project.
- No error tracking service (Sentry, etc.) was detected. Runtime errors in edge functions surface only through Supabase function logs.
- No CI/CD pipeline configuration detected in the repository (no `.github/workflows`, no `vercel.json` build commands beyond rewrites). Deployment likely triggered automatically by Vercel Git integration.
- The `delete-user` edge function (`supabase/functions/delete-user/`) was found but not analyzed; its exact integration surface is unknown.
- Google OAuth app credentials (client ID/secret) are configured in the Supabase Auth dashboard, not in the repo.
