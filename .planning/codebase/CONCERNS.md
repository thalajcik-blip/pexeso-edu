# CONCERNS
_Last updated: 2026-03-27_

## Summary

Pexeso-edu is a relatively clean, small-team codebase in active development. The most significant concerns are security-related: a hardcoded personal email address and CORS wildcard in edge functions, plus no RLS enforcement on the `rooms` table. The game state is monolithic (1051-line Zustand store) with no tests whatsoever, which creates fragility risk as multiplayer logic grows. Several data duplication issues (three copies of the LEVEL_XP constant, duplicate default-tier configs) will cause silent divergence bugs if any one copy is updated. The dual role system (legacy `user_roles` table alongside new `profiles.roles` column) adds complexity, and `useAuth.ts` for the admin panel is a separate auth implementation from `authStore.ts` in the main app.

---

## Critical

### Hardcoded admin email address in production edge function
- **File:** `supabase/functions/send-notification/index.ts:8`
- **Issue:** `const ADMIN_EMAIL = 'thalajcik@gmail.com'` is hardcoded in source. Personal email exposed in version control. If the operator changes, the code must be redeployed.
- **Fix approach:** Move to a Supabase secret env var (`ADMIN_EMAIL`).

### CORS wildcard on all edge functions including delete-account
- **Files:** `supabase/functions/delete-account/index.ts:4`, `supabase/functions/delete-user/index.ts:4`, `supabase/functions/generate-quiz/index.ts:251`, `supabase/functions/translate-quiz/index.ts:201`
- **Issue:** `'Access-Control-Allow-Origin': '*'` allows any origin to call these endpoints. The delete-account endpoint destroys user data; the delete-user endpoint (superadmin only) can be called from any domain. While the functions do token-based auth, the wildcard CORS is unnecessarily permissive and complicates future hardening.
- **Fix approach:** Restrict to the production domain (e.g. `https://pexedu.com`) or use an allowlist.

### Rooms table has a fully open RLS policy
- **File:** `src/services/multiplayerService.ts:12-13` (comment documents this policy)
- **Issue:** The comment explicitly documents: `create policy "open" on rooms for all using (true) with check (true)`. Any authenticated user can read, insert, update or delete any room row.
- **Fix approach:** Add host ownership check — only the room creator (`host_id`) should be able to update or delete a room.

### Admin signUp grants teacher role to any self-registered user
- **File:** `src/admin/useAuth.ts:59-61`
- **Issue:** `signUp` in the admin panel automatically inserts a `teacher` role into `user_roles` for any newly registered user without approval. This bypasses the teacher-request workflow that the rest of the app enforces.
- **Impact:** Anyone who discovers the `/admin` signup form gains teacher access immediately.
- **Fix approach:** Remove the auto-insert of `user_roles` on signup; require superadmin approval.

---

## High

### Monolithic game store (1051 lines) with no tests
- **File:** `src/store/gameStore.ts`
- **Issue:** All game logic — local solo, multiplayer sync, lightning mode, quiz voting, presence, reconnect — lives in one Zustand store. No tests exist anywhere in the project (`find . -name "*.test.*"` returns nothing). Timer-based logic with `setTimeout` callbacks that reference `get()` is especially hard to reason about.
- **Impact:** Any change to turn sequencing, quiz vote resolution, or lightning timer can introduce silent multiplayer desync bugs with no safety net.
- **Fix approach:** Extract sub-domains (lightning, quiz, multiplayer) into separate modules. Add at minimum unit tests for `computeCorrectAnswer`, `buildLightningQuestions`, and XP calculation.

### Dual role system — `user_roles` table vs `profiles.roles` column
- **Files:** `src/admin/useAuth.ts:13-19`, `src/store/authStore.ts:183`, `supabase/migrations/20260322_user_roles_phase1.sql`
- **Issue:** The system maintains two sources of truth for admin roles: the legacy `user_roles` table (read by `useAuth.ts` in the admin panel and by `delete-user` edge function) and the new `profiles.roles` array (read by the main app via `authStore.ts`). Teacher approval in `TeacherRequestsManager.tsx:44` writes to both, but they can drift.
- **Impact:** A role change in one place may not be reflected in the other, causing access inconsistencies between the admin panel and the main app.
- **Fix approach:** Migrate fully to `profiles.roles`, remove the `user_roles` table, and update `useAuth.ts` and `delete-user` to use `profiles`.

### `updateProfile` silently swallows database errors
- **File:** `src/store/authStore.ts:248-252`
- **Issue:** `updateProfile: async (data) => { ... await supabase.from('profiles').update(data).eq('id', user.id) ... }` — no error is returned or surfaced to the UI. The function signature is `Promise<void>`. Callers (settings modal, avatar save) can never know if the update failed.
- **Fix approach:** Change return type to `Promise<string | null>` (matching the pattern used by `completeOnboarding` and `registerAsPlayer`), check the error, and surface it to the UI.

### `addXP` does not guard against race conditions / double-counting
- **File:** `src/store/authStore.ts:308-317`
- **Issue:** `addXP` reads `profile.xp` from local state, adds the increment, and writes back. In a scenario where two XP grants happen close together (e.g. solo finish + realtime profile update), the second write overwrites the first, losing XP.
- **Fix approach:** Use a Supabase RPC that does an atomic `UPDATE profiles SET xp = xp + $amount`.

### DeckList loads all cards for all decks on every page render for validation
- **File:** `src/admin/DeckList.tsx:101-107`
- **Issue:** After loading all decks (`select('*')`), the component immediately fetches all `custom_cards` rows for all those decks to compute invalid card counts. This is an N+1 pattern in disguise — as the deck count grows, this query will pull back a very large payload.
- **Fix approach:** Move card validation stats to a materialized view or a computed column on `custom_decks`.

### Translation flow serializes per card with a hardcoded 6.5-second delay
- **File:** `src/admin/DeckList.tsx:223`
- **Issue:** `await new Promise(r => setTimeout(r, 6500))` is hardcoded between each card translation to avoid Gemini free-tier rate limits. A deck with 30 cards takes over 3 minutes to translate, blocking the UI thread logic and providing no way to pause/resume.
- **Impact:** If the browser tab is closed mid-translation, a partially-created deck is left in the database.
- **Fix approach:** Move bulk translation to an edge function (background job), or at minimum add cleanup for partial translation failures.

---

## Medium

### Three independent copies of `LEVEL_XP` constant
- **Files:**
  - `src/store/authStore.ts:20` (canonical)
  - `src/components/auth/DashboardModal.tsx:8`
  - `src/components/profile/ProfilePage.tsx:5`
- **Issue:** Each file defines `const LEVEL_XP = [0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000]` inline. If the levelling curve changes, only the canonical copy may be updated, causing the dashboard progress bar and profile page to display wrong values.
- **Fix approach:** Export `LEVEL_XP` from `src/store/authStore.ts` only and import it everywhere.

### Default tier config duplicated across three files
- **Files:** `src/admin/DeckEditor.tsx:25-50`, `src/admin/AdminSettings.tsx:32-57`, `src/components/modals/WinModal.tsx`
- **Issue:** The six-tier default feedback messages (Genius/Excellent/Great/etc.) are copy-pasted. Same as `LEVEL_XP` — one edit site will drift from the others.
- **Fix approach:** Extract to `src/data/defaultTiers.ts` and import.

### `debugEndGame` is accessible via keyboard shortcut in production
- **Files:** `src/App.tsx:116-123`, `src/store/gameStore.ts:798-807`
- **Issue:** Pressing `:` during a game triggers `debugEndGame()` in all environments, not just development. The `GameBoard.tsx` menu button is correctly gated by `import.meta.env.DEV`, but the keyboard shortcut is not.
- **Fix approach:** Wrap the `useEffect` in `src/App.tsx:117-122` with `if (import.meta.env.DEV)`.

### `eslint-disable-next-line react-hooks/exhaustive-deps` used pervasively
- **Files:** `src/App.tsx:63,80,113`, `src/components/lightning/LightningGame.tsx` (6 occurrences), `src/components/modals/QuizModal.tsx` (3 occurrences), `src/components/modals/WinModal.tsx`, `src/components/game/ScoreBoard.tsx`
- **Issue:** 15+ suppressions of the exhaustive-deps rule indicate that many `useEffect` hooks have implicit dependencies on Zustand store values that change. This can cause stale-closure bugs where effects don't re-run when they should.
- **Fix approach:** Audit each suppression. Most can be resolved by using refs for stable callbacks or using the Zustand `useStore` selector pattern.

### `set(updates as any)` in `applyDeepLink`
- **File:** `src/store/gameStore.ts:347`
- **Issue:** `set(updates as any)` loses type safety when applying deep-link URL params to the store. An unexpected URL parameter could silently set an invalid store value.
- **Fix approach:** Build a typed partial and apply only known keys explicitly.

### XP level-up toast fires with `setTimeout(showXPProgress, 800)` — fire-and-forget
- **File:** `src/services/gameService.ts:74`
- **Issue:** If the component unmounts before 800ms (e.g. user navigates away quickly), the toast still fires but React may have torn down context. Not critical but produces console warnings.

### Two separate Supabase auth hooks in the same app
- **Files:** `src/admin/useAuth.ts` (admin panel), `src/store/authStore.ts` (main app)
- **Issue:** The admin panel at `/admin` uses a completely separate `useAuth` hook with its own session management and role fetching. This means session state is not shared, and a user authenticated in the main app is not automatically authenticated in the admin panel.
- **Impact:** Complexity, duplicated session-change handling. If Supabase client behaviour changes, both hooks must be updated.

### `DeckEditor.tsx` calls `supabase.from('custom_cards').select('*')` (lines 126, 271)
- **Files:** `src/admin/DeckEditor.tsx:126,271`
- **Issue:** `select('*')` on `custom_cards` fetches all columns including potentially large `answers` JSONB. As card counts grow, this is unnecessarily expensive.
- **Fix approach:** Select only the columns actually used by the editor view.

---

## Low

### Personal admin email hardcoded as a constant (non-critical copy)
- **File:** `supabase/functions/send-notification/index.ts:8` (already flagged in Critical; the `FROM` sender `hello@pexedu.com` at line 7 is also hardcoded but is less risky)

### `generateCode()` in DeckEditor uses `Math.random()` — not cryptographically secure
- **File:** `src/admin/DeckEditor.tsx:78`
- **Issue:** Private deck access codes are generated with `Math.random().toString(36).substring(2, 8).toUpperCase()`. This produces short (6-char), predictable codes that can be brute-forced if private decks contain sensitive educational material.
- **Fix approach:** Use `crypto.getRandomValues()` or a similar CSPRNG.

### `getPlayerId()` uses weak random ID for multiplayer player identity
- **File:** `src/services/multiplayerService.ts:64-69`
- **Issue:** Player IDs are generated with `Math.random().toString(36)`. Collision probability is low but non-zero in larger lobbies.

### Bulk upload modal filters files > 2 MB but gives no feedback for rejected files
- **File:** `src/admin/BulkUploadModal.tsx:44-45`
- **Issue:** Files larger than 2 MB are silently dropped (`const valid = files.filter(f => f.size <= 2 * 1024 * 1024)`). Users dragging multiple files won't know some were ignored.

### `Set names` in DashboardModal hardcoded to Czech only
- **File:** `src/components/auth/DashboardModal.tsx:13-18`
- **Issue:** `SET_NAMES: { flags: 'Vlajky', animals: 'Zvířátka', ... }` always shows Czech deck names regardless of the user's selected language.

### Storage policies allow any authenticated user to delete any image
- **File:** `supabase/migrations/20260311103937_add_storage_policy.sql:20-25`
- **Issue:** The delete policy is `TO authenticated USING (bucket_id = 'card-images')` — any logged-in user can delete any file in the bucket, not just their own.
- **Fix approach:** Add an owner check, e.g. `USING (bucket_id = 'card-images' AND (storage.foldername(name))[1] = auth.uid()::text)`.

### `confirm()` used for destructive action confirmation
- **File:** `src/admin/DeckList.tsx:125`
- **Issue:** `if (!confirm('Opravdu smazat tuto sadu?'))` uses the browser's native `confirm()` dialog, which is blocked in some embedded contexts and is inconsistent with the rest of the UI which uses custom modals.

---

## Gaps / Unknowns

- **No test suite** — zero test files found. It is impossible to assess regression risk from static analysis alone. All game logic (quiz resolution, lightning sync, multiplayer state transitions) is untested.
- **No RLS policy definitions visible for most tables** — only `rooms` (via code comment), `teacher_requests`, and `storage.objects` are documented. The policies for `profiles`, `custom_decks`, `custom_cards`, `game_history`, and `admin_settings` are not in the migrations in this repo. Their security posture cannot be assessed.
- **No migration to remove legacy `quiz_options`/`quiz_correct` columns** — `20260313_add_flexible_answers.sql` adds `answers` JSONB and migrates data, but the old columns remain and both code paths still exist. It is unclear if/when the legacy path will be removed.
- **Audio deck feature completeness** — `src/admin/AudioTrimModal.tsx` and audio encoding utils were recently added (last commit). It is unclear whether audio decks are fully tested end-to-end in multiplayer mode.
- **Supabase Realtime message size limits** — `game_start` broadcasts the full `cards` array and `lightning_start` broadcasts all questions. For the 8×8 large board (64 cards) with custom deck image URLs, this payload could approach or exceed Supabase Realtime's broadcast payload limits (~32 KB). Not verified.
- **No pagination on `game_history` in production** — `DashboardModal.tsx` fetches the last 100 rows client-side with a show-more button, but the Supabase query has no hard limit beyond the default PostgREST 1000-row cap. Long-term, users with many games will receive large payloads.
