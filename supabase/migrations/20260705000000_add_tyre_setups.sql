-- ============================================================================
-- Add: tyre_setups
--
-- Replaces the `fs_tyres_v2` localStorage key in frontend/lib/tyreStore.ts.
-- That was a genuine "fake table" (unlike the mileage store, which just
-- redundantly shadowed a real DB column) -- live per-vehicle tyre
-- configuration and health state with no server-side persistence at all,
-- and no owner scoping (a second browser/device saw nothing).
--
-- Pragmatic single-row-per-vehicle JSONB shape rather than fully normalizing
-- tyres/pressure_logs/issue_logs into child tables, to keep the existing
-- call sites (frontend/app/tyres/page.tsx, frontend/app/trips/page.tsx)
-- close to unchanged -- just swap a synchronous localStorage read/write for
-- an async Supabase one.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tyre_setups (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         TEXT        NOT NULL REFERENCES users(id),
  vehicle_id       UUID        NOT NULL UNIQUE REFERENCES vehicles(id) ON DELETE CASCADE,
  tyre_count       INTEGER     NOT NULL,
  has_spare        BOOLEAN     NOT NULL DEFAULT false,
  tyres            JSONB       NOT NULL DEFAULT '[]'::jsonb,
  synced_trip_ids  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tyre_setups_owner ON tyre_setups(owner_id);

ALTER TABLE tyre_setups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tyre_setups_owner" ON tyre_setups
  FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (owner_id = (auth.jwt() ->> 'sub'));
