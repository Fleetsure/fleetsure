-- ============================================================================
-- RLS / RPC regression suite
--
-- Directly tests the exact vulnerability classes fixed in the Phase 1
-- security pass: cross-tenant data isolation, the driver-trip IDOR, the
-- get_team_role identity binding, the parties auth.uid()->auth.jwt() fix,
-- driver-uploads storage scoping, and admin_users-driven admin access.
--
-- Runs entirely inside one transaction that is ALWAYS rolled back at the
-- end (see run.sh) -- no test data is ever persisted, safe to run against
-- the live project at any time.
--
-- Mechanism: Postgres lets a sufficiently-privileged connection SET ROLE
-- authenticated and set the request.jwt.claims session variable that
-- auth.jwt()/auth.uid() read from -- this exercises the *real* RLS
-- policies exactly as PostgREST would, without needing a real Firebase
-- login or JWT signing secret.
-- ============================================================================

CREATE TEMP TABLE _test_results (name text PRIMARY KEY, passed boolean, detail text);
GRANT ALL ON _test_results TO authenticated;

-- ── Fixtures (namespaced IDs, nothing collides with real data) ─────────────

INSERT INTO users (id, email, name) VALUES
  ('rlstest_owner_a', 'rlstest-owner-a@test.local', 'RLS Test Owner A'),
  ('rlstest_owner_b', 'rlstest-owner-b@test.local', 'RLS Test Owner B');

INSERT INTO vehicles (id, owner_id, registration_number, make, model) VALUES
  ('a0000000-0000-4000-a000-00000000000a', 'rlstest_owner_a', 'RLSTEST-A', 'Test', 'Vehicle'),
  ('b0000000-0000-4000-b000-00000000000b', 'rlstest_owner_b', 'RLSTEST-B', 'Test', 'Vehicle');

INSERT INTO drivers (id, owner_id, name, phone, firebase_uid) VALUES
  ('a1111111-1111-4111-a111-111111111111', 'rlstest_owner_a', 'RLS Test Driver A', '9990000001', 'rlstest_driver_a'),
  ('b1111111-1111-4111-b111-111111111111', 'rlstest_owner_b', 'RLS Test Driver B', '9990000002', 'rlstest_driver_b');

INSERT INTO trips (id, owner_id, vehicle_id, driver_id, driver_name, origin, destination, start_date, status, freight_amount) VALUES
  ('a2222222-2222-4222-a222-222222222222', 'rlstest_owner_a', 'a0000000-0000-4000-a000-00000000000a', 'a1111111-1111-4111-a111-111111111111', 'RLS Test Driver A', 'Origin A', 'Dest A', current_date, 'in_progress', 5000),
  ('b2222222-2222-4222-b222-222222222222', 'rlstest_owner_b', 'b0000000-0000-4000-b000-00000000000b', 'b1111111-1111-4111-b111-111111111111', 'RLS Test Driver B', 'Origin B', 'Dest B', current_date, 'in_progress', 7000);

INSERT INTO team_members (id, owner_id, email, name, role, firebase_uid, is_active) VALUES
  ('a3333333-3333-4333-a333-333333333333', 'rlstest_owner_a', 'rlstest-manager-a@test.local', 'RLS Test Manager A', 'manager', 'rlstest_manager_a', true);

INSERT INTO parties (id, owner_id, name, party_type) VALUES
  ('a4444444-4444-4444-a444-444444444444', 'rlstest_owner_a', 'RLS Test Party A', 'customer');

INSERT INTO admin_users (email) VALUES ('rlstest-admin@test.local');

INSERT INTO storage.objects (bucket_id, name) VALUES
  ('driver-uploads', 'a1111111-1111-4111-a111-111111111111/rlstest.jpg'),
  ('driver-uploads', 'b1111111-1111-4111-b111-111111111111/rlstest.jpg');

-- ── Test 1: core tenant isolation (vehicles) ────────────────────────────────
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','rlstest_owner_a','role','authenticated')::text, true);
INSERT INTO _test_results
  SELECT 'owner_a_sees_only_own_vehicle', count(*) = 1, 'count=' || count(*)
  FROM vehicles WHERE id IN ('a0000000-0000-4000-a000-00000000000a', 'b0000000-0000-4000-b000-00000000000b');
RESET ROLE;

-- ── Test 2: driver-trip IDOR fix -- driver A cannot fetch driver B's trip ──
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','rlstest_driver_a','role','authenticated')::text, true);
INSERT INTO _test_results
  SELECT 'driver_a_cannot_see_driver_b_active_trips', count(*) = 0, 'leaked_rows=' || count(*)
  FROM get_active_driver_trips('b1111111-1111-4111-b111-111111111111'::uuid);
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','rlstest_driver_a','role','authenticated')::text, true);
INSERT INTO _test_results
  SELECT 'driver_a_still_sees_own_active_trip', count(*) = 1, 'count=' || count(*)
  FROM get_active_driver_trips('a1111111-1111-4111-a111-111111111111'::uuid);
RESET ROLE;

-- ── Test 3: get_team_role identity binding (zero-arg, self-lookup only) ────
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','rlstest_manager_a','role','authenticated')::text, true);
INSERT INTO _test_results
  SELECT 'get_team_role_returns_own_role', get_team_role() = 'manager', 'got=' || coalesce(get_team_role(), 'null');
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','rlstest_nobody','role','authenticated')::text, true);
INSERT INTO _test_results
  SELECT 'get_team_role_null_for_non_member', get_team_role() IS NULL, 'got=' || coalesce(get_team_role(), 'null');
RESET ROLE;

-- ── Test 4: parties RLS uses auth.jwt()->>'sub', not the old auth.uid() ────
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','rlstest_owner_a','role','authenticated')::text, true);
INSERT INTO _test_results
  SELECT 'owner_a_sees_own_party', count(*) = 1, 'count=' || count(*)
  FROM parties WHERE id = 'a4444444-4444-4444-a444-444444444444';
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','rlstest_owner_b','role','authenticated')::text, true);
INSERT INTO _test_results
  SELECT 'owner_b_cannot_see_owner_a_party', count(*) = 0, 'leaked_rows=' || count(*)
  FROM parties WHERE id = 'a4444444-4444-4444-a444-444444444444';
RESET ROLE;

-- ── Test 5: driver-uploads storage is scoped per-driver, not per-"any driver" ─
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','rlstest_driver_a','role','authenticated')::text, true);
INSERT INTO _test_results
  SELECT 'driver_a_cannot_read_driver_b_upload', count(*) = 0, 'leaked_rows=' || count(*)
  FROM storage.objects WHERE bucket_id = 'driver-uploads' AND name = 'b1111111-1111-4111-b111-111111111111/rlstest.jpg';
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','rlstest_driver_a','role','authenticated')::text, true);
INSERT INTO _test_results
  SELECT 'driver_a_can_read_own_upload', count(*) = 1, 'count=' || count(*)
  FROM storage.objects WHERE bucket_id = 'driver-uploads' AND name = 'a1111111-1111-4111-a111-111111111111/rlstest.jpg';
RESET ROLE;

-- ── Test 6: admin access is admin_users-driven, not a hardcoded email ──────
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','rlstest_owner_a','email','rlstest-owner-a@test.local','role','authenticated')::text, true);
INSERT INTO _test_results
  SELECT 'non_admin_cannot_read_other_tenant_users', count(*) = 0, 'leaked_rows=' || count(*)
  FROM users WHERE id = 'rlstest_owner_b';
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','rlstest_admin','email','rlstest-admin@test.local','role','authenticated')::text, true);
INSERT INTO _test_results
  SELECT 'admin_users_member_can_read_other_tenant_users', count(*) = 1, 'count=' || count(*)
  FROM users WHERE id = 'rlstest_owner_b';
RESET ROLE;

-- ── Test 7: manager scoping -- manager of owner A cannot manage owner B's trips ─
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','rlstest_manager_a','role','authenticated')::text, true);
INSERT INTO _test_results
  SELECT 'manager_a_cannot_see_owner_b_trip', count(*) = 0, 'leaked_rows=' || count(*)
  FROM trips WHERE id = 'b2222222-2222-4222-b222-222222222222';
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','rlstest_manager_a','role','authenticated')::text, true);
INSERT INTO _test_results
  SELECT 'manager_a_sees_owner_a_trip', count(*) = 1, 'count=' || count(*)
  FROM trips WHERE id = 'a2222222-2222-4222-a222-222222222222';
RESET ROLE;

-- ── Report ───────────────────────────────────────────────────────────────
SELECT name, passed, detail FROM _test_results ORDER BY name;
