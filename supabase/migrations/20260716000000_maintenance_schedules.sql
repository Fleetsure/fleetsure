-- Add: maintenance_schedules -- recurring/one-time maintenance items per
-- vehicle, feeding the Fleet Health "Scheduled Maintenance" section and the
-- Accounts P&L expense line. Same owner-only RLS shape as vehicle_batteries.

CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       TEXT        NOT NULL REFERENCES users(id),
  vehicle_id     UUID        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  description    TEXT        NOT NULL,
  frequency      TEXT        NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly', 'one_time')),
  amount         NUMERIC     NOT NULL DEFAULT 0,
  last_done_date DATE,
  next_due_date  DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_owner   ON maintenance_schedules(owner_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_vehicle ON maintenance_schedules(vehicle_id);

ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_schedules_owner" ON maintenance_schedules
  FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (owner_id = (auth.jwt() ->> 'sub'));
