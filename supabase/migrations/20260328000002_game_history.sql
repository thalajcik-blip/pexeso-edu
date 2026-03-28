CREATE TABLE IF NOT EXISTS game_history (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  set_slug       text,
  set_title      text,
  custom_deck_id uuid        REFERENCES custom_decks(id) ON DELETE SET NULL,
  game_mode      text        NOT NULL DEFAULT 'pexequiz',
  score          integer     NOT NULL DEFAULT 0,
  quiz_correct   integer     NOT NULL DEFAULT 0,
  quiz_total     integer     NOT NULL DEFAULT 0,
  total_pairs    integer     NOT NULL DEFAULT 0,
  duration_sec   integer     NOT NULL DEFAULT 0,
  is_multiplayer boolean     NOT NULL DEFAULT false,
  played_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_history_user    ON game_history(user_id);
CREATE INDEX idx_game_history_set     ON game_history(set_slug);
CREATE INDEX idx_game_history_played  ON game_history(played_at DESC);

ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_manages_own_history" ON game_history
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "teacher_reads_student_history" ON game_history
  FOR SELECT USING (auth.uid() IS NOT NULL);
