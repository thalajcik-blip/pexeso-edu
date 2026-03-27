-- GDPR-03: consent record table
CREATE TABLE IF NOT EXISTS child_consents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consent_version text NOT NULL DEFAULT 'v1',
  consented_at    timestamptz NOT NULL DEFAULT now(),
  ip_hash         text,
  UNIQUE(child_user_id, consent_version)
);

ALTER TABLE child_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_sees_own_consent" ON child_consents
  FOR SELECT USING (auth.uid() = child_user_id);

CREATE POLICY "user_inserts_own_consent" ON child_consents
  FOR INSERT WITH CHECK (auth.uid() = child_user_id);

-- GDPR-05: privacy-by-default flag
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_minor boolean NOT NULL DEFAULT false;

-- GDPR-05: block public reads for minor profiles
-- Note: If an existing all-public SELECT policy on profiles conflicts (e.g., USING (true)), drop it first.
CREATE POLICY "minor_profile_not_public"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR is_minor = false
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND 'superadmin' = ANY(roles)
    )
  );
