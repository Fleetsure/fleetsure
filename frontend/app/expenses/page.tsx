"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { tripService } from "@/lib/services/tripService";
import { fmtDate } from "@/lib/date";
import { Info, Route } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { EXPENSE_TYPES, expenseTypeLabel as expLabel, EXPENSE_TYPE_COLOR as TYPE_COLOR } from "@/lib/constants/expenseType";
import { useIsMobile } from "@/hooks/useIsMobile";

const fmt = (n: number) =>
  "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function TripExpensesPage() {
  const { t } = useLanguage();
  const [trips, setTrips]           = useState<any[]>([]);
  const [selectedTrip, setSelected] = useState("");
  const [detail, setDetail]         = useState<any>(null);
  const [loading, setLoading]       = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const isMobile = useIsMobile();


  useEffect(() => { tripService.getAll().then(r => setTrips(r.data || [])); }, []);

  useEffect(() => {
    if (!selectedTrip) { setDetail(null); setFetchError(null); return; }
    setLoading(true);
    setDetail(null);
    setFetchError(null);
    tripService.getById(selectedTrip).then(r => {
      if (r.success && r.data) {
        setDetail(r.data);
      } else {
        console.error("[TripExpenses] getById failed:", r.error);
        setFetchError(r.error ?? "Failed to load trip details");
      }
    }).finally(() => setLoading(false));
  }, [selectedTrip]);

  // Merge all four expense sources — same logic as trips/page.tsx
  const fuelEntries = (detail?.fuel_logs ?? []).map((fl: any) => ({
    id: `fl_${fl.id}`,
    label: "Fuel (HSD)",
    type_color: TYPE_COLOR.fuel,
    amount: Number(fl.amount),
    date: fl.date,
    description: `${Number(fl.litres).toFixed(1)} L${fl.fuel_station ? ` · ${fl.fuel_station}` : ""}`,
  }));
  const tollEntries = (detail?.toll_logs ?? []).map((tl: any) => ({
    id: `tl_${tl.id}`,
    label: "Toll / Bridge",
    type_color: TYPE_COLOR.toll,
    amount: Number(tl.amount),
    date: tl.date,
    description: [tl.toll_plaza, tl.payment_mode === "fastag" ? "FASTag" : tl.payment_mode ? "Cash" : null].filter(Boolean).join(" · ") || null,
  }));
  const miscEntries = (detail?.misc_expenses ?? []).map((me: any) => ({
    id: `me_${me.id}`,
    label: expLabel(me.category),
    type_color: TYPE_COLOR[me.category] ?? TYPE_COLOR.other,
    amount: Number(me.amount),
    date: me.date,
    description: me.description || null,
  }));
  const legacyEntries = (detail?.expenses ?? []).map((e: any) => ({
    id: e.id,
    label: expLabel(e.expense_type),
    type_color: TYPE_COLOR[e.expense_type] ?? TYPE_COLOR.other,
    amount: Number(e.amount),
    date: e.date,
    description: e.description || null,
  }));

  const allExpenses = [...legacyEntries, ...fuelEntries, ...tollEntries, ...miscEntries]
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalExp = allExpenses.reduce((s, e) => s + e.amount, 0);
  const freight  = Number(detail?.freight_amount ?? 0);
  const profit   = freight - totalExp;
  const margin   = freight > 0 ? ((profit / freight) * 100).toFixed(1) : "0.0";

  // Group by label for breakdown cards
  const byLabel: Record<string, number> = {};
  allExpenses.forEach(e => { byLabel[e.label] = (byLabel[e.label] || 0) + e.amount; });

  return (
    <div>
      <Header title={t("nav.services")} subtitle="Consolidated trip P&L view" />
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>

        {/* Info banner */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#e8f0fe", border: "1px solid #c5d5fb", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#1a3a8f" }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            This is a <strong>read-only view</strong>. To add or manage expenses, open the trip from the{" "}
            <a href="/trips" style={{ color: "#1E2D8E", fontWeight: 700, textDecoration: "underline" }}>Trips page</a>{" "}
            — fuel, tolls, and other costs can be added there and will appear here automatically.
          </span>
        </div>

        {/* Trip selector */}
        <div className="card" style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#555", display: "block", marginBottom: 8 }}>Select Trip</label>
          <select value={selectedTrip} onChange={e => setSelected(e.target.value)}
            style={{ width: "100%", maxWidth: 480, padding: "9px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5 }}>
            <option value="">— Choose a trip —</option>
            {trips.map((trip: any) => (
              <option key={trip.id} value={trip.id}>
                {trip.origin} → {trip.destination} · {fmtDate(trip.start_date)} · ₹{Number(trip.freight_amount).toLocaleString("en-IN")}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <p style={{ color: "#bbb", textAlign: "center", padding: "32px 0" }}>Loading…</p>
        )}

        {!loading && detail && (
          <>
            {/* Freight + P&L summary */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Freight Income", value: fmt(freight),  color: "#2e7d32", bg: "#e8f5e9" },
                { label: "Total Expenses", value: fmt(totalExp), color: "#c62828", bg: "#fce4ec" },
                { label: profit >= 0 ? "Net Profit" : "Net Loss", value: fmt(profit), color: profit >= 0 ? "#2e7d32" : "#c62828", bg: profit >= 0 ? "#e8f5e9" : "#fce4ec" },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ background: s.bg, border: "none", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{s.label}{s.label.startsWith("Net") ? ` · ${margin}%` : ""}</div>
                </div>
              ))}
            </div>

            {/* Breakdown by category */}
            {Object.keys(byLabel).length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
                {Object.entries(byLabel).map(([label, amt]) => {
                  const entry = allExpenses.find(e => e.label === label);
                  const color = entry?.type_color ?? "#666";
                  return (
                    <div key={label} className="stat-card" style={{ borderLeft: `3px solid ${color}` }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color }}>{fmt(amt)}</div>
                      <div style={{ fontSize: 11.5, color: "#888", marginTop: 3 }}>{label}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Expenses table */}
            <div className="card">
              <h2 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>All Expenses</h2>

              {allExpenses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <Route size={32} color="#ddd" style={{ margin: "0 auto 10px", display: "block" }} />
                  <p style={{ color: "#bbb", margin: 0, fontSize: 13 }}>No expenses logged for this trip yet</p>
                </div>
              ) : isMobile ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {allExpenses.map(e => (
                    <div key={e.id} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: `${e.type_color}15`, color: e.type_color }}>
                            {e.label}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{e.description || "—"}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#c62828" }}>{fmt(e.amount)}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{fmtDate(e.date)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      {["Category", "Date", "Note", "Amount"].map((h, i) => (
                        <th key={h} style={{ textAlign: i === 3 ? "right" : "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allExpenses.map(e => (
                      <tr key={e.id}>
                        <td>
                          <span className="badge" style={{ background: `${e.type_color}15`, color: e.type_color }}>
                            {e.label}
                          </span>
                        </td>
                        <td style={{ color: "#888" }}>{fmtDate(e.date)}</td>
                        <td style={{ color: "#aaa" }}>{e.description || "—"}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#c62828" }}>{fmt(e.amount)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={3} style={{ fontWeight: 700, fontSize: 13, borderTop: "2px solid #f0f0f0", paddingTop: 10 }}>Total</td>
                      <td style={{ textAlign: "right", fontWeight: 800, fontSize: 13, color: "#c62828", borderTop: "2px solid #f0f0f0", paddingTop: 10 }}>{fmt(totalExp)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {!loading && fetchError && (
          <div style={{ background: "#fce4ec", border: "1px solid #ef9a9a", borderRadius: 10, padding: "14px 18px", color: "#b71c1c", fontSize: 13 }}>
            <strong>Could not load trip:</strong> {fetchError}
            <div style={{ marginTop: 6, fontSize: 12, color: "#c62828" }}>
              Check the browser console (F12 → Console) for more details.
            </div>
          </div>
        )}

        {!loading && !detail && !fetchError && !selectedTrip && (
          <div style={{ textAlign: "center", padding: "52px 20px", color: "#ccc" }}>
            <Route size={40} color="#e0e0e0" style={{ margin: "0 auto 14px", display: "block" }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "#bbb" }}>Select a trip above to view its expenses</div>
          </div>
        )}

      </div>
    </div>
  );
}
