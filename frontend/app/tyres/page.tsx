"use client";
import { useEffect, useState } from "react";
import { getTyreSetup, saveTyreSetup } from "@/lib/services/tyreSetupService";
import Header from "@/components/Header";
import { tyreService, tyreRotationService, tyreScrapService } from "@/lib/services/tyreService";
import { vehicleService } from "@/lib/services/vehicleService";
import { tripService } from "@/lib/services/tripService";
import { fmtDate, todayISO } from "@/lib/date";
import { Plus, X, Trash2, Circle, AlertTriangle, Info, RotateCcw, Settings, Recycle } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  VehicleTyreSetup, TyreUnit, TYRE_BRANDS, calcHealth, healthColor, getInsights, predictReplacement,
} from "@/lib/tyreCalc";
import { lbl, inp } from "./styles";
import TruckDiagram from "./TruckDiagram";
import SetupModal from "./SetupModal";
import EditTyreModal from "./EditTyreModal";
import RotationModal from "./RotationModal";
import ScrapModal from "./ScrapModal";
import { useFirm } from "@/lib/FirmContext";

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
const EMPTY_LOG = {
  vehicle_id: "", date: todayISO(), amount: "",
  tyre_brand: "", tyre_count: "1", tyre_type: "new",
  tyre_position: "", odometer_km: "", notes: "",
  tyre_construction: "", tyre_condition: "",
};
const CONSTRUCTION_TOOLTIP = "Nylon = bias-ply, better for rough roads. Radial = highway, better mileage.";
const CONDITION_TOOLTIP = "Remould = retreaded tyre, cheaper alternative.";

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TyresPage() {
  const { t } = useLanguage();
  const { activeFirmId } = useFirm();
  const [tab, setTab] = useState<"health" | "logs">("health");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [rotations, setRotations] = useState<any[]>([]);
  const [scraps, setScraps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  // Health tab state
  const [selVehicleId, setSelVehicleId] = useState("");
  const [setup, setSetup] = useState<VehicleTyreSetup | null>(null);
  const [selectedPos, setSelectedPos] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [editingTyre, setEditingTyre] = useState<TyreUnit | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  // Expense log state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY_LOG });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showRotation, setShowRotation] = useState(false);
  const [showScrap, setShowScrap] = useState(false);

  const load = async () => {
    if (!activeFirmId) { setLogs([]); setVehicles([]); setRotations([]); setScraps([]); setLoading(false); return; }
    const [l, v, r, s] = await Promise.all([
      tyreService.getAll(), vehicleService.getAll(), tyreRotationService.getAll(), tyreScrapService.getAll(),
    ]);
    setLogs(l.data || []); setVehicles(v.data || []); setRotations(r.data || []); setScraps(s.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [activeFirmId]);

  useEffect(() => {
    if (!selVehicleId) { setSetup(null); return; }
    getTyreSetup(selVehicleId).then(setSetup);
    setSelectedPos(null);
  }, [selVehicleId]);

  // ── Trip sync ───────────────────────────────────────────────────────────────

  const syncTrips = async () => {
    if (!selVehicleId || !setup) return;
    setSyncing(true);
    try {
      const r = await tripService.getAll();
      const newTrips = (r.data || []).filter((trip: any) =>
        trip.vehicle_id === selVehicleId &&
        trip.status === "completed" &&
        trip.distance_km &&
        !setup.synced_trip_ids.includes(trip.id)
      );
      if (newTrips.length === 0) {
        setSyncMsg("All trips already synced — no new km to add.");
      } else {
        const addedKm = newTrips.reduce((s: number, trip: any) => s + parseFloat(trip.distance_km || 0), 0);
        const updated: VehicleTyreSetup = {
          ...setup,
          tyres: setup.tyres.map(ty => ty.is_spare ? ty : { ...ty, kms_run: ty.kms_run + addedKm }),
          synced_trip_ids: [...setup.synced_trip_ids, ...newTrips.map((trip: any) => trip.id)],
        };
        await saveTyreSetup(selVehicleId, updated);
        setSetup(updated);
        setSyncMsg(`Synced ${newTrips.length} trip(s) — +${Math.round(addedKm).toLocaleString("en-IN")} km added to ${updated.tyres.filter(ty => !ty.is_spare).length} tyres.`);
      }
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(""), 5000);
    }
  };

  // ── Tyre edit ───────────────────────────────────────────────────────────────

  const saveTyreEdit = async (updated: TyreUnit) => {
    if (!setup || !selVehicleId) return;
    const newSetup = { ...setup, tyres: setup.tyres.map(ty => ty.position === updated.position ? updated : ty) };
    await saveTyreSetup(selVehicleId, newSetup);
    setSetup(newSetup);
    setEditingTyre(null);
  };

  const saveSetup = async (s: VehicleTyreSetup) => {
    await saveTyreSetup(selVehicleId, s);
    setSetup(s);
    setShowSetup(false);
  };

  // ── Expense log ─────────────────────────────────────────────────────────────

  const setF = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: any) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await tyreService.add({
        ...form,
        amount: parseFloat(form.amount),
        tyre_count: parseInt(form.tyre_count) || 1,
        odometer_km: form.odometer_km ? parseFloat(form.odometer_km) : null,
        tyre_brand: form.tyre_brand || null,
        tyre_position: form.tyre_position || null,
        notes: form.notes || null,
      });
      setShowForm(false); setForm({ ...EMPTY_LOG }); load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await tyreService.delete(id); load();
  };

  const handleAddRotation = async (data: any) => {
    await tyreRotationService.add(data);
    setShowRotation(false); load();
  };
  const handleDeleteRotation = async (id: string) => {
    if (!confirm("Delete this rotation entry?")) return;
    await tyreRotationService.delete(id); load();
  };

  const handleAddScrap = async (data: any) => {
    await tyreScrapService.add(data);
    setShowScrap(false); load();
  };
  const handleDeleteScrap = async (id: string) => {
    if (!confirm("Delete this scrap entry?")) return;
    await tyreScrapService.delete(id); load();
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const vehicleName = (id: string) => vehicles.find(v => v.id === id)?.registration_number || "—";
  const filtered = logs.filter(l => (!filterVehicle || l.vehicle_id === filterVehicle) && (!filterType || l.tyre_type === filterType));
  const totalSpend = logs.reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const thisMonth = logs.filter(l => l.date?.slice(0, 7) === todayISO().slice(0, 7)).reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const scrapIncome = scraps.reduce((s, l) => s + parseFloat(l.scrap_amount || 0), 0);
  const insights = setup ? getInsights(setup.tyres) : [];

  const fleetAvgHealth = setup && setup.tyres.length > 0
    ? Math.round(setup.tyres.filter(ty => !ty.is_spare).reduce((s, ty) => s + calcHealth(ty), 0) / setup.tyres.filter(ty => !ty.is_spare).length)
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <Header title={t("tyre.title")} subtitle={`${logs.length} expense entries · ₹${totalSpend.toLocaleString("en-IN")} total`} />
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 4, marginBottom: 22, background: "#f0f1fa", borderRadius: 10, padding: 4, width: "fit-content" }}>
          {(["health", "logs"] as const).map(key => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: "7px 20px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                background: tab === key ? "white" : "transparent",
                color: tab === key ? "#1E2D8E" : "#888",
                boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
              {key === "health" ? "🔧 Tyre Health" : "📋 Expense Logs"}
            </button>
          ))}
        </div>

        {/* ── TYRE HEALTH TAB ─────────────────────────────────────────────────── */}
        {tab === "health" && (
          <div>
            {/* Vehicle selector bar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
              <select value={selVehicleId} onChange={e => setSelVehicleId(e.target.value)}
                style={{ flex: "1 1 200px", maxWidth: 260, padding: "8px 12px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13.5, background: "var(--bg-card)", color: "var(--text-main)" }}>
                <option value="">— Select a vehicle —</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number} — {v.make} {v.model}</option>)}
              </select>
              {selVehicleId && (
                <>
                  <button onClick={() => setShowSetup(true)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "none", border: "1.5px solid #e0e0f0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#555", cursor: "pointer" }}>
                    <Settings size={14} /> {setup ? "Reconfigure" : "Setup Tyres"}
                  </button>
                  {setup && (
                    <button onClick={syncTrips} disabled={syncing}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: syncing ? "#f5f5f5" : "#e8f5e9", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: syncing ? "#aaa" : "#2e7d32", cursor: syncing ? "not-allowed" : "pointer" }}>
                      <RotateCcw size={14} /> {syncing ? "Syncing…" : "Sync Trips"}
                    </button>
                  )}
                </>
              )}
            </div>

            {syncMsg && (
              <div style={{ padding: "8px 14px", background: "#e8f5e9", color: "#2e7d32", borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
                ✓ {syncMsg}
              </div>
            )}

            {!selVehicleId ? (
              <div className="card" style={{ textAlign: "center", padding: "52px 20px" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#eef0fb", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Circle size={32} color="#1E2D8E" style={{ opacity: 0.5 }} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Select a vehicle to view tyre health</div>
                <div style={{ fontSize: 13, color: "#aaa" }}>Track health, predict replacement, and sync trip distances per vehicle.</div>
              </div>
            ) : !setup ? (
              <div className="card" style={{ textAlign: "center", padding: "52px 20px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🛞</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No tyre layout configured</div>
                <div style={{ fontSize: 13, color: "#aaa", marginBottom: 20 }}>Set up the number of tyres to start tracking health, km, and insights.</div>
                <button className="btn-primary" onClick={() => setShowSetup(true)}>
                  <Plus size={14} /> Setup Tyres
                </button>
              </div>
            ) : (
              <div>
                {/* Fleet summary stats */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Fleet Avg Health", value: `${fleetAvgHealth}%`, color: healthColor(fleetAvgHealth ?? 0).color },
                    { label: "Tyres Tracked", value: setup.tyres.length, color: "#1E2D8E" },
                    { label: "Need Replacement", value: setup.tyres.filter(ty => calcHealth(ty) < 30).length, color: "#c62828" },
                    { label: "Trips Synced", value: setup.synced_trip_ids.length, color: "#2e7d32" },
                  ].map(s => (
                    <div key={s.label} className="stat-card" style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Insights */}
                {insights.length > 0 && (
                  <div className="card" style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#333" }}>
                      Smart Insights ({insights.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {insights.map((ins, i) => {
                        const cfg = {
                          critical: { icon: <AlertTriangle size={13} />, color: "#c62828", bg: "#fce4ec" },
                          warning:  { icon: <AlertTriangle size={13} />, color: "#e65100", bg: "#fff3e0" },
                          info:     { icon: <Info size={13} />,          color: "#1565c0", bg: "#e3f2fd" },
                        }[ins.type];
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 12px", borderRadius: 8, background: cfg.bg, color: cfg.color, fontSize: 12.5 }}>
                            <span style={{ flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
                            {ins.msg}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Truck diagram + tyre cards */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "auto 1fr", gap: 20, alignItems: "start" }}>

                  {/* Truck diagram */}
                  <div className="card" style={{ minWidth: 240, padding: "20px 16px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Tyre Layout — {setup.tyre_count} wheels{setup.has_spare ? " + spare" : ""}
                    </div>
                    <TruckDiagram
                      tyres={setup.tyres}
                      selectedPos={selectedPos}
                      onSelect={ty => { setSelectedPos(ty.position); setEditingTyre(ty); }}
                    />
                    <div style={{ fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 10 }}>
                      Click a tyre to edit
                    </div>
                  </div>

                  {/* Tyre cards */}
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 10 }}>
                      {setup.tyres.map(ty => {
                        const h = calcHealth(ty);
                        const { color, bg } = healthColor(h);
                        const pred = predictReplacement(ty);
                        const cpk = ty.kms_run > 0 ? `₹${(ty.cost / ty.kms_run).toFixed(2)}/km` : "—";
                        return (
                          <div key={ty.position}
                            onClick={() => { setSelectedPos(ty.position); setEditingTyre(ty); }}
                            style={{ padding: "14px", borderRadius: 10, background: bg,
                              border: `1.5px solid ${color}44`,
                              cursor: "pointer",
                              outline: selectedPos === ty.position ? `2px solid ${color}` : "none" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 4 }}>
                              {ty.is_spare ? "🔄 " : ""}{ty.position}
                            </div>
                            <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1.1, marginBottom: 2 }}>{h}%</div>
                            <div style={{ height: 5, borderRadius: 3, background: "#e0e0e0", marginBottom: 6 }}>
                              <div style={{ height: "100%", borderRadius: 3, background: color, width: `${h}%`, transition: "width 0.4s" }} />
                            </div>
                            <div style={{ fontSize: 10.5, color: "#666", marginBottom: 2 }}>
                              {ty.kms_run.toLocaleString("en-IN")} / {ty.max_lifespan_km.toLocaleString("en-IN")} km
                            </div>
                            <div style={{ fontSize: 10.5, color: "#888" }}>{ty.brand} · {ty.retread_count}x retread</div>
                            {pred && (
                              <div style={{ fontSize: 10, marginTop: 4, color: pred.days < 30 ? "#c62828" : "#888" }}>
                                Replace in ~{pred.days}d
                              </div>
                            )}
                            <div style={{ fontSize: 10, marginTop: 2, color: "#1E2D8E", fontWeight: 600 }}>{cpk}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── EXPENSE LOGS TAB ────────────────────────────────────────────────── */}
        {tab === "logs" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Entries", value: logs.length,                                             color: "#1E2D8E" },
                { label: "Total Spend",   value: `₹${totalSpend.toLocaleString("en-IN")}`,               color: "#2e7d32" },
                { label: "This Month",    value: `₹${thisMonth.toLocaleString("en-IN")}`,                 color: "#0277bd" },
                { label: "New / Repairs", value: `${logs.filter(l => l.tyre_type === "new").length} / ${logs.filter(l => l.tyre_type === "repair").length}`, color: "#e65100" },
                { label: "Scrap Income",  value: `+₹${scrapIncome.toLocaleString("en-IN")}`,              color: "#2e7d32" },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", marginBottom: 16, gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t("tyre.title")}</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)}
                    style={{ padding: "7px 10px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13, background: "var(--bg-subtle)", color: "var(--text-main)" }}>
                    <option value="">All Vehicles</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                  </select>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    style={{ padding: "7px 10px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13, background: "var(--bg-subtle)", color: "var(--text-main)" }}>
                    <option value="">All Types</option>
                    {TYRE_TYPES.map(ty => <option key={ty.value} value={ty.value}>{ty.label}</option>)}
                  </select>
                  <button className="btn-outline" onClick={() => setShowRotation(true)} style={{ whiteSpace: "nowrap" }}>
                    <RotateCcw size={14} /> Rotate Tyres
                  </button>
                  <button className="btn-outline" onClick={() => setShowScrap(true)} style={{ whiteSpace: "nowrap" }}>
                    <Recycle size={14} /> Scrap Tyre
                  </button>
                  <button className="btn-primary" onClick={() => { setForm({ ...EMPTY_LOG }); setError(""); setShowForm(true); }} style={{ whiteSpace: "nowrap" }}>
                    <Plus size={15} /> {t("tyre.add")}
                  </button>
                </div>
              </div>

              {loading ? (
                <p style={{ color: "#aaa", textAlign: "center", padding: "32px 0" }}>{t("common.loading")}</p>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 20px" }}>
                  <Circle size={32} color="#1E2D8E" style={{ opacity: 0.3, marginBottom: 12 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>No expense entries</div>
                  <div style={{ fontSize: 13, color: "#aaa" }}>{filterVehicle || filterType ? "Try clearing filters." : "Log tyre purchases, repairs and maintenance."}</div>
                </div>
              ) : isMobile ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {filtered.map((l: any) => {
                    const tc = TYPE_COLORS[l.tyre_type] || TYPE_COLORS.new;
                    return (
                      <div key={l.id} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: tc.bg, color: tc.color }}>
                              {TYRE_TYPES.find(ty => ty.value === l.tyre_type)?.label || l.tyre_type}
                            </span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#1E2D8E", marginBottom: 2 }}>{vehicleName(l.vehicle_id)}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {[l.tyre_brand, l.tyre_count > 1 ? `${l.tyre_count} tyres` : null, l.tyre_position].filter(Boolean).join(" · ") || "—"}
                          </div>
                          {l.odometer_km && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{parseFloat(l.odometer_km).toLocaleString("en-IN")} km</div>}
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
                      <th>Date</th><th>Vehicle</th><th>Type</th><th>Brand</th>
                      <th>Count</th><th>Position</th><th>Odometer</th><th>Amount</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((l: any) => {
                      const tc = TYPE_COLORS[l.tyre_type] || TYPE_COLORS.new;
                      return (
                        <tr key={l.id}>
                          <td style={{ fontSize: 13 }}>{fmtDate(l.date)}</td>
                          <td style={{ fontWeight: 600, color: "#1E2D8E" }}>{vehicleName(l.vehicle_id)}</td>
                          <td><span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: tc.bg, color: tc.color }}>{TYRE_TYPES.find(ty => ty.value === l.tyre_type)?.label || l.tyre_type}</span></td>
                          <td>{l.tyre_brand || <span style={{ color: "#ccc" }}>—</span>}</td>
                          <td style={{ textAlign: "center" }}>{l.tyre_count}</td>
                          <td style={{ fontSize: 12.5, color: "#666" }}>{l.tyre_position || <span style={{ color: "#ccc" }}>—</span>}</td>
                          <td style={{ fontSize: 12.5, color: "#888" }}>{l.odometer_km ? `${parseFloat(l.odometer_km).toLocaleString("en-IN")} km` : <span style={{ color: "#ccc" }}>—</span>}</td>
                          <td style={{ fontWeight: 700, color: "#1E2D8E" }}>₹{parseFloat(l.amount).toLocaleString("en-IN")}</td>
                          <td>
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

            {/* Rotations */}
            <div className="card" style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Tyre Rotations</h2>
                <button className="btn-outline" onClick={() => setShowRotation(true)}><RotateCcw size={13} /> Log Rotation</button>
              </div>
              {rotations.length === 0 ? (
                <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "20px 0" }}>No rotations logged yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {rotations.map((r: any) => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, background: "var(--bg-subtle)", border: "1px solid var(--border)", fontSize: 12.5, gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <span style={{ fontWeight: 700, color: "#1E2D8E" }}>{vehicleName(r.vehicle_id)}</span>
                        <span style={{ color: "#888", marginLeft: 8 }}>{r.positions_rotated}</span>
                        {r.odometer_km && <span style={{ color: "#aaa", marginLeft: 8 }}>{parseFloat(r.odometer_km).toLocaleString("en-IN")} km</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: "#aaa" }}>{fmtDate(r.date)}</span>
                        <button onClick={() => handleDeleteRotation(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 2 }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scraps */}
            <div className="card" style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Scrap History</h2>
                <button className="btn-outline" onClick={() => setShowScrap(true)}><Recycle size={13} /> Log Scrap</button>
              </div>
              {scraps.length === 0 ? (
                <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "20px 0" }}>No scrap entries yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {scraps.map((sc: any) => (
                    <div key={sc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, background: "var(--bg-subtle)", border: "1px solid var(--border)", fontSize: 12.5, gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <span style={{ fontWeight: 700, color: "#1E2D8E" }}>{vehicleName(sc.vehicle_id)}</span>
                        <span style={{ color: "#888", marginLeft: 8 }}>{sc.tyre_count} tyre{sc.tyre_count > 1 ? "s" : ""}{sc.construction ? ` · ${sc.construction}` : ""}</span>
                        {sc.dealer_name && <span style={{ color: "#aaa", marginLeft: 8 }}>{sc.dealer_name}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontWeight: 700, color: "#2e7d32" }}>+₹{parseFloat(sc.scrap_amount).toLocaleString("en-IN")}</span>
                        <span style={{ color: "#aaa" }}>{fmtDate(sc.date)}</span>
                        <button onClick={() => handleDeleteScrap(sc.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 2 }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showSetup && selVehicleId && (
        <SetupModal existing={setup} onSave={saveSetup} onClose={() => setShowSetup(false)} />
      )}

      {editingTyre && (
        <EditTyreModal tyre={editingTyre} onSave={saveTyreEdit} onClose={() => setEditingTyre(null)} />
      )}

      {showRotation && (
        <RotationModal vehicles={vehicles} onSave={handleAddRotation} onClose={() => setShowRotation(false)} />
      )}

      {showScrap && (
        <ScrapModal vehicles={vehicles} onSave={handleAddScrap} onClose={() => setShowScrap(false)} />
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 480, position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => setShowForm(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>
            <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>{t("tyre.add")}</h2>
            {error && <div style={{ background: "#fce4ec", color: "#b71c1c", padding: "8px 12px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{error}</div>}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Vehicle *</label>
                  <select required value={form.vehicle_id} onChange={e => setF("vehicle_id", e.target.value)} style={inp}>
                    <option value="">{t("form.select_vehicle")}</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Date *</label>
                  <input type="date" required value={form.date} onChange={e => setF("date", e.target.value)} style={inp} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Type *</label>
                  <select value={form.tyre_type} onChange={e => setF("tyre_type", e.target.value)} style={inp}>
                    {TYRE_TYPES.map(ty => <option key={ty.value} value={ty.value}>{ty.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Amount (₹) *</label>
                  <input type="number" required min="0" step="0.01" placeholder="12000" value={form.amount} onChange={e => setF("amount", e.target.value)} style={inp} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Brand</label>
                  <select value={form.tyre_brand} onChange={e => setF("tyre_brand", e.target.value)} style={inp}>
                    <option value="">Select brand</option>
                    {TYRE_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Tyre Count</label>
                  <input type="number" min="1" max="20" value={form.tyre_count} onChange={e => setF("tyre_count", e.target.value)} style={inp} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Tyre Construction *</label>
                  <select required title={CONSTRUCTION_TOOLTIP} value={form.tyre_construction} onChange={e => setF("tyre_construction", e.target.value)} style={inp}>
                    <option value="">Select construction</option>
                    <option value="nylon">Nylon</option>
                    <option value="radial">Radial</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Tyre Condition *</label>
                  <select required title={CONDITION_TOOLTIP} value={form.tyre_condition} onChange={e => setF("tyre_condition", e.target.value)} style={inp}>
                    <option value="">Select condition</option>
                    <option value="new">New</option>
                    <option value="remould">Remould</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Position</label>
                  <input type="text" placeholder="Front L, Rear R…" value={form.tyre_position} onChange={e => setF("tyre_position", e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Odometer (km)</label>
                  <input type="number" min="0" placeholder="142500" value={form.odometer_km} onChange={e => setF("odometer_km", e.target.value)} style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <input type="text" placeholder="Any additional info…" value={form.notes} onChange={e => setF("notes", e.target.value)} style={inp} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setShowForm(false)}>{t("common.cancel")}</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>
                  {saving ? t("common.loading") : t("tyre.add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
