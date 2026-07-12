"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { miscExpenseService } from "@/lib/services/miscExpenseService";
import { vehicleService } from "@/lib/services/vehicleService";
import { tripService } from "@/lib/services/tripService";
import { fmtDate, todayISO } from "@/lib/date";
import { Plus, X, Trash2, PackageOpen } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useFirm } from "@/lib/FirmContext";

const CATEGORIES = [
  { value: "fine",              label: "Fine / Penalty",      color: "#b71c1c", bg: "#fce4ec" },
  { value: "parking",           label: "Parking",             color: "#6a1b9a", bg: "#f3e5f5" },
  { value: "halting",           label: "Halting / Stay",      color: "#0277bd", bg: "#e1f5fe" },
  { value: "loading_unloading", label: "Loading / Unloading", color: "#e65100", bg: "#fff3e0" },
  { value: "cleaning",          label: "Cleaning / Washing",  color: "#2e7d32", bg: "#e8f5e9" },
  { value: "battery",           label: "Battery",             color: "#f57f17", bg: "#fffde7" },
  { value: "weighbridge",       label: "Weighbridge",         color: "#1E2D8E", bg: "#eef0fb" },
  { value: "other",             label: "Other",               color: "#555",    bg: "#f5f5f5" },
];

const catColor = (val: string) => CATEGORIES.find(c => c.value === val) || CATEGORIES[CATEGORIES.length - 1];

const EMPTY = {
  vehicle_id:  "",
  trip_id:     "",
  date:        todayISO(),
  amount:      "",
  category:    "other",
  description: "",
  notes:       "",
};

export default function MiscExpensesPage() {
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
  const [filterCat, setFilterCat]         = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const isMobile = useIsMobile();


  const load = async () => {
    if (!activeFirmId) { setLogs([]); setVehicles([]); setTrips([]); setLoading(false); return; }
    const [l, v, t] = await Promise.all([miscExpenseService.getAll(), vehicleService.getAll(), tripService.getAll()]);
    setLogs(l.data || []); setVehicles(v.data || []); setTrips(t.data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [activeFirmId]);

  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: any) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await miscExpenseService.add({
        ...form,
        amount:     parseFloat(form.amount),
        vehicle_id: form.vehicle_id || null,
        trip_id:    form.trip_id || null,
        description: form.description || null,
        notes:      form.notes || null,
      });
      setShowForm(false); setForm({ ...EMPTY }); load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await miscExpenseService.delete(id); load();
  };

  const vehicleName = (id: string) => vehicles.find(v => v.id === id)?.registration_number || "—";
  const tripLabel = (id: string) => { const tp = trips.find(tp => tp.id === id); return tp ? `${tp.origin} → ${tp.destination}` : null; };

  const filtered = logs
    .filter(l => !filterCat || l.category === filterCat)
    .filter(l => !filterVehicle || l.vehicle_id === filterVehicle);

  const totalSpend = logs.reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const thisMonth  = logs.filter(l => l.date?.slice(0, 7) === todayISO().slice(0, 7))
                         .reduce((s, l) => s + parseFloat(l.amount || 0), 0);

  // Top category by spend
  const byCat = CATEGORIES.map(c => ({
    ...c,
    total: logs.filter(l => l.category === c.value).reduce((s, l) => s + parseFloat(l.amount || 0), 0)
  })).sort((a, b) => b.total - a.total);

  return (
    <div>
      <Header title={t("misc.title")} subtitle={`${logs.length} entries · ₹${totalSpend.toLocaleString("en-IN")} total`} />
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total Entries", value: logs.length,                               color: "#1E2D8E", bg: "#eef0fb" },
            { label: "Total Spend",   value: `₹${totalSpend.toLocaleString("en-IN")}`, color: "#b71c1c", bg: "#fce4ec" },
            { label: "This Month",    value: `₹${thisMonth.toLocaleString("en-IN")}`,  color: "#0277bd", bg: "#e1f5fe" },
            { label: "Top Category",  value: byCat[0]?.total > 0 ? byCat[0].label : "—", color: "#e65100", bg: "#fff3e0" },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
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
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t("misc.title")}</h2>
            <div style={{ display: "flex", gap: 8, flex: isMobile ? undefined : 1, maxWidth: isMobile ? undefined : 440 }}>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                style={{ flex: 1, padding: "7px 10px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13, background: "var(--bg-subtle)", color: "var(--text-main)" }}>
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <select value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)}
                style={{ flex: 1, padding: "7px 10px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13, background: "var(--bg-subtle)", color: "var(--text-main)" }}>
                <option value="">All Vehicles</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
              </select>
              <button className="btn-primary" onClick={() => { setForm({ ...EMPTY }); setError(""); setShowForm(true); }} style={{ whiteSpace: "nowrap" }}>
                <Plus size={15} /> {t("misc.add")}
              </button>
            </div>
          </div>

          {loading ? (
            <p style={{ color: "#aaa", textAlign: "center", padding: "32px 0" }}>{t("common.loading")}</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "52px 20px" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#eef0fb", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <PackageOpen size={32} color="#1E2D8E" style={{ opacity: 0.5 }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)", marginBottom: 6 }}>
                {filterCat || filterVehicle ? "No entries match your filters" : "Log your first misc expense"}
              </div>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 20, maxWidth: 320, margin: "0 auto 20px" }}>
                {filterCat || filterVehicle ? "Try clearing the filters." : "Track fines, parking, halting charges, loading/unloading, cleaning and other costs here."}
              </div>
              {!filterCat && !filterVehicle && (
                <button className="btn-primary" onClick={() => { setForm({ ...EMPTY }); setError(""); setShowForm(true); }}>
                  <Plus size={14} /> {t("misc.add")}
                </button>
              )}
            </div>
          ) : isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((l: any) => {
                const c = catColor(l.category);
                return (
                  <div key={l.id} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: c.bg, color: c.color }}>
                          {c.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1E2D8E", marginBottom: 2 }}>
                        {l.vehicle_id ? vehicleName(l.vehicle_id) : "—"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{l.description || "—"}</div>
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
                );
              })}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Vehicle</th>
                  <th>Trip</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l: any) => {
                  const c = catColor(l.category);
                  return (
                    <tr key={l.id}>
                      <td style={{ fontSize: 13 }}>{fmtDate(l.date)}</td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: c.bg, color: c.color }}>
                          {c.label}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: "#1E2D8E", fontSize: 13 }}>{l.vehicle_id ? vehicleName(l.vehicle_id) : <span style={{ color: "#ccc" }}>—</span>}</td>
                      <td style={{ fontSize: 12, color: "#888" }}>{l.trip_id ? tripLabel(l.trip_id) || "—" : <span style={{ color: "#ccc" }}>—</span>}</td>
                      <td style={{ fontSize: 13 }}>{l.description || <span style={{ color: "#ccc" }}>—</span>}</td>
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
            <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>{t("misc.add")}</h2>

            {error && <div style={{ background: "#fce4ec", color: "#b71c1c", padding: "8px 12px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>{t("misc.category")} *</label>
                  <select value={form.category} onChange={e => set("category", e.target.value)} style={inp}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>{t("form.date")} *</label>
                  <input type="date" required value={form.date} onChange={e => set("date", e.target.value)} style={inp} />
                </div>
              </div>

              <div>
                <label style={lbl}>{t("form.amount")} *</label>
                <input type="number" required min="0" step="0.01" placeholder="e.g. 500" value={form.amount} onChange={e => set("amount", e.target.value)} style={inp} />
              </div>

              <div>
                <label style={lbl}>{t("misc.description")}</label>
                <input type="text" placeholder="e.g. Overloading fine at Nashik checkpost" value={form.description} onChange={e => set("description", e.target.value)} style={inp} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Vehicle (optional)</label>
                  <select value={form.vehicle_id} onChange={e => set("vehicle_id", e.target.value)} style={inp}>
                    <option value="">Not vehicle-specific</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Link to Trip (optional)</label>
                  <select value={form.trip_id} onChange={e => set("trip_id", e.target.value)} style={inp}>
                    <option value="">Not linked to trip</option>
                    {trips.filter(tp => !form.vehicle_id || tp.vehicle_id === form.vehicle_id).map(tp => (
                      <option key={tp.id} value={tp.id}>{tp.origin} → {tp.destination}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={lbl}>{t("form.notes")}</label>
                <input type="text" placeholder="Any additional info..." value={form.notes} onChange={e => set("notes", e.target.value)} style={inp} />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setShowForm(false)}>{t("common.cancel")}</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>
                  {saving ? t("common.loading") : t("misc.add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13.5, background: "var(--bg-card)", color: "var(--text-main)", boxSizing: "border-box" };
