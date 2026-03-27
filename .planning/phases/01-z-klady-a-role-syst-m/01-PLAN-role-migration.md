# Plan: Role Migration
**Phase:** 1 — Základy a role systém
**Goal:** `user_roles` tabuľka je zmazaná; admin app číta roly výlučne z `profiles.roles[]`; všetky tri admin write-paths sú migrované; `get_users_with_roles` RPC nereferencuje `user_roles`
**Requirements:** ROLE-01, ROLE-02, ROLE-03, ROLE-04
**Estimated complexity:** Medium

---

## Context

Codebase is in split-brain state. Player-side (`authStore.ts`) already reads `profiles.roles[]`. Admin-side (`useAuth.ts`) still queries the legacy `user_roles` table in `fetchRole()` and writes to it in `signUp()`. Three other admin files also write to `user_roles` directly.

The backfill migration (`20260322_user_roles_phase1.sql`) has already run — `profiles.roles[]` is populated. Do NOT re-run it.

The `UsersManager.tsx` component calls a `get_users_with_roles` RPC that JOINs `user_roles`. This RPC must be rewritten before the table is dropped, or `UsersManager` will break silently after the drop.

Execution order: TypeScript changes first → RPC rewrite → staging verification → drop table.

---

## Tasks

### Task 1: Rewrite `useAuth.ts` to read roles from `profiles.roles[]`

**File:** `src/admin/useAuth.ts`

**What:** Remove all references to `user_roles` table. Two changes required.

**How:**

**Change 1 — `fetchRole()` (lines 14–18):**

Replace the existing query:
```typescript
// OLD — remove this:
const { data } = await supabase.from('user_roles').select('role').eq('user_id', uid).single()
const role = data?.role ?? null
setRole(role as AdminRole)
```

With:
```typescript
// NEW:
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

**Change 2 — `signUp()` (lines 59–61):**

Find the block that inserts into `user_roles` after account creation (it looks like `supabase.from('user_roles').insert(...)` or `upsert`). Delete that entire insert/upsert call. The `profiles` row is created by DB trigger with `roles: ['player']` by default — no manual insert needed.

---

### Task 2: Remove `user_roles` writes from `TeacherRequestsManager.tsx` and `UsersManager.tsx`

**Files:**
- `src/admin/TeacherRequestsManager.tsx`
- `src/admin/UsersManager.tsx`

**What:** Both files write to `user_roles`. Remove those writes; `profiles.roles[]` is already the source of truth.

**How — `TeacherRequestsManager.tsx` `approve()` (line ~44):**

Find the `user_roles` upsert call inside `approve()`. It looks like:
```typescript
await supabase.from('user_roles').upsert({ user_id: request.user_id, role: 'teacher' })
```
Delete only this line. The `profiles.update({ roles: [...] })` call that follows must stay — it is the correct write path.

**How — `UsersManager.tsx` `setRole()` (lines 77–86):**

Replace the entire `setRole` function body (which currently does DML on `user_roles`) with:
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

**How — rewrite `get_users_with_roles` RPC:**

`UsersManager.tsx:30` calls `supabase.rpc('get_users_with_roles')`. This RPC JOINs `user_roles` — it must be replaced before dropping the table.

Create a new Supabase migration file `supabase/migrations/$(date +%Y%m%d%H%M%S)_rewrite_get_users_with_roles.sql` with:
```sql
CREATE OR REPLACE FUNCTION get_users_with_roles()
RETURNS TABLE (
  id           uuid,
  username     text,
  email        text,
  roles        text[],
  created_at   timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.username,
    a.email,
    p.roles,
    p.created_at
  FROM profiles p
  JOIN auth.users a ON a.id = p.id
  ORDER BY p.created_at DESC;
$$;
```

Apply via `supabase db push` or Supabase Dashboard SQL editor.

---

### Task 3: Remove dead code from Edge Functions and drop `user_roles`

**Files:**
- `supabase/functions/delete-user/index.ts`
- `supabase/functions/send-notification/index.ts`

**What:** Remove `user_roles` references from both Edge Functions. Then drop the table.

**How — `delete-user/index.ts`:**

Lines 32–40 contain a SELECT on `user_roles` to check if the target user is a superadmin:
```typescript
// OLD — find and replace:
const { data: roleData } = await adminClient.from('user_roles').select('role').eq('user_id', targetUserId).single()
const targetIsSuperadmin = roleData?.role === 'superadmin'
```

Replace with:
```typescript
const { data: profileData } = await adminClient.from('profiles').select('roles').eq('id', targetUserId).single()
const targetIsSuperadmin = (profileData?.roles ?? []).includes('superadmin')
```

Line 45 contains a `user_roles.delete()` call — delete this line entirely.

**How — `send-notification/index.ts`:**

Lines 91–106 handle a `type === 'INSERT'` webhook event for `user_roles` table. This is dead code after migration. Delete the entire `if (type === 'INSERT' && record?.user_id && record?.role)` branch.

**How — drop the table:**

Create migration file `supabase/migrations/$(date +%Y%m%d%H%M%S)_drop_user_roles.sql`:
```sql
-- Safe to run only after TypeScript changes are deployed and verified in staging
DROP TABLE IF EXISTS user_roles;
```

Apply via `supabase db push`. Run this last, after verifying admin login + role display on staging.

---

## DB Migrations

Two new migration files (create with timestamped names, apply in order):

**Migration 1 — rewrite RPC:**
```sql
CREATE OR REPLACE FUNCTION get_users_with_roles()
RETURNS TABLE (
  id           uuid,
  username     text,
  email        text,
  roles        text[],
  created_at   timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.username,
    a.email,
    p.roles,
    p.created_at
  FROM profiles p
  JOIN auth.users a ON a.id = p.id
  ORDER BY p.created_at DESC;
$$;
```

**Migration 2 — drop legacy table (run last):**
```sql
DROP TABLE IF EXISTS user_roles;
```

---

## Tests / Verification

1. **Admin login as superadmin:** Log in to `/admin` → role shown as `superadmin` → no `user_roles` query in Supabase Dashboard logs.

2. **Admin login as teacher:** Log in as a teacher account → role shown as `teacher` → no errors.

3. **Users list loads:** `/admin/users` renders the full user list with roles column populated.

4. **Role change:** Change a user's role in UsersManager → reload page → role persists → `profiles.roles[]` updated (check in Supabase Table Editor).

5. **Teacher approval:** Approve a pending teacher request in TeacherRequestsManager → `profiles.roles` contains `teacher` → no `user_roles` insert in DB logs.

6. **Table dropped:** Run `SELECT * FROM user_roles;` in Supabase SQL editor → returns `relation "user_roles" does not exist`.

7. **grep check (no regressions):**
   ```bash
   grep -rn "user_roles" src/ supabase/functions/
   ```
   Must return zero matches.

---

## Commit message

`feat(role-migration): migrate admin auth from user_roles to profiles.roles[], drop legacy table`
