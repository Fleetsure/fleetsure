import { TRIP_STATUS_CONFIG } from "@/lib/constants/tripStatus";

export default function TripStatusBadge({ status }: { status: string }) {
  const c = TRIP_STATUS_CONFIG[status] ?? TRIP_STATUS_CONFIG.planned;
  return (
    <span style={{ background: c.bg, color: c.color, padding: "3px 10px", borderRadius: 12, fontSize: 11.5, fontWeight: 700 }}>
      {c.label}
    </span>
  );
}
