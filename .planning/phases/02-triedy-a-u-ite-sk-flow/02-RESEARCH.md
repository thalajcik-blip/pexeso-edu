# Phase 2: Triedy a učiteľský flow — Research

**Researched:** 2026-03-28
**Domain:** Classroom management schema (Supabase Postgres + RLS), teacher dashboard UI (React + shadcn/ui), student join flow, CSV export, settings modal, teacher-request admin approval
**Confidence:** HIGH — all findings sourced from codebase inspection and verified against existing Phase 1 patterns

---

## Summary

Phase 2 builds the entire classroom layer that the pilot teacher depends on by April 15. It is the first phase with significant new product surface: three new Postgres tables (`classes`, `class_members`, `class_assignments`), a new route tree for the teacher dashboard, and the student join flow via `/join/PX-XXXX`. All five plans must land as a coherent unit — the schema plan is the hard prerequisite for all four UI plans.

The existing codebase gives this phase a strong foundation. `profiles.roles[]` cleanly separates teachers from players. `authStore.ts` already exposes `profile.roles` to the game-side React tree and `useAuth.ts` serves the admin side. The existing `send-notification` Edge Function (Resend) handles teacher-approval email already — only a new `teacher_rejected` email branch needs to be added. The `TeacherRequestsManager.tsx` already does Supabase direct writes for approve/reject but does NOT yet send a rejection email — this is the main TADMIN gap.

The biggest architectural decision is **where the teacher dashboard lives**: inside `/admin` (existing sidebar) or as a new first-class route in the game app (e.g., `/teacher`). The `/admin` route uses `useAuth.ts` (admin Supabase session) while the main game app uses `authStore.ts` (player Supabase session). Both read the same Supabase project. The teacher dashboard belongs in the **game-side app** (`/teacher` route) because: (a) teachers also play games, (b) the student-facing join flow lives there, (c) the Settings modal is already a game-side component, and (d) the `/admin` route is for superadmins and content editors. A `/teacher` route using BrowserRouter (already present in `main.tsx`) is the cleanest approach.

The Settings modal (`src/components/auth/SettingsModal.tsx`) already implements SET-01 (username), SET-02 (avatar), and SET-04 (privacy toggles). SET-03 (language change) is the only missing piece — it requires calling `useGameStore.getState().setLanguage()` in addition to `updateProfile({ locale })`.

**Primary recommendation:** Execute plans in this order: (1) schema + RLS, (2) teacher-side classroom UI, (3) student join flow, (4) teacher dashboard, (5) TADMIN fix + Settings SET-03 gap. Never skip plan 1 — all four UI plans write to/read from the new tables.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLASS-01 | Teacher creates class with name + generated `PX-XXXX` invite code | New `classes` table; invite code via `crypto.getRandomValues()` (same pattern as existing room codes) |
| CLASS-02 | Student joins via invite code or invite link | `class_members` INSERT; join UI accessible without full registration (player-path login) |
| CLASS-03 | Teacher sees roster: username, avatar, last active | `class_members` JOIN `profiles`; `last_active_at` column updated on game completion |
| CLASS-04 | Teacher assigns built-in or custom deck to class | `class_assignments` table; supports both `set_slug` (built-in) and `custom_deck_id` (FK to `custom_decks`) |
| CLASS-05 | Student sees assigned decks in their dashboard | Query `class_assignments` via `class_members`; display in student dashboard / assigned-decks banner |
| CLASS-06 | `/join/PX-XXXX` auto-adds student after login | Route handler in `main.tsx` + `App.tsx`; store invite code in `sessionStorage`, insert `class_members` after auth |
| CLASS-07 | RLS: teacher sees own classes, student sees own memberships | SECURITY DEFINER helpers `is_class_teacher(class_id)` + `is_class_member(class_id)`; RLS on all 3 tables |
| CLASS-08 | Invite code is permanent (no expiry for MVP) | No `expires_at` column; `invite_code` UNIQUE NOT NULL on `classes` |
| GDPR-04 | Teacher declaration checkbox when creating class | Checkbox in create-class form; `gdpr_confirmed_at` timestamptz on `classes` table; not nullable |
| TADMIN-01 | Superadmin sees list of pending teacher requests | `TeacherRequestsManager.tsx` already does this; no new work |
| TADMIN-02 | Superadmin approves/rejects in 1 click | Already implemented; rejection email missing (see TADMIN-04) |
| TADMIN-03 | On approval — `profiles.roles[]` updated to `['player','teacher']` | Already implemented in `TeacherRequestsManager.tsx:39-42` |
| TADMIN-04 | Notification to teacher after approval/rejection | Approval email already works; rejection email branch missing in `send-notification/index.ts` |
| SET-01 | User can change username | Already in `SettingsModal.tsx`; no new work |
| SET-02 | User can change avatar | Already in `SettingsModal.tsx`; no new work |
| SET-03 | User can change language (SK/CS/EN) | NOT yet in `SettingsModal.tsx`; need to add language selector + `setLanguage()` call |
| SET-04 | Privacy toggles — `show_stats`, `show_favorites`, `show_activity` | Already in `SettingsModal.tsx`; no new work |
| DASH-01 | Teacher sees class list with student count + last activity | `/teacher` route; query `classes` + `class_members` count + max `last_active_at` |
| DASH-02 | Class detail — roster with assigned decks (green check / grey dash) | Join `class_members` + `class_assignments`; per-student assignment status |
| DASH-03 | Deck results — class avg score, per-student row (score, duration, played_at) | Join `game_history` on `user_id` + `set_slug` / `custom_deck_id`; aggregate per student |
| DASH-04 | Color coding — green >=70%, yellow 40-69%, red <40% | Client-side derived from `quiz_correct / quiz_total` ratio |
| DASH-05 | CSV export — client-side from query result | `encodeURIComponent` + `data:text/csv` blob download; no server needed |
| DASH-07 | Onboarding checklist — 3 steps: create class, assign deck, share link | Zustand or `localStorage` tracks completion state; auto-check when actions are taken |
</phase_requirements>

---

## Standard Stack

### Core — No new npm packages needed

All required functionality is achievable with the existing stack:

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@supabase/supabase-js` | 2.100.1 | DB queries, RLS, Realtime | Already installed |
| `react-router-dom` | 7.13.1 | `/teacher`, `/join/:code` routes | Already installed |
| `zustand` | 5.0.11 | Teacher dashboard state | Already installed |
| `shadcn/ui` components | (installed) | `Button`, `Input`, `Dialog`, `Badge`, `Card`, `Skeleton` | Already installed |
| `lucide-react` | 0.577.0 | Icons (clipboard, check, users, etc.) | Already installed |
| `sonner` | 2.0.7 | Toast notifications (copy-to-clipboard, join success) | Already installed |

**No new npm installs needed.** CSV export uses browser-native `Blob` + `URL.createObjectURL`. Invite code generation uses `crypto.getRandomValues()` (already the project standard).

### New Database Objects

| Object | Type | Purpose |
|--------|------|---------|
| `classes` | Table | CLASS-01: teacher's class with invite code |
| `class_members` | Table | CLASS-02/03/07: student membership records |
| `class_assignments` | Table | CLASS-04/05: deck-to-class assignments |
| `is_class_teacher(class_id uuid)` | SQL Function SECURITY DEFINER | CLASS-07: RLS helper |
| `is_class_member(class_id uuid)` | SQL Function SECURITY DEFINER | CLASS-07: RLS helper |
| `gdpr_confirmed_at` | Column on `classes` | GDPR-04: teacher declaration timestamp |

---

## Architecture Patterns

### Recommended Project Structure for Phase 2

```
src/
├── components/
│   ├── teacher/               # NEW — all teacher dashboard components
│   │   ├── TeacherDashboard.tsx     # DASH-01: class list
│   │   ├── ClassDetail.tsx          # DASH-02/03: roster + results
│   │   ├── CreateClassModal.tsx     # CLASS-01 + GDPR-04
│   │   ├── InviteCodeDisplay.tsx    # CLASS-01 copyable code + link
│   │   ├── AssignDeckModal.tsx      # CLASS-04
│   │   └── OnboardingChecklist.tsx  # DASH-07
│   ├── student/               # NEW — student-facing classroom components
│   │   └── AssignedDecksBanner.tsx  # CLASS-05
│   └── auth/
│       └── SettingsModal.tsx  # EXTEND: add SET-03 language selector
├── store/
│   └── classroomStore.ts      # NEW — Zustand store for classroom state
supabase/
└── migrations/
    └── 20260328_classroom_schema.sql   # NEW — all 3 tables + RLS
```

### Pattern 1: SECURITY DEFINER Helper Functions for RLS

**What:** Helper SQL functions that bypass the RLS caller check — used to write clean, non-recursive RLS policies.
**When to use:** Whenever an RLS policy needs to JOIN another RLS-protected table (e.g., checking if a user is a member of a class to authorize access to class data). Without SECURITY DEFINER, Postgres evaluates the helper function's own RLS context, causing infinite recursion or permission denial.

**Example (matching Phase 1's `is_superadmin()` pattern):**
```sql
-- Source: Phase 1 pattern from 20260327220313_gdpr_consent_schema.sql
CREATE OR REPLACE FUNCTION is_class_teacher(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM classes
    WHERE id = p_class_id AND teacher_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_class_member(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM class_members
    WHERE class_id = p_class_id AND user_id = auth.uid()
  );
$$;
```

### Pattern 2: Invite Code Generation (PX-XXXX Format)

**What:** Cryptographically random 4-character alphanumeric code prefixed with `PX-`.
**When to use:** CLASS-01 class creation. Must match existing project standard (`crypto.getRandomValues()`).

```typescript
// Source: Existing pattern from src/admin/DeckEditor.tsx + multiplayerService.ts
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O, 1/I ambiguity
  const arr = new Uint8Array(4)
  crypto.getRandomValues(arr)
  return 'PX-' + Array.from(arr).map(b => chars[b % chars.length]).join('')
}
```

### Pattern 3: /join/:code Route — Deep Link with Post-Auth Redirect

**What:** Anonymous user clicks `/join/PX-XXXX`. App stores the invite code in `sessionStorage`, prompts login, then on `SIGNED_IN` event runs the `class_members` INSERT.
**When to use:** CLASS-02/CLASS-06. Mirrors existing `?room=` handling in `authStore.ts:241`.

```typescript
// Source: Derived from existing authStore.ts room join pattern (line 241-244)
// In App.tsx or a dedicated JoinRoute component:
useEffect(() => {
  const pending = sessionStorage.getItem('pexedu_pending_join')
  if (pending && user) {
    supabase.from('class_members').upsert({
      class_id: pending,  // looked up by invite_code
      user_id: user.id,
    }, { onConflict: 'class_id,user_id' }).then(() => {
      sessionStorage.removeItem('pexedu_pending_join')
    })
  }
}, [user])
```

### Pattern 4: game_history JOIN for Dashboard Results (DASH-03)

**What:** `game_history` table already exists (queried in `DashboardModal.tsx`). For class results, filter by `user_id IN (class member IDs)` and join on `set_slug` or look for custom deck matches.
**When to use:** DASH-03 per-student score table.

The `game_history` table has columns: `id`, `set_title`, `set_slug`, `game_mode`, `is_multiplayer`, `quiz_correct`, `quiz_total`, `total_pairs`, `played_at`, `user_id`. For class assignment results, query as:

```sql
SELECT
  cm.user_id,
  p.username,
  p.avatar_id,
  gh.quiz_correct,
  gh.quiz_total,
  gh.played_at,
  extract(epoch from (gh.played_at - gh.started_at)) as duration_s
FROM class_members cm
JOIN profiles p ON p.id = cm.user_id
LEFT JOIN game_history gh ON gh.user_id = cm.user_id
  AND (gh.set_slug = $assignment_slug OR gh.custom_deck_id = $assignment_deck_id)
WHERE cm.class_id = $class_id
ORDER BY p.username;
```

Note: `game_history` may not have `custom_deck_id` or `started_at` columns yet. Check actual schema and add columns if missing.

### Pattern 5: /teacher Route Registration

**What:** Add `/teacher` as a new top-level route in `main.tsx`, parallel to `/admin` and `/profile`.
**When to use:** The teacher dashboard is a game-side authenticated feature, not an admin tool.

```typescript
// Source: Existing pattern in src/main.tsx (lines 23-33)
const isAdmin    = window.location.pathname.startsWith('/admin')
const isProfile  = window.location.pathname.startsWith('/profile/')
const isTeacher  = window.location.pathname.startsWith('/teacher')
const isJoin     = window.location.pathname.startsWith('/join/')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdmin
      ? <BrowserRouter><AdminApp /></BrowserRouter>
      : isTeacher
        ? <BrowserRouter><TeacherApp /></BrowserRouter>
        : isJoin
          ? <JoinRoute />
          : isProfile
            ? <ProfilePage />
            : <App />}
  </StrictMode>
)
```

### Pattern 6: CSV Export (DASH-05)

**What:** Client-side CSV generation from a JS array of objects. No server or library needed.
**When to use:** DASH-05 export button in class results view.

```typescript
// Source: Standard browser pattern — no library needed
function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

### Anti-Patterns to Avoid

- **Don't put the teacher dashboard inside `/admin`:** The admin app uses `useAuth.ts` (admin Supabase session). Teachers are primarily players who also teach. The `/teacher` route with `authStore.ts` (player session) is the correct home.
- **Don't write class invite code with `Math.random()`:** Project standard is `crypto.getRandomValues()`. Using `Math.random()` is predictable and was explicitly fixed in TECH-04 (Phase 1).
- **Don't use Supabase Realtime for the teacher dashboard:** Polling suffices for results (confirmed in ROADMAP.md: "Realtime reserved for multiplayer"). Use a manual refresh button or `useEffect` on mount.
- **Don't skip the UPSERT conflict clause on `class_members`:** Without `ON CONFLICT (class_id, user_id) DO NOTHING`, double-clicking the join link creates duplicate rows that break the roster count.
- **Don't check `profiles.roles[]` in client code for teacher guard:** Use RLS on the `classes` table (`teacher_id = auth.uid()`). Client-side role checks are UI hints only.
- **Don't add `expires_at` to invite codes for MVP:** CLASS-08 explicitly says invite codes are permanent. Adding expiry logic now is scope creep.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Invite code uniqueness | Custom retry loop | Postgres `UNIQUE` constraint + client retry on conflict error | DB handles uniqueness atomically; client catches `23505` error code |
| CSV generation | Papa Parse or similar lib | Native `Blob` + `URL.createObjectURL` (see Pattern 6) | Zero dependency, 8 lines of code |
| Role guard on teacher routes | Custom middleware | Supabase RLS `teacher_id = auth.uid()` on `classes` table | Server-enforced; client UI simply shows empty state |
| Email for teacher rejection | New Edge Function | Add branch to existing `send-notification/index.ts` | Resend already configured; FROM/TO pattern already in place |
| Onboarding checklist persistence | DB table | `localStorage` keyed by `class_id` | Checklist is ephemeral UX aid, not auditable data |

---

## Runtime State Inventory

> Phase 2 is a greenfield build — no renames or refactors. Runtime state inventory not applicable.

None — this phase creates new tables and new UI. No existing strings are renamed.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | Migration deploy | Yes | 2.75.0 | — |
| Node.js | Build / Vite | Yes | 24.14.0 | — |
| `@supabase/supabase-js` | DB queries | Yes | 2.100.1 | — |
| Resend API (send-notification fn) | TADMIN-04 rejection email | Yes (configured) | — | Skip email, log only |
| `react-router-dom` v7 | `/teacher` + `/join/:code` routes | Yes | 7.13.1 | — |
| shadcn/ui components | Teacher dashboard UI | Yes (all needed components installed) | — | — |

**Missing dependencies with no fallback:** None.

---

## Common Pitfalls

### Pitfall 1: game_history Missing Columns for Dashboard

**What goes wrong:** DASH-03 needs to match game results to specific deck assignments. `game_history` has `set_slug` for built-in decks but likely has no `custom_deck_id` column. Duration computation needs `started_at` which also may not exist.
**Why it happens:** `game_history` was built for personal dashboards, not teacher analytics.
**How to avoid:** Before writing the dashboard query, run `\d game_history` in Supabase SQL Editor to check actual columns. If `custom_deck_id` or `started_at` are missing, add them in the classroom schema migration.
**Warning signs:** Dashboard shows results only for built-in decks; custom deck games never appear in teacher view.

### Pitfall 2: `/join/PX-XXXX` Race Between Route Render and Auth State

**What goes wrong:** User clicks join link → app renders → auth state is `null` while Supabase session restores from `localStorage` → join logic runs before `user` is set → class_members INSERT fails silently.
**Why it happens:** `supabase.auth.getSession()` is async; `onAuthStateChange` fires slightly later.
**How to avoid:** Store the pending invite code in `sessionStorage` first. Run the actual INSERT inside the `SIGNED_IN` auth state change handler (or in a `useEffect` that watches `user !== null`). Mirror the existing `?room=` param handling in `authStore.ts:241-244`.
**Warning signs:** Student clicks join link, gets redirected to login, logs in, sees empty dashboard with no class added.

### Pitfall 3: RLS Recursive Loop on class_members

**What goes wrong:** If the RLS policy on `class_members` calls a function that itself queries `class_members`, Postgres throws `ERROR: infinite recursion detected in policy for relation "class_members"`.
**Why it happens:** Naive implementation like `USING (EXISTS (SELECT 1 FROM class_members WHERE ...))` recurses.
**How to avoid:** Use SECURITY DEFINER helper functions `is_class_teacher()` and `is_class_member()` that query `classes` and `class_members` respectively — these bypass the RLS context of the caller. Pattern from Phase 1's `is_superadmin()` function.
**Warning signs:** Any query to `class_members` returns a Postgres error about infinite recursion; superadmin also cannot read the table.

### Pitfall 4: Teacher Dashboard in Wrong Auth Context

**What goes wrong:** If teacher dashboard is placed inside `/admin`, it uses `useAuth.ts` (admin session). The admin session and the player session are BOTH connected to the same Supabase project, but they are managed by two different React trees. A teacher who is not a superadmin cannot reach `/admin` (AdminApp blocks with "Čekáme na schválení" screen when role is null or teacher).
**Why it happens:** `AdminApp.tsx` only renders the layout for `AdminRole = 'superadmin' | 'teacher'` where `teacher` means admin-context teacher, not game-context teacher.
**How to avoid:** Place teacher dashboard at `/teacher` in the game-side React tree using `authStore.ts`.
**Warning signs:** Teacher logs in to `/admin`, sees "Čekáme na schválení" because `useAuth.ts` returns `role = null` for non-superadmin-approved users.

### Pitfall 5: Duplicate class_members rows on repeat join

**What goes wrong:** Student clicks join link twice (or link is clicked after already joined). Two rows are inserted with the same `class_id + user_id`. Roster count shows student twice. Dashboard shows duplicate results.
**Why it happens:** Standard INSERT does not check for existing rows.
**How to avoid:** Use `supabase.from('class_members').upsert({...}, { onConflict: 'class_id,user_id' })`. The DB `UNIQUE(class_id, user_id)` constraint is the source of truth.
**Warning signs:** Roster count > actual student count; per-student results appear duplicated in teacher dashboard.

### Pitfall 6: GDPR-04 Checkbox Not Persisted as Timestamp

**What goes wrong:** GDPR-04 requires that the teacher's declaration be auditable (they confirmed "the school has parental consent"). Storing it as a boolean can be argued as insufficient for GDPR audit trail.
**Why it happens:** Checkboxes naturally map to booleans.
**How to avoid:** Store `gdpr_confirmed_at timestamptz NOT NULL` on the `classes` table. Set to `now()` on class creation. Not nullable — cannot create class without confirming. This is a proven pattern from `child_consents`.
**Warning signs:** DB has `gdpr_accepted boolean` instead of `gdpr_confirmed_at timestamptz`.

---

## Code Examples

### SQL Schema for classes, class_members, class_assignments

```sql
-- Source: Derived from existing Phase 1 migration patterns

CREATE TABLE classes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name             text NOT NULL,
  invite_code      text NOT NULL UNIQUE,
  gdpr_confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_classes_invite_code ON classes(invite_code);

CREATE TABLE class_members (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id       uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at      timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz,
  UNIQUE(class_id, user_id)
);

CREATE INDEX idx_class_members_class ON class_members(class_id);
CREATE INDEX idx_class_members_user ON class_members(user_id);

CREATE TABLE class_assignments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id       uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  set_slug       text,         -- built-in deck slug (e.g., 'flags', 'animals')
  custom_deck_id uuid REFERENCES custom_decks(id) ON DELETE SET NULL,
  assigned_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_deck_type CHECK (
    (set_slug IS NOT NULL AND custom_deck_id IS NULL) OR
    (set_slug IS NULL AND custom_deck_id IS NOT NULL)
  )
);

CREATE INDEX idx_class_assignments_class ON class_assignments(class_id);
```

### RLS Policies

```sql
-- Source: Phase 1 SECURITY DEFINER pattern

ALTER TABLE classes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_assignments ENABLE ROW LEVEL SECURITY;

-- Teacher manages own classes
CREATE POLICY "teacher_manages_own_classes" ON classes
  FOR ALL USING (teacher_id = auth.uid());

-- Authenticated users can read class by invite code (for join flow)
CREATE POLICY "anyone_reads_class_by_invite" ON classes
  FOR SELECT USING (auth.uid() IS NOT NULL);
-- Note: this is intentionally broad for the join flow; tighten post-MVP

-- class_members: teacher can see all members of their classes
CREATE POLICY "teacher_sees_class_members" ON class_members
  FOR SELECT USING (is_class_teacher(class_id));

-- class_members: student can see own memberships
CREATE POLICY "member_sees_own_membership" ON class_members
  FOR SELECT USING (user_id = auth.uid());

-- class_members: student can join (INSERT) — membership check happens at INSERT
CREATE POLICY "anyone_can_join_class" ON class_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- class_assignments: teacher manages, members can read
CREATE POLICY "teacher_manages_assignments" ON class_assignments
  FOR ALL USING (is_class_teacher(class_id));

CREATE POLICY "member_reads_assignments" ON class_assignments
  FOR SELECT USING (is_class_member(class_id));
```

### Rejection Email Branch in send-notification

```typescript
// Source: Extend existing supabase/functions/send-notification/index.ts
// Add after the existing 'teacher_approved' branch:

if (type === 'teacher_rejected' && userId) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: userData } = await supabase.auth.admin.getUserById(userId)
  const userEmail = userData?.user?.email
  if (!userEmail) return new Response(JSON.stringify({ skipped: 'no_email' }), { status: 200 })

  await sendEmail(
    userEmail,
    'Žiadosť o učiteľský účet na Pexedu',
    `<p>Bohužiaľ, vaša žiadosť o učiteľský účet nebola schválená.</p>`
  )
  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
```

### Language Selector Addition to SettingsModal (SET-03 gap)

```typescript
// Source: SettingsModal already uses useGameStore(s => s.language)
// Add to saveProfile handler:
const setLanguage = useGameStore(s => s.setLanguage)

async function saveLanguage(lang: 'cs' | 'sk' | 'en') {
  setLanguage(lang)                              // updates Zustand + localStorage
  await updateProfile({ locale: lang } as never) // persists to profiles.locale
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `user_roles` table for admin auth | `profiles.roles[]` array | Phase 1 (2026-03-27) | Teacher role is now in profiles; no separate table needed |
| RLS via direct `auth.uid()` checks | SECURITY DEFINER helper functions | Phase 1 pattern | Prevents recursive policy errors; required for classroom RLS |
| `Math.random()` for codes | `crypto.getRandomValues()` | Phase 1 (TECH-04) | Required for all new code generation in this project |

**Deprecated in this codebase:**
- `user_roles` table: dropped in Phase 1 migration `20260327220449_drop_user_roles.sql`
- Direct `user_roles` writes in any TypeScript: all removed in Phase 1

---

## Open Questions

1. **game_history columns for custom decks in DASH-03**
   - What we know: `game_history` has `set_slug`, `quiz_correct`, `quiz_total`, `played_at` — confirmed from `DashboardModal.tsx` query
   - What's unclear: Does `game_history` have `custom_deck_id`? Does it have `started_at` for duration? Cannot confirm without `\d game_history` against live DB
   - Recommendation: Plan 1 (schema) should include `ALTER TABLE game_history ADD COLUMN IF NOT EXISTS custom_deck_id uuid` and `ADD COLUMN IF NOT EXISTS started_at timestamptz`. Set `started_at` at game start in `gameService.ts`.

2. **Anonymous student join (no account)**
   - What we know: ROADMAP.md confirmed "Anonymous play as default student path — YES"
   - What's unclear: How does an anonymous student (no Supabase auth user) get stored in `class_members`? The `user_id` FK references `profiles(id)` which requires a real auth user
   - Recommendation: For MVP Phase 2, require login to join a class (`authStore.openAuthModal()` if not signed in). Anonymous play for classroom games can be a Phase 3+ feature. Document this decision in the plan.

3. **Teacher route guard — how to prevent non-teachers from accessing /teacher**
   - What we know: `profile.roles` is available in `authStore`
   - What's unclear: Should `/teacher` redirect to login if unauthenticated, or show a landing page?
   - Recommendation: Redirect to login with `openAuthModalForLogin()` if no `user`. If `user` exists but lacks `teacher` role, show "Access requires teacher role" + teacher request CTA.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no `pytest.ini`, `jest.config.*`, `vitest.config.*` or `__tests__/` directory found |
| Config file | None — Wave 0 must create |
| Quick run command | (not available until Wave 0) |
| Full suite command | (not available until Wave 0) |

Note: The project has no automated test infrastructure. Phase 2 has significant DB schema work (migrations) and branching logic (join flow, RLS). Manual verification is the current approach (matching Phase 1's `01-VERIFICATION.md` pattern).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Available |
|--------|----------|-----------|-------------------|-----------|
| CLASS-01 | Teacher creates class, gets PX-XXXX code | manual | — | No infra |
| CLASS-02 | Student joins via code | manual | — | No infra |
| CLASS-06 | `/join/PX-XXXX` auto-joins after login | manual (browser) | — | No infra |
| CLASS-07 | Teacher cannot see other teachers' classes | manual (2 accounts) | — | No infra |
| GDPR-04 | Class creation blocked without checkbox | manual | — | No infra |
| TADMIN-04 | Rejection email sent | manual (check inbox) | — | No infra |
| DASH-05 | CSV downloads with correct data | manual | — | No infra |

### Sampling Rate

Given no test infrastructure exists, the equivalent "gate" is the GSD Verification pass at phase end. Each plan should include observable truths verifiable by code inspection (matching Phase 1 VERIFICATION.md format).

### Wave 0 Gaps

The project has no test framework. Rather than establishing one now (which is out of scope for Phase 2), plans should continue the Phase 1 pattern of code-inspection verification + human verification checklist items.

---

## Sources

### Primary (HIGH confidence)

- `/Users/tomashalajcik/pexeso-edu/src/store/authStore.ts` — profiles.roles[] source of truth, existing join/auth patterns
- `/Users/tomashalajcik/pexeso-edu/src/main.tsx` — routing pattern for new routes
- `/Users/tomashalajcik/pexeso-edu/supabase/migrations/20260322_user_roles_phase1.sql` — SECURITY DEFINER and RLS pattern
- `/Users/tomashalajcik/pexeso-edu/supabase/migrations/20260327220313_gdpr_consent_schema.sql` — consent timestamp pattern (GDPR-04 reference)
- `/Users/tomashalajcik/pexeso-edu/src/components/auth/SettingsModal.tsx` — SET-01/02/04 already implemented; SET-03 gap confirmed
- `/Users/tomashalajcik/pexeso-edu/src/admin/TeacherRequestsManager.tsx` — TADMIN-01/02/03 already implemented; TADMIN-04 rejection gap confirmed
- `/Users/tomashalajcik/pexeso-edu/src/components/auth/DashboardModal.tsx` — game_history query columns confirmed
- `/Users/tomashalajcik/pexeso-edu/supabase/functions/send-notification/index.ts` — Resend email pattern, `teacher_approved` already works
- `/Users/tomashalajcik/pexeso-edu/.planning/phases/01-z-klady-a-role-syst-m/01-VERIFICATION.md` — Phase 1 completion status confirmed

### Secondary (MEDIUM confidence)

- Supabase RLS SECURITY DEFINER pattern — verified from existing codebase; consistent with Supabase official documentation on recursive policy prevention
- `crypto.getRandomValues()` for invite code generation — verified from Phase 1 TECH-04 fix in `DeckEditor.tsx` and `multiplayerService.ts`

### Tertiary (LOW confidence — flag for validation)

- `game_history` column set (specifically `custom_deck_id`, `started_at`) — inferred from `DashboardModal.tsx` query which does NOT include these columns; actual table schema not confirmed against live DB

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed from `package.json`
- Schema design: HIGH — follows established Phase 1 migration patterns exactly
- RLS patterns: HIGH — SECURITY DEFINER pattern verified from Phase 1 code
- Settings SET-03 gap: HIGH — confirmed by reading `SettingsModal.tsx` (no language selector present)
- TADMIN-04 gap: HIGH — confirmed by reading `TeacherRequestsManager.tsx` (rejection path has no email call)
- game_history columns: LOW — need `\d game_history` confirmation against live DB
- Anonymous join semantics: MEDIUM — ROADMAP confirmed anon play, but class membership FK requires resolution

**Research date:** 2026-03-28
**Valid until:** 2026-04-15 (phase deadline) — schema is stable, no fast-moving dependencies
