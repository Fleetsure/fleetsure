-- ============================================================================
-- Add: tyre construction/condition, tyre rotations, tyre scraps, vehicle
-- batteries. Same owner-only RLS shape as tyre_logs/tyre_setups -- tyres and
-- batteries aren't manager/accountant-scoped in the current schema either.
-- ============================================================================

ALTER TABLE tyre_logs
  ADD COLUMN IF NOT EXISTS tyre_construction TEXT CHECK (tyre_construction IN ('nylon', 'radial')),
  ADD COLUMN IF NOT EXISTS tyre_condition    TEXT CHECK (tyre_condition IN ('new', 'remould'));

CREATE TABLE IF NOT EXISTS tyre_rotations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          TEXT        NOT NULL REFERENCES users(id),
  vehicle_id        UUID        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date              DATE        NOT NULL,
  positions_rotated TEXT        NOT NULL,
  odometer_km       NUMERIC,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tyre_rotations_owner   ON tyre_rotations(owner_id);
CREATE INDEX IF NOT EXISTS idx_tyre_rotations_vehicle ON tyre_rotations(vehicle_id);

ALTER TABLE tyre_rotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tyre_rotations_owner" ON tyre_rotations
  FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (owner_id = (auth.jwt() ->> 'sub'));

CREATE TABLE IF NOT EXISTS tyre_scraps (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      TEXT        NOT NULL REFERENCES users(id),
  vehicle_id    UUID        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date          DATE        NOT NULL,
  tyre_count    INTEGER     NOT NULL DEFAULT 1,
  construction  TEXT        CHECK (construction IN ('nylon', 'radial')),
  scrap_amount  NUMERIC     NOT NULL DEFAULT 0,
  dealer_name   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tyre_scraps_owner   ON tyre_scraps(owner_id);
CREATE INDEX IF NOT EXISTS idx_tyre_scraps_vehicle ON tyre_scraps(vehicle_id);

ALTER TABLE tyre_scraps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tyre_scraps_owner" ON tyre_scraps
  FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (owner_id = (auth.jwt() ->> 'sub'));

CREATE TABLE IF NOT EXISTS vehicle_batteries (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          TEXT        NOT NULL REFERENCES users(id),
  vehicle_id        UUID        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  brand             TEXT,
  capacity_ah       NUMERIC,
  installation_date DATE,
  warranty_expiry   DATE,
  cost              NUMERIC,
  condition         TEXT        NOT NULL DEFAULT 'good' CHECK (condition IN ('good', 'weak', 'dead')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_batteries_owner   ON vehicle_batteries(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_batteries_vehicle ON vehicle_batteries(vehicle_id);

ALTER TABLE vehicle_batteries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicle_batteries_owner" ON vehicle_batteries
  FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (owner_id = (auth.jwt() ->> 'sub'));
