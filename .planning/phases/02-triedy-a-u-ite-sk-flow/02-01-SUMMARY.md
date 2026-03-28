---
phase: 02-triedy-a-u-ite-sk-flow
plan: 01
subsystem: database
tags: [postgres, supabase, rls, security-definer, typescript, classroom]

# Dependency graph
requires:
  - phase: 01-zaklady-a-role-system
    provides: profiles table with roles[], GDPR consent tables, SECURITY DEFINER pattern
provides:
  - classes table with invite_code (UNIQUE), gdpr_confirmed_at (timestamptz)
  - class_members table with UNIQUE(class_id, user_id) constraint
  - class_assignments table with CHECK one_deck_type constraint
  - is_class_teacher + is_class_member SECURITY DEFINER helper functions
  - 7 RLS policies covering teacher and student access patterns
  - TypeScript interfaces ClassRoom, ClassMember, ClassAssignment + joined types
affects: [02-02, 02-03, 02-04, teacher-ui, student-join, class-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER functions for RLS helpers to prevent recursive policy evaluation"
    - "XOR constraint for polymorphic FK (set_slug XOR custom_deck_id)"
    - "gdpr_confirmed_at as timestamptz audit field instead of boolean flag"

key-files:
  created:
    - supabase/migrations/20260328000001_classroom_schema.sql
    - src/types/classroom.ts
  modified: []

key-decisions:
  - "invite_code is permanent UNIQUE NOT NULL — no expiry column (CLASS-08)"
  - "gdpr_confirmed_at is timestamptz not boolean — auditable timestamp (GDPR-04)"
  - "UNIQUE(class_id, user_id) on class_members prevents duplicate joins at DB level"
  - "CHECK one_deck_type ensures exactly one of set_slug/custom_deck_id is populated"
  - "anyone_reads_class_by_invite policy allows invite-code lookup for join flow"

patterns-established:
  - "SECURITY DEFINER helpers: create function + GRANT EXECUTE to authenticated before creating policies that use it"
  - "Joined types pattern: Base interface + WithXxx extends base for query result shapes"

requirements-completed: [CLASS-01, CLASS-07, CLASS-08, GDPR-04]

# Metrics
duration: 5min
completed: 2026-03-28
---

# Phase 2 Plan 01: Classroom Schema Summary

**PostgreSQL classroom schema (3 tables + RLS + SECURITY DEFINER helpers) with matching TypeScript interfaces as hard prerequisite for all teacher/student UI in Phase 2**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-28T09:12:58Z
- **Completed:** 2026-03-28T09:18:07Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments

- Three-table classroom schema: `classes` (invite_code, gdpr_confirmed_at), `class_members` (UNIQUE join guard), `class_assignments` (XOR deck constraint)
- Two SECURITY DEFINER helper functions (`is_class_teacher`, `is_class_member`) with GRANT to authenticated — prevents recursive RLS evaluation
- Seven RLS policies: teacher manages own classes/assignments, students see own memberships, anyone authenticated can look up class by invite code and join
- TypeScript interfaces matching SQL column names 1:1, plus joined types for UI queries

## Task Commits

Each task was committed atomically:

1. **Task 1: Create classroom SQL migration** - `f125ecb` (feat)
2. **Task 2: Create TypeScript classroom types** - `00d8572` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `supabase/migrations/20260328000001_classroom_schema.sql` - DDL for 3 tables, 2 SECURITY DEFINER helpers, 7 RLS policies, GRANT EXECUTE
- `src/types/classroom.ts` - ClassRoom, ClassMember, ClassAssignment base interfaces + ClassWithStudentCount, ClassMemberWithProfile, AssignmentWithDeck joined types + CreateClassPayload

## Decisions Made

- `invite_code` is permanent with no `expires_at` column — per CLASS-08 design decision already validated
- `gdpr_confirmed_at timestamptz NOT NULL DEFAULT now()` instead of a boolean — provides an auditable timestamp per GDPR-04
- Added `anyone_reads_class_by_invite` SELECT policy on `classes` so invite-code lookup works for unauthenticated-but-signed-in users during join flow
- `CHECK one_deck_type` enforces at DB level that each assignment references exactly one deck type (built-in slug OR custom deck UUID)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

The migration file must be applied to Supabase (dev + prod) before any classroom UI is built:

```bash
# Dev
supabase db push --db-url <dev-db-url>

# OR via Supabase Dashboard SQL Editor — paste contents of:
# supabase/migrations/20260328000001_classroom_schema.sql
```

No environment variables required — tables and functions are created in the existing Supabase project.

## Next Phase Readiness

- Schema complete — Plans 02-02 (teacher UI), 02-03 (student join), 02-04 (dashboard) can now be built
- TypeScript types ready for import in all Phase 2 service and component files
- RLS tested at policy definition level; integration testing happens when UI is built in 02-02

---
*Phase: 02-triedy-a-u-ite-sk-flow*
*Completed: 2026-03-28*
