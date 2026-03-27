# Architecture Research
_pexedu Q2 2026_

---

## Role Migration Strategy (user_roles → profiles.roles[])

**Current state (confirmed from codebase):**
- `src/store/authStore.ts` already reads from `profiles.roles[]` — player-side is migrated
- `src/admin/useAuth.ts` still reads from legacy `user_roles` table (`fetchRole` + `signUp` functions)
- Two independent auth contexts exist — they don't share state

**Migration strategy (safe, zero-downtime):**

**Step 1 — Backfill profiles.roles[]** (migration)
```sql
-- Ensure every user_roles entry is reflected in profiles.roles
UPDATE profiles p
SET roles = array_append(
  COALESCE(roles, '{player}'),
  ur.role::text
)
FROM user_roles ur
WHERE ur.user_id = p.id
  AND NOT (roles @> ARRAY[ur.role::text]);
```

**Step 2 — Update useAuth.ts**
Replace `user_roles` table queries with `profiles` reads:
```ts
// fetchRole — replace:
const { data } = await supabase.from('user_roles').select('role').eq('user_id', uid).single()
// with:
const { data } = await supabase.from('profiles').select('roles').eq('id', uid).single()
const role = data?.roles?.includes('superadmin') ? 'superadmin'
           : data?.roles?.includes('teacher') ? 'teacher' : null
```

**Step 3 — Verify in staging, then drop:**
```sql
DROP TABLE IF EXISTS user_roles;
```

**Risk:** Low if Step 1 runs first. The legacy table is only read (never written) by the current admin UI.

---

## Classroom RLS Design

**Key principle:** Use `SECURITY DEFINER` helper functions — avoids repeated subqueries in policies and is dramatically faster.

```sql
-- Helper functions
CREATE OR REPLACE FUNCTION is_class_teacher(class_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_class_member(class_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM class_members
    WHERE class_id = class_id AND user_id = auth.uid() AND status = 'active'
  );
$$;
```

**Policies for `classes`:**
```sql
-- Teachers own their classes
CREATE POLICY "teacher_owns_class" ON classes
  FOR ALL USING (teacher_id = auth.uid());

-- Members can view classes they belong to
CREATE POLICY "member_views_class" ON classes
  FOR SELECT USING (is_class_member(id));
```

**Policies for `class_members`:**
```sql
-- Teacher manages members
CREATE POLICY "teacher_manages_members" ON class_members
  FOR ALL USING (is_class_teacher(class_id));

-- Students see their own membership
CREATE POLICY "student_sees_own" ON class_members
  FOR SELECT USING (user_id = auth.uid());
```

**⚠️ Warning:** Do NOT use `auth.jwt()` for role checks in RLS — Supabase does NOT auto-populate custom claims into the JWT. Always read from `profiles.roles[]` via a helper function.

**Index requirements:**
```sql
CREATE INDEX ON classes(teacher_id);
CREATE INDEX ON class_members(class_id, user_id);
CREATE INDEX ON class_members(user_id, class_id); -- for student-side queries
```

---

## Classes Schema

**Three-table design** (keeps `game_history` generic — no FK needed):

```sql
-- Core class table
CREATE TABLE classes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         text NOT NULL,
  invite_code  text UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 6),
  description  text,
  is_active    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

-- Membership (students join classes)
CREATE TABLE class_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'active', -- 'active' | 'pending' | 'removed'
  joined_at  timestamptz DEFAULT now(),
  UNIQUE(class_id, user_id)
);

-- Optional: teacher assigns specific decks to a class
CREATE TABLE class_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  deck_slug       text,                        -- built-in deck
  custom_deck_id  uuid REFERENCES custom_decks(id),
  assigned_at     timestamptz DEFAULT now(),
  due_at          timestamptz,
  CHECK (deck_slug IS NOT NULL OR custom_deck_id IS NOT NULL)
);
```

**Joining game results to class context** (no schema change to `game_history`):
```sql
-- Teacher view: results of class members for a specific deck
SELECT gh.*, p.username, p.avatar_id
FROM game_history gh
JOIN class_members cm ON cm.user_id = gh.user_id AND cm.class_id = $class_id
JOIN profiles p ON p.id = gh.user_id
WHERE gh.custom_deck_id = $deck_id
   OR gh.set_slug = $set_slug
ORDER BY gh.played_at DESC;
```

---

## Stripe ↔ Supabase Sync Pattern

**Architecture:** Supabase Edge Function as Stripe webhook receiver.

**Step 1 — Add subscription fields to profiles:**
```sql
ALTER TABLE profiles ADD COLUMN subscription_tier text DEFAULT 'free'; -- 'free' | 'pro' | 'school'
ALTER TABLE profiles ADD COLUMN stripe_customer_id text UNIQUE;
ALTER TABLE profiles ADD COLUMN subscription_expires_at timestamptz;
```

**Step 2 — Checkout session (client-side):**
```ts
// Pass supabase user_id in metadata so webhook can map back
const session = await stripe.checkout.sessions.create({
  metadata: { supabase_user_id: user.id },
  // ...
})
```

**Step 3 — Webhook Edge Function:**
```ts
// supabase/functions/stripe-webhook/index.ts
const event = stripe.webhooks.constructEvent(body, signature, secret)

if (event.type === 'checkout.session.completed') {
  const userId = event.data.object.metadata.supabase_user_id
  const customerId = event.data.object.customer
  await supabase.from('profiles').update({
    subscription_tier: 'pro',
    stripe_customer_id: customerId,
    subscription_expires_at: null // unlimited until cancelled
  }).eq('id', userId)
}

if (event.type === 'customer.subscription.deleted') {
  await supabase.from('profiles')
    .update({ subscription_tier: 'free' })
    .eq('stripe_customer_id', event.data.object.customer)
}
```

**Idempotency:** Use Stripe's event ID — store processed event IDs to avoid double-processing.

**Race condition on redirect:** After Stripe checkout, user lands back on app before webhook fires. Fix: use the existing Supabase Realtime subscription on `profiles` — it fires automatically when `subscription_tier` updates. Show a "processing payment..." state until the profile update arrives.

---

## Supabase SPA Scale Pitfalls

**1. N+1 queries in teacher dashboard**
Don't fetch members then loop and fetch results — use PostgREST embedding:
```ts
supabase.from('classes')
  .select('*, class_members(*, profiles(username, avatar_id))')
  .eq('teacher_id', user.id)
```

**2. RLS policy performance without indexes**
Every RLS check runs a subquery. Without indexes on FK columns, a class with 30 students triggers 30 sequential scans. Add indexes on all FK columns used in RLS policies (see above).

**3. Realtime connection limits**
Supabase free tier: 200 concurrent Realtime connections. A class of 30 students all on the same game = 30 connections. At 10 simultaneous classes = 300 — hits the limit. **Mitigation:** Keep Realtime only for multiplayer game sessions. Use polling for dashboard analytics.

**4. auth.users email wall**
`auth.users` is not accessible via PostgREST (it's in the `auth` schema). The existing workaround (RPC function with `SECURITY DEFINER`) is the right approach — keep using it for teacher request flows.

**5. Anonymous play + class assignment**
If anonymous players (no account) play a deck, their results can't be linked to a class. Design decision: require account creation before joining a class. Guest play remains for public discovery.

**6. Dual auth context technical debt**
`authStore.ts` (Zustand) and `useAuth.ts` (React hook) are independent. If a teacher opens both `/` and `/admin` tabs, session state can diverge. Not a blocker for Q2 but will cause confusing bugs in teacher workflow — schedule cleanup in Phase 1.

---

## Recommended DB Changes (Priority Order)

| Priority | Change | Why |
|----------|--------|-----|
| 🔴 P1 | Backfill `profiles.roles[]` from `user_roles` + update `useAuth.ts` | Unblocks role system completion |
| 🔴 P1 | Add `classes`, `class_members`, `class_assignments` tables | Core classroom feature |
| 🔴 P1 | Add indexes on all new FK columns | RLS performance at class scale |
| 🟡 P2 | Add `subscription_tier`, `stripe_customer_id` to profiles | Unblocks monetization |
| 🟡 P2 | Create Stripe webhook Edge Function | Subscription sync |
| 🟢 P3 | Drop `user_roles` table | After migration verified in staging |

---
_Research by gsd-project-researcher · 2026-03-27_
