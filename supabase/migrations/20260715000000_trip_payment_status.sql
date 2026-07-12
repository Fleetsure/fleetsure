-- Add: trips.payment_status -- tracks freight collection (received/pending),
-- distinct from trips.status (trip lifecycle: planned/in_progress/completed).
-- Needed by the new Accounts > Freight view; no existing column captured this.

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('received', 'pending'));
