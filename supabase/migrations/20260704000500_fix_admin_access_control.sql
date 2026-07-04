-- ============================================================================
-- Fix: admin access control
--
-- Two problems found live:
--  1. admin_users had RLS enabled with ZERO policies -- default-deny for
--     every PostgREST role, so the /admin page's own fallback check
--     (`select id from admin_users where email = ...`) always silently
--     returned nothing, even for a real row in the table.
--  2. The actual authorization for the admin dashboard's cross-tenant reads
--     was four policies with a single admin email hardcoded directly in
--     SQL (independent of the admin_users table they were presumably meant
--     to generalize) -- adding a second admin via admin_users would have no
--     effect on data access at all.
--
-- Fix: give admin_users a self-read policy, and drive all four "read
-- everything" policies off admin_users membership instead of a hardcoded
-- string, so admin_users becomes the actual single source of truth.
-- ============================================================================

CREATE POLICY "admin_self_check" ON admin_users
  FOR SELECT USING (email = auth.jwt() ->> 'email');

DROP POLICY IF EXISTS "admin_read_all_users"     ON users;
DROP POLICY IF EXISTS "admin_read_all_vehicles"  ON vehicles;
DROP POLICY IF EXISTS "admin_read_all_trips"     ON trips;
DROP POLICY IF EXISTS "admin_read_all_fuel_logs" ON fuel_logs;

CREATE OR REPLACE FUNCTION is_admin()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email'
  );
$$;
REVOKE ALL ON FUNCTION is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

CREATE POLICY "admin_read_all_users"     ON users     FOR SELECT USING (is_admin());
CREATE POLICY "admin_read_all_vehicles"  ON vehicles  FOR SELECT USING (is_admin());
CREATE POLICY "admin_read_all_trips"     ON trips     FOR SELECT USING (is_admin());
CREATE POLICY "admin_read_all_fuel_logs" ON fuel_logs FOR SELECT USING (is_admin());
