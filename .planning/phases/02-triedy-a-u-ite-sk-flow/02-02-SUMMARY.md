---
phase: 02-triedy-a-u-ite-sk-flow
plan: 02
subsystem: teacher-ui
tags: [react, zustand, supabase, classroom, gdpr, teacher, routing]

# Dependency graph
requires:
  - phase: 02-triedy-a-u-ite-sk-flow
    plan: 01
    provides: classroom schema (classes, class_members, class_assignments), TypeScript types
provides:
  - useClassroomStore: fetchClasses, createClass, fetchClassDetail, assignDeck, removeAssignment
  - /teacher route rendered via BrowserRouter + TeacherDashboard
  - CreateClassModal with GDPR-04 declaration checkbox gating submission
  - InviteCodeDisplay with clipboard copy + sonner toast
  - AssignDeckModal with built-in + approved custom decks
affects: [02-03, 02-04, student-join-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "crypto.getRandomValues() for invite code generation (no 0/O/1/I chars)"
    - "Retry on Supabase unique_violation (23505) for invite_code conflicts"
    - "React Router Routes inside TeacherDashboard component for /teacher sub-routes"
    - "TEXTS inline i18n object pattern (cs/sk/en) matching SettingsModal pattern"
    - "TeacherGuard wrapper component for auth + role check"

key-files:
  created:
    - src/store/classroomStore.ts
    - src/components/teacher/TeacherDashboard.tsx
    - src/components/teacher/CreateClassModal.tsx
    - src/components/teacher/InviteCodeDisplay.tsx
    - src/components/teacher/AssignDeckModal.tsx
  modified:
    - src/main.tsx
    - src/types/classroom.ts

key-decisions:
  - "TeacherDashboard uses React Router sub-routes (/ and /class/:id) inside BrowserRouter from main.tsx"
  - "TeacherGuard checks both teacher and superadmin roles to allow superadmin to preview teacher UI"
  - "createClass re-fetches classes after success then reads classes[0] for invite code display"
  - "AssignDeckModal fetches approved custom_decks on open (not on mount) to stay fresh"

requirements-completed: [CLASS-01, CLASS-03, CLASS-04, GDPR-04]

# Metrics
duration: 15min
completed: 2026-03-28
---

# Phase 2 Plan 02: Teacher UI Summary

**Zustand classroom store + 4 teacher components (dashboard, create modal, invite code display, assign deck modal) + /teacher route with React Router sub-routing and auth guard**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-03-28
- **Tasks:** 2/2
- **Files modified:** 6 (3 created, 3 new components dir)

## Accomplishments

- `classroomStore.ts` — Zustand store with 5 CRUD actions; `createClass` generates `PX-XXXX` invite codes with `crypto.getRandomValues()` using a charset that excludes confusing chars (0/O/1/I), retries up to 3x on unique_violation
- `main.tsx` — `isTeacher` const + `BrowserRouter<TeacherDashboard>` branch added between isAdmin and isProfile
- `TeacherDashboard.tsx` — `TeacherGuard` checks `profile.roles.includes('teacher')`, React Router `<Routes>` with `/` (class list) and `/class/:id` (detail), uses THEMES tokens throughout
- `CreateClassModal.tsx` — class name input (3–50 chars), GDPR-04 checkbox ("škola má souhlas/súhlas rodičů/rodičov..."), submit disabled until checkbox checked, shows InviteCodeDisplay on success
- `InviteCodeDisplay.tsx` — monospace `PX-XXXX` display, full join link `https://pexedu.com/join/PX-XXXX`, copy button with lucide Copy icon + sonner toast
- `AssignDeckModal.tsx` — two sections: built-in `DECKS` list with card counts, approved `custom_decks` from Supabase; each calls `useClassroomStore.assignDeck()`

## Task Commits

1. **Task 1: classroomStore + /teacher route** - `e97cfc7` (feat)
2. **Task 2: Teacher UI components** - `9d6c874` (feat)

## Files Created/Modified

- `src/store/classroomStore.ts` — Zustand classroom CRUD store
- `src/types/classroom.ts` — TypeScript interfaces (cherry-picked from Plan 01 main-branch commit)
- `src/main.tsx` — isTeacher + TeacherDashboard route
- `src/components/teacher/TeacherDashboard.tsx` — auth guard + React Router sub-routes + class list + class detail views
- `src/components/teacher/CreateClassModal.tsx` — GDPR checkbox + class creation form
- `src/components/teacher/InviteCodeDisplay.tsx` — code display + copy-to-clipboard
- `src/components/teacher/AssignDeckModal.tsx` — built-in + custom deck assignment

## Decisions Made

- React Router sub-routes (`/` and `/class/:id`) inside TeacherDashboard — consistent with how AdminApp handles its own routing
- `TeacherGuard` allows `superadmin` role in addition to `teacher` so superadmin can preview/test teacher UI without needing a separate account
- `createClass` re-fetches classes after success and reads `classes[0]` (most recent) for invite code display — simple and reliable
- `AssignDeckModal` fetches `custom_decks` on `open` (not on component mount) so list is always fresh

## Deviations from Plan

**1. [Rule 2 - Missing functionality] Added clearCurrentClass action to store**
- **Found during:** Task 1 implementation
- **Issue:** Store had no way to reset detail view state when navigating away
- **Fix:** Added `clearCurrentClass()` action to reset `currentClassId`, `members`, `assignments`
- **Files modified:** `src/store/classroomStore.ts`
- **Commit:** e97cfc7

**2. [Rule 2 - Missing functionality] superadmin included in teacher role check**
- **Found during:** Task 2 auth guard implementation
- **Issue:** Plan said check `profile.roles.includes('teacher')` but superadmin needs access too for testing
- **Fix:** TeacherGuard checks `includes('teacher') || includes('superadmin')`
- **Files modified:** `src/components/teacher/TeacherDashboard.tsx`
- **Commit:** 9d6c874

## Known Stubs

None — all data is wired to live Supabase queries. No hardcoded placeholder values.

## Self-Check: PASSED

- `src/store/classroomStore.ts` — EXISTS
- `src/components/teacher/TeacherDashboard.tsx` — EXISTS
- `src/components/teacher/CreateClassModal.tsx` — EXISTS
- `src/components/teacher/InviteCodeDisplay.tsx` — EXISTS
- `src/components/teacher/AssignDeckModal.tsx` — EXISTS
- Commit `e97cfc7` — EXISTS (git log verified)
- Commit `9d6c874` — EXISTS (git log verified)
