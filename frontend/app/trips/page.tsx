"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import {
  getTrips, createTrip, updateTrip,
  getVehicles, getDrivers, getTripDetail, addExpense,
  suggestVehicles, driverFatigueCheck,
} from "@/lib/api";
import { Plus, X, Route, MessageCircle, FileDown, Zap, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import LocationInput from "@/components/LocationInput";
import { useLanguage } from "@/lib/LanguageContext";

// ── WhatsApp trip sheet generator ─────────────────────────────────────────────
function shareOnWhatsApp(trip: any, detail: any, vehicleReg: string) {
  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fmtMoney = (n: number) => "₹" + n.toLocaleString("en-IN");

  const expenses = detail?.expenses || [];
  const totalExp = expenses.reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);
  const freight  = parseFloat(trip.freight_amount || 0);
  const profit   = freight - totalExp;

  const statusLabel: Record<string, string> = {
    planned: "Planned", in_progress: "In Progress",
    completed: "Completed", cancelled: "Cancelled",
  };

  const lines: string[] = [
    `*Trip Sheet*`,
    `*${trip.origin} → ${trip.destination}*`,
    ``,
    `*Vehicle:* ${vehicleReg}`,
    `*Driver:* ${trip.driver_name}${trip.driver_phone ? `  |  ${trip.driver_phone}` : ""}`,
    `*Dates:* ${fmtDate(trip.start_date)} → ${fmtDate(trip.end_date)}`,
  ];

  if (detail?.doc_number)    lines.push(`*LR No:* ${detail.doc_number}`);
  if (detail?.material)      lines.push(`*Material:* ${detail.material}${detail.weight_tonnes ? `  |  ${detail.weight_tonnes} T` : ""}`);

  lines.push(``);
  lines.push(`*Freight:* ${fmtMoney(freight)}`);
  if (totalExp > 0) lines.push(`*Expenses:* ${fmtMoney(totalExp)}`);
  if (totalExp > 0) lines.push(`*Net:* ${profit >= 0 ? "" : "-"}${fmtMoney(Math.abs(profit))}`);
  lines.push(`*Status:* ${statusLabel[trip.status] || trip.status}`);
  lines.push(``);
  lines.push(`_FleetSure_`);

  const url = `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
  window.open(url, "_blank");
}


// ── Constants ─────────────────────────────────────────────────────────────────

const EXPENSE_TYPES = [
  { value: "fuel",              label: "Fuel (HSD)" },
  { value: "toll",              label: "Toll / Bridge" },
  { value: "rto",               label: "RTO" },
  { value: "police_challan",    label: "Police / Naka" },
  { value: "maintenance",       label: "Parts & Repairs" },
  { value: "tyre",              label: "Tyre Repair" },
  { value: "oil",               label: "Oil" },
  { value: "loading_unloading", label: "Loading / Unloading" },
  { value: "driver_payment",    label: "Driver Payment" },
  { value: "telephone",         label: "Telephone" },
  { value: "other",             label: "Other" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; step: number }> = {
  planned:     { label: "Planned",     color: "#1565c0", bg: "#e3f2fd", step: 0 },
  in_progress: { label: "In Progress", color: "#e65100", bg: "#fff3e0", step: 1 },
  completed:   { label: "Completed",   color: "#2e7d32", bg: "#e8f5e9", step: 2 },
  cancelled:   { label: "Cancelled",   color: "#c62828", bg: "#fce4ec", step: -1 },
};

const EMPTY_FORM = {
  vehicle_id: "", driver_id: "", driver_name: "", driver_phone: "",
  origin: "", destination: "", distance_km: "",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: "", freight_amount: "",
  doc_number: "", material: "", weight_tonnes: "", driver_advance: "",
  notes: "",
};

const EMPTY_EXP = {
  expense_type: "fuel", amount: "", description: "",
  date: new Date().toISOString().slice(0, 10),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const expLabel = (t: string) =>
  EXPENSE_TYPES.find(e => e.value === t)?.label ?? t;

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.planned;
  return (
    <span style={{ background: c.bg, color: c.color, padding: "3px 10px", borderRadius: 12, fontSize: 11.5, fontWeight: 700 }}>
      {c.label}
    </span>
  );
}

function StatusStepper({ status }: { status: string }) {
  const STEPS = ["planned", "in_progress", "completed"];
  const cur = STATUS_CONFIG[status]?.step ?? 0;
  const cancelled = status === "cancelled";

  // Build alternating step-circle and connector array
  const items: React.ReactNode[] = [];
  STEPS.forEach((s, i) => {
    const cfg   = STATUS_CONFIG[s];
    const past   = !cancelled && cur > i;
    const active = !cancelled && cur === i;
    items.push(
      <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 60 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: past || active ? cfg.color : "#e8e8f0",
          color: past || active ? "#fff" : "#bbb",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700,
          outline: active ? `3px solid ${cfg.color}44` : "none",
          outlineOffset: 2,
        }}>
          {past ? "✓" : i + 1}
        </div>
        <div style={{ fontSize: 10.5, fontWeight: active ? 700 : 500, color: active ? cfg.color : past ? "#555" : "#bbb", textAlign: "center" }}>
          {cfg.label}
        </div>
      </div>
    );
    if (i < STEPS.length - 1) {
      items.push(
        <div key={`c${i}`} style={{ flex: 1, height: 2, background: past ? "#2e7d32" : "#e8e8f0", margin: "13px 4px 0", minWidth: 20 }} />
      );
    }
  });

  return <div style={{ display: "flex", alignItems: "flex-start", padding: "12px 0 8px" }}>{items}</div>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TripsPage() {
  const { t } = useLanguage();
  const [trips, setTrips]       = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [isMobile, setIsMobile] = useState(false);

  // Phase 2 — smart suggestions
  const [vehicleSuggestions, setVehicleSuggestions] = useState<any[]>([]);
  const [fatigueStatus, setFatigueStatus]           = useState<any>(null);
  const [fatigueLoading, setFatigueLoading]         = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Log trip form
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [saving, setSaving]       = useState(false);
  const [formErr, setFormErr]     = useState("");

  // Trip sheet drawer
  const [selTrip, setSelTrip]       = useState<any>(null);
  const [detail, setDetail]         = useState<any>(null);
  const [detLoading, setDetLoading] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  // Expense form (inside drawer)
  const [expForm, setExpForm]       = useState({ ...EMPTY_EXP });
  const [showExpForm, setShowExpForm] = useState(false);
  const [pdfModal, setPdfModal]   = useState(false);
  const [pdfOpts, setPdfOpts]     = useState({
    showProfit: false,
    expTypes: { all: true, fuel: false, toll: false, maintenance: false, driver_payment: false, loading: false, other: false }
  });
  const [addingExp, setAddingExp]   = useState(false);
  const [expErr, setExpErr]         = useState("");

  // ── Data loading ────────────────────────────────────────────────────────────

  const load = () =>
    Promise.all([getTrips(), getVehicles(), getDrivers()])
      .then(([t, v, d]) => { setTrips(t.data); setVehicles(v.data); setDrivers(d.data || []); })
      .finally(() => setLoading(false));

  // Fetch vehicle suggestions when origin changes (debounced)
  const handleOriginChange = (value: string) => {
    setForm(p => ({ ...p, origin: value }));
    if (value.trim().length < 3) { setVehicleSuggestions([]); return; }
    const timer = setTimeout(() => {
      suggestVehicles(value.trim())
        .then(r => setVehicleSuggestions(r.data.suggestions || []))
        .catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  };

  // Fetch fatigue status when driver changes
  const handleDriverChange = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    setForm(p => ({
      ...p,
      driver_id:    driverId,
      driver_name:  driver?.name  || "",
      driver_phone: driver?.phone || "",
    }));
    if (!driverId) { setFatigueStatus(null); return; }
    setFatigueLoading(true);
    driverFatigueCheck(driverId)
      .then(r => setFatigueStatus(r.data))
      .catch(() => setFatigueStatus(null))
      .finally(() => setFatigueLoading(false));
  };

  // Apply a vehicle suggestion to the form
  const applySuggestion = (s: any) => {
    setForm(p => ({ ...p, vehicle_id: s.vehicle_id }));
    setVehicleSuggestions([]);
  };

  useEffect(() => { load(); }, []);

  // ── Trip sheet ──────────────────────────────────────────────────────────────

  const openTrip = async (trip: any) => {
    setSelTrip(trip);
    setDetail(null);
    setDetLoading(true);
    setShowExpForm(false);
    setExpForm({ ...EMPTY_EXP });
    setExpErr("");
    try {
      const r = await getTripDetail(trip.id);
      setDetail(r.data);
    } finally {
      setDetLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!selTrip) return;
    try {
      const r = await getTripDetail(selTrip.id);
      setDetail(r.data);
    } catch {}
  };

  // ── Status transitions ──────────────────────────────────────────────────────

  const advanceStatus = async (trip: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = trip.status === "planned" ? "in_progress" : "completed";
    setStatusBusy(true);
    try {
      await updateTrip(trip.id, { status: next });
      const updated = { ...trip, status: next };
      setTrips(prev => prev.map(t => t.id === trip.id ? updated : t));
      setSelTrip((p: any) => p?.id === trip.id ? updated : p);
      setDetail((p: any) => p ? { ...p, status: next } : p);
    } catch {}
    finally { setStatusBusy(false); }
  };

  const cancelTripFn = async (trip: any) => {
    if (!confirm("Cancel this trip? The vehicle will be released.")) return;
    setStatusBusy(true);
    try {
      await updateTrip(trip.id, { status: "cancelled" });
      const updated = { ...trip, status: "cancelled" };
      setTrips(prev => prev.map(t => t.id === trip.id ? updated : t));
      setSelTrip((p: any) => p?.id === trip.id ? updated : p);
      setDetail((p: any) => p ? { ...p, status: "cancelled" } : p);
    } catch {}
    finally { setStatusBusy(false); }
  };

  // ── Add expense ─────────────────────────────────────────────────────────────

  const handleAddExpense = async () => {
    if (!expForm.amount || !selTrip) return;
    setAddingExp(true); setExpErr("");
    try {
      await addExpense(selTrip.id, {
        expense_type: expForm.expense_type,
        amount: parseFloat(expForm.amount),
        description: expForm.description || null,
        date: expForm.date,
      });
      setExpForm({ ...EMPTY_EXP });
      setShowExpForm(false);
      await refreshDetail();
    } catch (err: any) {
      const d = err.response?.data?.detail;
      setExpErr(Array.isArray(d) ? d.map((x: any) => x.msg).join(", ") : d || "Failed to add expense");
    } finally { setAddingExp(false); }
  };

  // ── Create trip ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: any) => {
    e.preventDefault(); setSaving(true); setFormErr("");
    try {
      await createTrip({
        ...form,
        driver_id:      form.driver_id      || null,
        distance_km:    form.distance_km    ? parseFloat(form.distance_km)    : null,
        weight_tonnes:  form.weight_tonnes  ? parseFloat(form.weight_tonnes)  : null,
        driver_advance: form.driver_advance ? parseFloat(form.driver_advance) : 0,
        freight_amount: parseFloat(form.freight_amount),
        end_date:       form.end_date    || null,
        doc_number:     form.doc_number  || null,
        material:       form.material    || null,
      });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      setVehicleSuggestions([]);
      setFatigueStatus(null);
      load();
    } catch (err: any) {
      const d = err.response?.data?.detail;
      setFormErr(Array.isArray(d) ? d.map((x: any) => x.msg).join(", ") : d || "Something went wrong");
    } finally { setSaving(false); }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const filtered   = filter === "all" ? trips : trips.filter(t => t.status === filter);
  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

  const expenses     = detail?.expenses ?? [];
  const totalExp     = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const freight      = Number(detail?.freight_amount ?? selTrip?.freight_amount ?? 0);
  const profit       = freight - totalExp;
  const margin       = freight > 0 ? ((profit / freight) * 100).toFixed(1) : "0.0";
  const driverAdv    = Number(detail?.driver_advance ?? 0);
  const driverBal    = driverAdv - totalExp; // + = driver owes back, − = pay driver more

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <Header title={t("nav.trips")} subtitle={`${trips.length} ${t("dash.total_trips")}`} />
      {/* Floating Log Trip button on mobile */}
      {isMobile && (
        <button
          onClick={() => { setShowForm(true); setFormErr(""); }}
          style={{
            position: "fixed", bottom: 74, right: 16, zIndex: 990,
            width: 56, height: 56, borderRadius: "50%",
            background: "#1E2D8E", color: "white", border: "none",
            boxShadow: "0 4px 16px rgba(30,45,142,0.4)",
            fontSize: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          +
        </button>
      )}
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 10 : 14, marginBottom: isMobile ? 14 : 24 }}>
          {[
            { label: "Total Trips",  value: trips.length,                                         color: "#1E2D8E" },
            { label: "Planned",      value: trips.filter(t => t.status === "planned").length,      color: "#1565c0" },
            { label: "In Progress",  value: trips.filter(t => t.status === "in_progress").length,  color: "#e65100" },
            { label: "Completed",    value: trips.filter(t => t.status === "completed").length,    color: "#2e7d32" },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs + Log Trip button */}
        {isMobile ? (
          <div style={{ marginBottom: 14 }}>
            {/* Horizontally scrollable filter strip */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" as any, scrollbarWidth: "none" as any }}>
              {["all", "planned", "in_progress", "completed", "cancelled"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{
                    padding: "7px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                    border: "none", cursor: "pointer", flexShrink: 0,
                    background: filter === f ? (STATUS_CONFIG[f]?.color || "#1E2D8E") : "#f0f1fa",
                    color: filter === f ? "#fff" : "#666",
                  }}>
                  {f === "all" ? `All (${trips.length})` : `${f.replace("_", " ")} (${trips.filter(t => t.status === f).length})`}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            {["all", "planned", "in_progress", "completed", "cancelled"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                  border: "none", cursor: "pointer",
                  background: filter === f ? (STATUS_CONFIG[f]?.color || "#1E2D8E") : "#f0f1fa",
                  color: filter === f ? "#fff" : "#666",
                }}>
                {f === "all" ? `All (${trips.length})` : `${f.replace("_", " ")} (${trips.filter(t => t.status === f).length})`}
              </button>
            ))}
            <button className="btn-primary" style={{ marginLeft: "auto" }}
              onClick={() => { setShowForm(true); setFormErr(""); }}>
              <Plus size={15} /> Log Trip
            </button>
          </div>
        )}

        {/* Trips table */}
        <div className="card">
          {loading ? (
            <p style={{ color: "#aaa", textAlign: "center", padding: "32px 0" }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "52px 20px" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: filter !== "all" ? "#f5f5f5" : "#eef0fb",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <Route size={32} color={filter !== "all" ? "#ccc" : "#1E2D8E"} style={{ opacity: filter !== "all" ? 1 : 0.5 }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)", marginBottom: 6 }}>
                {filter !== "all" ? `No ${filter.replace("_", " ")} trips` : "Log your first trip"}
              </div>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 20, maxWidth: 320, margin: "0 auto 20px" }}>
                {filter !== "all"
                  ? `No trips with status "${filter.replace("_", " ")}" found. Switch to All to see everything.`
                  : "Log trips to track routes, freight income, expenses per trip and profitability."}
              </div>
              {filter === "all" && (
                <button className="btn-primary" onClick={() => { setShowForm(true); setFormErr(""); }}>
                  <Plus size={14} /> Log Trip
                </button>
              )}
            </div>
          ) : isMobile ? (
            // Mobile: trip cards
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((t: any) => {
                const veh = vehicleMap[t.vehicle_id];
                const nextLabel = t.status === "planned" ? "Dispatch" : t.status === "in_progress" ? "Complete" : null;
                const nextColor = t.status === "planned" ? "#e65100" : "#2e7d32";
                return (
                  <div key={t.id} onClick={() => openTrip(t)}
                    style={{ padding: "14px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--bg-card)", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)", flex: 1, marginRight: 8 }}>
                        <span style={{ color: "#1E2D8E" }}>{t.origin}</span>
                        <span style={{ color: "#bbb", margin: "0 5px" }}>→</span>
                        <span>{t.destination}</span>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        <div>{t.driver_name} · {veh?.registration_number || "—"}</div>
                        <div style={{ marginTop: 2 }}>{t.start_date}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: "#1E2D8E" }}>{fmt(Number(t.freight_amount))}</span>
                        {nextLabel && (
                          <button onClick={e => { e.stopPropagation(); advanceStatus(t, e); }}
                            disabled={statusBusy}
                            style={{ padding: "6px 12px", background: nextColor, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            {nextLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Desktop: table
            <table>
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Date</th>
                  <th>Freight</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t: any) => {
                  const veh = vehicleMap[t.vehicle_id];
                  const nextLabel = t.status === "planned" ? "Dispatch" : t.status === "in_progress" ? "Complete" : null;
                  const nextColor = t.status === "planned" ? "#e65100" : "#2e7d32";
                  const isSelected = selTrip?.id === t.id;
                  return (
                    <tr key={t.id} onClick={() => openTrip(t)}
                      style={{ cursor: "pointer", background: isSelected ? "#f5f6ff" : undefined }}>
                      <td style={{ fontWeight: 600 }}>
                        <span style={{ color: "#1E2D8E" }}>{t.origin}</span>
                        <span style={{ color: "#bbb", margin: "0 6px" }}>→</span>
                        <span>{t.destination}</span>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 12.5 }}>
                        {veh?.registration_number || "—"}
                      </td>
                      <td>{t.driver_name}</td>
                      <td style={{ color: "#888" }}>{t.start_date}</td>
                      <td style={{ fontWeight: 700, color: "#1E2D8E" }}>
                        {fmt(Number(t.freight_amount))}
                      </td>
                      <td><StatusBadge status={t.status} /></td>
                      <td onClick={e => e.stopPropagation()}>
                        {nextLabel ? (
                          <button
                            onClick={e => advanceStatus(t, e)}
                            disabled={statusBusy}
                            style={{ padding: "4px 12px", background: nextColor, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            {nextLabel}
                          </button>
                        ) : t.status === "completed" ? (
                          <span style={{ fontSize: 12, color: "#2e7d32", fontWeight: 600 }}>✓ Done</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Trip Sheet Drawer ─────────────────────────────────────────────────── */}
      {selTrip && (
        <>
          {/* Backdrop */}
          <div onClick={() => { setSelTrip(null); setDetail(null); }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 900 }} />

          {/* Drawer panel */}
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: 520,
            background: "var(--bg-card, #fff)", zIndex: 901,
            display: "flex", flexDirection: "column",
            boxShadow: "-4px 0 32px rgba(0,0,0,0.15)",
          }}>

            {/* ── Drawer header ──────────────────────────────────────────────── */}
            <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid #f0f0f6", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#1E2D8E" }}>
                    {selTrip.origin} → {selTrip.destination}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#aaa", marginTop: 2 }}>Trip Sheet</div>
                </div>
                <button onClick={() => { setSelTrip(null); setDetail(null); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", padding: 4 }}>
                  <X size={18} />
                </button>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selTrip.status === "planned" && (
                  <button onClick={() => advanceStatus(selTrip)} disabled={statusBusy}
                    style={{ padding: "8px 18px", background: "#e65100", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    ▶ Dispatch Truck
                  </button>
                )}
                {selTrip.status === "in_progress" && (
                  <button onClick={() => advanceStatus(selTrip)} disabled={statusBusy}
                    style={{ padding: "8px 18px", background: "#2e7d32", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    ✓ Mark Delivered
                  </button>
                )}
                {!["completed", "cancelled"].includes(selTrip.status) && (
                  <button onClick={() => cancelTripFn(selTrip)} disabled={statusBusy}
                    style={{ padding: "8px 14px", background: "none", color: "#c62828", border: "1.5px solid #c62828", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                    ✕ Cancel
                  </button>
                )}
                {selTrip.status === "cancelled" && (
                  <span style={{ fontSize: 12.5, color: "#c62828", fontWeight: 600, paddingTop: 8 }}>Trip was cancelled</span>
                )}
                {selTrip.status === "completed" && (
                  <span style={{ fontSize: 12.5, color: "#2e7d32", fontWeight: 600, paddingTop: 8 }}>✓ Trip completed</span>
                )}
                <button
                  onClick={() => shareOnWhatsApp(selTrip, detail, vehicleMap[selTrip.vehicle_id]?.registration_number || "—")}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#25D366", color: "white", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                  <MessageCircle size={14} /> Share on WhatsApp
                </button>
                <button
                  onClick={() => setPdfModal(true)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#1E2D8E", color: "white", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                  <FileDown size={14} /> Download PDF
                </button>
              </div>
            </div>

            {/* ── Drawer body (scrollable) ────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 32px" }}>

              {/* Status stepper */}
              {selTrip.status !== "cancelled" && <StatusStepper status={selTrip.status} />}

              {/* Trip details grid */}
              <div style={{ background: "#f9f9fb", borderRadius: 10, padding: "12px 14px", marginBottom: 14, fontSize: 12.5 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
                  {[
                    { label: "Vehicle",   value: vehicleMap[selTrip.vehicle_id]?.registration_number },
                    { label: "Driver",    value: selTrip.driver_name },
                    { label: "Start",     value: selTrip.start_date },
                    { label: "End",       value: selTrip.end_date },
                    { label: "LR No.",    value: detail?.doc_number },
                    { label: "Material",  value: detail?.material },
                    { label: "Weight",    value: detail?.weight_tonnes ? `${detail.weight_tonnes} T` : null },
                    { label: "Distance",  value: selTrip.distance_km ? `${selTrip.distance_km} km` : null },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ color: "#bbb", fontSize: 10.5, marginBottom: 1 }}>{f.label}</div>
                      <div style={{ fontWeight: 600, color: f.value ? "#333" : "#ddd" }}>{f.value || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Income bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#e8f5e9", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#2e7d32" }}>Freight Income</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#2e7d32" }}>{fmt(Number(selTrip.freight_amount))}</span>
              </div>

              {/* Expenses header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Expenses</div>
                {!["completed", "cancelled"].includes(selTrip.status) && (
                  <button onClick={() => setShowExpForm(v => !v)}
                    style={{ padding: "4px 12px", background: "#1E2D8E", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    + Add
                  </button>
                )}
              </div>

              {/* Add expense form */}
              {showExpForm && (
                <div style={{ background: "#f5f6ff", border: "1.5px solid #e0e3ff", borderRadius: 10, padding: "12px", marginBottom: 12 }}>
                  {expErr && <div style={{ color: "#b71c1c", fontSize: 12, marginBottom: 8 }}>{expErr}</div>}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 3 }}>Category</label>
                      <select value={expForm.expense_type}
                        onChange={e => setExpForm(p => ({ ...p, expense_type: e.target.value }))}
                        style={{ width: "100%", padding: "7px 8px", border: "1.5px solid #e8e8f0", borderRadius: 7, fontSize: 12.5, boxSizing: "border-box" }}>
                        {EXPENSE_TYPES.map(et => <option key={et.value} value={et.value}>{et.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 3 }}>Amount (₹)</label>
                      <input type="number" placeholder="0" value={expForm.amount}
                        onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))}
                        style={{ width: "100%", padding: "7px 8px", border: "1.5px solid #e8e8f0", borderRadius: 7, fontSize: 12.5, boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 3 }}>Date</label>
                      <input type="date" value={expForm.date}
                        onChange={e => setExpForm(p => ({ ...p, date: e.target.value }))}
                        style={{ width: "100%", padding: "7px 8px", border: "1.5px solid #e8e8f0", borderRadius: 7, fontSize: 12.5, boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 3 }}>Note (optional)</label>
                      <input type="text" placeholder="e.g. NH-48 Toll" value={expForm.description}
                        onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))}
                        style={{ width: "100%", padding: "7px 8px", border: "1.5px solid #e8e8f0", borderRadius: 7, fontSize: 12.5, boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setShowExpForm(false); setExpErr(""); setExpForm({ ...EMPTY_EXP }); }}
                      style={{ flex: 1, padding: "7px", background: "none", border: "1.5px solid #ddd", borderRadius: 7, fontSize: 12.5, cursor: "pointer" }}>
                      Cancel
                    </button>
                    <button onClick={handleAddExpense} disabled={addingExp || !expForm.amount}
                      style={{ flex: 2, padding: "7px", background: addingExp || !expForm.amount ? "#ccc" : "#1E2D8E", color: "#fff", border: "none", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                      {addingExp ? "Adding..." : "Add Expense"}
                    </button>
                  </div>
                </div>
              )}

              {/* Expenses list */}
              {detLoading ? (
                <p style={{ color: "#bbb", fontSize: 13, textAlign: "center", padding: "12px 0" }}>Loading…</p>
              ) : expenses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "14px 0", color: "#ccc", fontSize: 13 }}>
                  No expenses logged yet
                </div>
              ) : (
                <table style={{ width: "100%", fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      {["Category", "Date", "Note", "Amount"].map((h, i) => (
                        <th key={h} style={{ textAlign: i === 3 ? "right" : "left", padding: "5px 4px", color: "#bbb", fontWeight: 600, fontSize: 11, borderBottom: "1px solid #f0f0f0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e: any) => (
                      <tr key={e.id}>
                        <td style={{ padding: "7px 4px", fontWeight: 600, color: "#444" }}>{expLabel(e.expense_type)}</td>
                        <td style={{ padding: "7px 4px", color: "#999" }}>{e.date}</td>
                        <td style={{ padding: "7px 4px", color: "#aaa", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {e.description || "—"}
                        </td>
                        <td style={{ padding: "7px 4px", textAlign: "right", fontWeight: 700, color: "#c62828" }}>
                          {fmt(Number(e.amount))}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={3} style={{ padding: "8px 4px", fontWeight: 700, fontSize: 13, borderTop: "2px solid #f0f0f0" }}>
                        Total Expenses
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 800, fontSize: 13, color: "#c62828", borderTop: "2px solid #f0f0f0" }}>
                        {fmt(totalExp)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* Driver advance reconciliation */}
              {driverAdv > 0 && (
                <div style={{ background: "#f9f9fb", borderRadius: 10, padding: "10px 14px", marginTop: 14, fontSize: 12.5 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Driver Advance Reconciliation</div>
                  {[
                    { label: "Advance Given",    value: fmt(driverAdv),  color: "#333" },
                    { label: "Total Expenses",   value: fmt(totalExp),   color: "#c62828" },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#666" }}>{r.label}</span>
                      <span style={{ fontWeight: 600, color: r.color }}>{r.value}</span>
                    </div>
                  ))}
                  <div style={{ height: 1, background: "#e8e8f0", margin: "6px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700 }}>
                      {driverBal >= 0 ? "Driver Owes Back" : "Additional Pay to Driver"}
                    </span>
                    <span style={{ fontWeight: 800, color: driverBal >= 0 ? "#2e7d32" : "#c62828" }}>
                      {fmt(Math.abs(driverBal))}
                    </span>
                  </div>
                </div>
              )}

              {/* P&L Summary */}
              <div style={{
                background: profit >= 0 ? "#e8f5e9" : "#fce4ec",
                border: `1.5px solid ${profit >= 0 ? "#a5d6a7" : "#ef9a9a"}`,
                borderRadius: 12, padding: "14px 16px", marginTop: 16,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 10 }}>Trip P&L Summary</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: "#555" }}>Freight Income</span>
                  <span style={{ fontWeight: 600, color: "#2e7d32" }}>{fmt(freight)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: "#555" }}>Total Expenses</span>
                  <span style={{ fontWeight: 600, color: "#c62828" }}>− {fmt(totalExp)}</span>
                </div>
                <div style={{ height: 1, background: profit >= 0 ? "#a5d6a7" : "#ef9a9a", marginBottom: 10 }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Net {profit >= 0 ? "Profit" : "Loss"}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: profit >= 0 ? "#2e7d32" : "#c62828" }}>
                      {profit < 0 ? "− " : ""}{fmt(profit)}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#888", marginTop: 1 }}>Margin: {margin}%</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {/* ── Log Trip Modal ─────────────────────────────────────────────────────── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: 540, position: "relative", maxHeight: "92vh", overflowY: "auto" }}>
            <button onClick={() => { setShowForm(false); setVehicleSuggestions([]); setFatigueStatus(null); }}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
              <X size={18} />
            </button>
            <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>{t("trip.new")}</h2>
            <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "#888" }}>{t("vehicle.fill_manually")}</p>

            {formErr && (
              <div style={{ background: "#fce4ec", color: "#b71c1c", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 13 }}>
                {formErr}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Vehicle */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{t("trip.vehicle")} *</label>
                <select required value={form.vehicle_id}
                  onChange={e => setForm(p => ({ ...p, vehicle_id: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }}>
                  <option value="">{t("form.select_vehicle")}</option>
                  {vehicles.filter(v => v.status === "active").map((v: any) => (
                    <option key={v.id} value={v.id}>{v.registration_number} — {v.make} {v.model}</option>
                  ))}
                </select>
              </div>

              {/* Driver */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Driver</label>
                <div style={{ position: "relative" }}>
                  <select value={form.driver_id} onChange={e => handleDriverChange(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box", appearance: "auto" }}>
                    <option value="">— Select driver (or type name below) —</option>
                    {drivers.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}{d.phone ? ` · ${d.phone}` : ""}</option>
                    ))}
                  </select>
                </div>

                {/* Fatigue badge */}
                {fatigueLoading && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "#888" }}>Checking driver status…</div>
                )}
                {!fatigueLoading && fatigueStatus && (() => {
                  const cfg: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
                    available: { bg: "#e8f5e9", color: "#2e7d32", icon: <CheckCircle size={12} /> },
                    caution:   { bg: "#fff8e1", color: "#f57f17", icon: <AlertTriangle size={12} /> },
                    blocked:   { bg: "#fce4ec", color: "#b71c1c", icon: <AlertTriangle size={12} /> },
                    on_trip:   { bg: "#e3f2fd", color: "#1565c0", icon: <Clock size={12} /> },
                  };
                  const c = cfg[fatigueStatus.status] ?? cfg.available;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, padding: "5px 10px", background: c.bg, borderRadius: 6, width: "fit-content" }}>
                      <span style={{ color: c.color, display: "flex" }}>{c.icon}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: c.color, textTransform: "capitalize" }}>
                        {fatigueStatus.status.replace("_", " ")} — {fatigueStatus.reason}
                      </span>
                    </div>
                  );
                })()}

                {/* Manual name/phone fallback if no driver selected from list */}
                {!form.driver_id && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                    {[
                      { label: "Driver Name *", key: "driver_name", placeholder: "Ramesh Kumar", required: true },
                      { label: "Driver Phone",  key: "driver_phone", placeholder: "9876543210",  required: false },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#888", display: "block", marginBottom: 3 }}>{f.label}</label>
                        <input required={f.required} value={(form as any)[f.key]} placeholder={f.placeholder}
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                          style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Route */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <LocationInput
                  label="From *"
                  value={form.origin}
                  onChange={v => handleOriginChange(v)}
                  placeholder="e.g. Mumbai, Andheri"
                  required
                />
                <LocationInput
                  label="To *"
                  value={form.destination}
                  onChange={v => setForm(p => ({ ...p, destination: v }))}
                  placeholder="e.g. Delhi, Gurgaon"
                  required
                />
              </div>

              {/* Smart vehicle suggestions */}
              {vehicleSuggestions.length > 0 && (
                <div style={{ background: "#f0f4ff", border: "1.5px solid #c5cef9", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Zap size={13} color="#1E2D8E" />
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#1E2D8E" }}>
                      Vehicles near {form.origin} — reduce empty run
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {vehicleSuggestions.map((s: any) => (
                      <div key={s.vehicle_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "white", borderRadius: 8, padding: "8px 10px", border: "1px solid #dde3fa" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{s.registration_number}</div>
                          <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>
                            Last trip: {s.last_trip_from} → {s.last_trip_to} · {s.idle_days}d ago
                            {s.last_driver_name ? ` · ${s.last_driver_name}` : ""}
                          </div>
                        </div>
                        <button type="button" onClick={() => applySuggestion(s)}
                          style={{ fontSize: 12, fontWeight: 700, color: "#1E2D8E", background: "#eef0fb", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap" }}>
                          Use this
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LR / Material */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "LR No. / Doc No.", key: "doc_number", placeholder: "LR/2024/001" },
                  { label: "Material / Goods", key: "material",   placeholder: "Steel Coils" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{f.label}</label>
                    <input value={(form as any)[f.key]} placeholder={f.placeholder}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>

              {/* Freight / Advance / Weight */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: "Freight (₹) *", key: "freight_amount", placeholder: "85000", required: true,  type: "number" },
                  { label: "Driver Advance (₹)", key: "driver_advance", placeholder: "5000", required: false, type: "number" },
                  { label: "Weight (Tonnes)", key: "weight_tonnes", placeholder: "25",    required: false, type: "number" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{f.label}</label>
                    <input type={f.type} required={f.required} value={(form as any)[f.key]} placeholder={f.placeholder}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>

              {/* Dates / Distance */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: "Start Date *", key: "start_date",  type: "date",   required: true },
                  { label: "End Date",     key: "end_date",    type: "date",   required: false },
                  { label: "Distance (km)",key: "distance_km", type: "number", required: false, placeholder: "1200" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{f.label}</label>
                    <input type={f.type} required={f.required} value={(form as any)[f.key]}
                      placeholder={(f as any).placeholder || ""}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Notes</label>
                <textarea value={form.notes} rows={2} placeholder="Optional..."
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, resize: "vertical", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => { setShowForm(false); setVehicleSuggestions([]); setFatigueStatus(null); }}>{t("common.cancel")}</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>
                  {saving ? t("common.loading") : t("trip.new")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PDF Options Modal ─────────────────────────────────────────────── */}
      {pdfModal && selTrip && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setPdfModal(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "white", borderRadius: 16, padding: 28, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e", marginBottom: 4 }}>Download Trip Sheet PDF</div>
            <div style={{ fontSize: 12.5, color: "#888", marginBottom: 20 }}>{selTrip.origin} → {selTrip.destination}</div>

            {/* Expense types */}
            <div style={{ fontWeight: 700, fontSize: 12, color: "#555", marginBottom: 10 }}>Include in PDF</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {[
                { key: "all",            label: "All expenses" },
                { key: "fuel",           label: "Fuel expenses only" },
                { key: "toll",           label: "Toll / FASTag charges" },
                { key: "maintenance",    label: "Maintenance / Repairs" },
                { key: "driver_payment", label: "Driver payments" },
                { key: "loading",        label: "Loading / Unloading" },
                { key: "other",          label: "Other expenses" },
              ].map(opt => (
                <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox"
                    checked={!!(pdfOpts.expTypes as any)[opt.key]}
                    onChange={e => setPdfOpts(p => ({ ...p, expTypes: { ...p.expTypes, [opt.key]: e.target.checked } }))}
                    style={{ width: 16, height: 16, accentColor: "#1E2D8E" }} />
                  {opt.label}
                </label>
              ))}
            </div>

            {/* Show profit toggle */}
            <div style={{ borderTop: "1px solid #f0f0f5", paddingTop: 14, marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox"
                  checked={pdfOpts.showProfit}
                  onChange={e => setPdfOpts(p => ({ ...p, showProfit: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: "#1E2D8E" }} />
                <div>
                  <div style={{ fontWeight: 600 }}>Include net profit section</div>
                  <div style={{ fontSize: 11, color: "#aaa" }}>Internal use only — don&apos;t share with customers</div>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setPdfModal(false)}
                style={{ flex: 1, padding: "10px 0", border: "1px solid #e0e0e0", borderRadius: 8, background: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#555" }}>
                Cancel
              </button>
              <button onClick={async () => {
                const selected = Object.entries(pdfOpts.expTypes).filter(([,v]) => v).map(([k]) => k);
                const expTypes = selected.join(",") || "none";
                const url = `${process.env.NEXT_PUBLIC_API_URL}/trips/${selTrip.id}/pdf?expense_types=${encodeURIComponent(expTypes)}&show_profit=${pdfOpts.showProfit}`;
                const token = localStorage.getItem("token");
                try {
                  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                  if (!r.ok) throw new Error(`Server error: ${r.status}`);
                  const blob = await r.blob();
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `tripsheet_${selTrip.origin}_${selTrip.destination}.pdf`;
                  a.click();
                  setPdfModal(false);
                } catch (err) {
                  alert("Failed to generate PDF. Please try again.");
                }
              }}
                style={{ flex: 2, padding: "10px 0", border: "none", borderRadius: 8, background: "#1E2D8E", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <FileDown size={14} /> Generate & Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
