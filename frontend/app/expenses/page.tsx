"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { tripService } from "@/lib/services/tripService";
import { vehicleService } from "@/lib/services/vehicleService";
import { todayISO, fmtDate } from "@/lib/date";
import { Plus, Wrench, X } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function ExpensesPage() {
  const { t } = useLanguage();
  const [trips, setTrips]           = useState<any[]>([]);
  const [selectedTrip, setSelected] = useState("");
  const [expenses, setExpenses]     = useState<any[]>([]);
  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [form, setForm]             = useState({ expense_type: "fuel", amount: "", description: "", date: todayISO() });
  const [isMobile, setIsMobile]     = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { tripService.getAll().then(r => setTrips(r.data || [])); }, []);

  useEffect(() => {
    if (!selectedTrip) { setExpenses([]); return; }
    tripService.getExpenses(selectedTrip).then(r => setExpenses(r.data || []));
  }, [selectedTrip]);

  const handleSubmit = async (e: any) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await tripService.addExpense(selectedTrip, { ...form, amount: parseFloat(form.amount) });
      setShowForm(false); setForm({ expense_type: "fuel", amount: "", description: "", date: todayISO() });
      tripService.getExpenses(selectedTrip).then(r => setExpenses(r.data || []));
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error adding expense");
    } finally { setSaving(false); }
  };

  const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const byType: any = {};
  expenses.forEach(e => { byType[e.expense_type] = (byType[e.expense_type] || 0) + parseFloat(e.amount); });

  const typeColors: any = { fuel: "#1E2D8E", toll: "#283593", maintenance: "#e65100", driver_payment: "#1a7a34", loading_unloading: "#6a1b9a", police_challan: "#b71c1c", other: "#666" };

  return (
    <div>
      <Header title={t("nav.services")} subtitle={t("trip.expense")} />
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>

        {/* Trip selector */}
        <div className="card" style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#555", display: "block", marginBottom: 8 }}>Select Trip to View Expenses</label>
          <select value={selectedTrip} onChange={e => setSelected(e.target.value)}
            style={{ width: "100%", maxWidth: 400, padding: "9px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5 }}>
            <option value="">— Choose a trip —</option>
            {trips.map((t: any) => (
              <option key={t.id} value={t.id}>{t.origin} → {t.destination} ({t.start_date}) — ₹{Number(t.freight_amount).toLocaleString("en-IN")}</option>
            ))}
          </select>
        </div>

        {selectedTrip && (
          <>
            {/* Breakdown */}
            {Object.keys(byType).length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
                {Object.entries(byType).map(([type, amt]: any) => (
                  <div key={type} className="stat-card" style={{ borderLeft: `3px solid ${typeColors[type] || "#1E2D8E"}` }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: typeColors[type] || "#1E2D8E" }}>₹{Number(amt).toLocaleString("en-IN")}</div>
                    <div style={{ fontSize: 11.5, color: "#888", marginTop: 3, textTransform: "capitalize" }}>{type.replace("_", " ")}</div>
                  </div>
                ))}
                <div className="stat-card" style={{ borderLeft: "3px solid #1a1a2e", background: "#f8f9ff" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>₹{Number(total).toLocaleString("en-IN")}</div>
                  <div style={{ fontSize: 11.5, color: "#888", marginTop: 3 }}>Total Expenses</div>
                </div>
              </div>
            )}

            <div className="card">
              <div style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "space-between",
                alignItems: isMobile ? "stretch" : "center",
                marginBottom: 16,
                gap: 10,
              }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t("trip.expense")}</h2>
                <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={15} />{t("misc.add")}</button>
              </div>
              {expenses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <Wrench size={32} color="#ddd" style={{ margin: "0 auto 10px", display: "block" }} />
                  <p style={{ color: "#aaa", margin: "0 0 12px", fontSize: 13.5 }}>No expenses logged for this trip</p>
                  <button className="btn-primary" onClick={() => setShowForm(true)}>Add First Expense</button>
                </div>
              ) : isMobile ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {expenses.map((e: any) => (
                    <div key={e.id} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: `${typeColors[e.expense_type]}15`, color: typeColors[e.expense_type] || "#1E2D8E", textTransform: "capitalize" }}>
                            {e.expense_type.replace("_", " ")}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{e.description || "—"}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#1E2D8E" }}>₹{Number(e.amount).toLocaleString("en-IN")}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{fmtDate(e.date)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <table>
                  <thead><tr><th>Type</th><th>Amount</th><th>Date</th><th>Description</th></tr></thead>
                  <tbody>
                    {expenses.map((e: any) => (
                      <tr key={e.id}>
                        <td><span className="badge" style={{ background: `${typeColors[e.expense_type]}15`, color: typeColors[e.expense_type] || "#1E2D8E", textTransform: "capitalize" }}>{e.expense_type.replace("_", " ")}</span></td>
                        <td style={{ fontWeight: 600, color: "#1E2D8E" }}>₹{Number(e.amount).toLocaleString("en-IN")}</td>
                        <td>{fmtDate(e.date)}</td>
                        <td style={{ color: "#888" }}>{e.description || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 480, position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => setShowForm(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>
            <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>{t("misc.add")}</h2>
            {error && <div style={{ background: "#fce4ec", color: "#b71c1c", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 13 }}>{error}</div>}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Expense Type *</label>
                <select required value={form.expense_type} onChange={e => setForm(p => ({ ...p, expense_type: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5 }}>
                  {["fuel", "toll", "maintenance", "driver_payment", "loading_unloading", "police_challan", "other"].map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Amount (₹) *</label>
                <input type="number" required value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="5000"
                  style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5 }} />
              </div>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Date *</label>
                <input type="date" required value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5 }} />
              </div>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Description</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional note..."
                  style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5 }} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setShowForm(false)}>{t("common.cancel")}</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>{saving ? t("common.loading") : t("misc.add")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
