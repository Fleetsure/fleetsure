-- ============================================================================
-- Driver Account & Profile system
--
-- Three parts:
--   A. Extended driver profile fields on `drivers` (personal/bank/ID details
--      + document URLs).
--   B. `driver_expenses` — a driver-submitted, owner-approved expense claim
--      against a trip's advance (trips.driver_advance stays the source of
--      truth for "advance given"; this table is the new claim-and-approve
--      layer on top of it, distinct from the generic `misc_expenses` table).
--   C. `driver_salary` — one row per driver per month, a real payslip
--      record. Advance/expense/settlement numbers are pre-filled by the app
--      from live trip/expense/driver_payments data when a month is
--      "generated", then stored (not recomputed live), same way any payroll
--      record should be an immutable historical fact once created.
--
-- Reconciliation flow (implemented in the app, not in SQL):
--   trip.driver_advance given -> driver submits driver_expenses claims
--   (status='pending') -> owner approves/rejects each -> once no claims are
--   pending for a trip, "Record to Salary Ledger" writes one settlement row
--   into the EXISTING driver_payments table (type='settlement', trip_id
--   linked) for (advance - approved claims). driver_payments remains the
--   single ledger of driver-money movements; driver_salary is a monthly
--   rollup on top of it, not a competing ledger.
-- ============================================================================

-- ── A. Driver profile fields ──────────────────────────────────────────────

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS emergency_contact_name    TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone   TEXT,
  ADD COLUMN IF NOT EXISTS mother_name               TEXT,
  ADD COLUMN IF NOT EXISTS permanent_address         TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number       TEXT,
  ADD COLUMN IF NOT EXISTS bank_ifsc_code            TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_holder_name  TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_number            TEXT,
  ADD COLUMN IF NOT EXISTS pan_number                TEXT,
  ADD COLUMN IF NOT EXISTS license_image_url         TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_front_url         TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_back_url          TEXT,
  ADD COLUMN IF NOT EXISTS pan_image_url             TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_url         TEXT;

-- Note: the existing `address` column is kept as-is (treated as "Current
-- Address" in the UI) — only `permanent_address` is new, to avoid touching
-- a column already read/written across web, main-app and driver-app.

-- ── B. driver_expenses ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS driver_expenses (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  driver_id    UUID        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  owner_id     TEXT        NOT NULL REFERENCES users(id),
  amount       NUMERIC     NOT NULL,
  category     TEXT        NOT NULL CHECK (category IN ('fuel', 'food', 'loading', 'other')),
  note         TEXT,
  receipt_url  TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_expenses_trip   ON driver_expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_driver_expenses_driver ON driver_expenses(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_expenses_owner  ON driver_expenses(owner_id);

ALTER TABLE driver_expenses ENABLE ROW LEVEL SECURITY;

-- Driver: can submit and see only their own claims.
CREATE POLICY "driver_insert_own_expenses" ON driver_expenses
  FOR INSERT WITH CHECK (driver_id = get_driver_id_for_uid());

CREATE POLICY "driver_read_own_expenses" ON driver_expenses
  FOR SELECT USING (driver_id = get_driver_id_for_uid());

-- Owner: full control (review/approve/reject/delete).
CREATE POLICY "driver_expenses_owner" ON driver_expenses
  FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (owner_id = (auth.jwt() ->> 'sub'));

-- Manager / accountant, same pattern as every other owner-scoped table.
CREATE POLICY "manager_manage_driver_expenses"  ON driver_expenses FOR ALL    USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');
CREATE POLICY "accountant_view_driver_expenses" ON driver_expenses FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');

-- ── C. driver_salary ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS driver_salary (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id         UUID        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  owner_id          TEXT        NOT NULL REFERENCES users(id),
  month             DATE        NOT NULL,
  base_salary       NUMERIC     NOT NULL DEFAULT 0,
  advance_given     NUMERIC     NOT NULL DEFAULT 0,
  expenses_claimed  NUMERIC     NOT NULL DEFAULT 0,
  amount_returned   NUMERIC     NOT NULL DEFAULT 0,
  net_payable       NUMERIC     NOT NULL DEFAULT 0,
  paid              BOOLEAN     NOT NULL DEFAULT false,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (driver_id, month)
);

CREATE INDEX IF NOT EXISTS idx_driver_salary_driver ON driver_salary(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_salary_owner  ON driver_salary(owner_id);

ALTER TABLE driver_salary ENABLE ROW LEVEL SECURITY;

-- Owner/office only — this is a payroll register, not something drivers read.
CREATE POLICY "driver_salary_owner" ON driver_salary
  FOR ALL USING (owner_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (owner_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "manager_manage_driver_salary"  ON driver_salary FOR ALL    USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'manager');
CREATE POLICY "accountant_view_driver_salary" ON driver_salary FOR SELECT USING (owner_id = get_team_member_owner_id() AND get_team_member_role() = 'accountant');

-- ── D. Storage bucket: driver-docs ──────────────────────────────────────────
--
-- Private bucket (unlike the public trip-slips bucket) — license/Aadhaar/PAN
-- are sensitive PII, so display goes through signed URLs generated on
-- demand rather than a public URL. Owner-scoped by `${owner_id}/...` folder
-- prefix, same shape as the trip-slips policies.

INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-docs', 'driver-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "owner_upload_driver_docs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'driver-docs'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "owner_update_driver_docs" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'driver-docs'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "owner_delete_driver_docs" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'driver-docs'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "owner_read_driver_docs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'driver-docs'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );
