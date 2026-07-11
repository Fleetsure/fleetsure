-- ============================================================================
-- Bug fix: driver-app login could resolve a phone number to the WRONG
-- driver row when duplicate driver records share the same phone number.
--
-- `drivers.phone` has no uniqueness constraint (see baseline schema), so
-- nothing stops an owner from ending up with two driver rows for the same
-- person (re-added after a typo, added twice, etc). get_driver_by_phone
-- previously did an exact `phone = p_phone` match with `LIMIT 1` and no
-- `ORDER BY` — Postgres does not guarantee which row a LIMIT-without-ORDER
-- BY returns, so:
--   1. It could silently pick a different duplicate on every login,
--      switching a driver between "sees their trips" and "sees nothing"
--      across app restarts, with no code change and no visible cause.
--   2. It compared phone numbers exactly, while every RLS policy in this
--      app compares the last 10 digits (right(phone, 10)) — a driver whose
--      stored number has different formatting (spaces, +91 prefix, etc.)
--      than what Firebase reports could fail to match at all.
--
-- Fix: normalize the match the same way RLS does, and make the pick
-- deterministic — prefer a row that's already linked to a firebase_uid
-- (so a driver keeps resolving to the SAME row on every login instead of
-- flip-flopping), falling back to the oldest row (most likely to be the
-- original one with trip history already attached to it).
-- ============================================================================

CREATE OR REPLACE FUNCTION get_driver_by_phone(p_phone text)
 RETURNS SETOF drivers LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
    SELECT * FROM drivers
    WHERE right(phone, 10) = right(p_phone, 10)
    ORDER BY (firebase_uid IS NOT NULL) DESC, created_at ASC
    LIMIT 1;
END;
$$;

-- ============================================================================
-- This does NOT retroactively fix a driver who is already linked
-- (firebase_uid set) to the wrong duplicate row — it only prevents the
-- inconsistent behavior going forward. Run the diagnostic query below
-- first to check whether that's what happened to "Alpha" (phone
-- 9380361146) before assuming this migration alone resolves it.
-- ============================================================================

-- Run this SELECT (does not modify anything) to list any phone numbers
-- with more than one driver row under the same owner:
--
-- SELECT owner_id, right(phone, 10) AS phone_last10, count(*), array_agg(id) AS driver_ids, array_agg(firebase_uid) AS linked_uids
-- FROM drivers
-- GROUP BY owner_id, right(phone, 10)
-- HAVING count(*) > 1;
