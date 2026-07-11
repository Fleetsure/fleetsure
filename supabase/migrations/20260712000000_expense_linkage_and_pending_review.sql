-- ============================================================================
-- Two independent fixes, bundled in one file:
--
--   A. driver_expenses -> misc_expenses linkage. Previously an approved
--      driver expense claim only lived in driver_expenses, completely
--      disconnected from the trip's real expense total shown on the Trip
--      Sheet (fuel_logs + toll_logs + misc_expenses + expenses). Approving a
--      claim now also inserts a matching misc_expenses row (done in the app,
--      not here) and records the link, so "Total Expenses" on the Trip
--      Sheet and "Trip Expenses" on the Driver Account page always agree.
--
--   B. New trip status `pending_review`, sitting between `in_progress` and
--      `completed`: when a driver marks a trip delivered (driver-app), it
--      now lands on `pending_review` instead of jumping straight to
--      `completed` — only the fleet owner can confirm it to `completed`
--      (web app). This migration only touches the DB side (enum value +
--      the RPC driver-app uses to list a driver's own trips); the actual
--      status-transition logic lives in the app code.
--
-- IMPORTANT — run this in TWO steps, not as one paste:
--   Step 1: run the single ALTER TYPE statement below by itself first.
--   Step 2: then run everything after it.
-- Postgres does not allow a newly-added enum value to be used (even
-- indirectly, e.g. inside a function body that gets executed) in the same
-- transaction that added it. Running Step 1 alone first avoids that error.
-- ============================================================================

-- ── STEP 1 — run this alone first ───────────────────────────────────────────

ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'pending_review';

-- ── STEP 2 — run everything below, after Step 1 has committed ─────────────

-- A. Linkage column: which misc_expenses row (if any) this claim became
-- once approved. NULL until approved; stays NULL forever for rejected
-- claims.
ALTER TABLE driver_expenses
  ADD COLUMN IF NOT EXISTS linked_expense_id UUID REFERENCES misc_expenses(id) ON DELETE SET NULL;

-- B. get_active_driver_trips: a trip sitting in pending_review is still the
-- driver's trip to see (read-only at that point, action buttons hidden by
-- the app) — without this it would silently vanish from the driver-app
-- once marked delivered, since it no longer matches 'planned'/'in_progress'
-- and doesn't yet match 'completed' either.
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
    AND p_driver_id = get_driver_id_for_uid()
    AND t.status IN ('planned', 'in_progress', 'pending_review')
  ORDER BY t.start_date DESC;
$$;

-- Enforce "only the owner can confirm completed" at the RLS layer too, not
-- just in the app UI — a driver's own trip UPDATE can move a trip to
-- planned/in_progress/pending_review/cancelled, never straight to
-- completed.
DROP POLICY IF EXISTS "driver_update_trip_status" ON trips;
CREATE POLICY "driver_update_trip_status" ON trips
  FOR UPDATE USING (driver_id = get_driver_id_for_uid())
  WITH CHECK (
    driver_id = get_driver_id_for_uid()
    AND status IN ('planned', 'in_progress', 'pending_review', 'cancelled')
  );
