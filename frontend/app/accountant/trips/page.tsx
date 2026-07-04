"use client";
import { useEffect, useState } from "react";
import { teamService } from "@/lib/services/teamService";
import { Route } from "lucide-react";
import { TRIP_STATUS_COLOR as STATUS_COLOR, TRIP_STATUS_BG as STATUS_BG } from "@/lib/constants/tripStatus";

export default function AccountantTrips() {
  const [trips, setTrips]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom]     = useState("");
  const [to, setTo]         = useState("");
  const [statusFilter, setStatus] = useState("all");

  const load = async () => {
    setLoading(true);
    const filters: any = {};
    if (statusFilter !== "all") filters.status = statusFilter;
    if (from) filters.from = from;
    if (to)   filters.to   = to;
    const r = await teamService.getTrips(filters);
    setTrips(r.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [from, to, statusFilter]);

  const total = trips.reduce((s, t) => s + Number(t.freight_amount || 0), 0);

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", border: "1.5px solid #e0e0ee", borderRadius: 8,
    fontSize: 13, background: "white", color: "#333",
  };

  return (
    <div style={{ padding: "28px 32px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 4 }}>Trips</div>
        <div style={{ fontSize: 13, color: "#888" }}>
          {trips.length} trip{trips.length !== 1 ? "s" : ""} · Total freight: ₹{total.toLocaleString("en-IN")}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#888" }}>From</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inputStyle} />
          <span style={{ fontSize: 12, color: "#888" }}>to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inputStyle} />
          {(from || to) && (
            <button onClick={() => { setFrom(""); setTo(""); }} style={{ fontSize: 12, color: "#e53935", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          {["all", "planned", "in_progress", "completed", "cancelled"].map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
              background: statusFilter === s ? "#1a3a5c" : "#f0f0f8",
              color: statusFilter === s ? "white" : "#555",
            }}>
              {s === "all" ? "All" : s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#aaa", fontSize: 14 }}>Loading...</div>
        ) : trips.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#aaa" }}>
            <Route size={36} color="#e0e0ee" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14 }}>No trips found for the selected filters.</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f8ff" }}>
                {["Date", "Route", "Vehicle", "Driver", "Freight", "Status"].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trips.map((t, i) => (
                <tr key={t.id} style={{ borderTop: i > 0 ? "1px solid #f0f0f8" : "none" }}>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#555" }}>
                    {t.start_date ? new Date(t.start_date).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
                    {t.origin} → {t.destination}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#555" }}>
                    {t.vehicles?.registration_number || "—"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#555" }}>
                    {t.drivers?.name || "—"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#2e7d32" }}>
                    ₹{Number(t.freight_amount || 0).toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8,
                      background: STATUS_BG[t.status] || "#f5f5f5",
                      color: STATUS_COLOR[t.status] || "#555",
                      textTransform: "capitalize",
                    }}>
                      {t.status?.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f8f8ff", borderTop: "2px solid #e0e0ee" }}>
                <td colSpan={4} style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#555", textAlign: "right" }}>Total Freight</td>
                <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 800, color: "#2e7d32" }}>
                  ₹{total.toLocaleString("en-IN")}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
