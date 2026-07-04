-- ============================================================================
-- Add: link_driver_firebase_uid
--
-- Called by both the web driver portal and the driver mobile app on first
-- login to attach a driver's Firebase UID to their `drivers` row, but this
-- function has never existed anywhere -- live or in the repo. Every such
-- call currently fails with PostgREST error PGRST202 ("could not find
-- function"), so first-time driver login is broken today.
--
-- The live database already has the authorization logic for this encoded as
-- an UPDATE RLS policy (`driver_link_firebase_uid` on `drivers`, added in
-- the baseline migration): only a phone-verified caller whose phone matches
-- an unlinked driver row may set that row's firebase_uid, and only to their
-- own JWT sub. This function performs the same update explicitly rather
-- than relying on the app doing a raw `.update()` call, and -- importantly
-- -- ignores the client-supplied p_firebase_uid value, always binding to
-- the caller's own verified JWT `sub` instead, so a client can never link
-- an arbitrary UID to a driver row.
-- ============================================================================

CREATE OR REPLACE FUNCTION link_driver_firebase_uid(p_driver_id uuid, p_firebase_uid text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  caller_sub   text := auth.jwt() ->> 'sub';
  caller_phone text := auth.jwt() ->> 'phone_number';
BEGIN
  IF caller_sub IS NULL OR caller_phone IS NULL THEN
    RAISE EXCEPTION 'Not authenticated as a phone-verified user';
  END IF;

  UPDATE drivers
  SET firebase_uid = caller_sub
  WHERE id = p_driver_id
    AND firebase_uid IS NULL
    AND right(phone, 10) = right(caller_phone, 10);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver not found, already linked, or phone number mismatch';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION link_driver_firebase_uid(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION link_driver_firebase_uid(uuid, text) TO authenticated;
