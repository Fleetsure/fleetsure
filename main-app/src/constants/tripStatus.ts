import { PRIMARY, WARNING, SUCCESS, DANGER } from "../theme";

// Previously redefined identically (modulo shape) in DashboardScreen,
// TripsScreen, and TripDetailScreen.
export const TRIP_STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  planned:     { bg: "#EEF2FF", color: PRIMARY, label: "Planned" },
  in_progress: { bg: "#FFF7ED", color: WARNING, label: "In Progress" },
  completed:   { bg: "#F0FDF4", color: SUCCESS, label: "Completed" },
  cancelled:   { bg: "#FEF2F2", color: DANGER,  label: "Cancelled" },
};

export const NEXT_STATUS: Record<string, string | null> = {
  planned: "in_progress",
  in_progress: "completed",
  completed: null,
  cancelled: null,
};

export const NEXT_STATUS_LABEL: Record<string, string> = {
  planned: "Start Trip",
  in_progress: "Mark Delivered",
};
