"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin, Truck, Droplets, CircleDollarSign, Package, Camera,
  CheckCircle2, ChevronLeft, Plus, X, Loader2,
} from "lucide-react";
import { useDriverAuth } from "@/lib/driverAuth";
import { driverPortalService } from "@/lib/services/driverPortalService";

const PRIMARY = "#1E2D8E";
const GREEN   = "#059669";
const AMBER   = "#D97706";

type ExpenseTab = "fuel" | "toll" | "misc" | "other";
const EXP_TABS: { key: ExpenseTab; label: string; icon: any }[] = [
  { key: "fuel",  label: "Fuel",   icon: Droplets          },
  { key: "toll",  label: "Toll",   icon: CircleDollarSign  },
  { key: "misc",  label: "Misc",   icon: Package           },
  { key: "other", label: "Other",  icon: Plus              },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function today() { return new Date().toISOString().slice(0, 10); }

export default function TripDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const { driver } = useDriverAuth();

  const [trip,       setTrip]       = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState<ExpenseTab>("fuel");
  const [showForm,   setShowForm]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saveMsg,    setSaveMsg]    = useState("");
  const [statusMsg,  setStatusMsg]  = useState("");

  // Fuel form
  const [fuelDate,    setFuelDate]    = useState(today());
  const [fuelLitres,  setFuelLitres]  = useState("");
  const [fuelAmt,     setFuelAmt]     = useState("");
  const [fuelOdo,     setFuelOdo]     = useState("");
  const [fuelStation, setFuelStation] = useState("");
  const [fuelImage,   setFuelImage]   = useState<File | null>(null);

  // Toll form
  const [tollDate,   setTollDate]   = useState(today());
  const [tollAmt,    setTollAmt]    = useState("");
  const [tollPlaza,  setTollPlaza]  = useState("");
  const [tollMode,   setTollMode]   = useState("cash");

  // Misc/Other form
  const [expDate,  setExpDate]  = useState(today());
  const [expAmt,   setExpAmt]   = useState("");
  const [expCat,   setExpCat]   = useState("");
  const [expDesc,  setExpDesc]  = useState("");
  const [expImage, setExpImage] = useState<File | null>(null);

  const imageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    driverPortalService.getTripById(id, driver?.id).then(r => {
      if (r.success && r.data) setTrip(r.data);
      setLoading(false);
    });
  }, [id, driver?.id]);

  const canEdit = trip?.status === "in_progress" || trip?.status === "planned";

  async function startTrip() {
    if (!trip) return;
    setStatusMsg("Starting trip…");
    const r = await driverPortalService.updateTripStatus(trip.id, "in_progress");
    if (r.success) {
      setTrip((t: any) => ({ ...t, status: "in_progress" }));
      setStatusMsg("Trip started!");
    } else {
      setStatusMsg(r.error ?? "Failed to start.");
    }
    setTimeout(() => setStatusMsg(""), 2500);
  }

  async function completeTrip() {
    if (!trip) return;
    if (!confirm("Mark this trip as completed?")) return;
    setStatusMsg("Completing trip…");
    const r = await driverPortalService.updateTripStatus(trip.id, "completed", { end_date: today() });
    if (r.success) {
      setTrip((t: any) => ({ ...t, status: "completed", end_date: today() }));
      setStatusMsg("Trip completed!");
    } else {
      setStatusMsg(r.error ?? "Failed.");
    }
    setTimeout(() => setStatusMsg(""), 2500);
  }

  async function uploadImage(file: File): Promise<string | null> {
    if (!driver) return null;
    const r = await driverPortalService.uploadExpenseImage(file, driver.id, trip.id);
    return r.success ? (r.data ?? null) : null;
  }

  async function handleSave() {
    if (!trip || !driver) return;
    setSaving(true);
    let r: any;

    if (tab === "fuel") {
      let imageUrl: string | null = null;
      if (fuelImage) imageUrl = await uploadImage(fuelImage);
      r = await driverPortalService.addFuelLog(trip.id, trip.owner_id, trip.vehicle_id, {
        date: fuelDate, litres: Number(fuelLitres), amount: Number(fuelAmt),
        ...(fuelOdo     ? { odometer_km: Number(fuelOdo) } : {}),
        ...(fuelStation ? { fuel_station: fuelStation } : {}),
        ...(imageUrl    ? { notes: `Receipt: ${imageUrl}` } : {}),
      });
    } else if (tab === "toll") {
      r = await driverPortalService.addTollLog(trip.id, trip.owner_id, trip.vehicle_id, {
        date: tollDate, amount: Number(tollAmt),
        ...(tollPlaza ? { toll_plaza: tollPlaza } : {}),
        payment_mode: tollMode,
      });
    } else {
      let imageUrl: string | null = null;
      if (expImage) imageUrl = await uploadImage(expImage);
      const category = tab === "misc" ? expCat : expCat || "Other";
      if (tab === "misc") {
        r = await driverPortalService.addMiscExpense(trip.id, trip.owner_id, trip.vehicle_id, {
          date: expDate, amount: Number(expAmt), category, description: expDesc,
        });
      } else {
        r = await driverPortalService.addExpense(trip.id, trip.owner_id, trip.vehicle_id, {
          expense_type: category || "Other", amount: Number(expAmt), date: expDate,
          description: expDesc + (imageUrl ? ` | Receipt: ${imageUrl}` : ""),
        });
      }
    }

    setSaving(false);
    if (r?.success) {
      setSaveMsg("Saved!");
      setShowForm(false);
      // Refresh trip
      const fresh = await driverPortalService.getTripById(trip.id);
      if (fresh.success && fresh.data) setTrip(fresh.data);
      resetForms();
    } else {
      setSaveMsg(r?.error ?? "Failed to save.");
    }
    setTimeout(() => setSaveMsg(""), 3000);
  }

  function resetForms() {
    setFuelDate(today()); setFuelLitres(""); setFuelAmt(""); setFuelOdo(""); setFuelStation(""); setFuelImage(null);
    setTollDate(today()); setTollAmt(""); setTollPlaza(""); setTollMode("cash");
    setExpDate(today()); setExpAmt(""); setExpCat(""); setExpDesc(""); setExpImage(null);
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>Loading trip…</div>;
  if (!trip)   return <div style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>Trip not found.</div>;

  const allExpenses = [
    ...(trip.fuel_logs    ?? []).map((e: any) => ({ ...e, _type: "Fuel",      _color: "#0369A1", _bg: "#EFF6FF", amount: e.amount })),
    ...(trip.toll_logs    ?? []).map((e: any) => ({ ...e, _type: "Toll",      _color: "#7C3AED", _bg: "#EDE9FE" })),
    ...(trip.misc_expenses?? []).map((e: any) => ({ ...e, _type: e.category,  _color: "#B45309", _bg: "#FFF7ED" })),
    ...(trip.expenses     ?? []).map((e: any) => ({ ...e, _type: e.expense_type, _color: "#047857", _bg: "#ECFDF5" })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  const totalExp = allExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const isFormValid = () => {
    if (tab === "fuel") return fuelLitres && fuelAmt;
    if (tab === "toll") return tollAmt;
    return expAmt && expCat;
  };

  return (
    <div style={{ padding: "0 0 24px" }}>
      {/* Back header */}
      <div style={{ padding: "14px 16px 0", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: PRIMARY }}>
          <ChevronLeft size={22} />
        </button>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#0F172A" }}>Trip Detail</div>
      </div>

      {/* Trip summary card */}
      <div style={{ margin: "14px 16px 0", background: `linear-gradient(135deg, ${PRIMARY} 0%, #3749C0 100%)`, borderRadius: 16, padding: "20px 18px", color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {trip.vehicles?.registration_number ?? "Vehicle"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4, letterSpacing: "-0.4px" }}>
              {trip.origin} → {trip.destination}
            </div>
          </div>
          <div style={{
            padding: "4px 12px", borderRadius: 20,
            background: trip.status === "in_progress" ? "#DCFCE7" : trip.status === "completed" ? "#F1F5F9" : "rgba(255,255,255,0.2)",
            color: trip.status === "in_progress" ? GREEN : trip.status === "completed" ? "#64748B" : "white",
            fontSize: 11, fontWeight: 700, textTransform: "uppercase",
          }}>
            {trip.status === "in_progress" ? "In Progress" : trip.status === "completed" ? "Completed" : trip.status}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Freight",  value: fmt(trip.freight_amount)           },
            { label: "Advance",  value: fmt(trip.driver_advance ?? 0)      },
            { label: "Expenses", value: fmt(totalExp)                       },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {trip.start_date}{trip.end_date ? ` → ${trip.end_date}` : ""}
          {trip.material ? ` · ${trip.material}` : ""}
          {trip.distance_km ? ` · ${trip.distance_km} km` : ""}
        </div>
      </div>

      {/* Status action buttons */}
      {statusMsg && (
        <div style={{ margin: "12px 16px 0", padding: "10px 14px", background: "#DCFCE7", border: "1px solid #86EFAC", borderRadius: 10, fontSize: 13, color: GREEN, fontWeight: 600 }}>
          {statusMsg}
        </div>
      )}

      {trip.status === "planned" && (
        <button onClick={startTrip} style={{ display: "block", width: "calc(100% - 32px)", margin: "12px 16px 0", padding: "14px", background: GREEN, color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          ▶ Start Trip
        </button>
      )}
      {trip.status === "in_progress" && (
        <button onClick={completeTrip} style={{ display: "block", width: "calc(100% - 32px)", margin: "12px 16px 0", padding: "14px", background: "#0F172A", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          <CheckCircle2 size={17} style={{ verticalAlign: "middle", marginRight: 6 }} />
          Mark as Completed
        </button>
      )}

      {/* Add expense button */}
      {canEdit && !showForm && (
        <button onClick={() => setShowForm(true)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "calc(100% - 32px)", margin: "10px 16px 0", padding: "13px", background: "white", border: `2px dashed ${PRIMARY}`, borderRadius: 12, color: PRIMARY, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          <Plus size={18} /> Add Expense
        </button>
      )}

      {saveMsg && (
        <div style={{ margin: "10px 16px 0", padding: "10px 14px", background: "#DCFCE7", borderRadius: 10, fontSize: 13, color: GREEN, fontWeight: 600 }}>
          {saveMsg}
        </div>
      )}

      {/* Expense form */}
      {showForm && canEdit && (
        <div style={{ margin: "14px 16px 0", background: "white", borderRadius: 16, border: "1.5px solid #E2E8F0", overflow: "hidden" }}>
          {/* Tab switcher */}
          <div style={{ display: "flex", borderBottom: "1px solid #F1F5F9", overflowX: "auto" }}>
            {EXP_TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ flex: 1, minWidth: 68, padding: "12px 8px", border: "none", background: tab === key ? PRIMARY : "transparent", color: tab === key ? "white" : "#64748B", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: "16px" }}>
            {/* ── Fuel form ── */}
            {tab === "fuel" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Date" type="date" value={fuelDate} onChange={setFuelDate} />
                  <Field label="Litres" type="number" value={fuelLitres} onChange={setFuelLitres} placeholder="e.g. 120" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Amount (₹)" type="number" value={fuelAmt} onChange={setFuelAmt} placeholder="e.g. 12000" />
                  <Field label="Odometer (km)" type="number" value={fuelOdo} onChange={setFuelOdo} placeholder="optional" />
                </div>
                <Field label="Fuel Station" value={fuelStation} onChange={setFuelStation} placeholder="e.g. HPCL, NH48" />
                <ImagePicker label="Attach receipt" file={fuelImage} onChange={setFuelImage} inputRef={imageRef} />
              </div>
            )}

            {/* ── Toll form ── */}
            {tab === "toll" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Date" type="date" value={tollDate} onChange={setTollDate} />
                  <Field label="Amount (₹)" type="number" value={tollAmt} onChange={setTollAmt} placeholder="e.g. 245" />
                </div>
                <Field label="Toll Plaza Name" value={tollPlaza} onChange={setTollPlaza} placeholder="e.g. Khed-Shivapur" />
                <div>
                  <div style={labelStyle}>Payment Mode</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["cash", "fastag", "upi"].map(m => (
                      <button key={m} onClick={() => setTollMode(m)}
                        style={{ flex: 1, padding: "9px 4px", borderRadius: 8, border: `1.5px solid ${tollMode === m ? PRIMARY : "#E2E8F0"}`, background: tollMode === m ? "#EEF0FB" : "white", color: tollMode === m ? PRIMARY : "#64748B", fontWeight: 700, fontSize: 12, cursor: "pointer", textTransform: "uppercase" }}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Misc / Other form ── */}
            {(tab === "misc" || tab === "other") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Date" type="date" value={expDate} onChange={setExpDate} />
                  <Field label="Amount (₹)" type="number" value={expAmt} onChange={setExpAmt} placeholder="e.g. 500" />
                </div>
                <div>
                  <div style={labelStyle}>Category</div>
                  <select value={expCat} onChange={e => setExpCat(e.target.value)} style={inputStyle}>
                    <option value="">Select category…</option>
                    {(tab === "misc"
                      ? ["Tyre", "Repair", "Parking", "Cleaning", "Loading", "Unloading", "Other"]
                      : ["Driver Expense", "Food", "Lodging", "Document", "Police", "Weighbridge", "Other"]
                    ).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <Field label="Notes" value={expDesc} onChange={setExpDesc} placeholder="What was this for?" />
                <ImagePicker label="Attach bill/photo" file={expImage} onChange={setExpImage} inputRef={imageRef} />
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => { setShowForm(false); resetForms(); }}
                style={{ flex: 1, padding: "12px", background: "#F1F5F9", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#64748B", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !isFormValid()}
                style={{ flex: 2, padding: "12px", background: saving || !isFormValid() ? "#C7D2FE" : PRIMARY, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving || !isFormValid() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {saving ? <><Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> Saving…</> : "Save Expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense list */}
      <div style={{ margin: "20px 16px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>
          Expenses ({allExpenses.length}) · Total: {fmt(totalExp)}
        </div>
        {allExpenses.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px", color: "#94A3B8", fontSize: 13, background: "white", borderRadius: 12, border: "1.5px solid #E2E8F0" }}>
            No expenses logged yet.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {allExpenses.map((e: any, i) => (
            <div key={e.id ?? i} style={{ background: "white", borderRadius: 10, padding: "12px 14px", border: "1.5px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: e._bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: e._color }}>
                  {e._type?.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{e._type}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>
                    {e.date}
                    {e.litres ? ` · ${e.litres}L` : ""}
                    {e.toll_plaza ? ` · ${e.toll_plaza}` : ""}
                    {e.fuel_station ? ` · ${e.fuel_station}` : ""}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>{fmt(Number(e.amount))}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {trip.notes && (
        <div style={{ margin: "16px 16px 0", padding: "12px 14px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, fontSize: 13, color: "#92400E" }}>
          <strong>Note from manager:</strong> {trip.notes}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none", background: "#F8FAFC", boxSizing: "border-box", color: "#0F172A" };

function Field({ label, type = "text", value, onChange, placeholder }: { label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

function ImagePicker({ label, file, onChange, inputRef }: { label: string; file: File | null; onChange: (f: File | null) => void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {file ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#F0FDF4", borderRadius: 8, border: "1px solid #86EFAC" }}>
          <Camera size={14} color={GREEN} />
          <span style={{ fontSize: 13, color: GREEN, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
          <button onClick={() => onChange(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: 2 }}><X size={14} /></button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          style={{ width: "100%", padding: "11px", border: "1.5px dashed #C7D2FE", borderRadius: 8, background: "#F8FAFC", color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Camera size={14} /> Take photo or choose file
        </button>
      )}
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="file" accept="image/*" capture="environment"
        style={{ display: "none" }}
        onChange={e => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
