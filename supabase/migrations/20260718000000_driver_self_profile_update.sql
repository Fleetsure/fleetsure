-- ============================================================================
-- Add: update_driver_own_profile
--
-- There is no RLS UPDATE policy letting a driver edit their own profile —
-- only the narrow `driver_link_firebase_uid` one-time linking policy exists.
-- A plain RLS policy scoped by firebase_uid would let a driver update *any*
-- column on their own row, including owner_id/status — same problem
-- link_driver_firebase_uid was already built to avoid for the linking case.
-- Same fix here: a SECURITY DEFINER RPC with a hard-coded column allowlist,
-- instead of a broad UPDATE policy.
-- ============================================================================

CREATE OR REPLACE FUNCTION update_driver_own_profile(
  p_emergency_contact_name  TEXT DEFAULT NULL,
  p_emergency_contact_phone TEXT DEFAULT NULL,
  p_address                 TEXT DEFAULT NULL,
  p_permanent_address       TEXT DEFAULT NULL,
  p_aadhaar_number          TEXT DEFAULT NULL,
  p_pan_number              TEXT DEFAULT NULL,
  p_license_image_url       TEXT DEFAULT NULL,
  p_aadhaar_front_url       TEXT DEFAULT NULL,
  p_aadhaar_back_url        TEXT DEFAULT NULL,
  p_pan_image_url           TEXT DEFAULT NULL,
  p_profile_photo_url       TEXT DEFAULT NULL
) RETURNS drivers
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  updated_row drivers;
BEGIN
  UPDATE drivers SET
    emergency_contact_name  = COALESCE(p_emergency_contact_name,  emergency_contact_name),
    emergency_contact_phone = COALESCE(p_emergency_contact_phone, emergency_contact_phone),
    address                 = COALESCE(p_address,                 address),
    permanent_address       = COALESCE(p_permanent_address,       permanent_address),
    aadhaar_number          = COALESCE(p_aadhaar_number,          aadhaar_number),
    pan_number              = COALESCE(p_pan_number,              pan_number),
    license_image_url       = COALESCE(p_license_image_url,       license_image_url),
    aadhaar_front_url       = COALESCE(p_aadhaar_front_url,       aadhaar_front_url),
    aadhaar_back_url        = COALESCE(p_aadhaar_back_url,        aadhaar_back_url),
    pan_image_url           = COALESCE(p_pan_image_url,           pan_image_url),
    profile_photo_url       = COALESCE(p_profile_photo_url,       profile_photo_url)
  WHERE firebase_uid = (auth.jwt() ->> 'sub')
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'Driver profile not found for this session';
  END IF;

  RETURN updated_row;
END;
$$;

REVOKE ALL ON FUNCTION update_driver_own_profile(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION update_driver_own_profile(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;
