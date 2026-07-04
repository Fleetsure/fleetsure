# RLS / RPC regression tests

Run against the live linked project:

```sh
./supabase/tests/run.sh
```

Tests the exact vulnerability classes fixed in the Phase 1 security pass —
cross-tenant data isolation, the `get_active_driver_trips`/`get_completed_driver_trips`
IDOR, `get_team_role` identity binding, the `parties` RLS fix,
`driver-uploads` storage scoping, and admin_users-driven admin access.

**Safe to run anytime, including against production**: everything happens
inside one transaction (`BEGIN ... ROLLBACK`) that is always rolled back,
so no test data is ever persisted. `run.sh` wraps `rls_regression.sql` in
that transaction and exits non-zero if any assertion failed.

Mechanism: a sufficiently-privileged connection can `SET ROLE authenticated`
and set the `request.jwt.claims` session variable that `auth.jwt()`/`auth.uid()`
read from inside RLS policies — this exercises the real policies exactly as
PostgREST would for a real request, without needing an actual Firebase login
or the JWT signing secret.

Re-run this after any change to RLS policies, RPC functions, or the
migration baseline to confirm tenant isolation still holds.
