---
phase: 01-z-klady-a-role-syst-m
plan: "03"
subsystem: multiplayer-integrity
tags: [atomic-rpc, realtime-payload, rls, crypto]
dependency_graph:
  requires: []
  provides: [add_xp-rpc, rooms-rls, crypto-codes]
  affects: [authStore, multiplayerService, gameStore, DeckEditor]
tech_stack:
  added: []
  patterns: [atomic-sql-rpc, crypto.getRandomValues, rls-auth-uid]
key_files:
  created:
    - supabase/migrations/20260327000001_add_xp_rpc.sql
    - supabase/migrations/20260327000002_rooms_rls_restrict.sql
  modified:
    - src/store/authStore.ts
    - src/services/multiplayerService.ts
    - src/store/gameStore.ts
    - src/admin/DeckEditor.tsx
decisions:
  - Used cardSymbols (string[]) instead of cardIds (number[]) — clearer semantics, same payload reduction goal
  - RLS fallback to _legacyHostId param preserved for unauthenticated edge case
metrics:
  duration_seconds: 196
  completed_date: "2026-03-27"
  tasks_completed: 3
  files_modified: 6
---

# Phase 01 Plan 03: Critical Tech Fixes Summary

**One-liner:** Atomic `add_xp()` SQL RPC eliminates XP race conditions; `game_start` broadcast now sends symbol strings only (~1 KB vs 27–29 KB); rooms RLS restricts to `auth.uid()` host; all code generation uses `crypto.getRandomValues()`.

---

## What Was Built

### Task 1 — Atomic `add_xp()` SQL RPC
- Created `supabase/migrations/20260327000001_add_xp_rpc.sql` with `CREATE OR REPLACE FUNCTION add_xp(p_user_id uuid, p_xp_delta integer)` using `UPDATE profiles SET xp = xp + p_xp_delta` — atomic, no lost updates under concurrent load
- Level computed server-side from `LEVEL_XP` array, returns `jsonb {xp, level}`
- `authStore.addXP` replaced with `supabase.rpc('add_xp', {p_user_id, p_xp_delta})` — single round-trip, no client-side read-modify-write

### Task 2 — `game_start` Broadcast Payload Reduction
- Changed `GameAction` type: `game_start` variant now uses `cardSymbols: string[]` instead of `cards: CardData[]`
- `multiplayerService.ts`: updated type definition
- `gameStore.ts playAgain()`: broadcasts `cardSymbols` array, calls `_applyGameStart` with locally-built `CardData[]`
- `gameStore.ts startOnlineGame()`: same pattern
- `gameStore.ts _applyAction case 'game_start':` reconstructs `CardData[]` from received `cardSymbols` before calling `_applyGameStart`
- Result: broadcast payload for 64-card custom deck drops from ~27 KB to <1 KB

### Task 3 — `rooms` RLS + Crypto Fixes
- Created `supabase/migrations/20260327000002_rooms_rls_restrict.sql`: drops `"open"` policy, adds `host_manages_room` (ALL where `host_id = auth.uid()::text`) and `authenticated_reads_rooms` (SELECT for authenticated)
- `multiplayerService.ts createRoomInDb()`: fetches `supabase.auth.getUser()`, stores `user.id` (UUID) as `host_id` so RLS can match `auth.uid()`
- `multiplayerService.ts generateRoomCode()`: `crypto.getRandomValues(new Uint8Array(6))`
- `multiplayerService.ts getPlayerId()`: `crypto.getRandomValues(new Uint8Array(8))` → 16 hex chars
- `DeckEditor.tsx generateCode()`: `crypto.getRandomValues(new Uint8Array(4))` with chars alphabet

---

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | 2bcaa05 | fix(01-03): atomic add_xp RPC — replace client-side read-modify-write |
| 2 | c6688df | fix(01-03): game_start broadcast sends cardSymbols only, not full CardData[] |
| 3 | 1e5dfb8 | fix(01-03): rooms RLS restrict to host + authenticated; crypto.getRandomValues for all codes |

---

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written with one intentional deviation:

**[Rule 2 - Naming] `cardSymbols: string[]` instead of plan's `cardIds: number[]`**
- **Found during:** Task 2
- **Issue:** The plan suggested `cardIds: number[]` (pool key indices) but `CardData.id` is a sequential position index (0..N-1), not a pool key index. Sending position indices alone cannot reconstruct the symbol order.
- **Fix:** Used `cardSymbols: string[]` (the actual symbol strings) — achieves same payload reduction goal, unambiguously correct, and simpler receiver reconstruction.
- **Files modified:** `src/services/multiplayerService.ts`, `src/store/gameStore.ts`
- **Commit:** c6688df

---

## Known Stubs

None.

---

## Self-Check: PASSED

Files exist:
- FOUND: supabase/migrations/20260327000001_add_xp_rpc.sql
- FOUND: supabase/migrations/20260327000002_rooms_rls_restrict.sql
- FOUND: src/store/authStore.ts (modified)
- FOUND: src/services/multiplayerService.ts (modified)
- FOUND: src/store/gameStore.ts (modified)
- FOUND: src/admin/DeckEditor.tsx (modified)

Commits exist:
- FOUND: 2bcaa05
- FOUND: c6688df
- FOUND: 1e5dfb8

TypeScript: zero errors (`npx tsc --noEmit` passes)
Math.random: zero matches in multiplayerService.ts and DeckEditor.tsx
