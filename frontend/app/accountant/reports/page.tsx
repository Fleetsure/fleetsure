"use client";
import { useEffect, useState } from "react";
import { teamService } from "@/lib/services/teamService";
import { Download, FileText } from "lucide-react";

type ViewMode = "trip" | "month" | "vehicle";

export default function AccountantReports() {
  const [trips, setTrips]       = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [from, setFrom]         = useState("");
  const [to, setTo]             = useState("");
  const [view, setView]         = useState<ViewMode>("trip");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      teamService.getTrips({ from: from || undefined, to: to || undefined }),
      teamService.getExpenses({ from: from || undefined, to: to || undefined }),
    ]).then(([tr, er]) => {
      setTrips(tr.data ?? []);
      setExpenses(er.data ?? []);
      setLoading(false);
    });
  }, [from, to]);

  const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  const profitColor = (n: number) => n >= 0 ? "#2e7d32" : "#c62828";

  // Per-trip expense totals (matched by trip_id)
  const expByTrip = expenses.reduce((acc: Record<string, number>, e) => {
    if (e.trip_id) acc[e.trip_id] = (acc[e.trip_id] || 0) + Number(e.amount || 0);
    return acc;
  }, {});

  const tripPL = trips.map(t => {
    const revenue  = Number(t.freight_amount || 0);
    const expTotal = expByTrip[t.id] || 0;
    const profit   = revenue - expTotal;
    const margin   = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    return { ...t, expTotal, profit, margin };
  });

  const totalRevenue  = tripPL.reduce((s, t) => s + Number(t.freight_amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalProfit   = totalRevenue - totalExpenses;

  // By month
  const monthMap = new Map<string, { revenue: number; expenses: number; trips: number }>();
  trips.forEach(t => {
    const m = (t.start_date || "").slice(0, 7);
    if (!m) return;
    const entry = monthMap.get(m) || { revenue: 0, expenses: 0, trips: 0 };
    entry.revenue += Number(t.freight_amount || 0);
    entry.trips++;
    monthMap.set(m, entry);
  });
  expenses.forEach(e => {
    const m = (e.date || "").slice(0, 7);
    if (!m) return;
    const entry = monthMap.get(m) || { revenue: 0, expenses: 0, trips: 0 };
    entry.expenses += Number(e.amount || 0);
    monthMap.set(m, entry);
  });
  const monthlyPL = Array.from(monthMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, v]) => ({
      month, ...v,
      profit: v.revenue - v.expenses,
      margin: v.revenue > 0 ? Math.round(((v.revenue - v.expenses) / v.revenue) * 100) : 0,
    }));

  // By vehicle
  const vehMap = new Map<string, { reg: string; revenue: number; expenses: number; trips: number }>();
  trips.forEach(t => {
    const key = t.vehicle_id || t.vehicles?.registration_number || "Unknown";
    const reg = t.vehicles?.registration_number || key;
    const entry = vehMap.get(key) || { reg, revenue: 0, expenses: 0, trips: 0 };
    entry.revenue += Number(t.freight_amount || 0);
    entry.trips++;
    vehMap.set(key, entry);
  });
  expenses.forEach(e => {
    const key = e.vehicle_id || e.vehicles?.registration_number || "Unknown";
    const reg = e.vehicles?.registration_number || e.trips?.vehicles?.registration_number || key;
    const entry = vehMap.get(key) || { reg, revenue: 0, expenses: 0, trips: 0 };
    entry.expenses += Number(e.amount || 0);
    vehMap.set(key, entry);
  });
  const vehiclePL = Array.from(vehMap.values())
    .map(v => ({ ...v, profit: v.revenue - v.expenses, margin: v.revenue > 0 ? Math.round(((v.revenue - v.expenses) / v.revenue) * 100) : 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  const handleExport = async () => {
    const XLSX = await import("xlsx");
    const wb   = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Metric: "Total Revenue",   Value: totalRevenue },
      { Metric: "Total Expenses",  Value: totalExpenses },
      { Metric: "Net Profit",      Value: totalProfit },
      { Metric: "Total Trips",     Value: trips.length },
    ]), "Summary");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tripPL.map(t => ({
      Date:              t.start_date || "",
      Route:             `${t.origin} → ${t.destination}`,
      Vehicle:           t.vehicles?.registration_number || "",
      Driver:            t.drivers?.name || "",
      "Revenue (₹)":     Number(t.freight_amount || 0),
      "Expenses (₹)":    t.expTotal,
      "Profit (₹)":      t.profit,
      "Margin %":        `${t.margin}%`,
    }))), "Trip P&L");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthlyPL.map(m => ({
      Month:          m.month,
      Trips:          m.trips,
      "Revenue (₹)":  m.revenue,
      "Expenses (₹)": m.expenses,
      "Profit (₹)":   m.profit,
      "Margin %":     `${m.margin}%`,
    }))), "Monthly P&L");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vehiclePL.map(v => ({
      Vehicle:        v.reg,
      Trips:          v.trips,
      "Revenue (₹)":  v.revenue,
      "Expenses (₹)": v.expenses,
      "Profit (₹)":   v.profit,
      "Margin %":     `${v.margin}%`,
    }))), "Vehicle P&L");

    XLSX.writeFile(wb, `pl_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", border: "1.5px solid #e0e0ee", borderRadius: 8,
    fontSize: 13, background: "white", color: "#333",
  };

  const thStyle: React.CSSProperties = {
    padding: "11px 16px", textAlign: "left", fontSize: 11,
    fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em",
  };

  return (
    <div style={{ padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 4 }}>Profit & Loss Report</div>
          <div style={{ fontSize: 13, color: "#888" }}>
            {loading ? "Loading…" : `${trips.length} trip${trips.length !== 1 ? "s" : ""} · Net ${totalProfit >= 0 ? "profit" : "loss"}: ${fmt(Math.abs(totalProfit))}`}
          </div>
        </div>
        <button onClick={handleExport} disabled={loading || trips.length === 0} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 16px", borderRadius: 8, border: "none",
          background: "#1a3a5c", color: "white", fontSize: 13, fontWeight: 600,
          cursor: loading || trips.length === 0 ? "not-allowed" : "pointer",
          opacity: loading || trips.length === 0 ? 0.5 : 1,
        }}>
          <Download size={14} /> Export Report
        </button>
      </div>

      {/* KPI strip */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total Revenue",  value: totalRevenue,  color: "#2e7d32", bg: "#e8f5e9" },
            { label: "Total Expenses", value: totalExpenses, color: "#c62828", bg: "#ffebee" },
            { label: "Net Profit",     value: totalProfit,   color: profitColor(totalProfit), bg: totalProfit >= 0 ? "#e8f5e9" : "#ffebee" },
          ].map(k => (
            <div key={k.label} style={{ background: "white", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{fmt(k.value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters + view toggle */}
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
          {([["trip", "By Trip"], ["month", "By Month"], ["vehicle", "By Vehicle"]] as [ViewMode, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setView(key)} style={{
              padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
              background: view === key ? "#1a3a5c" : "#f0f0f8",
              color: view === key ? "white" : "#555",
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#aaa", fontSize: 14 }}>Loading…</div>

        ) : view === "trip" ? (
          tripPL.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#aaa" }}>
              <FileText size={36} color="#e0e0ee" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 14 }}>No trips found for the selected period.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8f8ff" }}>
                  {["Date", "Route", "Vehicle", "Driver", "Revenue", "Expenses", "Profit", "Margin"].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tripPL.map((t, i) => (
                  <tr key={t.id} style={{ borderTop: i > 0 ? "1px solid #f0f0f8" : "none" }}>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#555" }}>
                      {t.start_date ? new Date(t.start_date).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
                      {t.origin} → {t.destination}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#555" }}>
                      {t.vehicles?.registration_number || "—"}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#555" }}>
                      {t.drivers?.name || "—"}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700, color: "#2e7d32" }}>
                      {fmt(t.freight_amount || 0)}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#c62828" }}>
                      {t.expTotal > 0 ? fmt(t.expTotal) : "—"}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700, color: profitColor(t.profit) }}>
                      {fmt(t.profit)}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 8,
                        background: t.margin >= 0 ? "#e8f5e9" : "#ffebee",
                        color: profitColor(t.margin),
                      }}>
                        {t.margin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f8f8ff", borderTop: "2px solid #e0e0ee" }}>
                  <td colSpan={4} style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#555", textAlign: "right" }}>Total</td>
                  <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 800, color: "#2e7d32" }}>{fmt(totalRevenue)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 800, color: "#c62828" }}>{fmt(totalExpenses)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 800, color: profitColor(totalProfit) }}>{fmt(totalProfit)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )

        ) : view === "month" ? (
          monthlyPL.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#aaa" }}>No data found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8f8ff" }}>
                  {["Month", "Trips", "Revenue", "Expenses", "Profit", "Margin"].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyPL.map((m, i) => (
                  <tr key={m.month} style={{ borderTop: i > 0 ? "1px solid #f0f0f8" : "none" }}>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
                      {new Date(m.month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#555" }}>{m.trips}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#2e7d32" }}>{fmt(m.revenue)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#c62828" }}>{fmt(m.expenses)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: profitColor(m.profit) }}>{fmt(m.profit)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 8,
                        background: m.margin >= 0 ? "#e8f5e9" : "#ffebee",
                        color: profitColor(m.margin),
                      }}>
                        {m.margin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )

        ) : (
          // By Vehicle
          vehiclePL.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#aaa" }}>No data found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8f8ff" }}>
                  {["Vehicle", "Trips", "Revenue", "Expenses", "Profit", "Margin"].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehiclePL.map((v, i) => (
                  <tr key={v.reg} style={{ borderTop: i > 0 ? "1px solid #f0f0f8" : "none" }}>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{v.reg}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#555" }}>{v.trips}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#2e7d32" }}>{fmt(v.revenue)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#c62828" }}>{fmt(v.expenses)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: profitColor(v.profit) }}>{fmt(v.profit)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 8,
                        background: v.margin >= 0 ? "#e8f5e9" : "#ffebee",
                        color: profitColor(v.margin),
                      }}>
                        {v.margin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
