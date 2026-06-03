-- ============================================================
-- Driver Trips RPC Functions
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
--
-- Why: Direct table queries are blocked by RLS because Supabase
-- cannot verify Firebase JWTs unless Third-party Auth is configured.
-- These SECURITY DEFINER functions bypass RLS, matching the same
-- pattern already used by get_driver_by_phone.
-- ============================================================

CREATE OR REPLACE FUNCTION get_active_driver_trips(p_driver_id UUID)
RETURNS TABLE (
  id              UUID,
  owner_id        TEXT,
  vehicle_id      UUID,
  driver_id       UUID,
  driver_name     TEXT,
  driver_phone    TEXT,
  origin          TEXT,
  destination     TEXT,
  distance_km     NUMERIC,
  start_date      DATE,
  end_date        DATE,
  doc_number      TEXT,
  material        TEXT,
  weight_tonnes   NUMERIC,
  freight_amount  NUMERIC,
  driver_advance  NUMERIC,
  status          TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ,
  vehicles        JSON
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    t.id,
    t.owner_id,
    t.vehicle_id,
    t.driver_id,
    t.driver_name,
    t.driver_phone,
    t.origin,
    t.destination,
    t.distance_km,
    t.start_date,
    t.end_date,
    t.doc_number,
    t.material,
    t.weight_tonnes,
    t.freight_amount,
    t.driver_advance,
    t.status::TEXT,
    t.notes,
    t.created_at,
    t.updated_at,
    json_build_object(
      'registration_number', v.registration_number,
      'make', v.make,
      'model', v.model
    ) AS vehicles
  FROM trips t
  LEFT JOIN vehicles v ON v.id = t.vehicle_id
  WHERE t.driver_id = p_driver_id
    AND t.status IN ('planned', 'in_progress')
  ORDER BY t.start_date DESC;
$$;

CREATE OR REPLACE FUNCTION get_completed_driver_trips(p_driver_id UUID)
RETURNS TABLE (
  id              UUID,
  owner_id        TEXT,
  vehicle_id      UUID,
  driver_id       UUID,
  driver_name     TEXT,
  driver_phone    TEXT,
  origin          TEXT,
  destination     TEXT,
  distance_km     NUMERIC,
  start_date      DATE,
  end_date        DATE,
  doc_number      TEXT,
  material        TEXT,
  weight_tonnes   NUMERIC,
  freight_amount  NUMERIC,
  driver_advance  NUMERIC,
  status          TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ,
  vehicles        JSON
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    t.id,
    t.owner_id,
    t.vehicle_id,
    t.driver_id,
    t.driver_name,
    t.driver_phone,
    t.origin,
    t.destination,
    t.distance_km,
    t.start_date,
    t.end_date,
    t.doc_number,
    t.material,
    t.weight_tonnes,
    t.freight_amount,
    t.driver_advance,
    t.status::TEXT,
    t.notes,
    t.created_at,
    t.updated_at,
    json_build_object(
      'registration_number', v.registration_number,
      'make', v.make,
      'model', v.model
    ) AS vehicles
  FROM trips t
  LEFT JOIN vehicles v ON v.id = t.vehicle_id
  WHERE t.driver_id = p_driver_id
    AND t.status = 'completed'
  ORDER BY t.end_date DESC NULLS LAST
  LIMIT 50;
$$;
