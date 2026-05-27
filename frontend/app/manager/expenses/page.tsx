"use client";
import { useEffect, useState } from "react";
import { teamService } from "@/lib/services/teamService";
import { useTeamAuth } from "@/lib/teamAuth";
import { IndianRupee, Plus, X } from "lucide-react";

const CAT_COLOR: Record<string, string> = {
  Fuel:        "#e65100",
  Toll:        "#1565c0",
  Maintenance: "#7b1fa2",
  Tyre:        "#2e7d32",
  Misc:        "#555",
};

const MISC_CATEGORIES = ["Maintenance", "Tyre", "Repair", "Salary", "Loading/Unloading", "Brokerage", "Other"];

const EMPTY_FUEL = { vehicle_id: "", trip_id: "", date: "", amount: "", litres: "", odometer_km: "", fuel_station: "", notes: "" };
const EMPTY_TOLL = { vehicle_id: "", trip_id: "", date: "", amount: "", toll_plaza: "", notes: "" };
const EMPTY_MISC = { vehicle_id: "", trip_id: "", date: "", amount: "", category: "Maintenance", description: "" };

export default function ManagerExpenses() {
  const { member } = useTeamAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [trips, setTrips]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [from, setFrom]         = useState("");
  const [to, setTo]             = useState("");
  const [catFilter, setCat]     = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [expType, setExpType]     = useState<"fuel" | "toll" | "misc">("fuel");
  const [fuelForm, setFuelForm]   = useState(EMPTY_FUEL);
  const [tollForm, setTollForm]   = useState(EMPTY_TOLL);
  const [miscForm, setMiscForm]   = useState(EMPTY_MISC);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setLoading(true);
    const r = await teamService.getExpenses({ from: from || undefined, to: to || undefined });
    setExpenses(r.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [from, to]);

  useEffect(() => {
    Promise.all([teamService.getVehicles(), teamService.getTrips()]).then(([v, t]) => {
      setVehicles(v.data ?? []);
      setTrips(t.data ?? []);
    });
  }, []);

  const cats    = ["all", ...Array.from(new Set(expenses.map(e => e._cat).filter(Boolean)))];
  const filtered = catFilter === "all" ? expenses : expenses.filter(e => e._cat === catFilter);
  const total    = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);

  const openAdd = () => {
    setFuelForm(EMPTY_FUEL); setTollForm(EMPTY_TOLL); setMiscForm(EMPTY_MISC);
    setFormError(""); setExpType("fuel"); setShowModal(true);
  };

  const setF = (k: string, v: string) => setFuelForm(p => ({ ...p, [k]: v }));
  const setT = (k: string, v: string) => setTollForm(p => ({ ...p, [k]: v }));
  const setM = (k: string, v: string) => setMiscForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    const owner_id = member!.owner_id;
    setSaving(true); setFormError("");
    let result: any;

    if (expType === "fuel") {
      if (!fuelForm.vehicle_id || !fuelForm.date || !fuelForm.amount) {
        setFormError("Vehicle, date and amount are required."); setSaving(false); return;
      }
      result = await teamService.addFuelLog({
        owner_id,
        vehicle_id:  fuelForm.vehicle_id,
        date:        fuelForm.date,
        amount:      Number(fuelForm.amount),
        litres:      fuelForm.litres      ? Number(fuelForm.litres)      : undefined,
        odometer_km: fuelForm.odometer_km ? Number(fuelForm.odometer_km) : undefined,
        trip_id:     fuelForm.trip_id     || undefined,
        fuel_station: fuelForm.fuel_station.trim() || undefined,
        notes:       fuelForm.notes.trim()          || undefined,
      });
    } else if (expType === "toll") {
      if (!tollForm.vehicle_id || !tollForm.date || !tollForm.amount) {
        setFormError("Vehicle, date and amount are required."); setSaving(false); return;
      }
      result = await teamService.addTollLog({
        owner_id,
        vehicle_id: tollForm.vehicle_id,
        date:       tollForm.date,
        amount:     Number(tollForm.amount),
        trip_id:    tollForm.trip_id   || undefined,
        toll_plaza: tollForm.toll_plaza.trim() || undefined,
        notes:      tollForm.notes.trim()      || undefined,
      });
    } else {
      if (!miscForm.date || !miscForm.amount || !miscForm.category) {
        setFormError("Date, amount and category are required."); setSaving(false); return;
      }
      result = await teamService.addMiscExpense({
        owner_id,
        vehicle_id:  miscForm.vehicle_id  || undefined,
        trip_id:     miscForm.trip_id     || undefined,
        date:        miscForm.date,
        amount:      Number(miscForm.amount),
        category:    miscForm.category,
        description: miscForm.description.trim() || undefined,
      });
    }

    setSaving(false);
    if (result.success) { setShowModal(false); load(); }
    else setFormError(result.error || "Failed to save expense.");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1.5px solid #e0e0ee",
    borderRadius: 8, fontSize: 13.5, background: "white", color: "#333", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 5,
  };

  return (
    <div style={{ padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 4 }}>Expenses</div>
          <div style={{ fontSize: 13, color: "#888" }}>{filtered.length} record{filtered.length !== 1 ? "s" : ""} · Total: ₹{total.toLocaleString("en-IN")}</div>
        </div>
        <button onClick={openAdd} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 18px", background: "#1E2D8E", color: "white",
          border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#888" }}>From</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ padding: "8px 12px", border: "1.5px solid #e0e0ee", borderRadius: 8, fontSize: 13, background: "white" }} />
          <span style={{ fontSize: 12, color: "#888" }}>to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ padding: "8px 12px", border: "1.5px solid #e0e0ee", borderRadius: 8, fontSize: 13, background: "white" }} />
          {(from || to) && (
            <button onClick={() => { setFrom(""); setTo(""); }} style={{ fontSize: 12, color: "#e53935", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          {cats.slice(0, 6).map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
              background: catFilter === c ? "#1E2D8E" : "#f0f0f8",
              color: catFilter === c ? "white" : "#555",
            }}>
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#aaa", fontSize: 14 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "64px", textAlign: "center", color: "#aaa" }}>
            <IndianRupee size={36} color="#e0e0ee" style={{ marginBottom: 12, display: "block", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, marginBottom: 16 }}>No expenses found for the selected filters.</div>
            <button onClick={openAdd} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 18px", background: "#1E2D8E", color: "white",
              border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              <Plus size={14} /> Log Expense
            </button>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f8ff" }}>
                {["Date", "Category", "Vehicle / Trip", "Description", "Amount"].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => {
                const color   = CAT_COLOR[e._cat] || "#555";
                const vehicle = e.vehicles?.registration_number || e.trips?.vehicles?.registration_number || "—";
                const desc    = e.description || e.notes || e.fuel_station || e.toll_plaza || "—";
                return (
                  <tr key={e.id + e._table} style={{ borderTop: i > 0 ? "1px solid #f0f0f8" : "none" }}>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#555" }}>
                      {e.date ? new Date(e.date).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: `${color}18`, color }}>
                        {e._cat}
                      </span>
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#555" }}>{vehicle}</td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#555", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {desc}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700, color: "#c62828" }}>
                      ₹{Number(e.amount || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f8f8ff", borderTop: "2px solid #e0e0ee" }}>
                <td colSpan={4} style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#555", textAlign: "right" }}>Total</td>
                <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 800, color: "#c62828" }}>
                  ₹{total.toLocaleString("en-IN")}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 1000, display: "flex", alignItems: "flex-start",
          justifyContent: "center", padding: "40px 16px", overflowY: "auto",
        }}>
          <div style={{
            background: "white", borderRadius: 16, width: "100%", maxWidth: 520,
            boxShadow: "0 24px 60px rgba(0,0,0,0.2)", padding: "28px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>Log Expense</h3>
              <button onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            {/* Type tabs */}
            <div style={{ display: "flex", gap: 0, marginBottom: 20, borderRadius: 10, overflow: "hidden", border: "1.5px solid #e0e0ee" }}>
              {(["fuel", "toll", "misc"] as const).map((t, idx) => (
                <button key={t} onClick={() => setExpType(t)} style={{
                  flex: 1, padding: "10px", border: "none",
                  borderLeft: idx > 0 ? "1px solid #e0e0ee" : "none",
                  background: expType === t ? "#1E2D8E" : "white",
                  color: expType === t ? "white" : "#555",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>
                  {t === "fuel" ? "⛽ Fuel" : t === "toll" ? "🛣️ Toll" : "📦 Misc"}
                </button>
              ))}
            </div>

            {formError && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>
                {formError}
              </div>
            )}

            {/* FUEL form */}
            {expType === "fuel" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Vehicle <span style={{ color: "#e53935" }}>*</span></label>
                    <select style={inputStyle} value={fuelForm.vehicle_id} onChange={e => setF("vehicle_id", e.target.value)}>
                      <option value="">Select vehicle</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Date <span style={{ color: "#e53935" }}>*</span></label>
                    <input type="date" style={inputStyle} value={fuelForm.date} onChange={e => setF("date", e.target.value)} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Amount (₹) <span style={{ color: "#e53935" }}>*</span></label>
                    <input type="number" style={inputStyle} placeholder="0" value={fuelForm.amount} onChange={e => setF("amount", e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Litres</label>
                    <input type="number" style={inputStyle} placeholder="0.00" value={fuelForm.litres} onChange={e => setF("litres", e.target.value)} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Odometer (km)</label>
                    <input type="number" style={inputStyle} placeholder="0" value={fuelForm.odometer_km} onChange={e => setF("odometer_km", e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Trip (optional)</label>
                    <select style={inputStyle} value={fuelForm.trip_id} onChange={e => setF("trip_id", e.target.value)}>
                      <option value="">No trip</option>
                      {trips.map(t => <option key={t.id} value={t.id}>{t.origin} → {t.destination}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Fuel Station</label>
                  <input style={inputStyle} placeholder="HP / Indian Oil / BPCL..." value={fuelForm.fuel_station} onChange={e => setF("fuel_station", e.target.value)} />
                </div>
              </div>
            )}

            {/* TOLL form */}
            {expType === "toll" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Vehicle <span style={{ color: "#e53935" }}>*</span></label>
                    <select style={inputStyle} value={tollForm.vehicle_id} onChange={e => setT("vehicle_id", e.target.value)}>
                      <option value="">Select vehicle</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Date <span style={{ color: "#e53935" }}>*</span></label>
                    <input type="date" style={inputStyle} value={tollForm.date} onChange={e => setT("date", e.target.value)} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Amount (₹) <span style={{ color: "#e53935" }}>*</span></label>
                    <input type="number" style={inputStyle} placeholder="0" value={tollForm.amount} onChange={e => setT("amount", e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Toll Plaza</label>
                    <input style={inputStyle} placeholder="Plaza name" value={tollForm.toll_plaza} onChange={e => setT("toll_plaza", e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Trip (optional)</label>
                  <select style={inputStyle} value={tollForm.trip_id} onChange={e => setT("trip_id", e.target.value)}>
                    <option value="">No trip</option>
                    {trips.map(t => <option key={t.id} value={t.id}>{t.origin} → {t.destination}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Notes</label>
                  <input style={inputStyle} placeholder="Any notes..." value={tollForm.notes} onChange={e => setT("notes", e.target.value)} />
                </div>
              </div>
            )}

            {/* MISC form */}
            {expType === "misc" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Category <span style={{ color: "#e53935" }}>*</span></label>
                    <select style={inputStyle} value={miscForm.category} onChange={e => setM("category", e.target.value)}>
                      {MISC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Date <span style={{ color: "#e53935" }}>*</span></label>
                    <input type="date" style={inputStyle} value={miscForm.date} onChange={e => setM("date", e.target.value)} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Amount (₹) <span style={{ color: "#e53935" }}>*</span></label>
                    <input type="number" style={inputStyle} placeholder="0" value={miscForm.amount} onChange={e => setM("amount", e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Vehicle (optional)</label>
                    <select style={inputStyle} value={miscForm.vehicle_id} onChange={e => setM("vehicle_id", e.target.value)}>
                      <option value="">No vehicle</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Trip (optional)</label>
                  <select style={inputStyle} value={miscForm.trip_id} onChange={e => setM("trip_id", e.target.value)}>
                    <option value="">No trip</option>
                    {trips.map(t => <option key={t.id} value={t.id}>{t.origin} → {t.destination}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <input style={inputStyle} placeholder="What was this expense for?" value={miscForm.description} onChange={e => setM("description", e.target.value)} />
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{
                padding: "10px 20px", background: "#f0f0f8", border: "none",
                borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#555", cursor: "pointer",
              }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: "10px 24px", background: saving ? "#9ba4c4" : "#1E2D8E",
                color: "white", border: "none", borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
              }}>
                {saving ? "Saving…" : "Log Expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
