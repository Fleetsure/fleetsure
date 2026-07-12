"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useFirm } from "@/lib/FirmContext";
import { tripService } from "@/lib/services/tripService";
import { fuelService } from "@/lib/services/fuelService";
import { tollService } from "@/lib/services/tollService";
import { miscExpenseService } from "@/lib/services/miscExpenseService";
import { vehicleService } from "@/lib/services/vehicleService";
import { driverService } from "@/lib/services/driverService";
import { Plus, X, Route, MessageCircle, FileDown, Trash2 } from "lucide-react";
import LocationInput from "@/components/LocationInput";
import { useLanguage } from "@/lib/LanguageContext";
import { fmtDate, todayISO } from "@/lib/date";
import { autoSyncTripToTyres } from "@/lib/services/tyreSetupService";
import { EXPENSE_TYPES } from "@/lib/constants/expenseType";
import { TRIP_STATUS_CONFIG as STATUS_CONFIG } from "@/lib/constants/tripStatus";
import { useIsMobile } from "@/hooks/useIsMobile";
import { geocode, haversineKm } from "@/lib/geo";
import { shareOnWhatsApp } from "@/lib/tripShare";
import TripStatusBadge from "@/components/TripStatusBadge";
import TripStatusStepper from "@/components/TripStatusStepper";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import LogTripModal from "./LogTripModal";
import PdfOptionsModal from "./PdfOptionsModal";
import WeighbridgeModal from "./WeighbridgeModal";

const EMPTY_FORM = {
  vehicle_id: "", driver_id: "", driver_name: "", driver_phone: "",
  origin: "", destination: "", distance_km: "",
  start_date: todayISO(),
  end_date: "", freight_amount: "",
  doc_number: "", material: "", weight_tonnes: "", driver_advance: "",
  notes: "",
};

const EMPTY_EXP = {
  expense_type: "fuel", amount: "", description: "", litres: "",
  toll_plaza: "", payment_mode: "cash",
  date: todayISO(),
};

// Maps trip expense_type → misc_expenses category
const EXPENSE_TO_MISC_CAT: Record<string, string> = {
  maintenance:       "other",
  oil:               "other",
  police_challan:    "fine",
  rto:               "other",
  telephone:         "other",
  loading_unloading: "loading_unloading",
  driver_payment:    "other",
  tyre:              "other",
  other:             "other",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const expLabel = (t: string) =>
  EXPENSE_TYPES.find(e => e.value === t)?.label ?? t;

// Active trips (in_progress/pending_review) shouldn't be deleted mid-run.
const DELETABLE_STATUSES = ["planned", "completed"];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TripsPage() {
  const { t } = useLanguage();
  const { activeFirmId } = useFirm();
  const [trips, setTrips]       = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const isMobile = useIsMobile();

  // Phase 2 — smart suggestions
  const [vehicleSuggestions, setVehicleSuggestions] = useState<any[]>([]);
  const [fatigueStatus, setFatigueStatus]           = useState<any>(null);
  const [fatigueLoading, setFatigueLoading]         = useState(false);


  // Log trip form
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [saving, setSaving]       = useState(false);
  const [formErr, setFormErr]     = useState("");
  const [editingTrip, setEditingTrip] = useState<any>(null);

  // Trip sheet drawer
  const [selTrip, setSelTrip]       = useState<any>(null);
  const [detail, setDetail]         = useState<any>(null);
  const [detLoading, setDetLoading] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showWeighbridgeModal, setShowWeighbridgeModal] = useState(false);
  const [deleteTrip, setDeleteTrip] = useState<any>(null);

  const [distCalc, setDistCalc] = useState<"idle" | "loading" | "done" | "error">("idle");

  // Expense form (inside drawer)
  const [expForm, setExpForm]       = useState({ ...EMPTY_EXP, date: todayISO() });
  const [showExpForm, setShowExpForm] = useState(false);
  const [showSettleForm, setShowSettleForm] = useState(false);
  const [settleAmount, setSettleAmount]     = useState("");
  const [settlements, setSettlements]       = useState<any[]>([]);
  const [pdfModal, setPdfModal]   = useState(false);
  const [addingExp, setAddingExp]   = useState(false);
  const [expErr, setExpErr]         = useState("");

  // ── Data loading ────────────────────────────────────────────────────────────

  const load = () => {
    if (!activeFirmId) { setTrips([]); setVehicles([]); setDrivers([]); setLoading(false); return; }
    Promise.all([tripService.getAll(), vehicleService.getAll(), driverService.getAll()])
      .then(([t, v, d]) => { setTrips(t.data || []); setVehicles(v.data || []); setDrivers(d.data || []); })
      .finally(() => setLoading(false));
  };

  const handleOriginChange = (value: string) => {
    setForm(p => ({ ...p, origin: value }));
    setVehicleSuggestions([]);
  };

  const handleDriverChange = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    setForm(p => ({
      ...p,
      driver_id:    driverId,
      driver_name:  driver?.name  || "",
      driver_phone: driver?.phone || "",
    }));
    setFatigueStatus(null);
  };

  // Apply a vehicle suggestion to the form
  const applySuggestion = (s: any) => {
    setForm(p => ({ ...p, vehicle_id: s.vehicle_id }));
    setVehicleSuggestions([]);
  };

  useEffect(() => { load(); }, [activeFirmId]);

  // Auto-calculate distance from origin + destination
  useEffect(() => {
    if (form.origin.trim().length < 3 || form.destination.trim().length < 3) return;
    setDistCalc("loading");
    const timer = setTimeout(async () => {
      const [from, to] = await Promise.all([geocode(form.origin), geocode(form.destination)]);
      if (from && to) {
        setForm(p => ({ ...p, distance_km: String(haversineKm(from.lat, from.lon, to.lat, to.lon)) }));
        setDistCalc("done");
      } else {
        setDistCalc("error");
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [form.origin, form.destination]);

  // ── Trip sheet ──────────────────────────────────────────────────────────────

  const openTrip = async (trip: any) => {
    setSelTrip(trip);
    setDetail(null);
    setDetLoading(true);
    setShowExpForm(false);
    setExpForm({ ...EMPTY_EXP, date: todayISO() });
    setExpErr("");
    setSettlements([]);
    try {
      const [r, sRes] = await Promise.all([
        tripService.getById(trip.id),
        driverService.getPaymentsForTrip(trip.id),
      ]);
      setDetail(r.data);
      setSettlements(sRes.data ?? []);
    } finally {
      setDetLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!selTrip) return;
    try {
      const [r, sRes] = await Promise.all([
        tripService.getById(selTrip.id),
        driverService.getPaymentsForTrip(selTrip.id),
      ]);
      setDetail(r.data);
      setSettlements(sRes.data ?? []);
    } catch (err) {
      console.error("[Trips] failed to refresh trip detail:", err);
    }
  };

  // ── Status transitions ──────────────────────────────────────────────────────

  const advanceStatus = async (trip: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = trip.status === "planned" ? "in_progress" : trip.status === "in_progress" ? "pending_review" : "completed";

    // Dispatching (planned -> in_progress) reserves the vehicle: block it if
    // that vehicle is already out on another active trip. A vehicle can
    // still be assigned to other *planned* trips while in_trip — only
    // dispatch is blocked, not scheduling.
    if (next === "in_progress") {
      const veh = vehicles.find(v => v.id === trip.vehicle_id);
      if (veh?.status === "in_trip") {
        alert(`${veh.registration_number} is already on another active trip. Complete or cancel that trip before dispatching this one.`);
        return;
      }
    }

    setStatusBusy(true);
    try {
      const res = await tripService.update(trip.id, { status: next });
      if (!res.success) throw new Error(res.error || "Failed to update trip status");
      const updated = { ...trip, status: next };
      setTrips(prev => prev.map(t => t.id === trip.id ? updated : t));
      setSelTrip((p: any) => p?.id === trip.id ? updated : p);
      setDetail((p: any) => p ? { ...p, status: next } : p);
      if (next === "completed") autoSyncTripToTyres(trip);

      // Reaching in_progress reserves the vehicle ("in_trip"); reaching
      // completed releases it back to "active". pending_review keeps it
      // reserved since the trip isn't done yet.
      if (trip.vehicle_id && (next === "in_progress" || next === "completed")) {
        const vehStatus = next === "in_progress" ? "in_trip" : "active";
        const vRes = await vehicleService.update(trip.vehicle_id, { status: vehStatus });
        if (vRes.success) {
          setVehicles(prev => prev.map(v => v.id === trip.vehicle_id ? { ...v, status: vehStatus } : v));
        } else {
          console.error("[Trips] failed to update vehicle status after trip status change:", {
            vehicleId: trip.vehicle_id, attemptedStatus: vehStatus, error: vRes.error,
          });
        }
      }
    } catch (err: any) {
      console.error("[Trips] failed to advance trip status:", {
        tripId: trip.id, from: trip.status, to: next, error: err?.message || err, raw: err,
      });
      alert(err?.message || "Failed to update trip status. Please try again.");
    } finally { setStatusBusy(false); }
  };

  const cancelTripFn = async (trip: any) => {
    if (!confirm("Cancel this trip? The vehicle will be released.")) return;
    setStatusBusy(true);
    try {
      const res = await tripService.update(trip.id, { status: "cancelled" });
      if (!res.success) throw new Error(res.error || "Failed to cancel trip");
      const updated = { ...trip, status: "cancelled" };
      setTrips(prev => prev.map(t => t.id === trip.id ? updated : t));
      setSelTrip((p: any) => p?.id === trip.id ? updated : p);
      setDetail((p: any) => p ? { ...p, status: "cancelled" } : p);

      // Release the vehicle if this trip had it reserved — it only reached
      // in_trip if it was actually dispatched (in_progress/pending_review).
      if (trip.vehicle_id && ["in_progress", "pending_review"].includes(trip.status)) {
        const vRes = await vehicleService.update(trip.vehicle_id, { status: "active" });
        if (vRes.success) {
          setVehicles(prev => prev.map(v => v.id === trip.vehicle_id ? { ...v, status: "active" } : v));
        } else {
          console.error("[Trips] failed to release vehicle after trip cancel:", { vehicleId: trip.vehicle_id, error: vRes.error });
        }
      }
    } catch (err: any) {
      console.error("[Trips] failed to cancel trip:", { tripId: trip.id, error: err?.message || err, raw: err });
      alert(err?.message || "Failed to cancel trip. Please try again.");
    } finally { setStatusBusy(false); }
  };

  const handleDeleteTrip = async () => {
    const res = await tripService.delete(deleteTrip.id);
    if (!res.success) throw new Error(res.error || "Failed to delete trip");
    setTrips(prev => prev.filter(t => t.id !== deleteTrip.id));
    if (selTrip?.id === deleteTrip.id) { setSelTrip(null); setDetail(null); }
    setDeleteTrip(null);
  };

  // ── Add expense ─────────────────────────────────────────────────────────────

  const handleAddExpense = async () => {
    if (!expForm.amount || !selTrip) return;
    if (expForm.expense_type === "fuel" && !expForm.litres) {
      setExpErr("Litres filled is required for fuel entries."); return;
    }
    setAddingExp(true); setExpErr("");
    try {
      if (expForm.expense_type === "fuel") {
        // Write to fuel_logs → syncs to Fuel module automatically
        await fuelService.add({
          vehicle_id:   selTrip.vehicle_id,
          trip_id:      selTrip.id,
          date:         expForm.date,
          litres:       parseFloat(expForm.litres),
          amount:       parseFloat(expForm.amount),
          fuel_station: expForm.description || null,
          notes:        null,
          odometer_km:  null,
        });
      } else if (expForm.expense_type === "toll") {
        // Write to toll_logs → syncs to Tolls module automatically
        await tollService.add({
          vehicle_id:   selTrip.vehicle_id,
          trip_id:      selTrip.id,
          date:         expForm.date,
          amount:       parseFloat(expForm.amount),
          toll_plaza:   expForm.toll_plaza || undefined,
          route:        undefined,
          payment_mode: expForm.payment_mode || "cash",
          notes:        expForm.description || undefined,
        });
      } else {
        // All other types → misc_expenses → syncs to Misc Expenses module
        const miscCat = EXPENSE_TO_MISC_CAT[expForm.expense_type] ?? "other";
        await miscExpenseService.add({
          vehicle_id:  selTrip.vehicle_id,
          trip_id:     selTrip.id,
          date:        expForm.date,
          amount:      parseFloat(expForm.amount),
          category:    miscCat,
          description: expForm.description || expLabel(expForm.expense_type),
          notes:       undefined,
        });
      }
      setExpForm({ ...EMPTY_EXP, date: todayISO() });
      setShowExpForm(false);
      await refreshDetail();
    } catch (err: any) {
      const d = err?.response?.data?.detail ?? err?.message;
      setExpErr(Array.isArray(d) ? d.map((x: any) => x.msg).join(", ") : d || "Failed to add expense");
    } finally { setAddingExp(false); }
  };

  // ── Delete expense ──────────────────────────────────────────────────────────

  const handleDeleteExpense = async (exp: any) => {
    if (!confirm("Delete this expense?")) return;
    const id: string = exp.id;
    if (id.startsWith("fl_"))      await fuelService.delete(id.slice(3));
    else if (id.startsWith("tl_")) await tollService.delete(id.slice(3));
    else if (id.startsWith("me_")) await miscExpenseService.delete(id.slice(3));
    else                           await tripService.deleteExpense(id);
    await refreshDetail();
  };

  // ── Settle driver advance ───────────────────────────────────────────────────
  // This used to log the settlement via miscExpenseService.add(), i.e. as a
  // trip EXPENSE — which fed straight back into totalExp, which increased
  // "Additional Pay to Driver" by the same amount that was just paid,
  // triggering the same button again (an escalating loop: pay ₹650 -> total
  // expenses go up ₹650 -> owed amount goes up again). A settlement is money
  // leaving the owner directly to the driver, not a trip cost, so it belongs
  // in driver_payments (type='settlement'), same ledger as the Driver
  // Account page's "Record to Salary Ledger" — never in trip expenses.
  const handleSettle = async () => {
    if (!settleAmount || !selTrip) return;
    if (!selTrip.driver_id) {
      alert("This trip has no driver assigned — nothing to settle.");
      return;
    }
    const res = await driverService.recordSettlement(selTrip.driver_id, selTrip.id, parseFloat(settleAmount));
    if (!res.success) {
      console.error("[Trips] failed to record driver settlement:", { tripId: selTrip.id, error: res.error });
      alert(res.error || "Failed to record driver payment. Please try again.");
      return;
    }
    setSettleAmount(""); setShowSettleForm(false);
    await refreshDetail();
  };

  // ── Create trip ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: any) => {
    e.preventDefault(); setSaving(true); setFormErr("");
    const payload = {
      ...form,
      driver_id:      form.driver_id      || null,
      distance_km:    form.distance_km    ? parseFloat(form.distance_km)    : null,
      weight_tonnes:  form.weight_tonnes  ? parseFloat(form.weight_tonnes)  : null,
      driver_advance: form.driver_advance ? parseFloat(form.driver_advance) : 0,
      freight_amount: form.freight_amount ? parseFloat(form.freight_amount) : 0,
      end_date:       form.end_date    || null,
      doc_number:     form.doc_number  || null,
      material:       form.material    || null,
    };
    try {
      const res = editingTrip
        ? await tripService.update(editingTrip.id, payload)
        : await tripService.create(payload);
      if (!res.success) {
        setFormErr(res.error || "Something went wrong");
        return;
      }
      // The trip detail drawer (if open on this same trip) holds its own
      // copy of the row — refresh it too, or a save here would look like it
      // silently did nothing while the drawer keeps showing pre-edit values.
      if (editingTrip && selTrip?.id === editingTrip.id) {
        setSelTrip((res as any).data);
        refreshDetail();
      }
      setEditingTrip(null);
      setShowForm(false);
      setForm({ ...EMPTY_FORM, start_date: todayISO() });
      setVehicleSuggestions([]);
      setFatigueStatus(null);
      setDistCalc("idle");
      load();
    } catch (err: any) {
      const d = err.response?.data?.detail;
      setFormErr(Array.isArray(d) ? d.map((x: any) => x.msg).join(", ") : d || "Something went wrong");
    } finally { setSaving(false); }
  };

  const openEditTrip = (trip: any) => {
    setEditingTrip(trip);
    setForm({
      vehicle_id:     trip.vehicle_id     || "",
      driver_id:      trip.driver_id      || "",
      driver_name:    trip.driver_name    || "",
      driver_phone:   trip.driver_phone   || "",
      origin:         trip.origin         || "",
      destination:    trip.destination    || "",
      distance_km:    trip.distance_km    ? String(trip.distance_km)    : "",
      start_date:     trip.start_date     || todayISO(),
      end_date:       trip.end_date       || "",
      freight_amount: trip.freight_amount ? String(trip.freight_amount) : "",
      doc_number:     trip.doc_number     || "",
      material:       trip.material       || "",
      weight_tonnes:  trip.weight_tonnes  ? String(trip.weight_tonnes)  : "",
      driver_advance: trip.driver_advance ? String(trip.driver_advance) : "",
      notes:          trip.notes          || "",
    });
    setFormErr("");
    setShowForm(true);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const filtered   = filter === "all" ? trips : trips.filter(t => t.status === filter);
  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

  // Merge all dedicated expense tables so the trip P&L is always complete.
  // Entries added from a module (fuel/tolls/misc) with trip_id appear here automatically.
  // Entries added from the trip form are routed directly to the correct table.
  const fuelLogExpenses = (detail?.fuel_logs ?? []).map((fl: any) => ({
    id: `fl_${fl.id}`, expense_type: "fuel", amount: fl.amount, date: fl.date,
    description: `${Number(fl.litres).toFixed(1)} L${fl.fuel_station ? ` · ${fl.fuel_station}` : ""}`,
    _label: "Fuel (HSD)",
  }));
  const tollLogExpenses = (detail?.toll_logs ?? []).map((tl: any) => ({
    id: `tl_${tl.id}`, expense_type: "toll", amount: tl.amount, date: tl.date,
    description: [tl.toll_plaza, tl.payment_mode === "fastag" ? "FASTag" : tl.payment_mode ? "Cash" : null].filter(Boolean).join(" · ") || null,
    _label: "Toll / Bridge",
  }));
  const miscExpEntries = (detail?.misc_expenses ?? []).map((me: any) => ({
    id: `me_${me.id}`, expense_type: me.category, amount: me.amount, date: me.date,
    description: me.description || null,
    _label: me.description || me.category,
  }));
  const expenses = [...(detail?.expenses ?? []), ...fuelLogExpenses, ...tollLogExpenses, ...miscExpEntries]
    .sort((a: any, b: any) => a.date.localeCompare(b.date));
  const totalExp     = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const freight      = Number(detail?.freight_amount ?? selTrip?.freight_amount ?? 0);
  const profit       = freight - totalExp;
  const margin       = freight > 0 ? ((profit / freight) * 100).toFixed(1) : "0.0";
  const driverAdv    = Number(detail?.driver_advance ?? 0);
  const driverBal    = driverAdv - totalExp; // + = driver owes back, − = pay driver more
  // Settlements are driver_payments rows, not trip expenses — they don't
  // feed back into totalExp/driverBal above, so recording one can't trigger
  // another recalculation of the same owed amount.
  const totalSettled = settlements.filter((p: any) => p.type === "settlement").reduce((s: number, p: any) => s + Number(p.amount), 0);

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
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)", gap: isMobile ? 10 : 14, marginBottom: isMobile ? 14 : 24 }}>
          {[
            { label: "Total Trips",  value: trips.length,                                              color: "#1E2D8E" },
            { label: "Planned",      value: trips.filter(t => t.status === "planned").length,           color: "#1565c0" },
            { label: "In Progress",  value: trips.filter(t => t.status === "in_progress").length,       color: "#e65100" },
            { label: "Pending Review", value: trips.filter(t => t.status === "pending_review").length,  color: "#6a1b9a" },
            { label: "Completed",    value: trips.filter(t => t.status === "completed").length,         color: "#2e7d32" },
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
              {["all", "planned", "in_progress", "pending_review", "completed", "cancelled"].map(f => (
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
            {["all", "planned", "in_progress", "pending_review", "completed", "cancelled"].map(f => (
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
                const nextLabel = t.status === "planned" ? "Dispatch" : t.status === "in_progress" ? "Mark Delivered" : t.status === "pending_review" ? "Confirm Completed" : null;
                const nextColor = t.status === "planned" ? "#e65100" : t.status === "in_progress" ? "#6a1b9a" : "#2e7d32";
                return (
                  <div key={t.id} onClick={() => openTrip(t)}
                    style={{ padding: "14px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--bg-card)", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)", flex: 1, marginRight: 8 }}>
                        <span style={{ color: "#1E2D8E" }}>{t.origin}</span>
                        <span style={{ color: "#bbb", margin: "0 5px" }}>→</span>
                        <span>{t.destination}</span>
                      </div>
                      <TripStatusBadge status={t.status} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        <div>{t.driver_name} · {veh?.registration_number || "—"}</div>
                        <div style={{ marginTop: 2 }}>{fmtDate(t.start_date)}</div>
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
                        {DELETABLE_STATUSES.includes(t.status) && (
                          <button onClick={e => { e.stopPropagation(); setDeleteTrip(t); }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 4 }}>
                            <Trash2 size={15} />
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
                  const nextLabel = t.status === "planned" ? "Dispatch" : t.status === "in_progress" ? "Mark Delivered" : t.status === "pending_review" ? "Confirm Completed" : null;
                  const nextColor = t.status === "planned" ? "#e65100" : t.status === "in_progress" ? "#6a1b9a" : "#2e7d32";
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
                      <td style={{ color: "#888" }}>{fmtDate(t.start_date)}</td>
                      <td style={{ fontWeight: 700, color: "#1E2D8E" }}>
                        {fmt(Number(t.freight_amount))}
                      </td>
                      <td><TripStatusBadge status={t.status} /></td>
                      <td onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                        {DELETABLE_STATUSES.includes(t.status) && (
                          <button onClick={() => setDeleteTrip(t)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 4 }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#e53935")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#ccc")}>
                            <Trash2 size={14} />
                          </button>
                        )}
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
            position: "fixed", top: 0, right: 0, bottom: 0, width: isMobile ? "100%" : 520,
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
                    style={{ padding: "8px 18px", background: "#6a1b9a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    ✓ Mark Delivered
                  </button>
                )}
                {selTrip.status === "pending_review" && (
                  <button onClick={() => advanceStatus(selTrip)} disabled={statusBusy}
                    style={{ padding: "8px 18px", background: "#2e7d32", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    ✓ Confirm Completed
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
                {selTrip.status === "pending_review" && (
                  <span style={{ fontSize: 12.5, color: "#6a1b9a", fontWeight: 600, paddingTop: 8 }}>Driver marked delivered — awaiting your confirmation</span>
                )}
                {selTrip.status === "completed" && (
                  <span style={{ fontSize: 12.5, color: "#2e7d32", fontWeight: 600, paddingTop: 8 }}>✓ Trip completed</span>
                )}
                <button
                  onClick={() => openEditTrip(selTrip)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "none", color: "#1E2D8E", border: "1.5px solid #1E2D8E", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                  ✏ Edit Trip
                </button>
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
              {selTrip.status !== "cancelled" && <TripStatusStepper status={selTrip.status} />}

              {/* Trip details grid */}
              <div style={{ background: "#f9f9fb", borderRadius: 10, padding: "12px 14px", marginBottom: 14, fontSize: 12.5 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
                  {[
                    { label: "Vehicle",   value: vehicleMap[selTrip.vehicle_id]?.registration_number },
                    { label: "Driver",    value: selTrip.driver_name },
                    { label: "Start",     value: fmtDate(selTrip.start_date) },
                    { label: "End",       value: selTrip.end_date ? fmtDate(selTrip.end_date) : null },
                    { label: "LR No.",    value: detail?.doc_number },
                    { label: "Material",  value: detail?.material },
                    { label: "Weight",    value: detail?.weight_tonnes ? `${detail.weight_tonnes} T` : null },
                    { label: "Distance",    value: selTrip.distance_km ? `${selTrip.distance_km} km` : null },
                    { label: "Proj. Fuel", value: (() => { const veh = vehicleMap[selTrip.vehicle_id]; return (selTrip.distance_km && veh?.avg_mileage_kmpl) ? `~${(selTrip.distance_km / veh.avg_mileage_kmpl).toFixed(1)} L` : null; })() },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ color: "#bbb", fontSize: 10.5, marginBottom: 1 }}>{f.label}</div>
                      <div style={{ fontWeight: 600, color: f.value ? "#333" : "#ddd" }}>{f.value || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weighbridge & Quantity — empty_truck_weight/loading_quantity/
                  unloading_quantity/quantity_lost are stored in kg; shown
                  here converted to tonnes for readability. */}
              {detail && (detail.empty_truck_weight != null || detail.loading_quantity != null || detail.unloading_quantity != null || detail.weighbridge_slip_1_url || detail.weighbridge_slip_2_url || detail.weighbridge_slip_3_url) ? (
                <div style={{ background: "#fff8f0", border: "1px solid #ffe0b2", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#e65100" }}>Weighbridge & Quantity</div>
                    <button onClick={() => setShowWeighbridgeModal(true)}
                      style={{ fontSize: 11.5, fontWeight: 700, color: "#e65100", background: "none", border: "1px solid #ffcc80", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>
                      Edit
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px", fontSize: 12.5, marginBottom: 12 }}>
                    {[
                      { label: "Empty Truck Weight", value: detail.empty_truck_weight != null ? `${(detail.empty_truck_weight / 1000).toFixed(3)} T` : null },
                      { label: "Loading Date",       value: detail.loading_date ? fmtDate(detail.loading_date) : null },
                      { label: "Loaded Quantity",    value: detail.loading_quantity != null ? `${(detail.loading_quantity / 1000).toFixed(3)} T` : null },
                      { label: "Unloading Date",     value: detail.unloading_date ? fmtDate(detail.unloading_date) : null },
                      { label: "Delivered Quantity", value: detail.unloading_quantity != null ? `${(detail.unloading_quantity / 1000).toFixed(3)} T` : null },
                    ].map(f => (
                      <div key={f.label}>
                        <div style={{ color: "#bbb", fontSize: 10.5, marginBottom: 1 }}>{f.label}</div>
                        <div style={{ fontWeight: 600, color: f.value ? "#333" : "#ddd" }}>{f.value || "—"}</div>
                      </div>
                    ))}
                  </div>

                  {detail.quantity_lost !== null && detail.quantity_lost !== undefined && (
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      background: detail.quantity_lost < 0 ? "#fce4ec" : "white",
                      border: detail.quantity_lost < 0 ? "1px solid #f8bbd0" : "1px solid #ffe0b2",
                      borderRadius: 8, padding: "8px 12px", marginBottom: 12,
                    }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: detail.quantity_lost < 0 ? "#c62828" : "#555" }}>
                        Quantity Lost{detail.quantity_lost < 0 ? " · Data Error" : ""}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: detail.quantity_lost < 0 ? "#c62828" : "#e65100" }}>
                        {(detail.quantity_lost / 1000).toFixed(3)} T
                      </span>
                    </div>
                  )}

                  {(detail.weighbridge_slip_1_url || detail.weighbridge_slip_2_url || detail.weighbridge_slip_3_url) && (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {[
                        { label: "Slip 1 · Empty",     url: detail.weighbridge_slip_1_url },
                        { label: "Slip 2 · Loaded",    url: detail.weighbridge_slip_2_url },
                        { label: "Slip 3 · Delivered", url: detail.weighbridge_slip_3_url },
                      ].filter(s => s.url).map(s => (
                        <div key={s.label} style={{ textAlign: "center" }}>
                          <img src={s.url} alt={s.label} onClick={() => setLightboxUrl(s.url)}
                            style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #ffe0b2", cursor: "pointer" }} />
                          <div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : detail && (
                <button onClick={() => setShowWeighbridgeModal(true)}
                  style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center", padding: "9px 14px", marginBottom: 14, background: "#fff8f0", border: "1px dashed #ffcc80", borderRadius: 10, fontSize: 12.5, fontWeight: 700, color: "#e65100", cursor: "pointer" }}>
                  ⚖️ Add Weighbridge Details
                </button>
              )}

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
                      <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 3 }}>Amount (₹) *</label>
                      <input type="number" placeholder="0" value={expForm.amount}
                        onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))}
                        style={{ width: "100%", padding: "7px 8px", border: "1.5px solid #e8e8f0", borderRadius: 7, fontSize: 12.5, boxSizing: "border-box" }} />
                    </div>
                    {expForm.expense_type === "fuel" && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 3 }}>Litres filled *</label>
                        <input type="number" min="0.1" step="0.01" placeholder="e.g. 80.5" value={expForm.litres}
                          onChange={e => setExpForm(p => ({ ...p, litres: e.target.value }))}
                          style={{ width: "100%", padding: "7px 8px", border: "1.5px solid #e8e8f0", borderRadius: 7, fontSize: 12.5, boxSizing: "border-box" }} />
                      </div>
                    )}
                    {expForm.expense_type === "toll" && (
                      <>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 3 }}>Toll Plaza (optional)</label>
                          <input type="text" placeholder="e.g. Mumbai-Pune Expressway" value={expForm.toll_plaza}
                            onChange={e => setExpForm(p => ({ ...p, toll_plaza: e.target.value }))}
                            style={{ width: "100%", padding: "7px 8px", border: "1.5px solid #e8e8f0", borderRadius: 7, fontSize: 12.5, boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 3 }}>Payment Mode</label>
                          <select value={expForm.payment_mode}
                            onChange={e => setExpForm(p => ({ ...p, payment_mode: e.target.value }))}
                            style={{ width: "100%", padding: "7px 8px", border: "1.5px solid #e8e8f0", borderRadius: 7, fontSize: 12.5, boxSizing: "border-box" }}>
                            <option value="cash">Cash</option>
                            <option value="fastag">FASTag</option>
                          </select>
                        </div>
                      </>
                    )}
                    <div>
                      <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 3 }}>Date</label>
                      <input type="date" value={expForm.date}
                        onChange={e => setExpForm(p => ({ ...p, date: e.target.value }))}
                        style={{ width: "100%", padding: "7px 8px", border: "1.5px solid #e8e8f0", borderRadius: 7, fontSize: 12.5, boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 3 }}>
                        {expForm.expense_type === "fuel" ? "Fuel Station (optional)" : expForm.expense_type === "toll" ? "Notes (optional)" : "Note (optional)"}
                      </label>
                      <input type="text"
                        placeholder={expForm.expense_type === "fuel" ? "e.g. HP Petrol Pump, NH-48" : "e.g. NH-48 Toll"}
                        value={expForm.description}
                        onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))}
                        style={{ width: "100%", padding: "7px 8px", border: "1.5px solid #e8e8f0", borderRadius: 7, fontSize: 12.5, boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setShowExpForm(false); setExpErr(""); setExpForm({ ...EMPTY_EXP, date: todayISO() }); }}
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
                      {["Category", "Date", "Note", "Amount", ""].map((h, i) => (
                        <th key={h + i} style={{ textAlign: i === 3 ? "right" : "left", padding: "5px 4px", color: "#bbb", fontWeight: 600, fontSize: 11, borderBottom: "1px solid #f0f0f0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e: any) => (
                      <tr key={e.id}>
                        <td style={{ padding: "7px 4px", fontWeight: 600, color: "#444" }}>{e._label ?? expLabel(e.expense_type)}</td>
                        <td style={{ padding: "7px 4px", color: "#999" }}>{fmtDate(e.date)}</td>
                        <td style={{ padding: "7px 4px", color: "#aaa", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {e.description || "—"}
                        </td>
                        <td style={{ padding: "7px 4px", textAlign: "right", fontWeight: 700, color: "#c62828" }}>
                          {fmt(Number(e.amount))}
                        </td>
                        <td style={{ padding: "7px 4px", textAlign: "right" }}>
                          {!["completed", "cancelled"].includes(selTrip?.status) && (
                            <button onClick={() => handleDeleteExpense(e)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#ddd", padding: 2 }}
                              onMouseEnter={ev => (ev.currentTarget.style.color = "#e53935")}
                              onMouseLeave={ev => (ev.currentTarget.style.color = "#ddd")}>
                              <Trash2 size={11} />
                            </button>
                          )}
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700 }}>
                      {driverBal >= 0 ? "Driver Owes Back" : "Additional Pay to Driver"}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 800, color: driverBal >= 0 ? "#2e7d32" : "#c62828" }}>
                        {fmt(Math.abs(driverBal))}
                      </span>
                      {driverBal < 0 && totalSettled === 0 && !["completed", "cancelled"].includes(selTrip?.status) && (
                        <button onClick={() => { setSettleAmount(String(Math.abs(driverBal))); setShowSettleForm(v => !v); }}
                          style={{ padding: "3px 10px", background: "#1E2D8E", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          Pay Driver
                        </button>
                      )}
                    </div>
                  </div>
                  {totalSettled > 0 && (
                    <div style={{ marginTop: 8, fontSize: 11.5, color: "#2e7d32", fontWeight: 600 }}>
                      ✓ {fmt(totalSettled)} recorded as a driver payment
                    </div>
                  )}
                  {showSettleForm && (
                    <div style={{ marginTop: 8, padding: "10px 12px", background: "#eef0fb", borderRadius: 8, display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#555", flexShrink: 0 }}>Amount (₹)</span>
                      <input type="number" min={1} value={settleAmount}
                        onChange={e => setSettleAmount(e.target.value)}
                        style={{ flex: 1, padding: "5px 8px", border: "1.5px solid #c5cef9", borderRadius: 6, fontSize: 13 }} />
                      <button onClick={handleSettle}
                        style={{ padding: "5px 12px", background: "#1E2D8E", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        Log
                      </button>
                      <button onClick={() => setShowSettleForm(false)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 12 }}>✕</button>
                    </div>
                  )}
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

      {showForm && (
        <LogTripModal
          editingTrip={editingTrip}
          form={form}
          setForm={setForm}
          formErr={formErr}
          vehicles={vehicles}
          drivers={drivers}
          distCalc={distCalc}
          vehicleSuggestions={vehicleSuggestions}
          fatigueLoading={fatigueLoading}
          fatigueStatus={fatigueStatus}
          isMobile={isMobile}
          saving={saving}
          t={t}
          onDriverChange={handleDriverChange}
          onOriginChange={handleOriginChange}
          onApplySuggestion={applySuggestion}
          onSubmit={handleSubmit}
          onClose={() => { setShowForm(false); setEditingTrip(null); setVehicleSuggestions([]); setFatigueStatus(null); }}
        />
      )}

      {pdfModal && selTrip && (
        <PdfOptionsModal
          trip={selTrip}
          detail={detail}
          vehicles={vehicles}
          isMobile={isMobile}
          onClose={() => setPdfModal(false)}
        />
      )}

      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, cursor: "zoom-out", padding: 20 }}>
          <img src={lightboxUrl} alt="Weighbridge slip" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }} />
        </div>
      )}

      {showWeighbridgeModal && selTrip && (
        <WeighbridgeModal
          trip={detail ?? selTrip}
          isMobile={isMobile}
          onClose={() => setShowWeighbridgeModal(false)}
          onSaved={refreshDetail}
        />
      )}

      {deleteTrip && (
        <ConfirmDeleteModal
          title="Delete Trip"
          message="Delete this trip? This cannot be undone."
          onConfirm={handleDeleteTrip}
          onClose={() => setDeleteTrip(null)}
        />
      )}
    </div>
  );
}
