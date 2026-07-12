"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { tollService } from "@/lib/services/tollService";
import { vehicleService } from "@/lib/services/vehicleService";
import { tripService } from "@/lib/services/tripService";
import { fmtDate, todayISO } from "@/lib/date";
import { Plus, X, Trash2, IndianRupee, Truck, Route, CreditCard, Banknote } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import DocumentUpload from "@/components/DocumentUpload";
import { useFirm } from "@/lib/FirmContext";

const EMPTY = {
  vehicle_id:   "",
  trip_id:      "",
  date:         todayISO(),
  amount:       "",
  toll_plaza:   "",
  route:        "",
  payment_mode: "cash",
  notes:        "",
  receipt_url:  "",
};

export default function TollsPage() {
  const { t } = useLanguage();
  const { activeFirmId } = useFirm();
  const [logs, setLogs]         = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [trips, setTrips]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState<any>({ ...EMPTY });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [receiptUploading, setReceiptUploading] = useState(false);
  const isMobile = useIsMobile();


  const load = async () => {
    if (!activeFirmId) { setLogs([]); setVehicles([]); setTrips([]); setLoading(false); return; }
    const [l, v, t] = await Promise.all([tollService.getAll(), vehicleService.getAll(), tripService.getAll()]);
    setLogs(l.data || []);
    setVehicles(v.data || []);
    setTrips(t.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [activeFirmId]);

  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleReceiptUpload = async (file: File) => {
    setReceiptUploading(true);
    const res = await tollService.uploadReceipt(file);
    if (res.success) set("receipt_url", res.data as string);
    setReceiptUploading(false);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        amount:   parseFloat(form.amount),
        trip_id:  form.trip_id || null,
        toll_plaza: form.toll_plaza || null,
        route:    form.route || null,
        notes:    form.notes || null,
        receipt_url: form.receipt_url || null,
      };
      await tollService.add(payload);
      setShowForm(false); setForm({ ...EMPTY }); load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this toll entry?")) return;
    await tollService.delete(id); load();
  };

  const vehicleName = (id: string) => {
    const v = vehicles.find(v => v.id === id);
    return v ? v.registration_number : "—";
  };

  const tripLabel = (id: string) => {
    const tp = trips.find(tp => tp.id === id);
    return tp ? `${tp.origin} → ${tp.destination}` : null;
  };

  const filtered = filterVehicle ? logs.filter(l => l.vehicle_id === filterVehicle) : logs;

  const totalSpend  = logs.reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const thisMonth   = logs.filter(l => l.date?.slice(0, 7) === todayISO().slice(0, 7))
                          .reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const fastagCount = logs.filter(l => l.payment_mode === "fastag").length;
  const cashCount   = logs.filter(l => l.payment_mode === "cash").length;

  return (
    <div>
      <Header title={t("toll.title")} subtitle={`${logs.length} entries · ₹${totalSpend.toLocaleString("en-IN")} total spend`} />
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total Entries",   value: logs.length,                                                     icon: <Route size={18} />,        color: "#1E2D8E", bg: "#eef0fb" },
            { label: "Total Spend",     value: `₹${totalSpend.toLocaleString("en-IN")}`,                        icon: <IndianRupee size={18} />,   color: "#2e7d32", bg: "#e8f5e9" },
            { label: "This Month",      value: `₹${thisMonth.toLocaleString("en-IN")}`,                         icon: <Truck size={18} />,         color: "#0277bd", bg: "#e1f5fe" },
            { label: "FASTag / Cash",   value: `${fastagCount} / ${cashCount}`,                                 icon: <CreditCard size={18} />,    color: "#6a1b9a", bg: "#f3e5f5" },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ textAlign: "center" }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: s.bg, color: s.color,
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px"
              }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="card">
          <div style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            marginBottom: 16,
            gap: 10,
          }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t("toll.title")}</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flex: isMobile ? undefined : 1, maxWidth: isMobile ? undefined : 340 }}>
              <select
                value={filterVehicle}
                onChange={e => setFilterVehicle(e.target.value)}
                style={{ flex: 1, padding: "7px 10px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13, background: "var(--bg-subtle)", color: "var(--text-main)" }}>
                <option value="">All Vehicles</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
              </select>
              <button className="btn-primary" onClick={() => { setForm({ ...EMPTY }); setError(""); setShowForm(true); }} style={{ whiteSpace: "nowrap" }}>
                <Plus size={15} /> {t("toll.add")}
              </button>
            </div>
          </div>

          {loading ? (
            <p style={{ color: "#aaa", textAlign: "center", padding: "32px 0" }}>{t("common.loading")}</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "52px 20px" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#eef0fb", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Route size={32} color="#1E2D8E" style={{ opacity: 0.5 }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)", marginBottom: 6 }}>
                {filterVehicle ? "No toll entries for this vehicle" : "Log your first toll entry"}
              </div>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 20, maxWidth: 300, margin: "0 auto 20px" }}>
                {filterVehicle ? "Try selecting a different vehicle." : "Track toll expenses per vehicle or trip to get accurate profitability data."}
              </div>
              {!filterVehicle && (
                <button className="btn-primary" onClick={() => { setForm({ ...EMPTY }); setError(""); setShowForm(true); }}>
                  <Plus size={14} /> {t("toll.add")}
                </button>
              )}
            </div>
          ) : isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((l: any) => (
                <div key={l.id} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#1E2D8E", marginBottom: 3 }}>{vehicleName(l.vehicle_id)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                      {l.toll_plaza || (l.trip_id ? tripLabel(l.trip_id) : l.route) || "—"}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                      background: l.payment_mode === "fastag" ? "#e8f5e9" : "#fff3e0",
                      color: l.payment_mode === "fastag" ? "#2e7d32" : "#e65100",
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}>
                      {l.payment_mode === "fastag" ? <CreditCard size={10} /> : <Banknote size={10} />}
                      {l.payment_mode === "fastag" ? "FASTag" : "Cash"}
                    </span>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1E2D8E" }}>₹{parseFloat(l.amount).toLocaleString("en-IN")}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{fmtDate(l.date)}</div>
                    <button onClick={() => handleDelete(l.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: "4px 0", marginTop: 4 }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#e53935")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#ccc")}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Toll Plaza</th>
                  <th>Route / Trip</th>
                  <th>Mode</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l: any) => (
                  <tr key={l.id}>
                    <td style={{ fontSize: 13 }}>{fmtDate(l.date)}</td>
                    <td style={{ fontWeight: 600, color: "#1E2D8E" }}>{vehicleName(l.vehicle_id)}</td>
                    <td>{l.toll_plaza || <span style={{ color: "#ccc" }}>—</span>}</td>
                    <td style={{ fontSize: 12.5, color: "#666" }}>
                      {l.trip_id ? tripLabel(l.trip_id) || "—" : l.route || <span style={{ color: "#ccc" }}>—</span>}
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                        background: l.payment_mode === "fastag" ? "#e8f5e9" : "#fff3e0",
                        color:      l.payment_mode === "fastag" ? "#2e7d32" : "#e65100",
                        display: "inline-flex", alignItems: "center", gap: 4,
                      }}>
                        {l.payment_mode === "fastag" ? <CreditCard size={10} /> : <Banknote size={10} />}
                        {l.payment_mode === "fastag" ? "FASTag" : "Cash"}
                      </span>
                    </td>
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
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Add Toll Modal ───────────────────────────────────────── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 480, position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => setShowForm(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}>
              <X size={18} />
            </button>
            <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>{t("toll.add")}</h2>

            {error && (
              <div style={{ background: "#fce4ec", color: "#b71c1c", padding: "8px 12px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{error}</div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Vehicle *</label>
                  <select required value={form.vehicle_id} onChange={e => set("vehicle_id", e.target.value)} style={inputStyle}>
                    <option value="">{t("form.select_vehicle")}</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t("form.date")} *</label>
                  <input type="date" required value={form.date} onChange={e => set("date", e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>{t("form.amount")} *</label>
                  <input type="number" required min="0" step="0.01" placeholder="e.g. 285" value={form.amount} onChange={e => set("amount", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Payment Mode *</label>
                  <select value={form.payment_mode} onChange={e => set("payment_mode", e.target.value)} style={inputStyle}>
                    <option value="cash">Cash</option>
                    <option value="fastag">FASTag</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>{t("toll.booth")}</label>
                <input type="text" placeholder="e.g. Khopoli Toll, Surat Toll" value={form.toll_plaza} onChange={e => set("toll_plaza", e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Route / Highway</label>
                <input type="text" placeholder="e.g. NH48, Mumbai–Pune Expressway" value={form.route} onChange={e => set("route", e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Link to Trip (optional)</label>
                <select value={form.trip_id} onChange={e => set("trip_id", e.target.value)} style={inputStyle}>
                  <option value="">Not linked to a trip</option>
                  {trips.filter(t => !form.vehicle_id || t.vehicle_id === form.vehicle_id).map(t => (
                    <option key={t.id} value={t.id}>{t.origin} → {t.destination} ({fmtDate(t.start_date)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>{t("form.notes")}</label>
                <input type="text" placeholder="Any additional info..." value={form.notes} onChange={e => set("notes", e.target.value)} style={inputStyle} />
              </div>

              <DocumentUpload label="Receipt" url={form.receipt_url} uploading={receiptUploading} onSelect={handleReceiptUpload} />

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setShowForm(false)}>{t("common.cancel")}</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>
                  {saving ? t("common.loading") : t("toll.add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1.5px solid var(--border-input)",
  borderRadius: 8, fontSize: 13.5, background: "var(--bg-card)", color: "var(--text-main)",
  boxSizing: "border-box",
};
