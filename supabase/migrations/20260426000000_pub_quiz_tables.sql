-- Pub Quiz sessions
CREATE TABLE IF NOT EXISTS pub_quiz_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text UNIQUE NOT NULL,
  host_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'lobby',
  current_round    int NOT NULL DEFAULT 0,
  current_question int NOT NULL DEFAULT 0,
  timer_active     boolean NOT NULL DEFAULT false,
  timer_seconds    int,
  timer_started_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pub_quiz_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON pub_quiz_sessions FOR ALL USING (true) WITH CHECK (true);

-- Pub Quiz rounds (1–8 per session)
CREATE TABLE IF NOT EXISTS pub_quiz_rounds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid REFERENCES pub_quiz_sessions(id) ON DELETE CASCADE,
  round_number    int NOT NULL,
  game_mode       text NOT NULL,
  set_slug        text,
  custom_deck_id  uuid REFERENCES custom_decks(id),
  question_count  int NOT NULL DEFAULT 10,
  double_points   boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'pending',
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pub_quiz_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON pub_quiz_rounds FOR ALL USING (true) WITH CHECK (true);

-- Pub Quiz teams (up to 8 per session, no auth required)
CREATE TABLE IF NOT EXISTS pub_quiz_teams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid REFERENCES pub_quiz_sessions(id) ON DELETE CASCADE,
  name        text NOT NULL,
  avatar      text NOT NULL DEFAULT '🎯',
  color       text,
  total_score int NOT NULL DEFAULT 0,
  joined_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pub_quiz_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON pub_quiz_teams FOR ALL USING (true) WITH CHECK (true);

-- Pub Quiz answers
CREATE TABLE IF NOT EXISTS pub_quiz_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid REFERENCES pub_quiz_sessions(id) ON DELETE CASCADE,
  team_id         uuid REFERENCES pub_quiz_teams(id) ON DELETE CASCADE,
  round_number    int NOT NULL,
  question_index  int NOT NULL,
  answer          text NOT NULL,
  is_correct      boolean,
  score_earned    int NOT NULL DEFAULT 0,
  answered_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, round_number, question_index)
);
ALTER TABLE pub_quiz_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON pub_quiz_answers FOR ALL USING (true) WITH CHECK (true);
