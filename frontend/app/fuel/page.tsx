"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { getTrips, getTripExpenses, addExpense } from "@/lib/api";
import { Fuel, Plus, X } from "lucide-react";

export default function FuelPage() {
  const [trips, setTrips]       = useState<any[]>([]);
  const [fuelExpenses, setFuel] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTrip, setTrip] = useState("");
  const [form, setForm]         = useState({ amount: "", description: "", date: "" });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    getTrips().then(r => {
      const ts = r.data;
      setTrips(ts);
      Promise.all(ts.map((t: any) => getTripExpenses(t.id))).then(results => {
        const all = results.flatMap((r: any, i: number) =>
          r.data.filter((e: any) => e.expense_type === "fuel").map((e: any) => ({ ...e, trip: ts[i] }))
        );
        setFuel(all.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      });
    });
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await addExpense(selectedTrip, { expense_type: "fuel", amount: parseFloat(form.amount), description: form.description, date: form.date });
      setShowForm(false); setForm({ amount: "", description: "", date: "" });
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error");
    } finally { setSaving(false); }
  };

  const total = fuelExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <div>
      <Header title="Fuel" subtitle="Track fuel expenses across all trips" />
      <div style={{ padding: "24px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
          <div className="stat-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1E2D8E" }}>{fuelExpenses.length}</div>
            <div style={{ fontSize: 12.5, color: "#888", marginTop: 4 }}>Fuel Entries</div>
          </div>
          <div className="stat-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1E2D8E" }}>₹{Number(total).toLocaleString("en-IN")}</div>
            <div style={{ fontSize: 12.5, color: "#888", marginTop: 4 }}>Total Spent</div>
          </div>
          <div className="stat-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1E2D8E" }}>
              {fuelExpenses.length > 0 ? `₹${Math.round(total / fuelExpenses.length).toLocaleString("en-IN")}` : "—"}
            </div>
            <div style={{ fontSize: 12.5, color: "#888", marginTop: 4 }}>Avg per Entry</div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Fuel Log</h2>
            <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={15} />Log Fuel</button>
          </div>
          {fuelExpenses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Fuel size={36} color="#ddd" style={{ margin: "0 auto 10px", display: "block" }} />
              <p style={{ color: "#aaa", margin: 0, fontSize: 13.5 }}>No fuel expenses logged yet</p>
            </div>
          ) : (
            <table>
              <thead><tr><th>Trip</th><th>Amount</th><th>Date</th><th>Notes</th></tr></thead>
              <tbody>
                {fuelExpenses.map((e: any) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 500 }}>{e.trip.origin} → {e.trip.destination}</td>
                    <td style={{ fontWeight: 700, color: "#1E2D8E" }}>₹{Number(e.amount).toLocaleString("en-IN")}</td>
                    <td>{e.date}</td>
                    <td style={{ color: "#888" }}>{e.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: 400, position: "relative" }}>
            <button onClick={() => setShowForm(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Log Fuel Expense</h2>
            {error && <div style={{ background: "#fce4ec", color: "#b71c1c", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 13 }}>{error}</div>}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Trip *</label>
                <select required value={selectedTrip} onChange={e => setTrip(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5 }}>
                  <option value="">Select trip</option>
                  {trips.filter((t: any) => t.status !== "cancelled").map((t: any) => (
                    <option key={t.id} value={t.id}>{t.origin} → {t.destination} ({t.start_date})</option>
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
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Notes</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Pump name, litres, etc."
                  style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5 }} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>{saving ? "Saving..." : "Log Fuel"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
