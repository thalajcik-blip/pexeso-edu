---
phase: 02-triedy-a-u-ite-sk-flow
verified: 2026-03-28T12:00:00Z
status: gaps_found
score: 6/7 success criteria verified
re_verification: false
gaps:
  - truth: "Teacher vidí real-time zoznam žiakov (username, avatar, last active) v class detail pohľade"
    status: partial
    reason: "Roster is fetched on mount via fetchClassDetail(), but there is no Supabase Realtime subscription, channel, or polling — the list does not update without a page refresh. Success criterion says 'real-time' explicitly."
    artifacts:
      - path: "src/store/classroomStore.ts"
        issue: "No Realtime subscription for class_members updates"
      - path: "src/components/teacher/TeacherDashboard.tsx"
        issue: "fetchClassDetail called only once in useEffect([classId]) — no polling, no channel"
    missing:
      - "Supabase Realtime channel on class_members filtered by class_id to push live updates OR a polling interval (e.g., every 30s) in ClassDetailView"
human_verification:
  - test: "Teacher opens class detail, a student joins via /join/PX-XXXX — roster updates without page refresh"
    expected: "New student appears in the roster table within a few seconds"
    why_human: "Realtime behavior requires a live browser session and a student join event; cannot be verified programmatically from file inspection"
---

# Phase 2: Triedy a učiteľský flow — Verification Report

**Phase Goal:** Pilotný učiteľ vie vytvoriť triedu, zdieľať kód, žiaci sa pripoja a on vidí ich výsledky — všetko live do 15. apríla
**Verified:** 2026-03-28
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Učiteľ vytvára triedu — vidí confirmation s invite kódom PX-XXXX a kopírovateľným linkom | ✓ VERIFIED | `CreateClassModal.tsx` calls `createClass()`, on success shows `InviteCodeDisplay` with monospace PX-XXXX and copy button wired to `navigator.clipboard.writeText(joinLink)` |
| 2 | Žiak klikne na /join/PX-XXXX, prihlási sa, trieda je v jeho dashboarde bez ďalšej akcie | ✓ VERIFIED | `JoinClassRoute.tsx` handles deep link; stores `pexedu_pending_join` in sessionStorage; `App.tsx` useEffect auto-joins on login; UPSERT prevents duplicates |
| 3 | Teacher vidí real-time zoznam žiakov (username, avatar, last active) v class detail pohľade | ✗ FAILED | Roster fetched once on mount, no Supabase Realtime subscription or polling; does NOT update live |
| 4 | Teacher priradí custom sadu triede; žiak vidí "Tvoj učiteľ priradil: [sada]" banner | ✓ VERIFIED | `AssignDeckModal.tsx` calls `assignDeck()`; `AssignedDecksBanner.tsx` queries `class_assignments` and renders clickable deck names on SetupScreen |
| 5 | Teacher dashboard zobrazuje score per žiak s farebným kódovaním, exportovateľné do CSV | ✓ VERIFIED | `ClassResults.tsx` queries `game_history`, green (#22c55e) ≥70%, amber (#eab308) 40-69%, red (#ef4444) <40%; `Blob text/csv` download with class+deck filename |
| 6 | Superadmin schváli teacher request jedným klikom; učiteľ dostane notifikáciu; profiles.roles[] obsahuje teacher | ✓ VERIFIED | `TeacherRequestsManager.tsx` one-click approve updates `profiles.roles`; calls `send-notification` with `type: 'teacher_approved'`; reject similarly calls `type: 'teacher_rejected'` |
| 7 | Onboarding checklist zobrazí 3 kroky; každý krok sa zaškrtne po dokončení | ✓ VERIFIED | `OnboardingChecklist.tsx` has 3 steps (classes.length>0 / assignments.length>0 / localStorage key); auto-dismisses after 5s; CheckCircle/Circle icons from lucide-react |

**Score: 6/7 success criteria verified**

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260328000001_classroom_schema.sql` | 3 tables + RLS + SECURITY DEFINER | ✓ VERIFIED | 3 CREATE TABLE, 2 SECURITY DEFINER functions, 7 RLS policies, GRANT EXECUTE, UNIQUE constraints, CHECK constraint |
| `src/types/classroom.ts` | TypeScript interfaces | ✓ VERIFIED | ClassRoom, ClassMember, ClassAssignment, ClassWithStudentCount, ClassMemberWithProfile, AssignmentWithDeck, CreateClassPayload — all exported |
| `src/store/classroomStore.ts` | Zustand CRUD store | ✓ VERIFIED | fetchClasses, createClass (PX-XXXX via crypto.getRandomValues, 3 retries on 23505), fetchClassDetail, assignDeck, removeAssignment, clearCurrentClass |
| `src/components/teacher/TeacherDashboard.tsx` | Teacher dashboard with auth guard + routing | ✓ VERIFIED | TeacherGuard checks teacher OR superadmin; React Router sub-routes /class/:id; ClassListView + ClassDetailView |
| `src/components/teacher/CreateClassModal.tsx` | GDPR checkbox + class creation | ✓ VERIFIED | Submit disabled when !gdprChecked; calls createClass(); shows InviteCodeDisplay on success |
| `src/components/teacher/InviteCodeDisplay.tsx` | Code display + copy button | ✓ VERIFIED | Monospace PX-XXXX, full join link, clipboard copy, sonner toast, sets pexedu_onboarding_shared |
| `src/components/teacher/AssignDeckModal.tsx` | Deck assignment modal | ✓ VERIFIED | Built-in DECKS list + approved custom_decks from Supabase; calls assignDeck() |
| `src/components/student/JoinClassRoute.tsx` | /join/:code route handler | ✓ VERIFIED | lookupAndJoin with upsert; sessionStorage pending join; openAuthModalForLogin; redirect to / on success |
| `src/components/student/AssignedDecksBanner.tsx` | Assigned decks banner | ✓ VERIFIED | Queries class_members + class_assignments; resolves deck titles; clickable; returns null when no assignments; integrated into SetupScreen |
| `src/components/teacher/ClassResults.tsx` | Results table + CSV export | ✓ VERIFIED | game_history query by memberIds + set_slug/custom_deck_id; best-attempt grouping; color coding; Blob CSV download |
| `src/components/teacher/OnboardingChecklist.tsx` | 3-step onboarding | ✓ VERIFIED | 3 steps with auto-check logic; localStorage persistence; auto-dismiss at 5s; integrated in ClassListView |
| `src/main.tsx` (isTeacher + isJoin routes) | Route registration | ✓ VERIFIED | isTeacher + isJoin constants; BrowserRouter renders TeacherDashboard and JoinClassRoute respectively |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `classroomStore.ts` | `supabase.from('classes')` | Supabase queries | ✓ WIRED | Direct `from('classes')` calls in fetchClasses, createClass |
| `TeacherDashboard.tsx` | `classroomStore.ts` | useClassroomStore hook | ✓ WIRED | useClassroomStore() used in ClassListView, ClassDetailView |
| `main.tsx` | `TeacherDashboard.tsx` | isTeacher branch | ✓ WIRED | `const isTeacher = window.location.pathname.startsWith('/teacher')` + render branch |
| `main.tsx` | `JoinClassRoute.tsx` | isJoin branch | ✓ WIRED | `const isJoin = window.location.pathname.startsWith('/join/')` + render branch |
| `JoinClassRoute.tsx` | `supabase.from('class_members')` | UPSERT on join | ✓ WIRED | `upsert({ class_id, user_id }, { onConflict: 'class_id,user_id' })` |
| `JoinClassRoute.tsx` | `sessionStorage` | Pending join code | ✓ WIRED | `sessionStorage.setItem('pexedu_pending_join', code)` |
| `App.tsx` | `sessionStorage 'pexedu_pending_join'` | Post-login useEffect | ✓ WIRED | useEffect([user]) checks and clears pending join |
| `AssignedDecksBanner.tsx` | `supabase.from('class_assignments')` | Query assigned decks | ✓ WIRED | Queries class_members then class_assignments with class_ids |
| `SetupScreen.tsx` | `AssignedDecksBanner` | Import + render | ✓ WIRED | `import { AssignedDecksBanner }` + `{profile && <AssignedDecksBanner />}` |
| `ClassResults.tsx` | `supabase.from('game_history')` | Query results | ✓ WIRED | Queries game_history filtered by memberIds + set_slug/custom_deck_id |
| `ClassResults.tsx` | `Blob text/csv` | Client-side CSV | ✓ WIRED | `new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })` + createObjectURL |
| `TeacherRequestsManager.tsx` | `send-notification` function | fetch POST teacher_rejected | ✓ WIRED | fetch call in reject() with `type: 'teacher_rejected'` |
| `SettingsModal.tsx` | `gameStore.setLanguage` | Language selector | ✓ WIRED | `setLanguage(lang.code)` + `updateProfile({ locale: lang.code })` on click |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `TeacherDashboard.tsx` (ClassListView) | `classes` | `fetchClasses()` → `supabase.from('classes').select('*, class_members(count, last_active_at)').eq('teacher_id', user.id)` | Yes — live Supabase query | ✓ FLOWING |
| `TeacherDashboard.tsx` (ClassDetailView) | `members`, `assignments` | `fetchClassDetail()` → `supabase.from('class_members').select('*, profiles(...)').eq('class_id', classId)` | Yes — live Supabase query with profile join | ✓ FLOWING |
| `ClassResults.tsx` | `results` | `supabase.from('game_history').select(...).in('user_id', memberIds).eq('set_slug', ...)` | Yes — real game_history records | ✓ FLOWING |
| `AssignedDecksBanner.tsx` | `assigned` | `supabase.from('class_members').select('class_id').eq('user_id', profile.id)` then `supabase.from('class_assignments')...` | Yes — live Supabase query chain | ✓ FLOWING |
| `OnboardingChecklist.tsx` | `step1Done`, `step2Done`, `step3Done` | Zustand `classes.length`, `assignments.length`, `localStorage.getItem(STORAGE_KEY_SHARED)` | Yes — live store state + localStorage | ✓ FLOWING |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — requires running browser session with authenticated user and live Supabase database; no runnable entry points testable without starting a server and authenticated session.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CLASS-01 | 02-01, 02-02 | Teacher creates class with name + invite code PX-XXXX | ✓ SATISFIED | CreateClassModal + classroomStore.createClass() |
| CLASS-02 | 02-03 | Student joins via invite code or invite link | ✓ SATISFIED | JoinClassRoute handles /join/:code with UPSERT |
| CLASS-03 | 02-02 | Teacher sees student list (username, avatar, last active) | ✓ SATISFIED | ClassDetailView roster table with Avatar component |
| CLASS-04 | 02-02 | Teacher assigns deck (built-in or custom) to class | ✓ SATISFIED | AssignDeckModal + classroomStore.assignDeck() |
| CLASS-05 | 02-03 | Student sees assigned decks in dashboard | ✓ SATISFIED | AssignedDecksBanner on SetupScreen |
| CLASS-06 | 02-03 | Join by invite link — auto-joins after login | ✓ SATISFIED | JoinClassRoute + App.tsx pending join handler |
| CLASS-07 | 02-01 | RLS — teacher sees own, student sees own | ✓ SATISFIED | 7 RLS policies + SECURITY DEFINER helpers in migration |
| CLASS-08 | 02-01 | Invite code permanent (no expiry) | ✓ SATISFIED | invite_code NOT NULL UNIQUE, no expires_at column |
| GDPR-04 | 02-02 | Teacher GDPR declaration checkbox when creating class | ✓ SATISFIED | gdprChecked state gates form submit in CreateClassModal |
| TADMIN-01 | 02-05 | Superadmin sees pending teacher requests with email + school | ✓ SATISFIED | TeacherRequestsManager uses get_teacher_requests() RPC, shows email + school columns |
| TADMIN-02 | 02-05 | Superadmin approves/rejects with 1 click | ✓ SATISFIED | approve() + reject() functions with single button click |
| TADMIN-03 | 02-05 | After approval — profiles.roles[] updated | ✓ SATISFIED | approve() calls `profiles.update({ roles: ['teacher', 'player'] })` |
| TADMIN-04 | 02-05 | Notification on approval/rejection | ✓ SATISFIED | Both approve() and reject() call send-notification Edge Function |
| SET-01 | 02-05 (pre-existing) | User can change username | ? NEEDS HUMAN | SettingsModal has username section per SUMMARY; verified section label exists |
| SET-02 | 02-05 (pre-existing) | User can change avatar | ? NEEDS HUMAN | SettingsModal has avatar picker per SUMMARY |
| SET-03 | 02-05 | Language change (SK/CS/EN) in Settings | ✓ SATISFIED | Language selector section in SettingsModal; setLanguage + updateProfile({ locale }) |
| SET-04 | 02-05 (pre-existing) | Privacy toggles — show_stats, show_favorites, show_activity | ? NEEDS HUMAN | SettingsModal has privacy section per SUMMARY |
| DASH-01 | 02-02, 02-04 | Teacher sees class list with student count + last activity | ✓ SATISFIED | ClassListView shows student_count badge + formatRelativeTime(last_activity) |
| DASH-02 | 02-04 | Class detail — roster with assigned decks | ✓ SATISFIED | ClassDetailView shows roster + assignments sections |
| DASH-03 | 02-04 | Deck results — class average + per-student row (score, duration, played_at) | ✓ SATISFIED | ClassResults shows class average row + per-student rows |
| DASH-04 | 02-04 | Color coding green ≥70%, yellow 40-69%, red <40% | ✓ SATISFIED | getScoreColor() returns rgba(34,197,94,0.15)/#22c55e, rgba(234,179,8,0.15)/#eab308, rgba(239,68,68,0.15)/#ef4444 |
| DASH-05 | 02-04 | Export to CSV (client-side) | ✓ SATISFIED | downloadCSV() in ClassResults with Blob text/csv and filename pattern |
| DASH-07 | 02-04 | Onboarding checklist — 3 steps that auto-check | ✓ SATISFIED | OnboardingChecklist with 3 steps, localStorage persistence, auto-dismiss |

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/store/classroomStore.ts` | No Realtime subscription for class_members | ⚠️ Warning | Roster does not update live — violates "real-time" success criterion |
| `src/components/student/AssignedDecksBanner.tsx` | Custom deck click handler only calls `selectDeck(a.set_slug)` — the custom_deck_id branch has a comment but no actual selectDeck call | ℹ️ Info | Clicking a custom-deck name in the banner does not select it in gameStore; only built-in deck slugs work |

---

## Human Verification Required

### 1. Real-Time Roster Update

**Test:** Open `/teacher/class/:id` in a browser as a teacher. In a second browser/tab, join the class via `/join/PX-XXXX` as a student. Watch the teacher's roster.
**Expected:** The new student appears in the roster table without a page refresh.
**Why human:** Requires a live Supabase session with two authenticated users; cannot be verified by file inspection.

### 2. CSV Download Format

**Test:** As a teacher, open a class with at least one assignment and one student with game history. Click "Exportovat CSV".
**Expected:** A CSV file downloads with columns: Student, Score_Percent, Quiz_Correct, Quiz_Total, Duration_Sec, Played_At. Filename format: `{className}_{deckTitle}_{YYYY-MM-DD}.csv`.
**Why human:** CSV file content and download behavior requires browser interaction.

### 3. SettingsModal SET-01, SET-02, SET-04

**Test:** Open Settings modal, change avatar, change username, toggle show_stats.
**Expected:** Each change persists after page refresh.
**Why human:** These were pre-existing features marked in Phase 05 SUMMARY as complete; visual confirmation and persistence across reload require a live session.

---

## Gaps Summary

**1 gap blocking the "real-time" success criterion:**

The ROADMAP Success Criterion explicitly states "Teacher vidí **real-time** zoznam žiakov." The current implementation fetches the class roster once when the detail view mounts (`useEffect([classId, fetchClassDetail])`). There is no Supabase Realtime channel, no polling interval, and no subscription anywhere in `classroomStore.ts` or `TeacherDashboard.tsx`. The roster becomes stale the moment a student joins or their `last_active_at` changes.

**Fix:** Add a Supabase Realtime subscription on the `class_members` table filtered to `class_id = currentClassId` in either the store or the `ClassDetailView`. Alternatively, a 30-second polling interval in `ClassDetailView` would satisfy the spirit of "live results" for a pilot.

**1 minor wiring gap in AssignedDecksBanner:**

The `click` handler for custom-deck names in `AssignedDecksBanner.tsx` has a code comment `// custom deck selection requires full deck data — handled via fetchCustomDeckFull on click` but no actual implementation — clicking a custom deck does nothing (no `selectDeck` or navigation is called). This is a UX gap, not a blocker, but it means custom decks in the banner are not functional as "clickable" deck selectors.

---

*Verified: 2026-03-28*
*Verifier: Claude (gsd-verifier)*
