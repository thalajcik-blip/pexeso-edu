-- CLASS-01: classes table
CREATE TABLE IF NOT EXISTS classes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id          uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                text        NOT NULL,
  invite_code         text        NOT NULL UNIQUE,
  gdpr_confirmed_at   timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_classes_teacher     ON classes(teacher_id);
CREATE INDEX idx_classes_invite_code ON classes(invite_code);

-- CLASS-02: class_members table
CREATE TABLE IF NOT EXISTS class_members (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id       uuid        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id        uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at      timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz,
  UNIQUE(class_id, user_id)
);

CREATE INDEX idx_class_members_class ON class_members(class_id);
CREATE INDEX idx_class_members_user  ON class_members(user_id);

-- CLASS-03: class_assignments table
CREATE TABLE IF NOT EXISTS class_assignments (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id       uuid        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  set_slug       text,
  custom_deck_id uuid        REFERENCES custom_decks(id) ON DELETE SET NULL,
  assigned_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_deck_type CHECK (
    (set_slug IS NOT NULL AND custom_deck_id IS NULL)
    OR
    (set_slug IS NULL AND custom_deck_id IS NOT NULL)
  )
);

CREATE INDEX idx_class_assignments_class ON class_assignments(class_id);

-- CLASS-07: SECURITY DEFINER helper functions (prevent recursive RLS)
CREATE OR REPLACE FUNCTION is_class_teacher(p_class_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM classes WHERE id = p_class_id AND teacher_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_class_member(p_class_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM class_members WHERE class_id = p_class_id AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION is_class_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_class_member(uuid)  TO authenticated;

-- CLASS-07: Enable RLS
ALTER TABLE classes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_assignments ENABLE ROW LEVEL SECURITY;

-- classes: teacher manages own
CREATE POLICY "teacher_manages_own_classes" ON classes
  FOR ALL USING (teacher_id = auth.uid());

-- classes: any authenticated user can SELECT (needed for invite-code lookup)
CREATE POLICY "anyone_reads_class_by_invite" ON classes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- class_members: teacher sees members of their classes
CREATE POLICY "teacher_sees_class_members" ON class_members
  FOR SELECT USING (is_class_teacher(class_id));

-- class_members: student sees own memberships
CREATE POLICY "member_sees_own_membership" ON class_members
  FOR SELECT USING (user_id = auth.uid());

-- class_members: authenticated user can join (INSERT) their own row
CREATE POLICY "anyone_can_join_class" ON class_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- class_assignments: teacher manages assignments for their classes
CREATE POLICY "teacher_manages_assignments" ON class_assignments
  FOR ALL USING (is_class_teacher(class_id));

-- class_assignments: class member can read assignments
CREATE POLICY "member_reads_assignments" ON class_assignments
  FOR SELECT USING (is_class_member(class_id));
