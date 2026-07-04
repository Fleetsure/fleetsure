-- ============================================================
-- Driver Portal Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Add firebase_uid column to drivers
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE;

-- 2. Create vehicle_issues table
CREATE TABLE IF NOT EXISTS vehicle_issues (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_id   UUID        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id  UUID        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  trip_id     UUID        REFERENCES trips(id) ON DELETE SET NULL,
  issue_type  TEXT        NOT NULL,
  description TEXT        NOT NULL,
  severity    TEXT        NOT NULL DEFAULT 'medium',
  status      TEXT        NOT NULL DEFAULT 'open',
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicle_issues ENABLE ROW LEVEL SECURITY;

-- 3. Helper function: resolve driver UUID from Firebase UID (used by all RLS policies)
CREATE OR REPLACE FUNCTION get_driver_id_for_uid()
RETURNS UUID AS $$
  SELECT id FROM drivers WHERE firebase_uid = auth.jwt() ->> 'sub' LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. drivers table policies
DROP POLICY IF EXISTS "driver_view_own_record"    ON drivers;
DROP POLICY IF EXISTS "driver_link_firebase_uid"  ON drivers;

CREATE POLICY "driver_view_own_record" ON drivers
  FOR SELECT USING (
    firebase_uid = auth.jwt() ->> 'sub'
    OR right(phone, 10) = right(coalesce(auth.jwt() ->> 'phone_number', ''), 10)
  );

CREATE POLICY "driver_link_firebase_uid" ON drivers
  FOR UPDATE USING (
    firebase_uid IS NULL
    AND right(phone, 10) = right(coalesce(auth.jwt() ->> 'phone_number', ''), 10)
  )
  WITH CHECK (firebase_uid = auth.jwt() ->> 'sub');

-- 5. trips policies
DROP POLICY IF EXISTS "driver_view_assigned_trips"  ON trips;
DROP POLICY IF EXISTS "driver_update_trip_status"   ON trips;

CREATE POLICY "driver_view_assigned_trips" ON trips
  FOR SELECT USING (driver_id = get_driver_id_for_uid());

CREATE POLICY "driver_update_trip_status" ON trips
  FOR UPDATE USING (driver_id = get_driver_id_for_uid())
  WITH CHECK   (driver_id = get_driver_id_for_uid());

-- 6. expenses
DROP POLICY IF EXISTS "driver_manage_expenses" ON expenses;

CREATE POLICY "driver_manage_expenses" ON expenses
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE driver_id = get_driver_id_for_uid())
  );

-- 7. fuel_logs
DROP POLICY IF EXISTS "driver_manage_fuel_logs" ON fuel_logs;

CREATE POLICY "driver_manage_fuel_logs" ON fuel_logs
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE driver_id = get_driver_id_for_uid())
  );

-- 8. toll_logs
DROP POLICY IF EXISTS "driver_manage_toll_logs" ON toll_logs;

CREATE POLICY "driver_manage_toll_logs" ON toll_logs
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE driver_id = get_driver_id_for_uid())
  );

-- 9. misc_expenses
DROP POLICY IF EXISTS "driver_manage_misc_expenses" ON misc_expenses;

CREATE POLICY "driver_manage_misc_expenses" ON misc_expenses
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE driver_id = get_driver_id_for_uid())
  );

-- 10. vehicles
DROP POLICY IF EXISTS "driver_view_trip_vehicle" ON vehicles;

CREATE POLICY "driver_view_trip_vehicle" ON vehicles
  FOR SELECT USING (
    id IN (SELECT vehicle_id FROM trips WHERE driver_id = get_driver_id_for_uid())
  );

-- 11. vehicle_issues
DROP POLICY IF EXISTS "driver_manage_vehicle_issues" ON vehicle_issues;
DROP POLICY IF EXISTS "owner_view_vehicle_issues"    ON vehicle_issues;

CREATE POLICY "driver_manage_vehicle_issues" ON vehicle_issues
  FOR ALL USING (driver_id = get_driver_id_for_uid());

CREATE POLICY "owner_view_vehicle_issues" ON vehicle_issues
  FOR SELECT USING (owner_id = auth.jwt() ->> 'sub');

-- 12. driver_payments
DROP POLICY IF EXISTS "driver_view_own_payments" ON driver_payments;

CREATE POLICY "driver_view_own_payments" ON driver_payments
  FOR SELECT USING (driver_id = get_driver_id_for_uid());
