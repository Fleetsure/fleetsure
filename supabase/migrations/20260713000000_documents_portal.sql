-- ============================================================================
-- Centralized Documents Portal
--
-- Adds the fields needed to turn the existing `documents` table (previously
-- vehicle-only, base64-blob storage) into the single destination every
-- upload across the app writes to: driver docs, vehicle compliance docs,
-- trip weighbridge slips, and fuel/toll/driver-expense receipts.
--
-- Nothing existing is dropped or renamed — `vehicle_id`, `doc_type`,
-- `content_b64`, `file_name`, `file_size`, `mime_type` all stay so old rows
-- keep working. New rows going forward use `category` / `file_url` /
-- `linked_type` / `linked_id` / `expiry_date` instead.
-- ============================================================================

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS category    TEXT,
  ADD COLUMN IF NOT EXISTS file_url    TEXT,
  ADD COLUMN IF NOT EXISTS linked_type TEXT,
  ADD COLUMN IF NOT EXISTS linked_id   UUID,
  ADD COLUMN IF NOT EXISTS expiry_date DATE;

ALTER TABLE documents
  ADD CONSTRAINT documents_linked_type_check
  CHECK (linked_type IS NULL OR linked_type IN ('driver', 'vehicle', 'trip', 'business', 'other'));

-- Backfill: every pre-existing row was a vehicle document (that was the only
-- kind the old page/table supported) — tag it so it surfaces under "Vehicle
-- Documents" in the new portal instead of silently disappearing.
UPDATE documents
SET linked_type = 'vehicle', linked_id = vehicle_id, category = 'Vehicle Documents'
WHERE vehicle_id IS NOT NULL AND linked_type IS NULL;

UPDATE documents
SET category = 'Other'
WHERE category IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_owner_category ON documents (owner_id, category);
CREATE INDEX IF NOT EXISTS idx_documents_linked ON documents (linked_type, linked_id);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents (expiry_date) WHERE expiry_date IS NOT NULL;

-- RLS: the existing "documents_owner" policy (FOR ALL USING owner_id = jwt sub)
-- already covers every new column — no policy changes needed.

-- ============================================================================
-- New: receipt photo columns for fuel/toll logs (no upload capability
-- existed for either before this feature).
-- ============================================================================

ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE toll_logs ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- ============================================================================
-- Storage bucket: fleet-documents
--
-- Single public bucket for every upload the Documents Portal auto-flow
-- writes to (driver docs, vehicle docs, weighbridge slips, receipts) plus
-- manual uploads from the portal itself. Public so `file_url` can always be
-- a plain public URL with no signed-URL step anywhere in the app.
--
-- Two upload paths need to be allowed:
--   - the owner's web app, authenticated as the owner (jwt sub = owner_id):
--     objects stored at `${owner_id}/...`
--   - the driver mobile app, authenticated as the driver (jwt sub = the
--     driver's own firebase_uid, linked via drivers.firebase_uid) uploading
--     expense receipts: objects stored at `${driver_id}/...`, same
--     convention as the existing driver-uploads bucket.
-- The `documents` row's `owner_id` column (not the storage path) is what
-- the portal actually scopes by, so either path convention is fine as long
-- as storage RLS lets the right person write to it.
--
-- driver-docs and trip-slips remain as legacy buckets — old files there
-- keep working via their existing policies; nothing new is written there
-- after this migration.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('fleet-documents', 'fleet-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "owner_or_driver_upload_fleet_documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'fleet-documents'
    AND (
      (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
      OR (storage.foldername(name))[1] = get_driver_id_for_uid()::text
    )
  );

CREATE POLICY "owner_or_driver_update_fleet_documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'fleet-documents'
    AND (
      (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
      OR (storage.foldername(name))[1] = get_driver_id_for_uid()::text
    )
  );

CREATE POLICY "owner_or_driver_delete_fleet_documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'fleet-documents'
    AND (
      (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
      OR (storage.foldername(name))[1] = get_driver_id_for_uid()::text
    )
  );

-- Bucket is public, so reads work via the public URL without hitting RLS —
-- this SELECT policy just keeps authenticated/API-level listing consistent
-- with the same ownership scope (matches the trip-slips bucket pattern).
CREATE POLICY "owner_or_driver_read_fleet_documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'fleet-documents'
    AND (
      (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
      OR (storage.foldername(name))[1] = get_driver_id_for_uid()::text
    )
  );
