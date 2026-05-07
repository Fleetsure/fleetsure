"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { getTyreLogs, addTyreLog, deleteTyreLog, getVehicles } from "@/lib/api";
import { Plus, X, Trash2, Circle, Truck } from "lucide-react";

const TYRE_TYPES = [
  { value: "new",       label: "New Tyre" },
  { value: "recap",     label: "Recap / Retread" },
  { value: "repair",    label: "Repair / Puncture" },
  { value: "balance",   label: "Wheel Balancing" },
  { value: "alignment", label: "Wheel Alignment" },
];

const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  new:       { color: "#2e7d32", bg: "#e8f5e9" },
  recap:     { color: "#0277bd", bg: "#e1f5fe" },
  repair:    { color: "#e65100", bg: "#fff3e0" },
  balance:   { color: "#6a1b9a", bg: "#f3e5f5" },
  alignment: { color: "#1E2D8E", bg: "#eef0fb" },
};

const TYRE_BRANDS = ["MRF", "Apollo", "Bridgestone", "CEAT", "JK Tyre", "Goodyear", "Michelin", "Other"];

const EMPTY = {
  vehicle_id:    "",
  date:          new Date().toISOString().slice(0, 10),
  amount:        "",
  tyre_brand:    "",
  tyre_count:    "1",
  tyre_type:     "new",
  tyre_position: "",
  odometer_km:   "",
  notes:         "",
};

export default function TyresPage() {
  const [logs, setLogs]         = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState<any>({ ...EMPTY });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterType, setFilterType]       = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const load = async () => {
    const [l, v] = await Promise.all([getTyreLogs(), getVehicles()]);
    setLogs(l.data); setVehicles(v.data); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: any) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await addTyreLog({
        ...form,
        amount:      parseFloat(form.amount),
        tyre_count:  parseInt(form.tyre_count) || 1,
        odometer_km: form.odometer_km ? parseFloat(form.odometer_km) : null,
        tyre_brand:  form.tyre_brand || null,
        tyre_position: form.tyre_position || null,
        notes:       form.notes || null,
      });
      setShowForm(false); setForm({ ...EMPTY }); load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tyre entry?")) return;
    await deleteTyreLog(id); load();
  };

  const vehicleName = (id: string) => vehicles.find(v => v.id === id)?.registration_number || "—";

  const filtered = logs
    .filter(l => !filterVehicle || l.vehicle_id === filterVehicle)
    .filter(l => !filterType || l.tyre_type === filterType);

  const totalSpend  = logs.reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const thisMonth   = logs.filter(l => l.date?.slice(0, 7) === new Date().toISOString().slice(0, 7))
                          .reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const newCount    = logs.filter(l => l.tyre_type === "new").length;
  const repairCount = logs.filter(l => l.tyre_type === "repair").length;

  return (
    <div>
      <Header title="Tyres" subtitle={`${logs.length} entries · ₹${totalSpend.toLocaleString("en-IN")} total spend`} />
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total Entries",  value: logs.length,                                      color: "#1E2D8E", bg: "#eef0fb" },
            { label: "Total Spend",    value: `₹${totalSpend.toLocaleString("en-IN")}`,         color: "#2e7d32", bg: "#e8f5e9" },
            { label: "This Month",     value: `₹${thisMonth.toLocaleString("en-IN")}`,          color: "#0277bd", bg: "#e1f5fe" },
            { label: "New / Repairs",  value: `${newCount} / ${repairCount}`,                   color: "#e65100", bg: "#fff3e0" },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            marginBottom: 16,
            gap: 10,
          }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Tyre Entries</h2>
            <div style={{ display: "flex", gap: 8, flex: isMobile ? undefined : 1, maxWidth: isMobile ? undefined : 440 }}>
              <select value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)}
                style={{ flex: 1, padding: "7px 10px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13, background: "var(--bg-subtle)", color: "var(--text-main)" }}>
                <option value="">All Vehicles</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                style={{ flex: 1, padding: "7px 10px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13, background: "var(--bg-subtle)", color: "var(--text-main)" }}>
                <option value="">All Types</option>
                {TYRE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button className="btn-primary" onClick={() => { setForm({ ...EMPTY }); setError(""); setShowForm(true); }} style={{ whiteSpace: "nowrap" }}>
                <Plus size={15} /> Add Entry
              </button>
            </div>
          </div>

          {loading ? (
            <p style={{ color: "#aaa", textAlign: "center", padding: "32px 0" }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "52px 20px" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#eef0fb", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Circle size={32} color="#1E2D8E" style={{ opacity: 0.5 }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)", marginBottom: 6 }}>
                {filterVehicle || filterType ? "No entries match your filters" : "Log your first tyre entry"}
              </div>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 20, maxWidth: 300, margin: "0 auto 20px" }}>
                {filterVehicle || filterType ? "Try clearing the filters." : "Track tyre purchases, recaps, repairs and wheel work to understand true vehicle costs."}
              </div>
              {!filterVehicle && !filterType && (
                <button className="btn-primary" onClick={() => { setForm({ ...EMPTY }); setError(""); setShowForm(true); }}>
                  <Plus size={14} /> Add Entry
                </button>
              )}
            </div>
          ) : isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((l: any) => {
                const tc = TYPE_COLORS[l.tyre_type] || TYPE_COLORS.new;
                return (
                  <div key={l.id} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#1E2D8E", marginBottom: 3 }}>{vehicleName(l.vehicle_id)}</div>
                      <div style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: tc.bg, color: tc.color }}>
                          {TYRE_TYPES.find(t => t.value === l.tyre_type)?.label || l.tyre_type}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {l.tyre_brand || "—"}{l.tyre_count > 1 ? ` × ${l.tyre_count}` : ""}
                        {l.tyre_position ? ` · ${l.tyre_position}` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#1E2D8E" }}>₹{parseFloat(l.amount).toLocaleString("en-IN")}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{new Date(l.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                      <button onClick={() => handleDelete(l.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: "4px 0", marginTop: 4 }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#e53935")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#ccc")}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Brand</th>
                  <th>Count</th>
                  <th>Position</th>
                  <th>Odometer</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l: any) => {
                  const tc = TYPE_COLORS[l.tyre_type] || TYPE_COLORS.new;
                  return (
                    <tr key={l.id}>
                      <td style={{ fontSize: 13 }}>{new Date(l.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td style={{ fontWeight: 600, color: "#1E2D8E" }}>{vehicleName(l.vehicle_id)}</td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: tc.bg, color: tc.color }}>
                          {TYRE_TYPES.find(t => t.value === l.tyre_type)?.label || l.tyre_type}
                        </span>
                      </td>
                      <td>{l.tyre_brand || <span style={{ color: "#ccc" }}>—</span>}</td>
                      <td style={{ textAlign: "center" }}>{l.tyre_count}</td>
                      <td style={{ fontSize: 12.5, color: "#666" }}>{l.tyre_position || <span style={{ color: "#ccc" }}>—</span>}</td>
                      <td style={{ fontSize: 12.5, color: "#888" }}>{l.odometer_km ? `${parseFloat(l.odometer_km).toLocaleString("en-IN")} km` : <span style={{ color: "#ccc" }}>—</span>}</td>
                      <td style={{ fontWeight: 700, color: "#1E2D8E" }}>₹{parseFloat(l.amount).toLocaleString("en-IN")}</td>
                      <td style={{ textAlign: "right" }}>
                        <button onClick={() => handleDelete(l.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 4 }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#e53935")}
                          onMouseLeave={e => (e.currentTarget.style.color = "#ccc")}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 480, position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => setShowForm(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}>
              <X size={18} />
            </button>
            <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>Add Tyre Entry</h2>

            {error && <div style={{ background: "#fce4ec", color: "#b71c1c", padding: "8px 12px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Vehicle *</label>
                  <select required value={form.vehicle_id} onChange={e => set("vehicle_id", e.target.value)} style={inp}>
                    <option value="">Select vehicle</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Date *</label>
                  <input type="date" required value={form.date} onChange={e => set("date", e.target.value)} style={inp} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Type *</label>
                  <select value={form.tyre_type} onChange={e => set("tyre_type", e.target.value)} style={inp}>
   