const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  open:      { bg: "#e8f5e9", color: "#2e7d32", label: "Open" },
  matched:   { bg: "#e3f2fd", color: "#1565c0", label: "Matched" },
  expired:   { bg: "#f5f5f5", color: "#999",    label: "Expired" },
  cancelled: { bg: "#fce4ec", color: "#c62828", label: "Cancelled" },
  pending:   { bg: "#fff8e1", color: "#e65100", label: "Pending" },
  accepted:  { bg: "#e8f5e9", color: "#2e7d32", label: "Accepted" },
  rejected:  { bg: "#fce4ec", color: "#c62828", label: "Rejected" },
  withdrawn: { bg: "#f5f5f5", color: "#999",    label: "Withdrawn" },
};

export default function Badge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || { bg: "#f0f0f0", color: "#666", label: status };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99 }}>
      {s.label}
    </span>
  );
}
