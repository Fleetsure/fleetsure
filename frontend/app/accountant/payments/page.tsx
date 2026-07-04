"use client";
import { useEffect, useState } from "react";
import { teamService } from "@/lib/services/teamService";
import { Download, Users } from "lucide-react";
import { PAYMENT_TYPE_COLOR } from "@/lib/constants/paymentType";

export default function AccountantPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [drivers, setDrivers]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [from, setFrom]         = useState("");
  const [to, setTo]             = useState("");
  const [driverFilter, setDriverFilter] = useState("all");

  useEffect(() => {
    Promise.all([
      teamService.getDriverPayments(),
      teamService.getDrivers(),
    ]).then(([pr, dr]) => {
      setPayments(pr.data ?? []);
      setDrivers(dr.data ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = payments.filter(p => {
    if (driverFilter !== "all" && p.driver_id !== driverFilter) return false;
    if (from && p.date < from) return false;
    if (to   && p.date > to)   return false;
    return true;
  });

  const total = filtered.reduce((s, p) => s + Number(p.amount || 0), 0);

  // Per-driver totals for summary strip
  const driverTotals = filtered.reduce((acc: Record<string, number>, p) => {
    const name = p.drivers?.name || "Unknown";
    acc[name] = (acc[name] || 0) + Number(p.amount || 0);
    return acc;
  }, {});

  const handleExport = async () => {
    const XLSX = await import("xlsx");
    const rows = filtered.map(p => ({
      Date:   p.date || "",
      Driver: p.drivers?.name  || "",
      Phone:  p.drivers?.phone || "",
      "Amount (₹)": Number(p.amount || 0),
      Type:   p.type || "",
      Notes:  p.notes || "",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Driver Payments");
    XLSX.writeFile(wb, `driver_payments_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", border: "1.5px solid #e0e0ee", borderRadius: 8,
    fontSize: 13, background: "white", color: "#333",
  };

  return (
    <div style={{ padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 4 }}>Driver Payments</div>
          <div style={{ fontSize: 13, color: "#888" }}>
            {loading ? "Loading…" : `${filtered.length} payment${filtered.length !== 1 ? "s" : ""} · Total: ₹${total.toLocaleString("en-IN")}`}
          </div>
        </div>
        <button onClick={handleExport} disabled={loading || filtered.length === 0} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 16px", borderRadius: 8, border: "none",
          background: "#1a3a5c", color: "white", fontSize: 13, fontWeight: 600,
          cursor: loading || filtered.length === 0 ? "not-allowed" : "pointer",
          opacity: loading || filtered.length === 0 ? 0.5 : 1,
        }}>
          <Download size={14} /> Export Excel
        </button>
      </div>

      {/* Per-driver summary strip */}
      {!loading && Object.keys(driverTotals).length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {Object.entries(driverTotals).slice(0, 6).map(([name, amt]) => (
            <div key={name} style={{
              padding: "8px 14px", borderRadius: 10, background: "white",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", gap: 8, alignItems: "center",
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1a3a5c" }} />
              <div>
                <div style={{ fontSize: 11, color: "#888" }}>{name}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a3a5c" }}>
                  ₹{Math.round(amt).toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#888" }}>From</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inputStyle} />
          <span style={{ fontSize: 12, color: "#888" }}>to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inputStyle} />
          {(from || to) && (
            <button onClick={() => { setFrom(""); setTo(""); }} style={{ fontSize: 12, color: "#e53935", background: "none", border: "none", cursor: "pointer" }}>
              Clear
            </button>
          )}
        </div>
        <select value={driverFilter} onChange={e => setDriverFilter(e.target.value)}
          style={{ ...inputStyle, marginLeft: "auto" }}>
          <option value="all">All Drivers</option>
          {drivers.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#aaa", fontSize: 14 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#aaa" }}>
            <Users size={36} color="#e0e0ee" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14 }}>No driver payments found.</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f8ff" }}>
                {["Date", "Driver", "Type", "Notes", "Amount"].map(h => (
                  <th key={h} style={{
                    padding: "11px 16px", textAlign: "left", fontSize: 11,
                    fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const typeColor = PAYMENT_TYPE_COLOR[p.type] || "#555";
                return (
                  <tr key={p.id} style={{ borderTop: i > 0 ? "1px solid #f0f0f8" : "none" }}>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#555" }}>
                      {p.date ? new Date(p.date).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
                        {p.drivers?.name || "—"}
                      </div>
                      {p.drivers?.phone && (
                        <div style={{ fontSize: 11, color: "#888" }}>{p.drivers.phone}</div>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {p.type ? (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8,
                          background: `${typeColor}18`, color: typeColor, textTransform: "capitalize",
                        }}>
                          {p.type}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{
                      padding: "12px 16px", fontSize: 12, color: "#555",
                      maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {p.notes || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#1a3a5c" }}>
                      ₹{Number(p.amount || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f8f8ff", borderTop: "2px solid #e0e0ee" }}>
                <td colSpan={4} style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#555", textAlign: "right" }}>
                  Total Paid
                </td>
                <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 800, color: "#1a3a5c" }}>
                  ₹{total.toLocaleString("en-IN")}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
