-- ============================================================================
-- Fix: parties RLS still on the old UUID/auth.uid() model
--
-- Every other tenant table was migrated to auth.jwt() ->> 'sub' (Firebase
-- text UID) in MIGRATE_VEHICLES.sql, but parties was missed. auth.uid()
-- casts the JWT `sub` claim to uuid, which throws for Firebase UIDs (28-char
-- alphanumeric, not valid UUIDs) -- so parties CRUD has likely been erroring
-- for every real user in production.
-- ============================================================================

DROP POLICY IF EXISTS "owners_select_parties" ON parties;
DROP POLICY IF EXISTS "owners_insert_parties" ON parties;
DROP POLICY IF EXISTS "owners_update_parties" ON parties;
DROP POLICY IF EXISTS "owners_delete_parties" ON parties;

CREATE POLICY "parties_owner" ON parties
  FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (owner_id = (auth.jwt() ->> 'sub'));
