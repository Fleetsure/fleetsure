-- ============================================================================
-- Fix: driver-uploads storage policies check "is *a* driver", not "is *this*
-- driver"
--
-- Upload paths are always `${driverId}/${tripId}/...` (see
-- frontend/lib/services/driverPortalService.ts and
-- driver-app/src/services/driverService.ts), so any authenticated driver can
-- currently read or upload into any other driver's folder in the bucket.
-- Scope both policies to require the first path segment to equal the
-- caller's own derived driver id.
-- ============================================================================

DROP POLICY IF EXISTS "driver_read_own_files" ON storage.objects;
DROP POLICY IF EXISTS "driver_upload_own_files" ON storage.objects;

CREATE POLICY "driver_read_own_files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'driver-uploads'
    AND get_driver_id_for_uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_driver_id_for_uid()::text
  );

CREATE POLICY "driver_upload_own_files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'driver-uploads'
    AND get_driver_id_for_uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_driver_id_for_uid()::text
  );
