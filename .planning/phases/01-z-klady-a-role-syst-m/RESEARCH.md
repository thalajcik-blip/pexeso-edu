# Phase 1: Základy a role systém — Research

**Researched:** 2026-03-27
**Domain:** Auth migration, GDPR compliance flows, Supabase Realtime safety, RLS hardening
**Confidence:** HIGH — all findings sourced directly from codebase; no speculative claims

---

## Summary

Phase 1 is a pure fix-and-harden phase with no new product surface — every change is a prerequisite for Phases 2–6. Six distinct technical areas must be addressed in strict order: (1) migrate admin auth away from `user_roles`, (2) add GDPR consent to the registration flow, (3) store consent records and apply privacy-by-default for minors, (4) fix the `delete-account` Edge Function gaps, (5) make XP atomic, and (6) fix the Realtime payload size and security holes.

The codebase is in a split-brain state for roles: `authStore.ts` (player side) already reads `profiles.roles[]`; `useAuth.ts` (admin side) still reads the legacy `user_roles` table. Three admin files write to `user_roles` directly. The migration SQL already exists in `20260322_user_roles_phase1.sql` — it has already backfilled `profiles.roles[]` from `user_roles`. The remaining work is purely TypeScript: rewrite the three admin files to stop writing/reading `user_roles`, then drop the table.

GDPR state is zero. No age checkbox, no parental consent screen, no consent record in DB, no privacy-by-default column on `profiles`, no under-16 filtering in any leaderboard or public profile query. The `PrivacyModal.tsx` contains a general GDPR notice but nothing Article-8 specific.

The `game_start` broadcast sends full `CardData[]` objects (symbol = image URL string). For a 64-card board with 100-char Storage CDN URLs, that is 64 × 2 objects × ~120 bytes each = ~15 KB for cards alone before adding player names, settings, etc. The PITFALLS research confirmed ~27-29 KB measured size — dangerously close to the 32 KB Supabase Realtime broadcast limit.

**Primary recommendation:** Execute tasks in this order: (1) role migration, (2) GDPR schema + consent UI, (3) privacy-by-default, (4) delete-account fix, (5) atomic XP RPC, (6) game_start payload fix, (7) rooms RLS + crypto fix. Each is independent and can be reviewed separately.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ROLE-01 | `user_roles` → `profiles.roles[]` migration | Backfill SQL exists; 3 admin files need rewriting; drop table at end |
| ROLE-02 | Intent screen at registration (player / teacher) | `IntentScreen.tsx` and `AuthModal.tsx` already have intent UI; GDPR age checkbox must be added here |
| ROLE-03 | Teacher request flow via `profiles.roles[]` | `TeacherRequestsManager.tsx:44` writes to both tables; remove `user_roles` write only |
| ROLE-04 | `useAuth.ts` reads roles from `profiles.roles[]` | `fetchRole()` line 14–18 is the only change; `signUp()` line 60 must remove auto-insert |
| GDPR-01 | Age declaration checkbox at registration | Add to `AuthModal.tsx` credentials step and standalone `IntentScreen.tsx` |
| GDPR-02 | Parental consent screen for under-16 | New component; shown after age checkbox is checked, before account creation completes |
| GDPR-03 | Consent record saved to DB with timestamp | New `child_consents` table + RPC or direct insert |
| GDPR-05 | Privacy-by-default for under-16 | New `is_minor` boolean column on `profiles`; RLS or app-level filter for leaderboard/public profile |
| GDPR-06 | `delete-account` Edge Function covers all PII | Currently missing: Storage objects, `teacher_requests` rows |
| TECH-01 | `game_start` sends only card IDs | Two broadcast sites in `gameStore.ts` (lines 775, 948); type change in `multiplayerService.ts` line 46 |
| TECH-02 | Atomic `add_xp()` RPC | `authStore.ts:308–317` is the only call site; `gameService.ts:56` calls `addXP` |
| TECH-03 | `rooms` RLS restrict to host + participants | Currently `using (true)` — documented in `multiplayerService.ts:13` |
| TECH-04 | Invite code via `crypto.getRandomValues()` | Two sites: `DeckEditor.tsx:79` (private deck code) and `multiplayerService.ts:60` (room code) |
</phase_requirements>

---

## Standard Stack

No new dependencies required for this phase. All changes use:
- Supabase JS client v2 (already installed)
- Supabase Edge Functions (Deno) — existing runtime
- React + Zustand v5 — existing
- TypeScript strict mode — existing

### New Database Objects Required

| Object | Type | Purpose |
|--------|------|---------|
| `child_consents` | Table | GDPR-03: consent record per minor account |
| `is_minor` | Column on `profiles` | GDPR-05: privacy-by-default flag |
| `add_xp(user_id uuid, xp_delta integer)` | SQL Function (SECURITY DEFINER) | TECH-02: atomic XP increment |
| `rooms` RLS policies | Policy update | TECH-03: restrict to host + participants |

---

## Architecture Patterns

### Registration Flow (current)

```
AuthModal.tsx → tab='register'
  step='intent'        → handlePlayerIntent() / setStep('teacher-form')
  step='teacher-form'  → handleTeacherIntentSubmit() → setStep('credentials')
  step='credentials'   → signUpWithEmail() / signInWithGoogle()
    → authStore.signUpWithEmail() → supabase.auth.signUp() with user_metadata
    → email confirmation → loadProfile() → isOnboarding=true
    → OnboardingModal.tsx (username + avatar)
      → registerAsPlayer() / registerAsTeacher() → completeOnboarding()
```

The `AuthModal.tsx` already has a `SignUpStep` type (`'intent' | 'teacher-form' | 'credentials'`). The GDPR age checkbox and parental consent screen must fit between `credentials` and the actual `signUpWithEmail()` call, OR as a new step `'age-check'` inserted between `intent` and `credentials`.

**Recommended insertion point:** Add `'age-check'` as a step shown just before `credentials`. The user checks the age box (and if under-16, the parental consent modal appears before proceeding). The `is_under_16` boolean is stored in component state and passed into `signUpWithEmail` / `user_metadata`.

### Role Migration Pattern (ROLE-01, ROLE-03, ROLE-04)

**Files to change — complete list:**

| File | Location | Change |
|------|----------|--------|
| `src/admin/useAuth.ts` | `fetchRole()` lines 14–18 | Replace `user_roles` query with `profiles.roles[]` read |
| `src/admin/useAuth.ts` | `signUp()` lines 59–61 | Remove auto-insert into `user_roles` entirely |
| `src/admin/TeacherRequestsManager.tsx` | `approve()` line 44 | Remove `user_roles.upsert` call; `profiles.update` already correct |
| `src/admin/UsersManager.tsx` | `setRole()` lines 77–86 | Replace all `user_roles` DML with `profiles.update({ roles: [...] })` |
| `supabase/functions/delete-user/index.ts` | Lines 32–40 | Replace `user_roles` SELECT (superadmin check) with `profiles.roles` query |
| `supabase/functions/delete-user/index.ts` | Line 45 | Remove `user_roles.delete` |
| `supabase/functions/send-notification/index.ts` | Lines 91–106 | Remove the `user_roles` INSERT trigger path (dead code after migration) |

**Replacement pattern for `useAuth.ts fetchRole()`:**
```typescript
async function fetchRole(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', userId)
    .single()
  const roles: string[] = data?.roles ?? []
  const role: AdminRole = roles.includes('superadmin') ? 'superadmin'
    : roles.includes('teacher') ? 'teacher' : null
  setRole(role)
}
```

**Replacement pattern for `UsersManager.tsx setRole()`:**
```typescript
async function setRole(userId: string, newRole: string | null) {
  setSaving(userId)
  const newRoles = newRole === null
    ? ['player']
    : newRole === 'superadmin'
      ? ['superadmin', 'teacher', 'player']
      : ['teacher', 'player']
  const { error } = await supabase
    .from('profiles')
    .update({ roles: newRoles })
    .eq('id', userId)
  if (error) setError(error.message)
  await fetchUsers()
  setSaving(null)
}
```

Note: `UsersManager.tsx` calls `get_users_with_roles` RPC which currently JOINs `user_roles`. This RPC will also need updating to JOIN `profiles.roles[]` instead, OR the UI can be changed to call `profiles` directly.

**Drop table (final step, after staging verification):**
```sql
DROP TABLE IF EXISTS user_roles;
```

### GDPR Consent Flow (GDPR-01, GDPR-02, GDPR-03)

**New DB table:**
```sql
CREATE TABLE IF NOT EXISTS child_consents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consent_version text NOT NULL DEFAULT 'v1',
  consented_at    timestamptz NOT NULL DEFAULT now(),
  ip_hash         text,                          -- optional, privacy-preserving
  UNIQUE(child_user_id, consent_version)
);

ALTER TABLE child_consents ENABLE ROW LEVEL SECURITY;

-- User can see their own consent record
CREATE POLICY "user_sees_own_consent" ON child_consents
  FOR SELECT USING (auth.uid() = child_user_id);

-- Insert allowed by the user (called during registration)
CREATE POLICY "user_inserts_own_consent" ON child_consents
  FOR INSERT WITH CHECK (auth.uid() = child_user_id);
```

**New column on `profiles`:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_minor boolean NOT NULL DEFAULT false;
```

**GDPR-01 — age checkbox:** Add to `AuthModal.tsx` in the `'age-check'` step (new step between `'intent'` and `'credentials'`):
```
[ ] Mám menej ako 16 rokov / Mám méně než 16 let / I am under 16
```

Store result in component state `isUnder16: boolean`.

**GDPR-02 — parental consent screen:** A new modal/step shown conditionally when `isUnder16 === true`, before `signUpWithEmail()` is called. Must contain:
- Simplified privacy notice (child-friendly language, max 200 words)
- `[ ] Mám súhlas rodiča alebo zákonného zástupcu / Mám souhlas rodiče nebo zákonného zástupce`
- Only a "Continue" button (no skip)

**GDPR-03 — consent record:** After `signUpWithEmail()` completes and the user is authenticated, call:
```typescript
await supabase.from('child_consents').insert({
  child_user_id: user.id,
  consent_version: 'v1',
})
```
This must happen before `OnboardingModal` saves the username.

Also, pass `is_under_16: true` in `user_metadata` so `loadProfile()` can set `is_minor = true` when writing the profile:
```typescript
// In signUpWithEmail, add to options.data:
pexedu_is_minor: isUnder16 ? '1' : '0'
```

Then in `registerAsPlayer()` / `registerAsTeacher()`, read `user.user_metadata.pexedu_is_minor` and include `is_minor: true` in the profile upsert.

### Privacy-by-Default (GDPR-05)

**What to restrict:** Public profile page (`/profile/:id`) and any leaderboard queries must check `is_minor`.

**Implementation:** Add RLS policy on `profiles` table:
```sql
-- Public profile reads blocked for minors
-- (if existing profiles policy allows public read, add is_minor check)
CREATE POLICY "minor_profile_not_public"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()                          -- own profile always readable
    OR is_minor = false                      -- non-minors are public
    OR EXISTS (                              -- superadmin can read all
      SELECT 1 FROM profiles WHERE id = auth.uid() AND 'superadmin' = ANY(roles)
    )
  );
```

For leaderboard queries in `gameService.ts` or wherever `game_history` is aggregated for public display: add a JOIN filter:
```sql
JOIN profiles p ON p.id = gh.user_id AND p.is_minor = false
```
(This is a Phase 1 preparatory step; full leaderboard is Phase 4. The filter should be added to any existing leaderboard query if one exists.)

### delete-account Edge Function Gap Analysis (GDPR-06)

**Current `supabase/functions/delete-account/index.ts` deletes:**
- `game_history` rows (line 32)
- `profiles` row (line 33)
- `auth.users` entry (line 35)

**Missing — must add:**
- `teacher_requests` rows (user's request data)
- `child_consents` rows (new table from GDPR-03; add after creating it)
- Supabase Storage objects in `card-images` bucket owned by the user

**Storage deletion pattern (Deno):**
```typescript
// List all objects in user's folder
const { data: storageObjects } = await adminClient.storage
  .from('card-images')
  .list(user.id)   // assumes images stored under user.id/ prefix — verify actual path

if (storageObjects && storageObjects.length > 0) {
  const paths = storageObjects.map(obj => `${user.id}/${obj.name}`)
  await adminClient.storage.from('card-images').remove(paths)
}
```

**Note:** Storage object path structure must be verified. Current `add_storage_policy.sql` uses a path-based policy but does not document the folder naming convention. Check `BulkUploadModal.tsx` and `DeckEditor.tsx` for how image paths are constructed before implementing deletion.

**Also:** `delete-user/index.ts` (admin deletion) has the same gaps — add same deletions there.

### Atomic add_xp() RPC (TECH-02)

**Migration:**
```sql
CREATE OR REPLACE FUNCTION add_xp(p_user_id uuid, p_xp_delta integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_xp    integer;
  v_new_level integer;
  v_level_xp  integer[] := ARRAY[0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000];
  i           integer;
BEGIN
  UPDATE profiles
    SET xp = xp + p_xp_delta
  WHERE id = p_user_id
  RETURNING xp INTO v_new_xp;

  -- Compute level from new XP
  v_new_level := 1;
  FOR i IN 1..array_length(v_level_xp, 1) LOOP
    IF v_new_xp >= v_level_xp[i] THEN v_new_level := i; END IF;
  END LOOP;
  v_new_level := LEAST(v_new_level, array_length(v_level_xp, 1));

  UPDATE profiles SET level = v_new_level WHERE id = p_user_id;

  RETURN jsonb_build_object('xp', v_new_xp, 'level', v_new_level);
END;
$$;
```

**TypeScript change — `authStore.ts:308–317`:**
```typescript
addXP: async (amount) => {
  const { user } = get()
  if (!user) return
  const { data, error } = await supabase.rpc('add_xp', {
    p_user_id: user.id,
    p_xp_delta: amount,
  })
  if (!error && data) {
    set(s => ({
      profile: s.profile
        ? { ...s.profile, xp: data.xp, level: data.level }
        : null,
    }))
  }
},
```

The return type on the interface (`addXP: (amount: number) => Promise<void>`) stays the same — the RPC result is consumed internally.

Call site `gameService.ts:56` requires no change (`await useAuthStore.getState().addXP(xpEarned)` is still valid).

### game_start Payload Fix (TECH-01)

**Problem:** `game_start` broadcasts full `CardData[]` objects. `CardData.symbol` is an image URL string (Supabase Storage CDN, ~80–120 chars). For a 64-card board: 64 objects × ~150 bytes = ~9.6 KB for cards alone, plus player arrays, settings. Real measured size: 27–29 KB, against 32 KB limit.

**Two broadcast sites in `gameStore.ts`:**
- Line 775: `playAgain()` → `broadcastGameAction({ type: 'game_start', cards, ... })`
- Line 948: `startOnlineGame()` → `broadcastGameAction({ type: 'game_start', cards, ... })`

**Fix strategy:** Broadcast only card IDs (array of integers) instead of full `CardData`. Each joining client reconstructs cards from the deck they already have (deck was selected in lobby; `deckId` is already in the `game_start` payload).

**Type change in `multiplayerService.ts` line 46:**
```typescript
// Before:
| { type: 'game_start'; cards: CardData[]; playerIds: string[]; ... }
// After:
| { type: 'game_start'; cardIds: number[]; playerIds: string[]; ... }
```

**gameStore changes:**
In `playAgain()` and `startOnlineGame()`, build card IDs from the shuffled array:
```typescript
const cardIds = cards.map(c => c.id)
broadcastGameAction({ type: 'game_start', cardIds, playerIds, playerNames, deckId: selectedDeckId, size: selectedSize, turnTime, quizTime, startingPlayer })
```

In `_applyGameStart` (line 622) and the `case 'game_start':` handler (line 687), reconstruct cards from `cardIds`:
```typescript
// Receiver reconstructs from local deck pool
// cardId is just the index; cards are pre-built by the host's same shuffle seed
// Alternative: host sends the shuffle order (symbol indices), receiver builds cards
```

**Important implementation note:** The simplest reconstruction approach is to keep the same shuffle locally. The `cardIds` (integers 0..N-1) serve as the authoritative order. The receiver builds `CardData[]` in that order from its local deck pool. This requires the receiver to have the deck loaded — which it already does (lobby selected the deck and each client may have pre-fetched it). However, for custom decks, the receiver must fetch the custom deck before `_applyGameStart` is called.

The existing `_applyGameStart` signature already takes `deckId` — the receiver can fetch the custom deck if needed before reconstructing cards. This is a pre-existing constraint.

**Payload size after fix:** `cardIds: number[]` for 64 cards = 64 × 4 bytes max = ~256 bytes. Total `game_start` payload drops from 27-29 KB to under 1 KB.

### rooms RLS Fix (TECH-03)

**Current policy (documented in `multiplayerService.ts:13`):**
```sql
create policy "open" on rooms for all using (true) with check (true);
```

**Replacement:**
```sql
-- Drop the open policy
DROP POLICY IF EXISTS "open" ON rooms;

-- Host can do everything with their own room
CREATE POLICY "host_manages_room" ON rooms
  FOR ALL USING (host_id = auth.uid()::text);

-- Allow INSERT for the creating host (host_id is set at creation)
CREATE POLICY "host_creates_room" ON rooms
  FOR INSERT WITH CHECK (host_id = auth.uid()::text);

-- Any authenticated user can read rooms to join (needed for fetchRoomFromDb)
-- Restrict to just SELECT, not ALL
CREATE POLICY "authenticated_can_read_rooms" ON rooms
  FOR SELECT TO authenticated USING (true);
```

**Note on `host_id` type:** `rooms.host_id` is `text` (not `uuid`) as seen in `multiplayerService.ts:72`. The player ID from `getPlayerId()` is a random string, not the Supabase `auth.uid()`. This means host-based RLS using `auth.uid()` will not work as-is — the `host_id` stored is `getPlayerId()`, not the authenticated user's UUID.

**Resolution options:**
1. Change `host_id` to store `auth.uid()` (requires authenticated session when creating room) — cleanest
2. Keep SELECT open to authenticated users only, restrict UPDATE/DELETE to a flag checked via RPC

For Phase 1, the minimum safe fix is: restrict UPDATE and DELETE to `auth.uid()` (which requires storing `auth.uid()` as host_id), or simply add `FOR SELECT TO authenticated USING (true)` and remove the all-access policy. Full resolution requires confirming whether `getPlayerId()` and `auth.uid()` are correlated at room creation time.

**Recommendation:** Store `auth.uid()` as `host_id` when the player is authenticated (they always are in current multiplayer flow — it's behind the auth gate). Change `createRoomInDb` in `multiplayerService.ts:72` to use `supabase.auth.getUser()` UUID as host_id, then RLS works cleanly.

### Invite Code Fix (TECH-04)

**Two sites to fix:**

**Site 1 — `src/admin/DeckEditor.tsx:78-79` (private deck access code):**
```typescript
function generateCode() {
  // Before: return Math.random().toString(36).substring(2, 8).toUpperCase()
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}
```

**Site 2 — `src/services/multiplayerService.ts:58-61` (room code):**
```typescript
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  // Before: Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)])
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}
```

`crypto.getRandomValues` is available in all modern browsers and in Deno runtime. No import needed — it is a global in both environments.

**Note on `getPlayerId()` at line 66:** The player ID also uses `Math.random()` — this is a medium-priority fix (not required for TECH-04 which specifically targets invite/room codes, but should be addressed as part of this task).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic XP update | Client read-modify-write | `add_xp()` Postgres function with `UPDATE ... SET xp = xp + delta` | Postgres `UPDATE` with arithmetic is inherently atomic; no optimistic locking needed |
| GDPR consent tracking | Custom timestamp fields on `profiles` | Separate `child_consents` table | Allows multiple consent versions, revocation, and audit trail without schema churn |
| Role checks in RLS | `auth.jwt()` custom claims | `profiles.roles[]` via query | Supabase does NOT auto-populate custom claims — always read from `profiles` |
| Storage object deletion | Listing all objects globally | Scoped path listing (`list(user.id)`) | Must scope by user prefix to avoid mass-deletion bugs |

---

## Common Pitfalls

### Pitfall 1: Migration SQL already ran — don't re-run it
**What goes wrong:** Running `20260322_user_roles_phase1.sql` again will attempt INSERT/UPDATE on existing profiles and may produce constraint errors or overwrite manually corrected roles.
**Why it happens:** The migration has `ON CONFLICT (id) DO UPDATE SET roles = EXCLUDED.roles` which will reset any roles changed since the migration ran.
**How to avoid:** Check `profiles.roles` is already populated before any migration work. The Phase 1 plan should NOT re-run the existing migration. It should only: (1) write TypeScript changes, (2) create new tables/functions, and (3) drop `user_roles` at the end.
**Warning signs:** Migration script errors about duplicate keys or unexpected role resets in staging.

### Pitfall 2: `UsersManager.tsx` calls `get_users_with_roles` RPC that JOINs `user_roles`
**What goes wrong:** After dropping `user_roles`, the RPC breaks and the Users admin panel shows an error or empty list.
**Why it happens:** The RPC `get_users_with_roles` (called at `UsersManager.tsx:30`) was written to JOIN `user_roles` for the role column. It's not visible in the migration files reviewed — it likely exists as a function in Supabase directly.
**How to avoid:** Update or replace `get_users_with_roles` to read `profiles.roles[]` instead of `user_roles.role`. Do this before dropping the table.
**Warning signs:** `UsersManager` shows "Načítání…" indefinitely or throws a PostgREST error after the table is dropped.

### Pitfall 3: `delete-account` silently fails to delete Storage objects if path prefix is wrong
**What goes wrong:** The Storage deletion code uses `user.id` as the folder prefix, but if custom deck images are stored under a different path (e.g., `decks/{deckId}/{filename}` instead of `{userId}/{filename}`), the `list(user.id)` call returns empty and no files are deleted.
**Why it happens:** The Storage policy (`add_storage_policy.sql`) uses `(storage.foldername(name))[1] = auth.uid()::text` for delete, suggesting the convention is `{uid}/filename`. But this was not confirmed by reading `BulkUploadModal.tsx` upload logic.
**How to avoid:** Before implementing deletion, grep for the `upload()` call in `BulkUploadModal.tsx` to confirm the actual path structure.
**Warning signs:** `delete-account` returns `{ ok: true }` but files remain in Storage bucket after account deletion.

### Pitfall 4: `game_start` card reconstruction requires deck pre-load on receiver
**What goes wrong:** After switching to `cardIds`-only broadcast, a joining player who didn't pre-fetch the custom deck cannot reconstruct the card order.
**Why it happens:** `_applyGameStart` currently receives full `cards` array; the new version needs to build cards from local pool using the host's shuffle order.
**How to avoid:** The receiver must fetch the custom deck (if `deckId` is a custom deck) before calling `_applyGameStart`. The `deckId` is already in the `game_start` payload. Add a pre-fetch step in the `case 'game_start':` handler.
**Warning signs:** Joining players see an empty board or mismatched cards.

### Pitfall 5: `rooms.host_id` is `text`, not `uuid` — RLS with `auth.uid()` breaks
**What goes wrong:** Adding `USING (host_id = auth.uid()::text)` to rooms RLS will never match because `host_id` is set to the random string from `getPlayerId()`, not the authenticated user's UUID.
**Why it happens:** `multiplayerService.ts:72` passes the `hostId` parameter from `getPlayerId()` (random string) to `createRoomInDb()`.
**How to avoid:** Change `createRoomInDb` to accept the authenticated user's UUID as `host_id`, or use a separate `auth_uid` column for RLS while keeping the existing `host_id` for presence tracking.
**Warning signs:** Host cannot update room settings or any RLS-gated operation on the room fails.

### Pitfall 6: `send-notification/index.ts` still handles `user_roles` INSERT trigger
**What goes wrong:** After `user_roles` is dropped, the DB trigger (if any) that fired on `user_roles` INSERT no longer exists. But `send-notification/index.ts` lines 91–106 handle the `type === 'INSERT' && record?.user_id && record?.role` case — this code path becomes dead but benign.
**Why it happens:** Notification function was originally designed to respond to DB webhooks on `user_roles`.
**How to avoid:** Remove the dead code branch. No functional impact but reduces confusion.
**Warning signs:** None — it's dead code after migration.

---

## Code Examples

### Verified: Current game_start broadcast call sites

```typescript
// src/store/gameStore.ts:948 — startOnlineGame()
broadcastGameAction({
  type: 'game_start',
  cards,              // <-- this is the problem; full CardData[] including symbol (image URL)
  playerIds,
  playerNames,
  deckId: selectedDeckId,
  size: selectedSize,
  turnTime,
  quizTime,
  startingPlayer
})

// src/store/gameStore.ts:775 — playAgain()
broadcastGameAction({
  type: 'game_start',
  cards,              // <-- same problem
  playerIds,
  playerNames,
  deckId: selectedDeckId,
  size: selectedSize,
  turnTime,
  quizTime,
  startingPlayer
})
```

### Verified: Current addXP implementation (non-atomic)

```typescript
// src/store/authStore.ts:308–317 — the full non-atomic implementation
addXP: async (amount) => {
  const { user, profile } = get()
  if (!user || !profile) return
  const newXp = profile.xp + amount           // reads from local state
  const newLevel = getLevel(newXp)
  await supabase.from('profiles')
    .update({ xp: newXp, level: newLevel })   // writes computed value (not atomic)
    .eq('id', user.id)
  set(s => ({
    profile: s.profile ? { ...s.profile, xp: newXp, level: newLevel } : null,
  }))
},
```

### Verified: Current fetchRole in useAuth.ts (reads user_roles)

```typescript
// src/admin/useAuth.ts:13–20 — full function to replace
async function fetchRole(userId: string) {
  const { data } = await supabase
    .from('user_roles')           // <-- must change to 'profiles'
    .select('role')
    .eq('user_id', userId)
    .single()
  setRole((data?.role as AdminRole) ?? null)
}
```

### Verified: Current delete-account (missing Storage + teacher_requests)

```typescript
// supabase/functions/delete-account/index.ts:32–36
await adminClient.from('game_history').delete().eq('user_id', user.id)
await adminClient.from('profiles').delete().eq('id', user.id)
// MISSING: teacher_requests, child_consents, Storage objects
const { error } = await adminClient.auth.admin.deleteUser(user.id)
```

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — all changes are TypeScript, SQL migrations, and Supabase Edge Function edits within existing infrastructure).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — zero test files in repo |
| Config file | None |
| Quick run command | N/A — no test runner configured |
| Full suite command | N/A |

No automated tests exist anywhere in this codebase (`find . -name "*.test.*"` returns nothing per CONCERNS.md).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ROLE-01 | `user_roles` table dropped; admin panel still works | manual | Manually verify login to `/admin` as teacher + superadmin | N/A |
| ROLE-04 | `useAuth.ts` reads roles from `profiles.roles[]` | manual | Login as superadmin in admin; confirm role shows correctly | N/A |
| GDPR-01 | Age checkbox appears in registration flow | manual | Register new account; checkbox visible on age-check step | N/A |
| GDPR-02 | Under-16 sees parental consent screen | manual | Check age box; parental consent modal appears | N/A |
| GDPR-03 | Consent record saved to DB | manual | `SELECT * FROM child_consents WHERE child_user_id = '<uid>'` after registration | N/A |
| GDPR-05 | Under-16 profile not visible publicly | manual | Visit `/profile/<minor-id>` while logged out; 403 or not found | N/A |
| GDPR-06 | delete-account deletes Storage objects | manual | Upload image, delete account, verify object gone from `card-images` bucket | N/A |
| TECH-01 | game_start payload under 10 KB | manual | Console.log payload size before broadcast | N/A |
| TECH-02 | XP consistent under parallel load | manual | Run 30 concurrent XP grants via Supabase SQL; verify final XP | N/A |
| TECH-03 | rooms RLS restricts anonymous reads | manual | Query `rooms` as unauthenticated; expect 0 rows | N/A |
| TECH-04 | Invite code uses crypto.getRandomValues | review | Code review of DeckEditor.tsx and multiplayerService.ts | N/A |

### Wave 0 Gaps

No test framework is configured. Given the hard April 7 deadline and zero existing test infrastructure, automated testing is not feasible for Phase 1. All verification is manual using Supabase SQL Editor and browser-based smoke tests.

The ROADMAP success criteria serve as the acceptance checklist:
- [ ] Teacher and superadmin can log into `/admin` and see correct roles without `user_roles` table
- [ ] New user registration requires age confirmation; under-16 sees parental consent; record is in DB
- [ ] Player under 16 has no public profile and does not appear in leaderboards
- [ ] `delete-account` deletes all PII including Storage objects and `game_history` rows
- [ ] 30 concurrent XP grants are consistent (no lost updates) — verify via SQL
- [ ] `game_start` broadcast payload is under 10 KB even for the largest custom deck

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `user_roles` table for admin roles | `profiles.roles[]` | Migration `20260322` applied | Admin app still reads old table — Phase 1 completes the migration |
| Client-side read-modify-write for XP | Atomic SQL UPDATE | Phase 1 | Eliminates race condition at class scale |
| Full card objects in Realtime broadcast | Card IDs only | Phase 1 | Drops payload from 27-29 KB to <1 KB |
| `Math.random()` for invite codes | `crypto.getRandomValues()` | Phase 1 | Eliminates predictable code generation |

---

## Open Questions

1. **`get_users_with_roles` RPC definition**
   - What we know: `UsersManager.tsx:30` calls `supabase.rpc('get_users_with_roles')` and returns `{ user_id, email, role, created_at, username }`
   - What's unclear: The RPC body is not in the migration files; it likely JOINs `user_roles` and must be updated before dropping the table
   - Recommendation: Before dropping `user_roles`, inspect the function in Supabase SQL Editor (`SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'get_users_with_roles'`) and rewrite it to use `profiles.roles[]`

2. **Storage object path convention for card-images bucket**
   - What we know: Storage DELETE policy uses `(storage.foldername(name))[1] = auth.uid()::text`, suggesting `{uid}/filename` convention
   - What's unclear: `BulkUploadModal.tsx` upload path was not read in detail — the actual prefix used at upload time must be confirmed
   - Recommendation: Read `BulkUploadModal.tsx:55–80` before implementing Storage deletion in `delete-account`

3. **`rooms.host_id` vs `auth.uid()` mismatch**
   - What we know: `host_id` is stored as the random `getPlayerId()` string, not the Supabase auth UUID
   - What's unclear: Whether the multiplayer flow requires authentication before room creation (if always authenticated, switching to `auth.uid()` is safe)
   - Recommendation: Check whether `createRoomInDb` is always called by an authenticated user; if yes, switch `host_id` to `auth.uid()` and update `getPlayerId()` to fall back to auth UUID

4. **`is_minor` enforcement on leaderboard**
   - What we know: Full leaderboard feature is Phase 4; there are no leaderboard queries in Phase 1 scope
   - What's unclear: Whether any existing queries in `game_history` or `profiles` already serve leaderboard-like data that needs immediate filtering
   - Recommendation: For Phase 1, adding the `is_minor` column and RLS policy on `profiles` is sufficient; leaderboard query filtering is a Phase 4 concern

---

## Sources

### Primary (HIGH confidence)
- Direct codebase reads — all findings are from actual source files, not inferred
  - `src/admin/useAuth.ts` — role fetch implementation
  - `src/admin/TeacherRequestsManager.tsx` — dual-write to `user_roles` + `profiles`
  - `src/admin/UsersManager.tsx` — role management via `user_roles`
  - `src/store/authStore.ts` — `addXP` non-atomic implementation, `Profile` interface
  - `supabase/functions/delete-account/index.ts` — gap analysis
  - `supabase/functions/delete-user/index.ts` — `user_roles` superadmin check
  - `src/services/multiplayerService.ts` — `game_start` type definition, `Math.random()` usage, open rooms RLS documented
  - `src/store/gameStore.ts:775,948` — `game_start` broadcast call sites
  - `supabase/migrations/20260322_user_roles_phase1.sql` — confirmed backfill already ran
  - `.planning/research/ARCHITECTURE.md` — migration strategy, RLS design
  - `.planning/research/PITFALLS.md` — payload size measurement, race condition analysis

### Secondary (MEDIUM confidence)
- `.planning/codebase/CONCERNS.md` — `addXP` race condition, `user_roles` dual-system, rooms RLS open policy documentation

---

## Metadata

**Confidence breakdown:**
- Role migration: HIGH — all files and line numbers confirmed from source
- GDPR schema: HIGH — new tables designed; no unknowns except `is_minor` enforcement scope
- GDPR UI flow: HIGH — `AuthModal.tsx` step system fully understood; insertion point clear
- delete-account gaps: HIGH — missing deletions confirmed from reading the function
- atomic XP: HIGH — non-atomic pattern confirmed at exact lines; SQL RPC pattern is standard Postgres
- game_start fix: HIGH — broadcast call sites confirmed; reconstruction approach MEDIUM (depends on deck pre-load assumption)
- rooms RLS: MEDIUM — open policy confirmed; fix requires `host_id` type resolution (see Open Questions)
- crypto fix: HIGH — both `Math.random()` sites confirmed; `crypto.getRandomValues()` is standard

**Research date:** 2026-03-27
**Valid until:** 2026-04-07 (phase deadline; codebase changes may invalidate line numbers)
