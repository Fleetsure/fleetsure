-- ============================================================
--  FleetSure — Full Schema for Supabase
--  Run this in: Supabase Dashboard → SQL Editor → New query
--  Safe to re-run: uses IF NOT EXISTS / DO $$ blocks throughout
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ── ENUM TYPES ────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE vehiclestatus AS ENUM ('active', 'inactive', 'in_trip', 'maintenance');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vehicletype AS ENUM ('truck', 'mini_truck', 'trailer', 'tanker', 'container', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tripstatus AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE driverstatus AS ENUM ('available', 'on_trip', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE licenseclass AS ENUM ('LMV', 'HMV', 'HGMV', 'HPMV', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE paymenttype AS ENUM ('advance', 'salary', 'deduction', 'bonus', 'settlement');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE partytype AS ENUM ('customer', 'transporter', 'vendor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE policytype AS ENUM ('insurance', 'fitness', 'permit', 'puc', 'road_tax', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE insighttype AS ENUM (
    'idle_vehicle', 'unrecorded_expense', 'cost_per_km',
    'fuel_anomaly', 'driver_fatigue', 'maintenance_due',
    'empty_run', 'compliance_expiry'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE insightseverity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE loadstatus AS ENUM ('open', 'matched', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE intereststatus AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── TABLES ────────────────────────────────────────────────────────────────────

-- users
CREATE TABLE IF NOT EXISTS users (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(200) NOT NULL,
  email            VARCHAR(255) NOT NULL UNIQUE,
  hashed_password  VARCHAR(255),
  google_id        VARCHAR(255) UNIQUE,
  google_picture   TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  phone            VARCHAR(20),
  org_name         VARCHAR(255),
  org_logo         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);

-- vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number VARCHAR(20)  NOT NULL UNIQUE,
  make                VARCHAR(100) NOT NULL,
  model               VARCHAR(100) NOT NULL,
  year                INTEGER,
  vehicle_type        vehicletype  NOT NULL DEFAULT 'truck',
  fuel_type           VARCHAR(50),
  chassis_number      VARCHAR(100),
  engine_number       VARCHAR(100),
  vehicle_class       VARCHAR(100),
  owner_name          VARCHAR(200),
  rto_code            VARCHAR(20),
  color               VARCHAR(50),
  insurance_expiry    DATE,
  fitness_expiry      DATE,
  puc_expiry          DATE,
  permit_expiry       DATE,
  status              vehiclestatus NOT NULL DEFAULT 'active',
  owner_id            UUID,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_vehicles_registration_number ON vehicles(registration_number);
CREATE INDEX IF NOT EXISTS ix_vehicles_owner_id ON vehicles(owner_id);

-- drivers
CREATE TABLE IF NOT EXISTS drivers (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(150)  NOT NULL,
  phone               VARCHAR(20)   NOT NULL UNIQUE,
  alternate_phone     VARCHAR(20),
  address             TEXT,
  license_number      VARCHAR(50)   UNIQUE,
  license_class       licenseclass  DEFAULT 'HGMV',
  license_expiry      DATE,
  dob                 DATE,
  blood_group         VARCHAR(10),
  father_name         VARCHAR(150),
  transport_validity  DATE,
  issuing_rto         VARCHAR(100),
  badge_issue_date    DATE,
  status              driverstatus  NOT NULL DEFAULT 'available',
  owner_id            UUID,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_drivers_phone ON drivers(phone);
CREATE INDEX IF NOT EXISTS ix_drivers_license_number ON drivers(license_number);
CREATE INDEX IF NOT EXISTS ix_drivers_owner_id ON drivers(owner_id);

-- trips
CREATE TABLE IF NOT EXISTS trips (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      UUID          NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  driver_id       UUID,
  driver_name     VARCHAR(150)  NOT NULL,
  driver_phone    VARCHAR(20),
  origin          VARCHAR(200)  NOT NULL,
  destination     VARCHAR(200)  NOT NULL,
  distance_km     NUMERIC(10,2),
  start_date      DATE          NOT NULL,
  end_date        DATE,
  doc_number      VARCHAR(100),
  material        VARCHAR(200),
  weight_tonnes   NUMERIC(10,2),
  freight_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  driver_advance  NUMERIC(12,2) DEFAULT 0,
  status          tripstatus    NOT NULL DEFAULT 'planned',
  notes           TEXT,
  owner_id        UUID,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS ix_trips_driver_id  ON trips(driver_id);
CREATE INDEX IF NOT EXISTS ix_trips_owner_id   ON trips(owner_id);

-- expenses (per-trip)
CREATE TABLE IF NOT EXISTS expenses (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID          NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  expense_type VARCHAR(50)   NOT NULL,
  amount       NUMERIC(12,2) NOT NULL,
  description  VARCHAR(500),
  date         DATE          NOT NULL,
  receipt_url  VARCHAR(500),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_expenses_trip_id ON expenses(trip_id);

-- fuel_logs
CREATE TABLE IF NOT EXISTS fuel_logs (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id   UUID          NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  trip_id      UUID,
  date         DATE          NOT NULL,
  odometer_km  NUMERIC(10,2),
  litres       NUMERIC(8,2)  NOT NULL,
  amount       NUMERIC(10,2) NOT NULL,
  fuel_station VARCHAR(200),
  notes        TEXT,
  owner_id     UUID,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_fuel_logs_vehicle_id ON fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS ix_fuel_logs_trip_id    ON fuel_logs(trip_id);
CREATE INDEX IF NOT EXISTS ix_fuel_logs_owner_id   ON fuel_logs(owner_id);

-- toll_logs
CREATE TABLE IF NOT EXISTS toll_logs (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id   UUID          NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  trip_id      UUID          REFERENCES trips(id) ON DELETE SET NULL,
  date         DATE          NOT NULL,
  amount       NUMERIC(10,2) NOT NULL,
  toll_plaza   VARCHAR(200),
  route        VARCHAR(200),
  payment_mode VARCHAR(20)   NOT NULL DEFAULT 'cash',
  notes        TEXT,
  owner_id     UUID,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_toll_logs_vehicle_id ON toll_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS ix_toll_logs_trip_id    ON toll_logs(trip_id);
CREATE INDEX IF NOT EXISTS ix_toll_logs_owner_id   ON toll_logs(owner_id);

-- tyre_logs
CREATE TABLE IF NOT EXISTS tyre_logs (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    UUID          NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date          DATE          NOT NULL,
  amount        NUMERIC(10,2) NOT NULL,
  tyre_brand    VARCHAR(100),
  tyre_count    INTEGER       NOT NULL DEFAULT 1,
  tyre_type     VARCHAR(30)   NOT NULL DEFAULT 'new',
  tyre_position VARCHAR(100),
  odometer_km   NUMERIC(10,2),
  notes         TEXT,
  owner_id      UUID,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_tyre_logs_vehicle_id ON tyre_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS ix_tyre_logs_owner_id   ON tyre_logs(owner_id);

-- driver_payments
CREATE TABLE IF NOT EXISTS driver_payments (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id  UUID          NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  date       DATE          NOT NULL,
  type       paymenttype   NOT NULL,
  amount     NUMERIC(12,2) NOT NULL,
  notes      TEXT,
  trip_id    UUID,
  owner_id   UUID,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_driver_payments_driver_id ON driver_payments(driver_id);
CREATE INDEX IF NOT EXISTS ix_driver_payments_owner_id  ON driver_payments(owner_id);

-- misc_expenses
CREATE TABLE IF NOT EXISTS misc_expenses (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  UUID          REFERENCES vehicles(id) ON DELETE SET NULL,
  trip_id     UUID          REFERENCES trips(id) ON DELETE SET NULL,
  date        DATE          NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  category    VARCHAR(50)   NOT NULL DEFAULT 'other',
  description VARCHAR(300),
  notes       TEXT,
  owner_id    UUID,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_misc_expenses_vehicle_id ON misc_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS ix_misc_expenses_trip_id    ON misc_expenses(trip_id);
CREATE INDEX IF NOT EXISTS ix_misc_expenses_owner_id   ON misc_expenses(owner_id);

-- parties
CREATE TABLE IF NOT EXISTS parties (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200)  NOT NULL,
  phone           VARCHAR(20),
  gstin           VARCHAR(20),
  address         TEXT,
  party_type      partytype     NOT NULL DEFAULT 'customer',
  opening_balance NUMERIC(14,2) DEFAULT 0,
  notes           TEXT,
  owner_id        UUID,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_parties_owner_id ON parties(owner_id);

-- insurance_policies
CREATE TABLE IF NOT EXISTS insurance_policies (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    UUID          NOT NULL,
  policy_type   policytype    NOT NULL DEFAULT 'insurance',
  policy_number VARCHAR(100),
  insurer       VARCHAR(200),
  start_date    DATE,
  expiry_date   DATE          NOT NULL,
  premium       NUMERIC(12,2),
  notes         TEXT,
  owner_id      UUID,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_insurance_policies_vehicle_id ON insurance_policies(vehicle_id);
CREATE INDEX IF NOT EXISTS ix_insurance_policies_owner_id   ON insurance_policies(owner_id);

-- documents
CREATE TABLE IF NOT EXISTS documents (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(300) NOT NULL,
  doc_type    VARCHAR(100),
  vehicle_id  UUID,
  file_name   VARCHAR(300),
  file_size   INTEGER,
  mime_type   VARCHAR(100),
  content_b64 TEXT,
  notes       TEXT,
  owner_id    UUID,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_documents_vehicle_id ON documents(vehicle_id);
CREATE INDEX IF NOT EXISTS ix_documents_owner_id   ON documents(owner_id);

-- operational_insights
CREATE TABLE IF NOT EXISTS operational_insights (
  id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID            NOT NULL,
  insight_type insighttype     NOT NULL,
  severity     insightseverity NOT NULL DEFAULT 'info',
  title        VARCHAR(300)    NOT NULL,
  body         TEXT,
  meta         JSONB,
  vehicle_id   UUID,
  driver_id    UUID,
  trip_id      UUID,
  is_read      BOOLEAN         NOT NULL DEFAULT FALSE,
  is_dismissed BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_operational_insights_owner_id     ON operational_insights(owner_id);
CREATE INDEX IF NOT EXISTS ix_operational_insights_insight_type ON operational_insights(insight_type);
CREATE INDEX IF NOT EXISTS ix_operational_insights_vehicle_id   ON operational_insights(vehicle_id);
CREATE INDEX IF NOT EXISTS ix_operational_insights_driver_id    ON operational_insights(driver_id);
CREATE INDEX IF NOT EXISTS ix_operational_insights_trip_id      ON operational_insights(trip_id);

-- notification_settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                    UUID        NOT NULL UNIQUE,
  phone                       VARCHAR(20),
  email_compliance_alerts     BOOLEAN     NOT NULL DEFAULT TRUE,
  email_monthly_summary       BOOLEAN     NOT NULL DEFAULT TRUE,
  whatsapp_compliance_alerts  BOOLEAN     NOT NULL DEFAULT FALSE,
  whatsapp_monthly_summary    BOOLEAN     NOT NULL DEFAULT FALSE,
  alert_days_before           VARCHAR(20) NOT NULL DEFAULT '30,15,7',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_notification_settings_owner_id ON notification_settings(owner_id);

-- subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL UNIQUE,
  plan                     VARCHAR(50) NOT NULL DEFAULT 'trial',
  status                   VARCHAR(50) NOT NULL DEFAULT 'trial',
  razorpay_subscription_id VARCHAR(100) UNIQUE,
  trial_ends_at            TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_subscriptions_user_id ON subscriptions(user_id);

-- marketplace_return_loads
CREATE TABLE IF NOT EXISTS marketplace_return_loads (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id      UUID          REFERENCES vehicles(id) ON DELETE SET NULL,
  from_city       VARCHAR(150)  NOT NULL,
  to_city         VARCHAR(150)  NOT NULL,
  available_date  DATE          NOT NULL,
  vehicle_reg     VARCHAR(30),
  capacity_tonnes NUMERIC(8,2),
  cargo_accepted  VARCHAR(200),
  asking_price    NUMERIC(12,2),
  contact_phone   VARCHAR(20),
  contact_name    VARCHAR(150),
  notes           TEXT,
  status          loadstatus    NOT NULL DEFAULT 'open',
  rating          INTEGER,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_marketplace_return_loads_owner_id  ON marketplace_return_loads(owner_id);
CREATE INDEX IF NOT EXISTS ix_marketplace_return_loads_status    ON marketplace_return_loads(status);

-- marketplace_load_interests
CREATE TABLE IF NOT EXISTS marketplace_load_interests (
  id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  return_load_id     UUID           NOT NULL REFERENCES marketplace_return_loads(id) ON DELETE CASCADE,
  interested_user_id UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message            TEXT,
  status             intereststatus NOT NULL DEFAULT 'pending',
  rating             INTEGER,
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_marketplace_load_interests_return_load_id     ON marketplace_load_interests(return_load_id);
CREATE INDEX IF NOT EXISTS ix_marketplace_load_interests_interested_user_id ON marketplace_load_interests(interested_user_id);


-- ── updated_at trigger (auto-update timestamps) ───────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_parties_updated_at
    BEFORE UPDATE ON parties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_marketplace_return_loads_updated_at
    BEFORE UPDATE ON marketplace_return_loads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_marketplace_load_interests_updated_at
    BEFORE UPDATE ON marketplace_load_interests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Run this block in Supabase → SQL Editor after creating tables.
-- ─────────────────────────────────────────────────────────────

-- Enable RLS on every tenant-scoped table
ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE toll_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE tyre_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE misc_expenses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_insights     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_return_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_load_interests ENABLE ROW LEVEL SECURITY;

-- users: each user sees only their own row
CREATE POLICY "users_own_row" ON users
  FOR ALL USING (id = auth.uid());

-- vehicles, drivers, parties, insurance_policies, documents,
-- fuel_logs, toll_logs, tyre_logs, misc_expenses,
-- driver_payments, operational_insights, notification_settings, subscriptions
-- All follow the same owner_id = auth.uid() pattern

CREATE POLICY "vehicles_owner"           ON vehicles              FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "drivers_owner"            ON drivers               FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "trips_owner"              ON trips                 FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "parties_owner"            ON parties               FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "insurance_owner"          ON insurance_policies    FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "documents_owner"          ON documents             FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "fuel_logs_owner"          ON fuel_logs             FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "toll_logs_owner"          ON toll_logs             FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "tyre_logs_owner"          ON tyre_logs             FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "misc_expenses_owner"      ON misc_expenses         FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "driver_payments_owner"    ON driver_payments       FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "insights_owner"           ON operational_insights  FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "notif_settings_owner"     ON notification_settings FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "subscriptions_owner"      ON subscriptions         FOR ALL USING (user_id  = auth.uid());

-- expenses: scoped through trip ownership
CREATE POLICY "expenses_via_trip" ON expenses
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE owner_id = auth.uid())
  );

-- marketplace_return_loads: anyone authenticated can read open loads; only owner can write
CREATE POLICY "loads_read_open"   ON marketplace_return_loads
  FOR SELECT USING (status = 'open' OR owner_id = auth.uid());

CREATE POLICY "loads_write_owner" ON marketplace_return_loads
  FOR ALL USING (owner_id = auth.uid());

-- marketplace_load_interests: sender sees their own; load owner sees interests on their loads
CREATE POLICY "interests_sender"  ON marketplace_load_interests
  FOR ALL USING (interested_user_id = auth.uid());

CREATE POLICY "interests_load_owner" ON marketplace_load_interests
  FOR SELECT USING (
    return_load_id IN (SELECT id FROM marketplace_return_loads WHERE owner_id = auth.uid())
  );
