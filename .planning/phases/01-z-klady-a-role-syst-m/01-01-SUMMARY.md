---
phase: 01-z-klady-a-role-syst-m
plan: "01"
subsystem: admin-auth
tags: [role-migration, auth, supabase, admin]
dependency_graph:
  requires: []
  provides: [profiles.roles-as-source-of-truth, user_roles-dropped]
  affects: [useAuth.ts, UsersManager, TeacherRequestsManager, delete-user, send-notification]
tech_stack:
  added: []
  patterns: [profiles.roles[], SECURITY DEFINER RPC, Supabase Edge Function superadmin check]
key_files:
  created:
    - supabase/migrations/20260327220411_rewrite_get_users_with_roles.sql
    - supabase/migrations/20260327220449_drop_user_roles.sql
  modified:
    - src/admin/useAuth.ts
    - src/admin/TeacherRequestsManager.tsx
    - src/admin/UsersManager.tsx
    - supabase/functions/delete-user/index.ts
    - supabase/functions/send-notification/index.ts
decisions:
  - "UsersManager UserRow type updated from {user_id, role} to {id, roles[]} to match new RPC signature"
  - "delete-user superadmin check reads caller's profiles.roles[] — variable named targetIsSuperadmin per plan but guards caller, not target"
metrics:
  duration: 2m
  completed: "2026-03-27"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 7
---

# Phase 01 Plan 01: Role Migration Summary

Admin auth fully migrated from legacy `user_roles` table to `profiles.roles[]` array; all three write paths migrated, `get_users_with_roles` RPC rewritten, and `user_roles` drop migration created.

## What Was Built

The codebase was in a split-brain state where `authStore.ts` (player side) already used `profiles.roles[]` but the admin side still queried the legacy `user_roles` table. This plan completes the migration:

1. `useAuth.ts` `fetchRole()` now queries `profiles.roles[]` and derives `AdminRole` from the array
2. `useAuth.ts` `signUp()` no longer inserts into `user_roles` (DB trigger handles `profiles` row creation)
3. `TeacherRequestsManager.tsx` `approve()` no longer upserts into `user_roles` — `profiles.update()` is the only write
4. `UsersManager.tsx` `setRole()` fully rewritten to update `profiles.roles[]` with proper multi-role arrays
5. `get_users_with_roles` RPC rewritten to JOIN `profiles` directly (no `user_roles` reference)
6. `delete-user` edge function: superadmin check migrated to `profiles.roles[]`, `user_roles.delete()` cleanup removed
7. `send-notification` edge function: dead `user_roles` INSERT webhook branch removed
8. Drop migration created: `DROP TABLE IF EXISTS user_roles` (safe to apply after staging verification)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Updated UserRow type to match new RPC return signature**
- **Found during:** Task 2 — UsersManager rewrite
- **Issue:** New `get_users_with_roles` RPC returns `{id, username, email, roles, created_at}` but the existing `UserRow` type had `{user_id, role}`. All component references (`u.user_id`, `u.role`) would fail silently at runtime
- **Fix:** Updated `UserRow` type to `{id, roles[]}`, added `displayRole()`/`roleValue()` helpers, updated all JSX key/prop references from `user_id` to `id`
- **Files modified:** `src/admin/UsersManager.tsx`
- **Commit:** ab3b546

**2. [Rule 2 - Missing] Added `displayRole` and `roleValue` helpers for roles array display**
- **Found during:** Task 2 — UsersManager rewrite
- **Issue:** Old code used `u.role === 'teacher' ? 'Učitel' : ...` which won't work with `roles[]` array. New helpers extract display string and comparable value from the array
- **Fix:** `displayRole(roles[])` and `roleValue(roles[])` helper functions added inline
- **Files modified:** `src/admin/UsersManager.tsx`
- **Commit:** ab3b546

## Known Stubs

None — all data flows are wired. The drop migration (`20260327220449_drop_user_roles.sql`) should be applied to the database after deploying and verifying the TypeScript changes in staging.

## Self-Check: PASSED

Files created:
- supabase/migrations/20260327220411_rewrite_get_users_with_roles.sql — FOUND
- supabase/migrations/20260327220449_drop_user_roles.sql — FOUND

Commits:
- b71f545 — FOUND (useAuth.ts)
- ab3b546 — FOUND (TeacherRequestsManager, UsersManager, RPC migration)
- 6d91a1f — FOUND (edge functions, drop migration)

Grep check — zero `user_roles` references in src/ and supabase/functions/ — PASSED
