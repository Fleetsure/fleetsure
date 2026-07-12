-- ============================================================================
-- Multi-firm support
--
-- Adds an optional firm_id partition on top of the existing owner-scoped
-- data model. owner_id remains the RLS security boundary everywhere (two
-- firms under the same owner already trust each other implicitly, same
-- login) -- firm_id is an application-level filter, not a new RLS boundary.
-- Only firms itself gets RLS here.
-- ============================================================================

CREATE TABLE IF NOT EXISTS firms (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   TEXT        NOT NULL REFERENCES users(id),
  name       TEXT        NOT NULL,
  gstin      TEXT,
  address    TEXT,
  pan        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firms_owner ON firms(owner_id);

ALTER TABLE firms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firms_owner" ON firms
  FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (owner_id = (auth.jwt() ->> 'sub'));

-- ── firm_id on the 14 tables named in the request ───────────────────────────

ALTER TABLE vehicles              ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);
ALTER TABLE drivers               ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);
ALTER TABLE trips                 ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);
ALTER TABLE tyre_logs             ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);
ALTER TABLE tyre_setups           ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);
ALTER TABLE misc_expenses         ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);
ALTER TABLE fuel_logs             ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);
ALTER TABLE toll_logs             ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);
ALTER TABLE driver_payments       ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);
ALTER TABLE documents             ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);
ALTER TABLE maintenance_schedules ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);
ALTER TABLE vehicle_batteries     ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);
ALTER TABLE tyre_rotations        ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);
ALTER TABLE tyre_scraps           ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);

CREATE INDEX IF NOT EXISTS idx_vehicles_firm              ON vehicles(firm_id);
CREATE INDEX IF NOT EXISTS idx_drivers_firm                ON drivers(firm_id);
CREATE INDEX IF NOT EXISTS idx_trips_firm                  ON trips(firm_id);
CREATE INDEX IF NOT EXISTS idx_tyre_logs_firm               ON tyre_logs(firm_id);
CREATE INDEX IF NOT EXISTS idx_tyre_setups_firm             ON tyre_setups(firm_id);
CREATE INDEX IF NOT EXISTS idx_misc_expenses_firm           ON misc_expenses(firm_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_firm                ON fuel_logs(firm_id);
CREATE INDEX IF NOT EXISTS idx_toll_logs_firm                ON toll_logs(firm_id);
CREATE INDEX IF NOT EXISTS idx_driver_payments_firm          ON driver_payments(firm_id);
CREATE INDEX IF NOT EXISTS idx_documents_firm                ON documents(firm_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_firm    ON maintenance_schedules(firm_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_batteries_firm        ON vehicle_batteries(firm_id);
CREATE INDEX IF NOT EXISTS idx_tyre_rotations_firm           ON tyre_rotations(firm_id);
CREATE INDEX IF NOT EXISTS idx_tyre_scraps_firm              ON tyre_scraps(firm_id);

-- ── Backfill: one default firm per existing owner, then stamp firm_id onto
--    every existing row of theirs that doesn't have one yet ─────────────────

INSERT INTO firms (owner_id, name)
SELECT id, COALESCE(NULLIF(name, ''), 'My') || ' Transports'
FROM users
WHERE NOT EXISTS (SELECT 1 FROM firms WHERE firms.owner_id = users.id);

UPDATE vehicles t SET firm_id = f.id FROM firms f WHERE f.owner_id = t.owner_id AND t.firm_id IS NULL;
UPDATE drivers t SET firm_id = f.id FROM firms f WHERE f.owner_id = t.owner_id AND t.firm_id IS NULL;
UPDATE trips t SET firm_id = f.id FROM firms f WHERE f.owner_id = t.owner_id AND t.firm_id IS NULL;
UPDATE tyre_logs t SET firm_id = f.id FROM firms f WHERE f.owner_id = t.owner_id AND t.firm_id IS NULL;
UPDATE tyre_setups t SET firm_id = f.id FROM firms f WHERE f.owner_id = t.owner_id AND t.firm_id IS NULL;
UPDATE misc_expenses t SET firm_id = f.id FROM firms f WHERE f.owner_id = t.owner_id AND t.firm_id IS NULL;
UPDATE fuel_logs t SET firm_id = f.id FROM firms f WHERE f.owner_id = t.owner_id AND t.firm_id IS NULL;
UPDATE toll_logs t SET firm_id = f.id FROM firms f WHERE f.owner_id = t.owner_id AND t.firm_id IS NULL;
UPDATE driver_payments t SET firm_id = f.id FROM firms f WHERE f.owner_id = t.owner_id AND t.firm_id IS NULL;
UPDATE documents t SET firm_id = f.id FROM firms f WHERE f.owner_id = t.owner_id AND t.firm_id IS NULL;
UPDATE maintenance_schedules t SET firm_id = f.id FROM firms f WHERE f.owner_id = t.owner_id AND t.firm_id IS NULL;
UPDATE vehicle_batteries t SET firm_id = f.id FROM firms f WHERE f.owner_id = t.owner_id AND t.firm_id IS NULL;
UPDATE tyre_rotations t SET firm_id = f.id FROM firms f WHERE f.owner_id = t.owner_id AND t.firm_id IS NULL;
UPDATE tyre_scraps t SET firm_id = f.id FROM firms f WHERE f.owner_id = t.owner_id AND t.firm_id IS NULL;
