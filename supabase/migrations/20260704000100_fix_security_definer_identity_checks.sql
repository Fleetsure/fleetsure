-- ============================================================================
-- Fix: SECURITY DEFINER functions trusting client-supplied identity
--
-- get_active_driver_trips / get_completed_driver_trips took p_driver_id as a
-- plain argument and bypassed RLS (SECURITY DEFINER) with no check that the
-- caller *is* that driver -- any authenticated user could read another
-- tenant's driver trips (freight amounts, phone numbers) by passing any
-- driver UUID.
--
-- get_team_role took p_uid/p_email as plain arguments, same bypass, and was
-- executable even by `anon` -- anyone could learn any identity's team role.
-- ============================================================================

-- Keep the same signature (no app code changes needed) but require the
-- caller's own derived driver id to match the requested one.
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
    AND t.status IN ('planned', 'in_progress')
  ORDER BY t.start_date DESC;
$$;

CREATE OR REPLACE FUNCTION get_completed_driver_trips(p_driver_id UUID)
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
    AND t.status = 'completed'
  ORDER BY t.end_date DESC NULLS LAST
  LIMIT 50;
$$;

-- Drop the old signature and replace with a zero-argument, self-lookup
-- function (matching get_driver_id_for_uid / get_team_member_role) that
-- derives identity from the caller's own verified JWT instead of trusting
-- client-supplied uid/email. The Supabase JWT minted by exchange-token now
-- includes an `email` claim (see supabase/functions/exchange-token) so the
-- email-based first-login match for team members (before firebase_uid is
-- linked) keeps working without trusting client input.
DROP FUNCTION IF EXISTS get_team_role(text, text);

CREATE OR REPLACE FUNCTION get_team_role()
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT role FROM team_members
  WHERE (firebase_uid = auth.jwt() ->> 'sub' OR email = auth.jwt() ->> 'email')
  AND is_active = true
  LIMIT 1;
$$;

-- anon no longer needs this at all -- only an authenticated caller (one
-- who has already exchanged a Firebase token for a Supabase JWT) can call it.
REVOKE ALL ON FUNCTION get_team_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_team_role() TO authenticated;
