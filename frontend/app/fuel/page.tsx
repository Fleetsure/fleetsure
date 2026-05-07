"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { getFuelLogs, addFuelLog, deleteFuelLog, getFuelAnalytics, getVehicles, getTrips } from "@/lib/api";
import { Fuel, Plus, X, AlertTriangle, TrendingDown, TrendingUp, Truck, Trash2 } from "lucide-react";

const EMPTY = { vehicle_id: "", trip_id: "", date: new Date().toISOString().slice(0, 10), odometer_km: "", litres: "", rate: "", amount: "", fuel_station: "", notes: "" };

export default function FuelPage() {
  const [logs, setLogs]           = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [vehicles, setVehicles]   = useState<any[]>([]);
  const [trips, setTrips]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState<any>({ ...EMPTY });
  // Track which fields were manually typed (vs auto-calculated)
  const [manual, setManual]       = useState<Set<string>>(new Set());
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [tab, setTab]             = useState<"log" | "analytics">("log");
  const [isMobile, setIsMobile]   = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const load = async () => {
    const [l, a, v, t] = await Promise.all([getFuelLogs(), getFuelAnalytics(), getVehicles(), getTrips()]);
    setLogs(l.data);
    setAnalytics(a.data);
    setVehicles(v.data);
    setTrips(t.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  // Mark field as manually typed
  const touch = (k: string) => setManual(prev => new Set([...prev, k]));
  // Mark field as auto-calculated (not manual)
  const untouch = (k: string) => setManual(prev => { const n = new Set(prev); n.delete(k); return n; });

  const setLitres = (v: string) => {
    touch("litres");
    const litres = parseFloat(v);
    const rate   = parseFloat(form.rate);
    const amount = parseFloat(form.amount);
    if (!isNaN(litres) && litres > 0 && !isNaN(rate) && rate > 0 && manual.has("rate")) {
      setForm((p: any) => ({ ...p, litres: v, amount: (litres * rate).toFixed(2) }));
      untouch("amount");
    } else if (!isNaN(litres) && litres > 0 && !isNaN(amount) && amount > 0 && manual.has("amount")) {
      setForm((p: any) => ({ ...p, litres: v, rate: (amount / litres).toFixed(2) }));
      untouch("rate");
    } else { set("litres", v); }
  };

  const setRate = (v: string) => {
    touch("rate");
    const rate   = parseFloat(v);
    const litres = parseFloat(form.litres);
    const amount = parseFloat(form.amount);
    if (!isNaN(rate) && rate > 0 && !isNaN(litres) && litres > 0 && manual.has("litres")) {
      setForm((p: any) => ({ ...p, rate: v, amount: (litres * rate).toFixed(2) }));
      untouch("amount");
    } else if (!isNaN(rate) && rate > 0 && !isNaN(amount) && amount > 0 && manual.has("amount")) {
      setForm((p: any) => ({ ...p, rate: v, litres: (amount / rate).toFixed(2) }));
      untouch("litres");
    } else { set("rate", v); }
  };

  const setAmount = (v: string) => {
    touch("amount");
    const amount = parseFloat(v);
    const litres = parseFloat(form.litres);
    const rate   = parseFloat(form.rate);
    if (!isNaN(amount) && amount > 0 && !isNaN(litres) && litres > 0 && manual.has("litres")) {
      setForm((p: any) => ({ ...p, amount: v, rate: (amount / litres).toFixed(2) }));
      untouch("rate");
    } else if (!isNaN(amount) && amount > 0 && !isNaN(rate) && rate > 0 && manual.has("rate")) {
      setForm((p: any) => ({ ...p, amount: v, litres: (amount / rate).toFixed(2) }));
      untouch("litres");
    } else { set("amount", v); }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await addFuelLog({
        ...form,
        odometer_km: form.odometer_km ? parseFloat(form.odometer_km) : null,
        litres: parseFloat(form.litres),
        amount: parseFloat(form.amount),
      });
      setShowForm(false); setForm({ ...EMPTY }); setManual(new Set()); load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this fuel entry?")) return;
    await deleteFuelLog(id); load();
  };

  const vehicleName = (id: string) => {
    const v = vehicles.find(v => v.id === id);
    return v ? `${v.registration_number} (${v.make} ${v.model})` : id;
  };

  const anomalies = analytics.filter(a => a.anomaly);

  return (
    <div>
      <Header title="Fuel" subtitle={`${logs.length} fill-up entries · ${anomalies.length} anomaly${anomalies.length !== 1 ? "s" : ""} detected`} />
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>

        {/* Anomaly banner */}
        {anomalies.length > 0 && (
          <div style={{ background: "#fff3e0", border: "1.5px solid #ffb74d", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <AlertTriangle size={18} color="#e65100" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 700, color: "#bf360c", fontSize: 13.5, marginBottom: 4 }}>⚠️ Possible fuel theft detected on {anomalies.length} vehicle{anomalies.length > 1 ? "s" : ""}</div>
              {anomalies.map(a => (
                <div key={String(a.vehicle_id)} style={{ fontSize: 12.5, color: "#e65100", marginBottom: 2 }}>
                  <strong>{a.registration_number}</strong> — last fill-up efficiency dropped <strong>{a.anomaly_pct}%</strong> below average ({a.last_kmpl} km/L vs avg {a.avg_kmpl} km/L)
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
          {[
            { label: "Total Fill-ups",   value: logs.length,                                                          color: "#1E2D8E", bg: "#eef0fb" },
            { label: "Total Litres",     value: `${logs.reduce((s, l) => s + parseFloat(l.litres || 0), 0).toFixed(0)} L`, color: "#0277bd", bg: "#e1f5fe" },
            { label: "Total Spend",      value: `₹${logs.reduce((s, l) => s + parseFloat(l.amount || 0), 0).toLocaleString("en-IN")}`, color: "#2e7d32", bg: "#e8f5e9" },
            { label: "Anomalies Found",  value: anomalies.length,                                                     color: anomalies.length > 0 ? "#bf360c" : "#888", bg: anomalies.length > 0 ? "#fff3e0" : "#f5f5f5" },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
          {(["log", "analytics"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "7px 18px", borderRadius: 8, border: "1.5px solid", fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: tab === t ? "#1E2D8E" : "transparent",
                color: tab === t ? "white" : "#1E2D8E",
                borderColor: "#1E2D8E" }}>
              {t === "log" ? "Fuel Log" : (isMobile ? "Analytics" : "Efficiency Analytics")}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={15} />Add Fill-up</button>
        </div>

        <div className="card">
          {tab === "log" ? (
            loading ? <p style={{ color: "#aaa", textAlign: "center", padding: "32px 0" }}>Loading...</p>
            : logs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <Fuel size={36} color="#ddd" style={{ margin: "0 auto 10px", display: "block" }} />
                <p style={{ color: "#aaa", fontSize: 13.5 }}>No fuel entries yet. Add your first fill-up.</p>
                <button className="btn-primary" style={{ marginTop: 10 }} onClick={() => setShowForm(true)}>Add Fill-up</button>
              </div>
            ) : isMobile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {logs.map((l: any) => (
                  <div key={l.id} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#1E2D8E", marginBottom: 3 }}>{vehicleName(l.vehicle_id)}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {parseFloat(l.litres).toFixed(2)} L · ₹{(parseFloat(l.amount) / parseFloat(l.litres)).toFixed(1)}/L
                        {l.fuel_station ? ` · ${l.fuel_station}` : ""}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {l.odometer_km ? `${parseFloat(l.odometer_km).toLocaleString("en-IN")} km` : "—"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#1E2D8E" }}>₹{parseFloat(l.amount).toLocaleString("en-IN")}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{new Date(l.date).toLocaleDateString("en-IN")}</div>
                      <button onClick={() => handleDelete(l.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e53935", padding: "4px 0", marginTop: 4 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <table>
                <thead>
                  <tr><th>Date</th><th>Vehicle</th><th>Odometer</th><th>Litres</th><th>Amount</th><th>₹/L</th><th>Station</th><th></th></tr>
                </thead>
                <tbody>
                  {logs.map((l: any) => (
                    <tr key={l.id}>
                      <td>{new Date(l.date).toLocaleDateString("en-IN")}</td>
                      <td style={{ fontWeight: 600, color: "#1E2D8E", fontSize: 12.5 }}>{vehicleName(l.vehicle_id)}</td>
                      <td>{parseFloat(l.odometer_km).toLocaleString("en-IN")} km</td>
                      <td>{parseFloat(l.litres).toFixed(2)} L</td>
                      <td>₹{parseFloat(l.amount).toLocaleString("en-IN")}</td>
                      <td style={{ color: "#555" }}>₹{(parseFloat(l.amount) / parseFloat(l.litres)).toFixed(1)}</td>
                      <td style={{ color: "#888", fontSize: 12 }}>{l.fuel_station || "—"}</td>
                      <td>
                        <button onClick={() => handleDelete(l.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e53935", padding: 4 }}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            analytics.length === 0 ? (
              <p style={{ textAlign: "center", padding: "48px 0", color: "#aaa" }}>No analytics yet — add at least 2 fill-ups per vehicle.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr><th>Vehicle</th><th>Avg km/L</th><th>Last km/L</th><th>Total Litres</th><th>Total Spend</th><th>Fill-ups</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {analytics.map((a: any) => (
                      <tr key={String(a.vehicle_id)}>
                        <td style={{ fontWeight: 700, color: "#1E2D8E" }}>{a.registration_number}</td>
                        <td>{a.avg_kmpl ?? "—"}</td>
                        <td style={{ color: a.anomaly ? "#bf360c" : "inherit", fontWeight: a.anomaly ? 700 : 400 }}>{a.last_kmpl ?? "—"}</td>
                        <td>{a.total_litres.toFixed(0)} L</td>
                        <td>₹{a.total_spend.toLocaleString("en-IN")}</td>
                        <td>{a.fill_count}</td>
                        <td>
                          {a.anomaly ? (
                            <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#bf360c", fontWeight: 700, fontSize: 12 }}>
                              <TrendingDown size={13} /> {a.anomaly_pct}% drop — check driver
                            </span>
                          ) : (
                            <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#2e7d32", fontSize: 12 }}>
                              <TrendingUp size={13} /> Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* Add fill-up modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 480, position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => setShowForm(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>
            <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Add Fuel Fill-up</h2>
            {error && <div style={{ background: "#fce4ec", color: "#b71c1c", padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{error}</div>}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>Vehicle *</label>
                <select required value={form.vehicle_id} onChange={e => set("vehicle_id", e.target.value)} style={inp}>
                  <option value="">Select vehicle</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number} — {v.make} {v.model}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Link to Trip <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
                <select value={form.trip_id} onChange={e => set("trip_id", e.target.value)} style={inp}>
                  <option value="">No trip linked</option>
                  {trips.filter((t: any) => !form.vehicle_id || t.vehicle_id === form.vehicle_id).map((t: any) => (
                    <option key={t.id} value={t.id}>{t.origin} → {t.destination} ({t.start_date})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Date *</label><input required type="date" value={form.date} onChange={e => set("date", e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Odometer (km)</label><input type="number" step="1" min="0" placeholder="54321 (opt