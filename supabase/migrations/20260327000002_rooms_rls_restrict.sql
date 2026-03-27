-- Fix rooms RLS: restrict to host + authenticated readers
-- Previously USING (true) allowed any authenticated user to read/write any room

-- Remove the open all-access policy
DROP POLICY IF EXISTS "open" ON rooms;

-- Host (authenticated, auth.uid() stored as host_id) can manage their own room
CREATE POLICY "host_manages_room" ON rooms
  FOR ALL USING (host_id = auth.uid()::text)
  WITH CHECK (host_id = auth.uid()::text);

-- Any authenticated user can SELECT rooms (needed to join via fetchRoomFromDb)
CREATE POLICY "authenticated_reads_rooms" ON rooms
  FOR SELECT TO authenticated USING (true);
