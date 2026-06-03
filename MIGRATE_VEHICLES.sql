-- FleetSure — Supabase schema (full setup + incremental migrations)
-- Run this in the Supabase SQL editor.
-- All statements are idempotent: safe to re-run on an existing database.
--
-- What changed vs the previous version of this file:
--   • users.id is now a Firebase UID (TEXT), not UUID
--   • owner_id on every table is TEXT (matches Firebase UID)
--   • users gains google_picture column
--   • vehicles gains avg_mileage_kmpl column
--   • All tables that were managed by SQLAlchemy are now defined here


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. USERS  (id = Firebase UID — TEXT, not UUID)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             TEXT        PRIMARY KEY,   -- Firebase UID
  email          TEXT        NOT NULL,
  name           TEXT        NOT NULL DEFAULT '',
  phone          TEXT,
  org_name       TEXT,
  org_logo       TEXT,                      -- base64 data URL
  google_picture TEXT,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safe additions for databases created before the Firebase migration
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_picture TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone          TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_name       TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_logo       TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gst_number     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at  TIMESTAMPTZ;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. VEHICLES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            TEXT        NOT NULL REFERENCES users(id),
  registration_number TEXT        NOT NULL,
  make                TEXT        NOT NULL,
  model               TEXT        NOT NULL,
  year                INTEGER,
  vehicle_type        TEXT        DEFAULT 'truck',
  status              TEXT        DEFAULT 'active',
  -- Vahan / RC lookup columns
  fuel_type           TEXT,
  chassis_number      TEXT,
  engine_number       TEXT,
  vehicle_class       TEXT,
  owner_name          TEXT,
  rto_code            TEXT,
  color               TEXT,
  -- Compliance expiry dates
  insurance_expiry    DATE,
  fitness_expiry      DATE,
  puc_expiry          DATE,
  permit_expiry       DATE,
  -- Analytics
  avg_mileage_kmpl    NUMERIC,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_id, registration_number)
);

-- Vahan columns (original MIGRATE_VEHICLES migration)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_type        TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS chassis_number   TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_number    TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_class    TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_name       TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS rto_code         TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS color            TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fitness_expiry   DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS puc_expiry       DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS permit_expiry    DATE;
-- New: added for mileage analytics
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS avg_mileage_kmpl NUMERIC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. DRIVERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id           TEXT        NOT NULL REFERENCES users(id),
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


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. DRIVER PAYMENTS
-- ─────────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TRIPS
-- ─────────────────────────────────────────────────────────────────────────────
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
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_id UUID;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. EXPENSES  (per-trip line items)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID    NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  expense_type TEXT    NOT NULL,
  amount       NUMERIC NOT NULL,
  date         DATE    NOT NULL,
  description  TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. FUEL LOGS
-- ─────────────────────────────────────────────────────────────────────────────
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

ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS trip_id UUID;
ALTER TABLE fuel_logs ALTER COLUMN odometer_km DROP NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. TOLL LOGS
-- ─────────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. TYRE LOGS
-- ─────────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. MISC EXPENSES
-- ─────────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. INSURANCE POLICIES
-- ─────────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. DOCUMENTS
-- ─────────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────────
-- 13. PARTIES  (customers / suppliers ledger)
-- ─────────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────────
-- 14. MARKETPLACE — return load board
-- ─────────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────────
-- 15. OPERATIONAL INSIGHTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operational_insights (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     TEXT        NOT NULL REFERENCES users(id),
  insight_type TEXT        NOT NULL,
  severity     TEXT        NOT NULL DEFAULT 'info',   -- info | warning | critical
  title        TEXT        NOT NULL,
  body         TEXT,
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_dismissed BOOLEAN     NOT NULL DEFAULT FALSE,
  vehicle_id   UUID,
  trip_id      UUID,
  meta         JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 16. SUBSCRIPTIONS
-- ─────────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────────
-- 17. NOTIFICATION SETTINGS
-- ─────────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vehicles_owner          ON vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_drivers_owner           ON drivers(owner_id);
CREATE INDEX IF NOT EXISTS idx_trips_owner             ON trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle           ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_status            ON trips(status);
CREATE INDEX IF NOT EXISTS idx_expenses_trip           ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_owner         ON fuel_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle       ON fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_toll_logs_owner         ON toll_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_tyre_logs_owner         ON tyre_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_misc_expenses_owner     ON misc_expenses(owner_id);
CREATE INDEX IF NOT EXISTS idx_insurance_vehicle       ON insurance_policies(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner         ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_insights_owner          ON operational_insights(owner_id);
CREATE INDEX IF NOT EXISTS idx_insights_dismissed      ON operational_insights(owner_id, is_dismissed);
CREATE INDEX IF NOT EXISTS idx_marketplace_loads_status ON marketplace_return_loads(status);
CREATE INDEX IF NOT EXISTS idx_users_last_login          ON users(last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_created             ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_users_email         ON admin_users(email);


-- ─────────────────────────────────────────────────────────────────────────────
-- 18. ADMIN USERS  (controls access to the /admin dashboard)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  added_by   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY  (Firebase UID edition)
--
-- IMPORTANT: auth.uid() casts to UUID — it rejects Firebase UIDs (not valid UUIDs).
-- We use  auth.jwt() ->> 'sub'  instead, which returns the sub claim as TEXT.
-- The Supabase JWT minted by /api/auth/supabase-session sets sub = Firebase UID.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on every tenant-scoped table (safe to re-run)
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

-- Drop old policies (may have been created by supabase_schema.sql with wrong types)
DROP POLICY IF EXISTS "users_own_row"          ON users;
DROP POLICY IF EXISTS "vehicles_owner"         ON vehicles;
DROP POLICY IF EXISTS "drivers_owner"          ON drivers;
DROP POLICY IF EXISTS "trips_owner"            ON trips;
DROP POLICY IF EXISTS "expenses_via_trip"      ON expenses;
DROP POLICY IF EXISTS "fuel_logs_owner"        ON fuel_logs;
DROP POLICY IF EXISTS "toll_logs_owner"        ON toll_logs;
DROP POLICY IF EXISTS "tyre_logs_owner"        ON tyre_logs;
DROP POLICY IF EXISTS "misc_expenses_owner"    ON misc_expenses;
DROP POLICY IF EXISTS "insurance_owner"        ON insurance_policies;
DROP POLICY IF EXISTS "documents_owner"        ON documents;
DROP POLICY IF EXISTS "driver_payments_owner"  ON driver_payments;
DROP POLICY IF EXISTS "insights_owner"         ON operational_insights;
DROP POLICY IF EXISTS "notif_settings_owner"   ON notification_settings;
DROP POLICY IF EXISTS "subscriptions_owner"    ON subscriptions;
DROP POLICY IF EXISTS "loads_read_open"        ON marketplace_return_loads;
DROP POLICY IF EXISTS "loads_write_owner"      ON marketplace_return_loads;
DROP POLICY IF EXISTS "interests_sender"       ON marketplace_load_interests;
DROP POLICY IF EXISTS "interests_load_owner"   ON marketplace_load_interests;

-- Users: each user sees only their own row
CREATE POLICY "users_own_row" ON users
  FOR ALL USING (id = (auth.jwt() ->> 'sub'));

-- Standard owner tables — owner_id TEXT = Firebase UID stored as JWT sub
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

-- Subscriptions use user_id instead of owner_id
CREATE POLICY "subscriptions_owner" ON subscriptions
  FOR ALL USING (user_id = (auth.jwt() ->> 'sub'));

-- Expenses have no owner_id — scoped through the trip owner
CREATE POLICY "expenses_via_trip" ON expenses
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE owner_id = (auth.jwt() ->> 'sub'))
  );

-- Marketplace loads: anyone authenticated can read open loads; only owner can write
CREATE POLICY "loads_read_open" ON marketplace_return_loads
  FOR SELECT USING (status = 'open' OR owner_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "loads_write_owner" ON marketplace_return_loads
  FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'));

-- Marketplace interests: sender sees their own; load owner sees interests on their loads
CREATE POLICY "interests_sender" ON marketplace_load_interests
  FOR ALL USING (interested_user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "interests_load_owner" ON marketplace_load_interests
  FOR SELECT USING (
    return_load_id IN (
      SELECT id FROM marketplace_return_loads WHERE owner_id = (auth.jwt() ->> 'sub')
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- Verify: list all public tables
-- ─────────────────────────────────────────────────────────────────────────────
SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = 'public'
ORDER  BY table_name;
