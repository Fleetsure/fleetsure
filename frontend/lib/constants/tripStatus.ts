// Canonical trip status config. Previously redefined 5 times with a real
// color conflict: 3 files used green for in_progress + gray for completed,
// while trips/page.tsx and analytics/page.tsx used orange for in_progress +
// green for completed. Standardizing on the trips/page.tsx version (orange
// "in progress" reads better than green, which conventionally means "done").
export const TRIP_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; step: number }
> = {
  planned:        { label: "Planned",         color: "#1565c0", bg: "#e3f2fd", step: 0 },
  in_progress:    { label: "In Progress",     color: "#e65100", bg: "#fff3e0", step: 1 },
  pending_review: { label: "Pending Review",  color: "#6a1b9a", bg: "#f3e5f5", step: 2 },
  completed:      { label: "Completed",       color: "#2e7d32", bg: "#e8f5e9", step: 3 },
  cancelled:      { label: "Cancelled",       color: "#c62828", bg: "#fce4ec", step: -1 },
};

export const TRIP_STATUS_COLOR: Record<string, string> = Object.fromEntries(
  Object.entries(TRIP_STATUS_CONFIG).map(([status, cfg]) => [status, cfg.color])
);

export const TRIP_STATUS_BG: Record<string, string> = Object.fromEntries(
  Object.entries(TRIP_STATUS_CONFIG).map(([status, cfg]) => [status, cfg.bg])
);
