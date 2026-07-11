-- ============================================================================
-- Cleanup: drop columns confirmed to have zero references anywhere in
-- frontend/, main-app/, or driver-app/, and zero references in any RLS
-- policy, trigger, or SQL function across all prior migrations.
--
-- Deliberately NOT included here (left alone on purpose):
--   - Unread created_at/updated_at columns elsewhere in the schema — low
--     value to remove, real value as audit history if ever needed.
--   - subscriptions.razorpay_subscription_id, operational_insights.driver_id/
--     trip_id/expires_at — no write path found in any of the three app
--     codebases, but operational_insights has no INSERT path anywhere in
--     this repo either, meaning something outside these three apps (an
--     Edge Function, webhook, external script) may own that table. Don't
--     drop billing/webhook-adjacent columns without confirming that first.
--   - trips.updated_at — unread by the app, but returned by the
--     get_active_driver_trips / get_completed_driver_trips RPCs
--     (RETURNS TABLE lists it explicitly) — dropping it needs those
--     functions patched first, not a plain column drop.
-- ============================================================================

-- users: leftovers from a pre-Firebase auth scheme (this app now uses
-- Firebase Auth exclusively — confirmed no code path reads or writes
-- either column).
ALTER TABLE users
  DROP COLUMN IF EXISTS google_id,
  DROP COLUMN IF EXISTS hashed_password;

-- documents: doc_type/file_size were already called out as legacy,
-- kept-for-old-rows-only in the Documents Portal migration comments, and
-- confirmed unread by any of the three apps.
ALTER TABLE documents
  DROP COLUMN IF EXISTS doc_type,
  DROP COLUMN IF EXISTS file_size;

-- marketplace_return_loads.rating: distinct column from
-- marketplace_load_interests.rating (which IS used, via StarRating in
-- frontend/app/marketplace/page.tsx) — this one on the load itself has no
-- reader anywhere.
ALTER TABLE marketplace_return_loads
  DROP COLUMN IF EXISTS rating;
