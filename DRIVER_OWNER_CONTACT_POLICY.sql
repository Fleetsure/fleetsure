-- Run this in Supabase SQL Editor
-- Allows drivers to read their fleet manager's name and phone

DROP POLICY IF EXISTS "driver_view_owner_contact" ON users;

CREATE POLICY "driver_view_owner_contact" ON users
  FOR SELECT USING (
    id = (
      SELECT owner_id FROM drivers
      WHERE firebase_uid = auth.jwt() ->> 'sub'
      LIMIT 1
    )
  );
