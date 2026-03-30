-- Leaderboard is public — allow anonymous reads of game_history
-- Required for /leaderboard page to load without auth session
CREATE POLICY "public_reads_game_history" ON public.game_history
  FOR SELECT USING (true);
