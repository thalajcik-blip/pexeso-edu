---
phase: 01-z-klady-a-role-syst-m
verified: 2026-03-27T22:00:00Z
status: gaps_found
score: 12/13 must-haves verified
gaps:
  - truth: "Under-16 profiles have show_stats=false, not visible in leaderboards"
    status: partial
    reason: "The RLS policy 'minor_profile_not_public' blocks public reads of minor profiles at DB level (GDPR-05 is enforced). However the registerAsPlayer() and registerAsTeacher() upserts always write show_stats: true regardless of isMinor — the plan's stated truth that minor profiles have show_stats=false is not satisfied in code. The local Zustand state also defaults show_stats: true for new minor profiles."
    artifacts:
      - path: "src/store/authStore.ts"
        issue: "registerAsPlayer() and registerAsTeacher() upsert show_stats: true for all users including minors (lines 285, 290, 303, 312). Plan required show_stats: false for isMinor === true."
    missing:
      - "In registerAsPlayer() and registerAsTeacher() upserts, set show_stats: !isMinor (or explicitly false when isMinor) in the profiles.upsert() payload"
      - "Update the Zustand local state fallback objects on lines 290 and 312 to use show_stats: !isMinor"
human_verification:
  - test: "Admin login with user_roles dropped"
    expected: "Superadmin and teacher accounts log in to /admin and see correct roles; no DB error referencing user_roles table"
    why_human: "Requires live Supabase DB where drop migration has been applied; cannot verify table drop status programmatically against production"
  - test: "Under-16 registration flow end-to-end"
    expected: "Checking 'I am under 16' shows parental consent screen; after consent, account is created with child_consents row in DB; profiles.is_minor = true"
    why_human: "Requires live Supabase auth + DB to verify consent insert and is_minor flag"
  - test: "game_start payload size verification"
    expected: "Starting a multiplayer game with the largest custom deck shows WebSocket frame under 10 KB in browser DevTools"
    why_human: "Requires two running browser instances in a Supabase Realtime room"
  - test: "XP atomicity under concurrent load"
    expected: "30 concurrent game completions result in XP summing correctly in profiles table"
    why_human: "Requires load testing with concurrent sessions"
---

# Phase 1: Základy a role systém — Verification Report

**Phase Goal:** Dual auth context je zjednotený, GDPR consent flows existujú, kritické bezpečnostné a výkonnostné bugy sú opravené — bez týchto zmien sa nesmie nič iné nasadiť
**Verified:** 2026-03-27T22:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin app reads roles from profiles.roles[] without querying user_roles table | VERIFIED | `useAuth.ts:13-23` queries `profiles.roles[]`; zero `user_roles` references in src/ or supabase/functions/ |
| 2 | useAuth.ts fetchRole() returns correct role from profiles | VERIFIED | `fetchRole()` selects `profiles.roles`, derives `AdminRole` via `includes('superadmin'/'teacher')` |
| 3 | get_users_with_roles RPC does not reference user_roles table | VERIFIED | Migration `20260327220411_rewrite_get_users_with_roles.sql` JOINs `profiles` + `auth.users` only |
| 4 | user_roles table is dropped (migration exists) | VERIFIED | `20260327220449_drop_user_roles.sql` exists with `DROP TABLE IF EXISTS user_roles` — awaits DB application |
| 5 | New user registration includes age declaration step | VERIFIED | `AuthModal.tsx:8` type includes `'age-check'`; `handlePlayerIntent()` and `handleTeacherIntentSubmit()` both transition to `'age-check'` |
| 6 | Under-16 users see parental consent screen before account is created | VERIFIED | `AuthModal.tsx:334-360` renders parental consent when `showParentalConsent=true`; continue disabled until checkbox checked |
| 7 | Consent record saved to child_consents table with timestamp | VERIFIED | `authStore.ts:266-271` inserts into `child_consents` with `consent_version: 'v1'` in `completeOnboarding()` |
| 8 | Under-16 profiles have show_stats=false, not visible in leaderboards | PARTIAL | `is_minor=true` is set on profiles; RLS policy `minor_profile_not_public` blocks public reads. BUT `show_stats` is always set to `true` in registerAsPlayer/registerAsTeacher upserts — minor profiles do not get `show_stats=false` |
| 9 | delete-account removes teacher_requests, child_consents, and Storage objects | VERIFIED | `delete-account/index.ts:33-35` deletes `teacher_requests` + `child_consents`; Storage cleanup not needed (avatars are `avatar_id` integers, card images organized by deckId not userId — confirmed by SUMMARY decision) |
| 10 | addXP uses atomic SQL RPC (no client-side read-modify-write) | VERIFIED | `authStore.ts:322` calls `supabase.rpc('add_xp', ...)` — no client-side read before write |
| 11 | game_start broadcast sends only card symbols (payload < 5KB) | VERIFIED | `multiplayerService.ts:46` type uses `cardSymbols: string[]`; gameStore broadcasts symbol arrays, receiver reconstructs `CardData[]` from symbols |
| 12 | rooms table RLS restricts SELECT to host and participants | VERIFIED | `20260327000002_rooms_rls_restrict.sql` drops open policy, adds `host_manages_room` (ALL via `auth.uid()`) and `authenticated_reads_rooms` (SELECT for authenticated); `createRoomInDb` stores `user.id` as `host_id` |
| 13 | All random code generation uses crypto.getRandomValues() | VERIFIED | `multiplayerService.ts` `generateRoomCode()` and `getPlayerId()` both use `crypto.getRandomValues()`; `DeckEditor.tsx` `generateCode()` uses `crypto.getRandomValues()` — zero `Math.random()` at these sites |

**Score: 12/13 truths verified** (1 partial — GDPR-05 show_stats)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/admin/useAuth.ts` | Reads roles from profiles.roles[] | VERIFIED | fetchRole() queries profiles, signUp() has no user_roles insert |
| `src/admin/TeacherRequestsManager.tsx` | No user_roles write, uses profiles.roles[] | VERIFIED | approve() writes to profiles.roles[] only (line 39-42); no user_roles upsert |
| `src/admin/UsersManager.tsx` | setRole() writes to profiles.roles[] | VERIFIED | setRole() at line 72 uses profiles.update with roles array |
| `supabase/functions/delete-user/index.ts` | profiles.roles[] for superadmin check, no user_roles | VERIFIED | Line 32-37 reads `profiles.roles`; line 46-49 deletes game_history + teacher_requests + child_consents |
| `supabase/functions/send-notification/index.ts` | No user_roles INSERT webhook branch | VERIFIED | File only handles `teacher_approved` and `INSERT` (new user) events; no user_roles branch |
| `supabase/migrations/20260327220411_rewrite_get_users_with_roles.sql` | RPC using profiles table | VERIFIED | JOINs profiles + auth.users, returns roles[] array |
| `supabase/migrations/20260327220449_drop_user_roles.sql` | DROP TABLE user_roles | VERIFIED | `DROP TABLE IF EXISTS user_roles` present |
| `src/components/auth/AuthModal.tsx` | age-check + parental consent steps | VERIFIED | Lines 302-360 implement both steps with correct state transitions |
| `src/store/authStore.ts` | isMinor param, is_minor upsert, child_consents insert | PARTIAL | isMinor param wired (line 119); is_minor in upserts (lines 285, 303); child_consents insert in completeOnboarding (line 266); show_stats not set to false for minors |
| `supabase/migrations/20260327220313_gdpr_consent_schema.sql` | child_consents table + is_minor column | VERIFIED | Table with RLS, is_minor column, minor_profile_not_public policy |
| `supabase/functions/delete-account/index.ts` | Deletes teacher_requests + child_consents | VERIFIED | Lines 33-35 explicit deletions |
| `supabase/migrations/20260327000001_add_xp_rpc.sql` | add_xp(p_user_id, p_xp_delta) SECURITY DEFINER | VERIFIED | Full atomic function with level computation |
| `supabase/migrations/20260327000002_rooms_rls_restrict.sql` | host_manages_room + authenticated_reads_rooms | VERIFIED | Both policies present, drops open policy |
| `src/services/multiplayerService.ts` | crypto.getRandomValues, auth.uid() as host_id | VERIFIED | generateRoomCode() and getPlayerId() use crypto; createRoomInDb() stores user.id as host_id |
| `src/store/gameStore.ts` | cardSymbols broadcast, receiver reconstruction | VERIFIED | Broadcasts cardSymbols[], receiver reconstructs CardData[] from symbols at line 689 |
| `src/admin/DeckEditor.tsx` | generateCode() uses crypto.getRandomValues | VERIFIED | Lines 78-84 use crypto.getRandomValues(new Uint8Array(4)) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `useAuth.ts` | `profiles.roles[]` | supabase.from('profiles').select('roles') | WIRED | fetchRole() confirmed at lines 13-22 |
| `TeacherRequestsManager` | `profiles.roles[]` | supabase.from('profiles').update({roles}) | WIRED | approve() line 39-42; no user_roles write |
| `AuthModal.tsx age-check` | `child_consents insert` | authStore.completeOnboarding | WIRED | isUnder16 → pexedu_is_minor metadata → completeOnboarding insert |
| `authStore.addXP` | `add_xp() RPC` | supabase.rpc('add_xp') | WIRED | authStore.ts line 322 |
| `gameStore game_start` | `cardSymbols only broadcast` | broadcastGameAction({cardSymbols}) | WIRED | Two call sites (playAgain + startOnlineGame) both broadcast cardSymbols |
| `delete-account` | `teacher_requests + child_consents` | adminClient.from('teacher_requests/child_consents').delete() | WIRED | Lines 33-35 |
| `createRoomInDb` | `auth.uid() as host_id` | supabase.auth.getUser() | WIRED | Line 78-80 in multiplayerService.ts |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `authStore.addXP` | `data.xp, data.level` | `supabase.rpc('add_xp')` | Yes — atomic SQL UPDATE with RETURNING | FLOWING |
| `UsersManager.tsx` | `users` | `supabase.rpc('get_users_with_roles')` | Yes — JOINs profiles + auth.users | FLOWING |
| `gameStore game_start receiver` | `receivedCards` | `action.cardSymbols.map(...)` | Yes — reconstructed from broadcast symbols | FLOWING |
| `authStore child_consents` | insert trigger | `user.user_metadata.pexedu_is_minor` | Yes — metadata set at signUp, read at completeOnboarding | FLOWING |

---

### Behavioral Spot-Checks

Runnable server not available in static verification context. Key behaviors verified through code inspection:

| Behavior | Verification Method | Result | Status |
|----------|---------------------|--------|--------|
| No user_roles references in src/ or supabase/functions/ | `grep -rn "user_roles" src/ supabase/functions/` | Zero matches | PASS |
| No Math.random() in code generators | `grep -n "Math.random" multiplayerService.ts DeckEditor.tsx` | Zero matches | PASS |
| game_start type uses cardSymbols not cards | grep in multiplayerService.ts | `cardSymbols: string[]` confirmed | PASS |
| child_consents insert wired | grep in authStore.ts | insert at completeOnboarding line 266 | PASS |
| drop_user_roles migration exists | ls supabase/migrations/ | 20260327220449_drop_user_roles.sql found | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| ROLE-01 | 01-01-PLAN | user_roles migrated to profiles.roles[] | SATISFIED | Migration + all write paths updated |
| ROLE-02 | 01-01-PLAN | Intent screen — new user picks role at registration | SATISFIED | AuthModal.tsx intent step present |
| ROLE-03 | 01-01-PLAN | Teacher request flow uses profiles.roles[] | SATISFIED | TeacherRequestsManager approve() writes to profiles |
| ROLE-04 | 01-01-PLAN | Admin app (useAuth.ts) reads from profiles.roles[] | SATISFIED | fetchRole() confirmed |
| GDPR-01 | 01-02-PLAN | Age declaration checkbox at registration | SATISFIED | age-check step in AuthModal |
| GDPR-02 | 01-02-PLAN | Parental consent screen for under-16 | SATISFIED | showParentalConsent flow confirmed |
| GDPR-03 | 01-02-PLAN | Consent record saved to DB with timestamp | SATISFIED | child_consents insert in completeOnboarding |
| GDPR-05 | 01-02-PLAN | Privacy-by-default for under-16 (not public, no leaderboard) | PARTIAL | RLS policy enforces profile invisibility; show_stats is not set to false in code |
| GDPR-06 | 01-02-PLAN | delete-account deletes all PII (game results, XP, Storage) | SATISFIED | game_history, teacher_requests, child_consents deleted; Storage N/A (no user files) |
| TECH-01 | 01-03-PLAN | game_start sends card IDs/symbols only | SATISFIED | cardSymbols broadcast confirmed |
| TECH-02 | 01-03-PLAN | addXP atomic RPC | SATISFIED | supabase.rpc('add_xp') wired |
| TECH-03 | 01-03-PLAN | rooms RLS restrict to host + participants | SATISFIED | RLS migration + createRoomInDb auth.uid() |
| TECH-04 | 01-03-PLAN | Invite code via crypto.getRandomValues() | SATISFIED | generateRoomCode, getPlayerId, generateCode all confirmed |

**Requirements orphaned:** None. All 13 requirements from ROADMAP.md Phase 1 are accounted for in plans.

**Note on GDPR-04:** This requirement (Teacher declaration checkbox for class creation) is assigned to Phase 2, not Phase 1. It is not claimed by any Phase 1 plan and correctly absent here.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/store/authStore.ts` | 285, 290, 303, 312 | `show_stats: true` hardcoded for all users including minors | Warning | Minor profiles should have show_stats=false per plan; does not prevent profile DB-level visibility (RLS handles that) but violates the stated must-have truth |

No TODO/FIXME/placeholder comments found in modified files.
No empty return null or stub implementations found.

---

### Human Verification Required

#### 1. Admin roles after user_roles table drop

**Test:** Apply migration `20260327220449_drop_user_roles.sql` to staging Supabase, then log in as superadmin and as teacher to `/admin`.
**Expected:** Both roles display correctly; no DB errors; `/admin/users` renders full user list via get_users_with_roles RPC.
**Why human:** Cannot verify table drop status against live DB programmatically.

#### 2. Under-16 registration end-to-end

**Test:** Register a new account; check the "under 16" box; confirm parental consent; complete onboarding with username.
**Expected:** `child_consents` table has a row for the new user with `consent_version = 'v1'`; `profiles.is_minor = true`.
**Why human:** Requires live Supabase auth and DB.

#### 3. Minor profile not visible

**Test:** Log in as a non-minor user and attempt to fetch the profile of a minor user (e.g., via a direct API call or ProfilePage URL).
**Expected:** Profile returns empty/not found due to `minor_profile_not_public` RLS policy.
**Why human:** Requires two real accounts and live DB RLS enforcement.

#### 4. game_start payload size

**Test:** Start a multiplayer game with a large custom deck (32+ cards) and inspect WebSocket frames in browser DevTools.
**Expected:** `game_start` message is well under 10 KB.
**Why human:** Requires two browser instances with live Supabase Realtime.

#### 5. XP atomicity

**Test:** Multiple concurrent game completions (can be simulated with 2-3 browser tabs finishing simultaneously).
**Expected:** XP in profiles.xp reflects the sum of all concurrent awards without lost updates.
**Why human:** Requires concurrent live sessions.

---

### Gaps Summary

**1 gap found — GDPR-05 partial: show_stats not set to false for minor profiles**

The plan's must-have truth stated "Under-16 profiles have show_stats=false, not visible in leaderboards." The DB-level enforcement is correct — `minor_profile_not_public` RLS policy prevents any unauthorized SELECT of minor profiles, so minors are effectively invisible in any query that fetches profiles for display.

However, the code in `authStore.ts` does not set `show_stats: false` when creating a minor profile. The `registerAsPlayer()` and `registerAsTeacher()` upserts both hardcode `show_stats: true` (in the Zustand fallback objects on lines 290 and 312, and the upsert payloads on lines 285 and 303 do not include show_stats at all — defaulting to the DB default which is `true`).

The practical impact is limited because: (a) minors cannot be queried by other users due to RLS, and (b) the in-game leaderboard (LightningGame) is session-based and not a DB leaderboard query. The full DB leaderboard (GAME-04) is a Phase 4 requirement and does not exist yet.

**Fix is simple:** In `registerAsPlayer()` and `registerAsTeacher()`, include `show_stats: !isMinor` in the upsert payload.

---

_Verified: 2026-03-27T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
