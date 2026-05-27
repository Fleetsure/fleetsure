"use client";
import { useEffect, useState } from "react";
import { teamService } from "@/lib/services/teamService";
import { IndianRupee, Download } from "lucide-react";

const CAT_COLOR: Record<string, string> = {
  Fuel:        "#e65100",
  Toll:        "#1565c0",
  Maintenance: "#7b1fa2",
  Tyre:        "#2e7d32",
  Misc:        "#555",
};

export default function AccountantExpenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [from, setFrom]         = useState("");
  const [to, setTo]             = useState("");
  const [catFilter, setCat]     = useState("all");

  const load = async () => {
    setLoading(true);
    const r = await teamService.getExpenses({ from: from || undefined, to: to || undefined });
    setExpenses(r.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [from, to]);

  const cats     = ["all", ...Array.from(new Set(expenses.map(e => e._cat).filter(Boolean)))];
  const filtered = catFilter === "all" ? expenses : expenses.filter(e => e._cat === catFilter);
  const total    = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);

  // Category totals for summary
  const catTotals = expenses.reduce((acc: Record<string, number>, e) => {
    const cat = e._cat || "Other";
    acc[cat] = (acc[cat] || 0) + Number(e.amount || 0);
    return acc;
  }, {});

  const handleExport = async () => {
    const XLSX = await import("xlsx");
    const rows = filtered.map(e => ({
      Date: e.date || "",
      Category: e._cat || "",
      Amount: Number(e.amount || 0),
      Vehicle: e.vehicles?.registration_number || e.trips?.vehicles?.registration_number || "",
      Description: e.description || e.notes || e.station || e.plaza || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, `fleet_expenses_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", border: "1.5px solid #e0e0ee", borderRadius: 8,
    fontSize: 13, background: "white", color: "#333",
  };

  return (
    <div style={{ padding: "28px 32px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 4 }}>Expenses</div>
          <div style={{ fontSize: 13, color: "#888" }}>
            {filtered.length} record{filtered.length !== 1 ? "s" : ""} · Total: ₹{total.toLocaleString("en-IN")}
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

      {/* Summary strip */}
      {!loading && Object.keys(catTotals).length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {Object.entries(catTotals).slice(0, 6).map(([cat, amt]) => {
            const color = CAT_COLOR[cat] || "#555";
            return (
              <div key={cat} style={{ padding: "8px 14px", borderRadius: 10, background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                <div>
                  <div style={{ fontSize: 11, color: "#888" }}>{cat}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color }}> ₹{Math.round(amt).toLocaleString("en-IN")}</div>
                </div>
              </div>
            );
          })}
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
            <button onClick={() => { setFrom(""); setTo(""); }} style={{ fontSize: 12, color: "#e53935", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          {cats.slice(0, 7).map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
              background: catFilter === c ? "#1a3a5c" : "#f0f0f8",
              color: catFilter === c ? "white" : "#555",
            }}>
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#aaa", fontSize: 14 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#aaa" }}>
            <IndianRupee size={36} color="#e0e0ee" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14 }}>No expenses for the selected filters.</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f8ff" }}>
                {["Date", "Category", "Vehicle / Trip", "Description", "Amount"].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => {
                const color   = CAT_COLOR[e._cat] || "#555";
                const vehicle = e.vehicles?.registration_number || e.trips?.vehicles?.registration_number || "—";
                const desc    = e.description || e.notes || e.station || e.plaza || "—";
                return (
                  <tr key={e.id + e._table} style={{ borderTop: i > 0 ? "1px solid #f0f0f8" : "none" }}>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#555" }}>
                      {e.date ? new Date(e.date).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: `${color}18`, color }}>
                        {e._cat}
                      </span>
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#555" }}>{vehicle}</td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#555", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {desc}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700, color: "#c62828" }}>
                      ₹{Number(e.amount || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f8f8ff", borderTop: "2px solid #e0e0ee" }}>
                <td colSpan={4} style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#555", textAlign: "right" }}>Total</td>
                <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 800, color: "#c62828" }}>
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
