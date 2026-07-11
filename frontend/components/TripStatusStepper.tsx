import { TRIP_STATUS_CONFIG } from "@/lib/constants/tripStatus";

export default function TripStatusStepper({ status }: { status: string }) {
  const STEPS = ["planned", "in_progress", "pending_review", "completed"];
  const cur = TRIP_STATUS_CONFIG[status]?.step ?? 0;
  const cancelled = status === "cancelled";

  // Build alternating step-circle and connector array
  const items: React.ReactNode[] = [];
  STEPS.forEach((s, i) => {
    const cfg    = TRIP_STATUS_CONFIG[s];
    const past   = !cancelled && cur > i;
    const active = !cancelled && cur === i;
    items.push(
      <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 60 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: past || active ? cfg.color : "#e8e8f0",
          color: past || active ? "#fff" : "#bbb",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700,
          outline: active ? `3px solid ${cfg.color}44` : "none",
          outlineOffset: 2,
        }}>
          {past ? "✓" : i + 1}
        </div>
        <div style={{ fontSize: 10.5, fontWeight: active ? 700 : 500, color: active ? cfg.color : past ? "#555" : "#bbb", textAlign: "center" }}>
          {cfg.label}
        </div>
      </div>
    );
    if (i < STEPS.length - 1) {
      items.push(
        <div key={`c${i}`} style={{ flex: 1, height: 2, background: past ? "#2e7d32" : "#e8e8f0", margin: "13px 4px 0", minWidth: 20 }} />
      );
    }
  });

  return <div style={{ display: "flex", alignItems: "flex-start", padding: "12px 0 8px" }}>{items}</div>;
}
