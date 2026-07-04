-- ============================================================================
-- FleetSure baseline migration
--
-- This file documents the schema as it actually existed live on the
-- Supabase project (hjtamxpydneuykkcwpfn) on 2026-07-04, reconstructed from
-- live introspection (pg_get_functiondef / pg_policies / information_schema)
-- combined with the root-level *.sql files that were previously run ad hoc
-- through the Supabase Dashboard SQL editor.
--
-- This migration is marked as already-applied (`supabase migration repair`)
-- and is NOT executed against the live database — every object it describes
-- already exists there. Its purpose is to give the project a real, auditable
-- migration history to build on, and to let `supabase db reset` reconstruct
-- an equivalent schema for local development.
--
-- Sections:
--   1. Core tenant tables + indexes            (was: MIGRATE_VEHICLES.sql)
--   2. Driver portal (firebase_uid linking)     (was: DRIVER_PORTAL_MIGRATION.sql)
--   3. Team members (manager/accountant roles)  (was: TEAM_MEMBERS_MIGRATION.sql)
--   4. Driver <-> owner contact visibility      (was: DRIVER_OWNER_CONTACT_POLICY.sql)
--   5. Driver trip RPCs                         (was: GET_DRIVER_TRIPS_MIGRATION.sql)
--   6. Objects that existed live but had NO corresponding file in the repo
--      (created directly via the Supabase Dashboard SQL editor, never
--      checked into source control until now)
-- ============================================================================


-- ============================================================================
-- 1. CORE TENANT TABLES  (Firebase-UID / TEXT model — auth.jwt() ->> 'sub')
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id             TEXT        PRIMARY KEY,   -- Firebase UID
  email          TEXT        NOT NULL,
  name           TEXT        NOT NULL DEFAULT '',
  phone          TEXT,
  org_name       TEXT,
  org_logo       TEXT,
  google_picture TEXT,
  gst_number     TEXT,
  last_login_at  TIMESTAMPTZ,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            TEXT        NOT NULL REFERENCES users(id),
  registration_number TEXT        NOT NULL,
  make                TEXT        NOT NULL,
  model               TEXT        NOT NULL,
  year                INTEGER,
  vehicle_type        TEXT        DEFAULT 'truck',
  status              TEXT        DEFAULT 'active',
  fuel_type           TEXT,
  chassis_number      TEXT,
  engine_number       TEXT,
  vehicle_class       TEXT,
  owner_name          TEXT,
  rto_code            TEXT,
  color               TEXT,
  insurance_expiry    DATE,
  fitness_expiry      DATE,
  puc_expiry          DATE,
  permit_expiry       DATE,
  avg_mileage_kmpl    NUMERIC,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_id, registration_number)
);

CREATE TABLE IF NOT EXISTS drivers (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id           TEXT        NOT NULL REFERENCES users(id),
  firebase_uid       TEXT        UNIQUE,
  name               TEXT        NOT NULL,
  phone              TEXT        NOT NULL,
  alternate_phone    TEXT,
  address            TEXT,
  license_number     TEXT,
  license_expiry     DATE,
  transport_validity DATE,
  badge_issue_date   DATE,
  dob                DATE,
  blood_group        TEXT,
  license_class      TEXT,
  status             TEXT        DEFAULT 'active',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_payments (
  id        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id  TEXT    NOT NULL REFERENCES users(id),
  driver_id UUID    NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  trip_id   UUID,
  date      DATE    NOT NULL,
  type      TEXT    NOT NULL,
  amount    NUMERIC NOT NULL,
  notes     TEXT
);

CREATE TABLE IF NOT EXISTS trips (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       TEXT        NOT NULL REFERENCES users(id),
  vehicle_id     UUID        NOT NULL REFERENCES vehicles(id),
  driver_id      UUID,
  driver_name    TEXT        NOT NULL DEFAULT '',
  driver_phone   TEXT,
  origin         TEXT        NOT NULL,
  destination    TEXT        NOT NULL,
  distance_km    NUMERIC,
  start_date     DATE        NOT NULL,
  end_date       DATE,
  doc_number     TEXT,
  material       TEXT,
  weight_tonnes  NUMERIC,
  freight_amount NUMERIC     DEFAULT 0,
  driver_advance NUMERIC,
  status         TEXT        DEFAULT 'planned',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTE: expenses.owner_id below was added live via the Dashboard with no
-- corresponding file anywhere in the repo -- TEAM_MEMBERS_MIGRATION.sql's
-- manager/accountant policies depend on it, but MIGRATE_VEHICLES.sql's
-- CREATE TABLE for expenses never included it. Documented here for the
-- first time.
CREATE TABLE IF NOT EXISTS expenses (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     TEXT    REFERENCES users(id),
  trip_id      UUID    NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  expense_type TEXT    NOT NULL,
  amount       NUMERIC NOT NULL,
  date         DATE    NOT NULL,
  description  TEXT
);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS owner_id TEXT REFERENCES users(id);
-- Backfill from the parent trip for any row created before owner_id existed.
UPDATE expenses e SET owner_id = t.owner_id
  FROM trips t WHERE e.trip_id = t.id AND e.owner_id IS NULL;

CREATE TABLE IF NOT EXISTS fuel_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     TEXT        NOT NULL REFERENCES users(id),
  vehicle_id   UUID        NOT NULL REFERENCES vehicles(id),
  trip_id      UUID,
  date         DATE        NOT NULL,
  odometer_km  NUMERIC,
  litres       NUMERIC     NOT NULL,
  amount       NUMERIC     NOT NULL,
  fuel_station TEXT,
  notes        TEXT
);

CREATE TABLE IF NOT EXISTS toll_logs (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     TEXT    NOT NULL REFERENCES users(id),
  vehicle_id   UUID    NOT NULL REFERENCES vehicles(id),
  trip_id      UUID,
  date         DATE    NOT NULL,
  amount       NUMERIC NOT NULL,
  toll_plaza   TEXT,
  route        TEXT,
  payment_mode TEXT,
  notes        TEXT
);

CREATE TABLE IF NOT EXISTS tyre_logs (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      TEXT    NOT NULL REFERENCES users(id),
  vehicle_id    UUID    NOT NULL REFERENCES vehicles(id),
  date          DATE    NOT NULL,
  amount        NUMERIC NOT NULL,
  tyre_brand    TEXT,
  tyre_count    INTEGER,
  tyre_type     TEXT,
  tyre_position TEXT,
  odometer_km   NUMERIC,
  notes         TEXT
);

CREATE TABLE IF NOT EXISTS misc_expenses (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    TEXT    NOT NULL REFERENCES users(id),
  vehicle_id  UUID,
  trip_id     UUID,
  date        DATE    NOT NULL,
  amount      NUMERIC NOT NULL,
  category    TEXT    NOT NULL,
  description TEXT,
  notes       TEXT
);

CREATE TABLE IF NOT EXISTS insurance_policies (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      TEXT    NOT NULL REFERENCES users(id),
  vehicle_id    UUID    NOT NULL REFERENCES vehicles(id),
  policy_type   TEXT    NOT NULL,
  policy_number TEXT,
  insurer       TEXT,
  start_date    DATE,
  expiry_date   DATE    NOT NULL,
  premium       NUMERIC,
  notes         TEXT
);

CREATE TABLE IF NOT EXISTS documents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    TEXT        NOT NULL REFERENCES users(id),
  vehicle_id  UUID,
  name        TEXT        NOT NULL,
  doc_type    TEXT,
  file_name   TEXT,
  file_size   INTEGER,
  mime_type   TEXT,
  content_b64 TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTE: parties.owner_id is TEXT (Firebase model) like every sibling table,
-- but -- unlike every sibling table -- its RLS policies (below, section 6)
-- were never migrated off the old UUID/auth.uid() model. That mismatch is
-- fixed forward in 20260704000300_fix_parties_rls.sql.
CREATE TABLE IF NOT EXISTS parties (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        TEXT    NOT NULL REFERENCES users(id),
  name            TEXT    NOT NULL,
  phone           TEXT,
  gstin           TEXT,
  address         TEXT,
  party_type      TEXT    NOT NULL,
  opening_balance NUMERIC DEFAULT 0,
  notes           TEXT
);

CREATE TABLE IF NOT EXISTS marketplace_return_loads (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        TEXT        NOT NULL REFERENCES users(id),
  from_city       TEXT        NOT NULL,
  to_city         TEXT        NOT NULL,
  available_date  DATE        NOT NULL,
  vehicle_type    TEXT,
  capacity_tonnes NUMERIC,
  contact_phone   TEXT,
  contact_name    TEXT,
  notes           TEXT,
  status          TEXT        DEFAULT 'open',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketplace_load_interests (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  return_load_id     UUID        NOT NULL REFERENCES marketplace_return_loads(id) ON DELETE CASCADE,
  interested_user_id TEXT        NOT NULL REFERENCES users(id),
  message            TEXT,
  status             TEXT        DEFAULT 'pending',
  rating             INTEGER,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operational_insights (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     TEXT        NOT NULL REFERENCES users(id),
  insight_type TEXT        NOT NULL,
  severity     TEXT        NOT NULL DEFAULT 'info',
  title        TEXT        NOT NULL,
  body         TEXT,
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_dismissed BOOLEAN     NOT NULL DEFAULT FALSE,
  vehicle_id   UUID,
  trip_id      UUID,
  meta         JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  TEXT        NOT NULL REFERENCES users(id),
  plan                     TEXT        NOT NULL DEFAULT 'trial',
  status                   TEXT        NOT NULL DEFAULT 'trial',
  trial_ends_at            TIMESTAMPTZ,
  starts_at                TIMESTAMPTZ,
  ends_at                  TIMESTAMPTZ,
  razorpay_subscription_id TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_settings (
  id                         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                   TEXT    NOT NULL UNIQUE REFERENCES users(id),
  phone                      TEXT,
  email_compliance_alerts    BOOLEAN NOT NULL DEFAULT TRUE,
  email_monthly_summary      BOOLEAN NOT NULL DEFAULT TRUE,
  whatsapp_compliance_alerts BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_monthly_summary   BOOLEAN NOT NULL DEFAULT FALSE,
  alert_days_before          TEXT    NOT NULL DEFAULT '30,15,7'
);

CREATE TABLE IF NOT EXISTS admin_users (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  added_by   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_owner           ON vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_drivers_owner            ON drivers(owner_id);
CREATE INDEX IF NOT EXISTS idx_trips_owner              ON trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle            ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_status             ON trips(status);
CREATE INDEX IF NOT EXISTS idx_expenses_trip            ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_owner          ON fuel_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle        ON fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_toll_logs_owner          ON toll_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_tyre_logs_owner          ON tyre_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_misc_expenses_owner      ON misc_expenses(owner_id);
CREATE INDEX IF NOT EXISTS idx_insurance_vehicle        ON insurance_policies(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner          ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_insights_owner           ON operational_insights(owner_id);
CREATE INDEX IF NOT EXISTS idx_insights_dismissed       ON operational_insights(owner_id, is_dismissed);
CREATE INDEX IF NOT EXISTS idx_marketplace_loads_status ON marketplace_return_loads(status);
CREATE INDEX IF NOT EXISTS idx_users_last_login         ON users(last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_created            ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_users_email        ON admin_users(email);

ALTER TABLE users                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE toll_logs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tyre_logs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE misc_expenses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_insights       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_return_loads   ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_load_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users                ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_row" ON users
  FOR ALL USING (id = (auth.jwt() ->> 'sub'));

CREATE POLICY "vehicles_owner"        ON vehicles              FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'));
CREATE POLICY "drivers_owner"         ON drivers               FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'));
CREATE POLICY "trips_owner"           ON trips                 FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'));
CREATE POLICY "fuel_logs_owner"       ON fuel_logs             FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'));
CREATE POLICY "toll_logs_owner"       ON toll_logs             FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'));
CREATE POLICY "tyre_logs_owner"       ON tyre_logs             FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'));
CREATE POLICY "misc_expenses_owner"   ON misc_expenses         FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'));
CREATE POLICY "insurance_owner"       ON insurance_policies    FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'));
CREATE POLICY "documents_owner"       ON documents             FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'));
CREATE POLICY "driver_payments_owner" ON driver_payments       FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'));
CREATE POLICY "insights_owner"        ON operational_insights  FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'));
CREATE POLICY "notif_settings_owner"  ON notification_settings FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "subscriptions_owner" ON subscriptions
  FOR ALL USING (user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "expenses_via_trip" ON expenses
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE owner_id = (auth.jwt() ->> 'sub'))
  );

CREATE POLICY "loads_read_open" ON marketplace_return_loads
  FOR SELECT USING (status = 'open' OR owner_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "loads_write_owner" ON marketplace_return_loads
  FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "interests_sender" ON marketplace_load_interests
  FOR ALL USING (interested_user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "interests_load_owner" ON marketplace_load_interests
  FOR SELECT USING (
    return_load_id IN (
      SELECT id FROM marketplace_return_loads WHERE owner_id = (auth.jwt() ->> 'sub')
    )
  );

-- Live-but-buggy state of parties RLS at baseline time (still auth.uid()-based
-- UUID cast, which errors for Firebase text UIDs). Fixed forward in
-- 20260704000300_fix_parties_rls.sql -- kept here verbatim for history.
CREATE POLICY "owners_select_parties" ON parties FOR SELECT USING (owner_id = (auth.uid())::text);
CREATE POLICY "owners_insert_parties" ON parties FOR INSERT WITH CHECK (owner_id = (auth.uid())::text);
CREATE POLICY "owners_update_parties" ON parties FOR UPDATE USING (owner_id = (auth.uid())::text);
CREATE POLICY "owners_delete_parties" ON parties FOR DELETE USING (owner_id = (auth.uid())::text);


-- ============================================================================
-- 2. DRIVER PORTAL
-- ============================================================================

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

CREATE OR REPLACE FUNCTION get_driver_id_for_uid()
 RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT id FROM drivers WHERE firebase_uid = auth.jwt() ->> 'sub' LIMIT 1;
$$;

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

CREATE POLICY "driver_view_assigned_trips" ON trips
  FOR SELECT USING (driver_id = get_driver_id_for_uid());

CREATE POLICY "driver_update_trip_status" ON trips
  FOR UPDATE USING (driver_id = get_driver_id_for_uid())
  WITH CHECK   (driver_id = get_driver_id_for_uid());

CREATE POLICY "driver_manage_expenses" ON expenses
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE driver_id = get_driver_id_for_uid())
  );

CREATE POLICY "driver_manage_fuel_logs" ON fuel_logs
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE driver_id = get_driver_id_for_uid())
  );

CREATE POLICY "driver_manage_toll_logs" ON toll_logs
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE driver_id = get_driver_id_for_uid())
  );

CREATE POLICY "driver_manage_misc_expenses" ON misc_expenses
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE driver_id = get_driver_id_for_uid())
  );

CREATE POLICY "driver_view_trip_vehicle" ON vehicles
  FOR SELECT USING (
    id IN (SELECT vehicle_id FROM trips WHERE driver_id = get_driver_id_for_uid())
  );

CREATE POLICY "driver_manage_vehicle_issues" ON vehicle_issues
  FOR ALL USING (driver_id = get_driver_id_for_uid());

CREATE POLICY "owner_view_vehicle_issues" ON vehicle_issues
  FOR SELECT USING (owner_id = auth.jwt() ->> 'sub');

CREATE POLICY "driver_view_own_payments" ON driver_payments
  FOR SELECT USING (driver_id = get_driver_id_for_uid());


-- ============================================================================
-- 3. TEAM MEMBERS (manager / accountant roles)
-- ============================================================================

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

CREATE OR REPLACE FUNCTION get_team_member_owner_id()
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT owner_id FROM team_members
  WHERE firebase_uid = auth.jwt() ->> 'sub' AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_team_member_role()
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT role FROM team_members
  WHERE firebase_uid = auth.jwt() ->> 'sub' AND is_active = true
  LIMIT 1;
$$;

CREATE POLICY "owner_manage_team" ON team_members
  FOR ALL USING (owner_id = auth.jwt() ->> 'sub');

CREATE POLICY "member_view_own" ON team_members
  FOR SELECT USING (
    firebase_uid = auth.jwt() ->> 'sub'
    OR email = auth.jwt() ->> 'email'
  );

CREATE POLICY "member_link_uid" ON team_members
  FOR UPDATE USING (
    firebase_uid IS NULL AND email = auth.jwt() ->> 'email'
  )
  WITH CHECK (firebase_uid = auth.jwt() ->> 'sub');

CREATE POLICY "manager_manage_trips"    ON trips           FOR ALL    USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');
CREATE POLICY "accountant_view_trips"   ON trips           FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');
CREATE POLICY "manager_manage_vehicles"  ON vehicles        FOR ALL    USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');
CREATE POLICY "accountant_view_vehicles" ON vehicles        FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');
CREATE POLICY "manager_manage_drivers"  ON drivers          FOR ALL    USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');
CREATE POLICY "accountant_view_drivers" ON drivers          FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');
CREATE POLICY "manager_manage_expenses"  ON expenses        FOR ALL    USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');
CREATE POLICY "accountant_view_expenses" ON expenses        FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');
CREATE POLICY "manager_manage_fuel"  ON fuel_logs           FOR ALL    USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');
CREATE POLICY "accountant_view_fuel" ON fuel_logs           FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');
CREATE POLICY "manager_manage_tolls"  ON toll_logs          FOR ALL    USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');
CREATE POLICY "accountant_view_tolls" ON toll_logs          FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');
CREATE POLICY "manager_manage_misc"  ON misc_expenses       FOR ALL    USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');
CREATE POLICY "accountant_view_misc" ON misc_expenses       FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');
CREATE POLICY "manager_manage_payments"  ON driver_payments FOR ALL    USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');
CREATE POLICY "accountant_view_payments" ON driver_payments FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');
CREATE POLICY "manager_manage_issues"   ON vehicle_issues   FOR ALL    USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');
CREATE POLICY "accountant_view_issues"  ON vehicle_issues   FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');

CREATE POLICY "member_view_owner_user" ON users
  FOR SELECT USING (id = get_team_member_owner_id());


-- ============================================================================
-- 4. DRIVER <-> OWNER CONTACT VISIBILITY
-- ============================================================================

CREATE POLICY "driver_view_owner_contact" ON users
  FOR SELECT USING (
    id = (
      SELECT owner_id FROM drivers
      WHERE firebase_uid = auth.jwt() ->> 'sub'
      LIMIT 1
    )
  );


-- ============================================================================
-- 5. DRIVER TRIP RPCs
--
-- Live definitions include `SET search_path TO 'public'` hardening that the
-- original GET_DRIVER_TRIPS_MIGRATION.sql file in the repo lacked. Reproduced
-- here exactly as they existed at baseline time (still trusting the raw
-- p_driver_id argument -- fixed forward in
-- 20260704000100_fix_security_definer_identity_checks.sql).
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_driver_trips(p_driver_id UUID)
RETURNS TABLE (
  id UUID, owner_id TEXT, vehicle_id UUID, driver_id UUID, driver_name TEXT,
  driver_phone TEXT, origin TEXT, destination TEXT, distance_km NUMERIC,
  start_date DATE, end_date DATE, doc_number TEXT, material TEXT,
  weight_tonnes NUMERIC, freight_amount NUMERIC, driver_advance NUMERIC,
  status TEXT, notes TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  vehicles JSON
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    t.id, t.owner_id, t.vehicle_id, t.driver_id, t.driver_name, t.driver_phone,
    t.origin, t.destination, t.distance_km, t.start_date, t.end_date,
    t.doc_number, t.material, t.weight_tonnes, t.freight_amount, t.driver_advance,
    t.status::TEXT, t.notes, t.created_at, t.updated_at,
    json_build_object('registration_number', v.registration_number, 'make', v.make, 'model', v.model) AS vehicles
  FROM trips t
  LEFT JOIN vehicles v ON v.id = t.vehicle_id
  WHERE t.driver_id = p_driver_id
    AND t.status IN ('planned', 'in_progress')
  ORDER BY t.start_date DESC;
$$;

CREATE OR REPLACE FUNCTION get_completed_driver_trips(p_driver_id UUID)
RETURNS TABLE (
  id UUID, owner_id TEXT, vehicle_id UUID, driver_id UUID, driver_name TEXT,
  driver_phone TEXT, origin TEXT, destination TEXT, distance_km NUMERIC,
  start_date DATE, end_date DATE, doc_number TEXT, material TEXT,
  weight_tonnes NUMERIC, freight_amount NUMERIC, driver_advance NUMERIC,
  status TEXT, notes TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  vehicles JSON
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    t.id, t.owner_id, t.vehicle_id, t.driver_id, t.driver_name, t.driver_phone,
    t.origin, t.destination, t.distance_km, t.start_date, t.end_date,
    t.doc_number, t.material, t.weight_tonnes, t.freight_amount, t.driver_advance,
    t.status::TEXT, t.notes, t.created_at, t.updated_at,
    json_build_object('registration_number', v.registration_number, 'make', v.make, 'model', v.model) AS vehicles
  FROM trips t
  LEFT JOIN vehicles v ON v.id = t.vehicle_id
  WHERE t.driver_id = p_driver_id
    AND t.status = 'completed'
  ORDER BY t.end_date DESC NULLS LAST
  LIMIT 50;
$$;


-- ============================================================================
-- 6. PREVIOUSLY UNDOCUMENTED LIVE OBJECTS
-- (existed on the live project with zero corresponding file anywhere in the
-- repo prior to this migration -- created directly via the Dashboard SQL
-- editor at some unknown past point)
-- ============================================================================

-- get_driver_by_phone: SECURITY INVOKER, so it still respects RLS on drivers
-- for the calling role. Used to look up a driver profile by phone number
-- during first-time driver app login.
CREATE OR REPLACE FUNCTION get_driver_by_phone(p_phone text)
 RETURNS SETOF drivers LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY SELECT * FROM drivers WHERE phone = p_phone LIMIT 1;
END;
$$;

-- get_team_role: at baseline time this trusted client-supplied p_uid/p_email
-- with no verification against the caller's own JWT (SECURITY DEFINER +
-- executable by PUBLIC/anon/authenticated). This is the cross-tenant
-- role/PII oracle fixed in 20260704000100_fix_security_definer_identity_checks.sql.
-- Kept here verbatim for history; also notably missing the search_path
-- hardening every sibling function has.
CREATE OR REPLACE FUNCTION get_team_role(p_uid text, p_email text)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM team_members
  WHERE (firebase_uid = p_uid OR email = p_email)
  AND is_active = true
  LIMIT 1;
$$;

-- GoTrue Auth Hook: injects a `role` claim into tokens minted by Supabase's
-- own native Auth (not used by the Firebase-token-exchange flow, which mints
-- its own JWT with role already set -- this is leftover infrastructure from
-- an earlier native-Supabase-Auth approach). Kept for documentation; no
-- functional change made to it in this pass.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
 RETURNS jsonb LANGUAGE plpgsql STABLE
AS $$
BEGIN
  IF (event -> 'claims' ->> 'role') IS NULL THEN
    event := jsonb_set(event, '{claims,role}', '"authenticated"');
  END IF;
  RETURN event;
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- admin_users existed with RLS enabled but ZERO policies -- default-deny,
-- meaning the /admin page's own client-side fallback check against this
-- table always silently returned nothing. Fixed forward in
-- 20260704000500_fix_admin_access_control.sql.

-- The actual live authorization for the admin dashboard was four
-- policies hardcoding a single email address directly in SQL (independent
-- of the admin_users table they were presumably meant to generalize).
-- Kept here verbatim for history; replaced in
-- 20260704000500_fix_admin_access_control.sql with admin_users-driven checks.
CREATE POLICY "admin_read_all_users"     ON users      FOR SELECT USING ((auth.jwt() ->> 'email') = 'fleetsure.internal@gmail.com');
CREATE POLICY "admin_read_all_vehicles"  ON vehicles   FOR SELECT USING ((auth.jwt() ->> 'email') = 'fleetsure.internal@gmail.com');
CREATE POLICY "admin_read_all_trips"     ON trips      FOR SELECT USING ((auth.jwt() ->> 'email') = 'fleetsure.internal@gmail.com');
CREATE POLICY "admin_read_all_fuel_logs" ON fuel_logs  FOR SELECT USING ((auth.jwt() ->> 'email') = 'fleetsure.internal@gmail.com');

-- driver-uploads storage bucket + policies. Policies check "is *a* driver"
-- rather than "is *this* driver" -- fixed forward in
-- 20260704000400_fix_driver_uploads_storage_scope.sql.
INSERT INTO storage.buckets (id, name, public)
  VALUES ('driver-uploads', 'driver-uploads', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "driver_read_own_files" ON storage.objects
  FOR SELECT USING (bucket_id = 'driver-uploads' AND get_driver_id_for_uid() IS NOT NULL);

CREATE POLICY "driver_upload_own_files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'driver-uploads' AND get_driver_id_for_uid() IS NOT NULL);
