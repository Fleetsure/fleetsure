-- Run this SQL to add the new Vahan columns to the existing vehicles table.
-- Only needed if you had a vehicles table from before this update.
-- Safe to run multiple times (uses IF NOT EXISTS / ALTER COLUMN patterns).

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS fuel_type       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS chassis_number  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS engine_number   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS vehicle_class   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS owner_name      VARCHAR(200),
  ADD COLUMN IF NOT EXISTS rto_code        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS color           VARCHAR(50),
  ADD COLUMN IF NOT EXISTS insurance_expiry DATE,
  ADD COLUMN IF NOT EXISTS fitness_expiry   DATE,
  ADD COLUMN IF NOT EXISTS puc_expiry       DATE,
  ADD COLUMN IF NOT EXISTS permit_expiry    DATE;

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'vehicles'
ORDER BY ordinal_position;
