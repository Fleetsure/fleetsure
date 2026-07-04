# Legacy SQL files (superseded)

These files were the project's schema/RLS history before `supabase/migrations/`
existed. Every schema change up to 2026-07-04 was run ad hoc through the
Supabase Dashboard SQL editor with no tracked migration history — these files
were the closest thing to a record of that, but they were incomplete
(several live functions and policies had no file at all) and, in
`supabase_schema.sql`'s case, stale (superseded by `MIGRATE_VEHICLES.sql` for
every table except `parties`, which is why `parties` had a live RLS bug until
`supabase/migrations/20260704000300_fix_parties_rls.sql`).

**`supabase/migrations/` is now the source of truth.** `20260704000000_baseline.sql`
reconstructs the full live schema as it actually existed (verified via direct
introspection of the live database), including the previously-undocumented
objects. Everything from here on is a normal incremental migration applied
via `supabase db push --linked`.

Kept for historical reference only — do not run these against the database.

- `supabase_schema.sql` — original UUID/`auth.uid()` schema, stale for every
  tenant table except it was never revisited for `parties`.
- `MIGRATE_VEHICLES.sql` — migrated the core tables to the Firebase-UID/TEXT
  model; this is what's actually live.
- `DRIVER_PORTAL_MIGRATION.sql`, `GET_DRIVER_TRIPS_MIGRATION.sql`,
  `TEAM_MEMBERS_MIGRATION.sql`, `DRIVER_OWNER_CONTACT_POLICY.sql` — additive
  migrations, all folded into the baseline.
