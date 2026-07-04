#!/usr/bin/env bash
# Runs supabase/tests/rls_regression.sql against the linked project inside a
# transaction that is always rolled back, so no test data is ever persisted.
# Exits non-zero if any assertion failed.
set -euo pipefail
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SQL="BEGIN;
$(cat "$TEST_DIR/rls_regression.sql")
ROLLBACK;"

cd "$TEST_DIR/../.."

OUTPUT=$(supabase db query --linked "$SQL" 2>&1)

if ! echo "$OUTPUT" | grep -q '"rows"'; then
  echo "Test run failed to execute:"
  echo "$OUTPUT"
  exit 1
fi

JSON=$(echo "$OUTPUT" | sed -n '/^{/,/^}/p')
FAILED=$(echo "$JSON" | jq '[.rows[] | select(.passed == false)] | length')
TOTAL=$(echo "$JSON" | jq '.rows | length')

echo "$JSON" | jq -r '.rows[] | (if .passed then "  PASS" else "  FAIL" end) + "  " + .name + "  (" + .detail + ")"'
echo ""
echo "$((TOTAL - FAILED))/$TOTAL passed"

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
