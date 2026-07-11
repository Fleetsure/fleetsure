-- ============================================================================
-- Add: weighbridge & quantity tracking fields on trips
--
-- Three-slip weighbridge flow, filled in from the Trip Detail page (via the
-- "Add Weighbridge Details" button) after a trip has already been logged —
-- not part of the create/edit trip form:
--   Slip 1: empty truck weighed         -> empty_truck_weight   + weighbridge_slip_1_url
--   Slip 2: truck weighed after loading -> loading_quantity     + weighbridge_slip_2_url
--   Slip 3: truck weighed after unload  -> unloading_quantity   + weighbridge_slip_3_url
--
-- empty_truck_weight/loading_quantity/unloading_quantity are always stored
-- in kg — the app's kg/tonnes toggle on these fields is purely a display/
-- input convenience, converting to kg before it ever reaches the DB. (This
-- is deliberately independent of the pre-existing weight_tonnes column,
-- which is read in ~15 other places across web and mobile that assume
-- tonnes — left untouched to avoid a cross-app breaking change.)
--
-- quantity_lost is derived (loading_quantity - unloading_quantity, in kg)
-- and kept as a Postgres GENERATED column so it can never drift from the two
-- inputs and the app never has to remember to recompute it on update.
--
-- All columns are nullable — existing trips are unaffected until a user
-- opens "Add Weighbridge Details" on a trip.
-- ============================================================================

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS loading_date            DATE,
  ADD COLUMN IF NOT EXISTS unloading_date          DATE,
  ADD COLUMN IF NOT EXISTS loading_quantity        NUMERIC,
  ADD COLUMN IF NOT EXISTS unloading_quantity      NUMERIC,
  ADD COLUMN IF NOT EXISTS empty_truck_weight      NUMERIC,
  ADD COLUMN IF NOT EXISTS weighbridge_slip_1_url  TEXT,
  ADD COLUMN IF NOT EXISTS weighbridge_slip_2_url  TEXT,
  ADD COLUMN IF NOT EXISTS weighbridge_slip_3_url  TEXT;

-- quantity_lost = loading_quantity - unloading_quantity, in kg, auto-
-- maintained by Postgres. NULL until both inputs are present.
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS quantity_lost NUMERIC
    GENERATED ALWAYS AS (loading_quantity - unloading_quantity) STORED;

-- ============================================================================
-- Storage bucket: trip-slips
--
-- Public bucket (so weighbridge slip photos can be shown as <img> thumbnails
-- via a plain public URL, same as how the rest of the UI expects to just
-- store+display a URL). Upload/modify is still scoped to the trip's owner via
-- the standard `${owner_id}/...` folder-prefix RLS pattern used elsewhere in
-- this project (see driver-uploads bucket policies).
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-slips', 'trip-slips', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "owner_upload_trip_slips" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'trip-slips'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "owner_update_trip_slips" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'trip-slips'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "owner_delete_trip_slips" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'trip-slips'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

-- Bucket is public, so reads work via the public URL without hitting RLS —
-- this SELECT policy just keeps authenticated/API-level listing consistent
-- with the same ownership scope.
CREATE POLICY "owner_read_trip_slips" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'trip-slips'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );
