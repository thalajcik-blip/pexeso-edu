---
phase: 02-triedy-a-u-ite-sk-flow
plan: 05
subsystem: auth
tags: [email, notifications, resend, settings, i18n, language-selector, teacher-requests]

# Dependency graph
requires:
  - phase: 02-triedy-a-u-ite-sk-flow
    provides: "TeacherRequestsManager with approve/reject flow; send-notification Edge Function with teacher_approved branch"
provides:
  - "teacher_rejected email branch in send-notification Edge Function"
  - "Language selector in SettingsModal (SET-03)"
  - "Full teacher request flow: pending → approved/rejected with email notification in both cases"
affects: [teacher-flow, settings-modal, send-notification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Email notification fan-out pattern: admin UI calls send-notification Edge Function with type + userId"
    - "Language selector persists to both Zustand store (localStorage) and Supabase profiles.locale"

key-files:
  created: []
  modified:
    - supabase/functions/send-notification/index.ts
    - src/admin/TeacherRequestsManager.tsx
    - src/components/auth/SettingsModal.tsx

key-decisions:
  - "Rejection email is non-critical: wrapped in try/catch, failure does not block the reject operation"
  - "Language change writes to both Zustand persist (immediate UI) and profiles.locale (cross-device sync)"

patterns-established:
  - "Pattern: Email notifications in reject() use identical headers pattern as approve() for consistency"

requirements-completed: [TADMIN-01, TADMIN-02, TADMIN-03, TADMIN-04, SET-01, SET-02, SET-03, SET-04]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 02 Plan 05: Teacher Rejection Email + Settings Language Selector Summary

**Teacher rejection email via send-notification Edge Function and language selector (CS/SK/EN) in SettingsModal with dual persistence to Zustand + profiles.locale**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-28T09:19:11Z
- **Completed:** 2026-03-28T09:22:02Z
- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments
- Added `teacher_rejected` branch to send-notification Edge Function — fetches user email from Auth, fetches username from profiles, sends branded HTML rejection email via Resend
- Updated TeacherRequestsManager.tsx `reject()` to call send-notification with `type: 'teacher_rejected'` (same pattern as approve)
- Added language selector section to SettingsModal with 3 buttons (CZ/SK/EN flags), accent border on active, calls `setLanguage()` + `updateProfile({ locale })` on click

## Task Commits

Each task was committed atomically:

1. **Task 1: Add rejection email to send-notification + TeacherRequestsManager** - `831928d` (feat)
2. **Task 2: Add language selector to SettingsModal (SET-03)** - `05c19c7` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `supabase/functions/send-notification/index.ts` - Added teacher_rejected email branch between teacher_approved and INSERT branches
- `src/admin/TeacherRequestsManager.tsx` - reject() now calls send-notification with teacher_rejected
- `src/components/auth/SettingsModal.tsx` - Added setLanguage import, sectionLanguage texts, language selector section with 3 buttons

## Decisions Made
- Rejection email failure is non-critical (try/catch) — same pattern as approval email
- Language change writes to Zustand persist + profiles.locale for full persistence across devices

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. The send-notification Edge Function already has RESEND_API_KEY deployed.

## Next Phase Readiness
- TADMIN-04 and SET-03 are now complete
- Full teacher request admin flow is complete: approve (TADMIN-03) and reject (TADMIN-04) both send email notifications
- Settings modal has all planned features: avatar, username, password, privacy, language, danger zone

## Self-Check: PASSED

- FOUND: supabase/functions/send-notification/index.ts
- FOUND: src/admin/TeacherRequestsManager.tsx
- FOUND: src/components/auth/SettingsModal.tsx
- FOUND: commit 831928d (feat(02-05): add teacher rejection email notification)
- FOUND: commit 05c19c7 (feat(02-05): add language selector to SettingsModal)

---
*Phase: 02-triedy-a-u-ite-sk-flow*
*Completed: 2026-03-28*
