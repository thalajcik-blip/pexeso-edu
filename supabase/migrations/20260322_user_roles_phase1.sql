-- Phase 1: User roles system
-- Run in dev Supabase SQL Editor (project: pexeso-edu-dev / zmiwnqiocdolvnzabcrm)

-- 1. Add roles array to profiles (default: player)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS roles text[] DEFAULT ARRAY['player'];

-- 2. Existing profiles stay as ['player'] (DEFAULT handles it)

-- 3. Sync existing admin users from user_roles → profiles
--    Creates profile rows for admin users who don't have one yet,
--    and sets correct roles for those who do.
INSERT INTO profiles (id, roles)
SELECT
  ur.user_id,
  CASE ur.role
    WHEN 'superadmin' THEN ARRAY['superadmin', 'teacher', 'player']
    WHEN 'teacher'    THEN ARRAY['teacher', 'player']
    ELSE                   ARRAY['player']
  END
FROM user_roles ur
ON CONFLICT (id) DO UPDATE
  SET roles = EXCLUDED.roles;

-- 4. Add teacher_request_status to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS teacher_request_status text DEFAULT NULL;
-- NULL = no request | 'pending' | 'approved' | 'rejected'

-- 5. Create teacher_requests table
CREATE TABLE IF NOT EXISTS teacher_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES profiles(id) ON DELETE CASCADE,
  school        text NOT NULL,
  reason        text,
  status        text DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  reviewed_by   uuid REFERENCES profiles(id),
  reviewed_at   timestamptz,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE teacher_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees own request"
  ON teacher_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmin manages all requests"
  ON teacher_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND 'superadmin' = ANY(roles)
    )
  );
