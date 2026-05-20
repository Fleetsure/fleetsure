/**
 * Parse a YYYY-MM-DD string as a local date (not UTC).
 * `new Date("2026-05-20")` assumes UTC midnight → shows May 19 in IST.
 * This splits the string and constructs the date in local time instead.
 */
export function parseLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const s = String(dateStr).slice(0, 10); // take only YYYY-MM-DD part
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d); // local midnight — no UTC shift
}

/**
 * Format a YYYY-MM-DD string for display. Returns "—" for empty values.
 * e.g. "2026-05-20" → "20 May 2026"
 */
export function fmtDate(dateStr: string | null | undefined): string {
  const d = parseLocalDate(dateStr);
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * How many days until a YYYY-MM-DD expiry date (negative = expired).
 */
export function daysUntil(dateStr: string | null | undefined): number | null {
  const d = parseLocalDate(dateStr);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

/**
 * Today's date as YYYY-MM-DD in local time (safe default for date inputs).
 */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
