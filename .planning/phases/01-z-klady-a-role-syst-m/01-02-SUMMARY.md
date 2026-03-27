---
phase: 01-z-klady-a-role-syst-m
plan: "02"
subsystem: auth
tags: [gdpr, supabase, rls, react, zustand, edge-functions]

# Dependency graph
requires: []
provides:
  - child_consents table with RLS (GDPR-03)
  - is_minor column on profiles with privacy-by-default SELECT policy (GDPR-05)
  - age-check registration step in AuthModal with parental consent screen
  - pexedu_is_minor user_metadata flag propagated through signup flow
  - delete-account and delete-user Edge Functions cover teacher_requests + child_consents PII
affects: [leaderboards, public-profile, teacher-requests, delete-account]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - GDPR consent stored in child_consents with consent_version for versioning
    - is_minor flag on profiles controls SELECT visibility via RLS policy
    - pexedu_is_minor user_metadata string flag ('1'/'0') bridges signup form to profile upsert

key-files:
  created:
    - supabase/migrations/20260327220313_gdpr_consent_schema.sql
  modified:
    - src/components/auth/AuthModal.tsx
    - src/store/authStore.ts
    - supabase/functions/delete-account/index.ts
    - supabase/functions/delete-user/index.ts

key-decisions:
  - "Storage objects in card-images bucket are organized by deckId (not userId), so no user-specific storage cleanup is needed in delete-account"
  - "child_consents insert happens in completeOnboarding (after email confirmation + onboarding) not at signUp, because user.id must be present as profiles FK"
  - "pexedu_is_minor stored as string '1'/'0' in user_metadata to avoid boolean serialization issues across Supabase auth metadata"

patterns-established:
  - "GDPR consent: pexedu_is_minor metadata flag set at signup, read at registerAsPlayer/registerAsTeacher to set is_minor on profiles, consent record inserted at completeOnboarding"

requirements-completed: [GDPR-01, GDPR-02, GDPR-03, GDPR-05, GDPR-06]

# Metrics
duration: 3min
completed: 2026-03-27
---

# Phase 01 Plan 02: GDPR Consent Flows Summary

**Age declaration + parental consent screen in registration, child_consents DB table with RLS, is_minor privacy-by-default on profiles, and full PII deletion in delete-account/delete-user Edge Functions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-27T21:03:09Z
- **Completed:** 2026-03-27T21:05:50Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- DB migration adds `child_consents` table (with RLS) and `is_minor` boolean on `profiles` with privacy-by-default SELECT policy blocking minor profiles from public reads
- Registration flow extended with `age-check` step between intent and credentials — under-16 checkbox triggers inline parental consent screen before proceeding; localized for CS/SK/EN
- `delete-account` and `delete-user` Edge Functions now also delete `teacher_requests` and `child_consents` rows, covering all PII

## Task Commits

1. **Task 1: DB schema — child_consents and is_minor** - `f350ecd` (feat)
2. **Task 2: Registration flow — age-check step** - `4e056fd` (feat)
3. **Task 3: Fix delete-account Edge Function** - `f01ea94` (feat)

## Files Created/Modified

- `supabase/migrations/20260327220313_gdpr_consent_schema.sql` - child_consents table, is_minor column, minor_profile_not_public RLS policy
- `src/components/auth/AuthModal.tsx` - age-check and parental consent steps, GDPR texts for all 3 languages
- `src/store/authStore.ts` - isMinor param in signUpWithEmail, is_minor in profile upserts, consent insert in completeOnboarding, is_minor on Profile interface
- `supabase/functions/delete-account/index.ts` - added teacher_requests + child_consents deletion
- `supabase/functions/delete-user/index.ts` - added game_history + teacher_requests + child_consents deletion

## Decisions Made

- **Storage cleanup**: Storage files in `card-images` are organized by `{deckId}/{timestamp}.jpg` (confirmed by reading `BulkUploadModal.tsx`), not by userId. Regular users do not upload images directly, so no user-specific storage cleanup is needed when deleting a user account.
- **Consent insert timing**: The `child_consents` insert is done in `completeOnboarding()` rather than immediately after `signUp()`, because the `profiles` row (FK target) is created by a DB trigger upon email confirmation, not at signup time. Inserting too early would fail the FK constraint.
- **Metadata encoding**: `pexedu_is_minor` stored as string `'1'`/`'0'` in Supabase user metadata to avoid boolean serialization edge cases.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added game_history deletion to delete-user**
- **Found during:** Task 3 (Fix delete-user)
- **Issue:** Plan mentioned delete-user has same gaps as delete-account, but delete-user was not deleting game_history while delete-account was
- **Fix:** Added `game_history` deletion to delete-user alongside the other PII cleanup
- **Files modified:** supabase/functions/delete-user/index.ts
- **Committed in:** f01ea94

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Minor gap in admin-initiated deletion. No scope creep.

## Issues Encountered

None — storage path analysis was the only investigation needed and resolved cleanly.

## User Setup Required

**DB migration must be applied to prod Supabase.** Run via Supabase CLI:
```
supabase db push --project-ref fzqrrwzeypeiyhygacvc
```
Or manually apply `supabase/migrations/20260327220313_gdpr_consent_schema.sql` via Supabase SQL Editor on prod.

Note: If `profiles` table has an existing all-public SELECT policy (`USING (true)`), drop it before running the migration to avoid policy conflicts.

## Next Phase Readiness

- GDPR consent infrastructure complete; leaderboard filtering by `is_minor = false` can be added in the leaderboard phase
- `delete-account` Edge Function should be redeployed to prod after this change
- Settings screen (Plan 03) can now display is_minor status and privacy toggles

## Self-Check: PASSED

- FOUND: supabase/migrations/20260327220313_gdpr_consent_schema.sql
- FOUND: src/components/auth/AuthModal.tsx
- FOUND: src/store/authStore.ts
- FOUND: supabase/functions/delete-account/index.ts
- FOUND: supabase/functions/delete-user/index.ts
- FOUND commit f350ecd (Task 1)
- FOUND commit 4e056fd (Task 2)
- FOUND commit f01ea94 (Task 3)

---
*Phase: 01-z-klady-a-role-syst-m*
*Completed: 2026-03-27*
