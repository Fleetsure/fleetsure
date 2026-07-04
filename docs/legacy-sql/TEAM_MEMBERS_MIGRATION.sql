-- ============================================================
-- Team Members Migration (Manager & Accountant Role Support)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL,
  name         TEXT        NOT NULL,
  role         TEXT        NOT NULL CHECK (role IN ('manager', 'accountant')),
  firebase_uid TEXT        UNIQUE,
  is_active    BOOLEAN     DEFAULT true,
  job_title    TEXT,
  phone        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, email)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 2. Helper functions
CREATE OR REPLACE FUNCTION get_team_member_owner_id()
RETURNS TEXT AS $$
  SELECT owner_id FROM team_members
  WHERE firebase_uid = auth.jwt() ->> 'sub' AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_team_member_role()
RETURNS TEXT AS $$
  SELECT role FROM team_members
  WHERE firebase_uid = auth.jwt() ->> 'sub' AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. team_members policies
--    Fleet owner can manage their own team
DROP POLICY IF EXISTS "owner_manage_team" ON team_members;
CREATE POLICY "owner_manage_team" ON team_members
  FOR ALL USING (owner_id = auth.jwt() ->> 'sub');

--    Team member can view (and link firebase_uid on) their own record
DROP POLICY IF EXISTS "member_view_own" ON team_members;
CREATE POLICY "member_view_own" ON team_members
  FOR SELECT USING (
    firebase_uid = auth.jwt() ->> 'sub'
    OR email = auth.jwt() ->> 'email'
  );

DROP POLICY IF EXISTS "member_link_uid" ON team_members;
CREATE POLICY "member_link_uid" ON team_members
  FOR UPDATE USING (
    firebase_uid IS NULL AND email = auth.jwt() ->> 'email'
  )
  WITH CHECK (firebase_uid = auth.jwt() ->> 'sub');

-- 4. trips — manager: full CRUD; accountant: SELECT
DROP POLICY IF EXISTS "manager_manage_trips"    ON trips;
DROP POLICY IF EXISTS "accountant_view_trips"   ON trips;

CREATE POLICY "manager_manage_trips" ON trips
  FOR ALL USING (
    owner_id = get_team_member_owner_id()
    AND get_team_member_role() = 'manager'
  );

CREATE POLICY "accountant_view_trips" ON trips
  FOR SELECT USING (
    owner_id = get_team_member_owner_id()
    AND get_team_member_role() = 'accountant'
  );

-- 5. vehicles
DROP POLICY IF EXISTS "manager_manage_vehicles"  ON vehicles;
DROP POLICY IF EXISTS "accountant_view_vehicles" ON vehicles;

CREATE POLICY "manager_manage_vehicles" ON vehicles
  FOR ALL USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');

CREATE POLICY "accountant_view_vehicles" ON vehicles
  FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');

-- 6. drivers
DROP POLICY IF EXISTS "manager_manage_drivers"  ON drivers;
DROP POLICY IF EXISTS "accountant_view_drivers" ON drivers;

CREATE POLICY "manager_manage_drivers" ON drivers
  FOR ALL USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');

CREATE POLICY "accountant_view_drivers" ON drivers
  FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');

-- 7. expenses
DROP POLICY IF EXISTS "manager_manage_expenses"  ON expenses;
DROP POLICY IF EXISTS "accountant_view_expenses" ON expenses;

CREATE POLICY "manager_manage_expenses" ON expenses
  FOR ALL USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');

CREATE POLICY "accountant_view_expenses" ON expenses
  FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');

-- 8. fuel_logs
DROP POLICY IF EXISTS "manager_manage_fuel"  ON fuel_logs;
DROP POLICY IF EXISTS "accountant_view_fuel" ON fuel_logs;

CREATE POLICY "manager_manage_fuel" ON fuel_logs
  FOR ALL USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');

CREATE POLICY "accountant_view_fuel" ON fuel_logs
  FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');

-- 9. toll_logs
DROP POLICY IF EXISTS "manager_manage_tolls"  ON toll_logs;
DROP POLICY IF EXISTS "accountant_view_tolls" ON toll_logs;

CREATE POLICY "manager_manage_tolls" ON toll_logs
  FOR ALL USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');

CREATE POLICY "accountant_view_tolls" ON toll_logs
  FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');

-- 10. misc_expenses
DROP POLICY IF EXISTS "manager_manage_misc"  ON misc_expenses;
DROP POLICY IF EXISTS "accountant_view_misc" ON misc_expenses;

CREATE POLICY "manager_manage_misc" ON misc_expenses
  FOR ALL USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');

CREATE POLICY "accountant_view_misc" ON misc_expenses
  FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');

-- 11. driver_payments
DROP POLICY IF EXISTS "manager_manage_payments"  ON driver_payments;
DROP POLICY IF EXISTS "accountant_view_payments" ON driver_payments;

CREATE POLICY "manager_manage_payments" ON driver_payments
  FOR ALL USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');

CREATE POLICY "accountant_view_payments" ON driver_payments
  FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');

-- 12. vehicle_issues — manager can view + update status; accountant view
DROP POLICY IF EXISTS "manager_manage_issues"   ON vehicle_issues;
DROP POLICY IF EXISTS "accountant_view_issues"  ON vehicle_issues;

CREATE POLICY "manager_manage_issues" ON vehicle_issues
  FOR ALL USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');

CREATE POLICY "accountant_view_issues" ON vehicle_issues
  FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');

-- 13. team_members can view owner's contact (for profile page)
DROP POLICY IF EXISTS "member_view_owner_user" ON users;
CREATE POLICY "member_view_owner_user" ON users
  FOR SELECT USING (
    id = get_team_member_owner_id()
  );
