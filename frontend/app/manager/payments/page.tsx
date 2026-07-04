"use client";
import { useEffect, useState } from "react";
import { teamService } from "@/lib/services/teamService";
import { useTeamAuth } from "@/lib/teamAuth";
import { Wallet, Plus, X } from "lucide-react";
import { PAYMENT_TYPES, PAYMENT_TYPE_COLOR } from "@/lib/constants/paymentType";

const EMPTY_FORM = { driver_id: "", trip_id: "", date: "", type: "advance", amount: "", notes: "" };

export default function ManagerPayments() {
  const { member } = useTeamAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [drivers, setDrivers]   = useState<any[]>([]);
  const [trips, setTrips]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [driverFilter, setDriverFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState("");

  const load = () =>
    teamService.getDriverPayments().then(r => { setPayments(r.data ?? []); setLoading(false); });

  useEffect(() => {
    load();
    Promise.all([teamService.getDrivers(), teamService.getTrips()]).then(([d, t]) => {
      setDrivers(d.data ?? []);
      setTrips(t.data ?? []);
    });
  }, []);

  const filtered  = driverFilter ? payments.filter(p => p.driver_id === driverFilter) : payments;
  const total     = filtered.reduce((s, p) => {
    if (p.type === "deduction") return s - Number(p.amount || 0);
    return s + Number(p.amount || 0);
  }, 0);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.driver_id || !form.date || !form.amount) {
      setFormError("Driver, date and amount are required."); return;
    }
    setSaving(true); setFormError("");
    const result = await teamService.addDriverPayment({
      owner_id:  member!.owner_id,
      driver_id: form.driver_id,
      date:      form.date,
      type:      form.type as "advance" | "salary" | "deduction" | "bonus" | "settlement",
      amount:    Number(form.amount),
      notes:     form.notes.trim() || undefined,
      trip_id:   form.trip_id     || undefined,
    });
    setSaving(false);
    if (result.success) { setShowModal(false); load(); }
    else setFormError(result.error || "Failed to save payment.");
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
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 4 }}>Driver Payments</div>
          <div style={{ fontSize: 13, color: "#888" }}>
            {filtered.length} record{filtered.length !== 1 ? "s" : ""} · Net: ₹{total.toLocaleString("en-IN")}
          </div>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setFormError(""); setShowModal(true); }} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 18px", background: "#1E2D8E", color: "white",
          border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>
          <Plus size={16} /> Log Payment
        </button>
      </div>

      {/* Driver filter */}
      <div style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
        <select
          value={driverFilter}
          onChange={e => setDriverFilter(e.target.value)}
          style={{ padding: "9px 14px", border: "1.5px solid #e0e0ee", borderRadius: 10, fontSize: 13, background: "white", minWidth: 220 }}
        >
          <option value="">All Drivers</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {driverFilter && (
          <button onClick={() => setDriverFilter("")} style={{ fontSize: 12, color: "#e53935", background: "none", border: "none", cursor: "pointer" }}>
            Clear filter
          </button>
        )}
      </div>

      <div style={{ background: "white", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#aaa", fontSize: 14 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "64px", textAlign: "center", color: "#aaa" }}>
            <Wallet size={36} color="#e0e0ee" style={{ marginBottom: 12, display: "block", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, marginBottom: 16 }}>No payments logged yet.</div>
            <button onClick={() => { setForm(EMPTY_FORM); setFormError(""); setShowModal(true); }} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 18px", background: "#1E2D8E", color: "white",
              border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              <Plus size={14} /> Log First Payment
            </button>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f8ff" }}>
                {["Date", "Driver", "Type", "Trip", "Notes", "Amount"].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const color = PAYMENT_TYPE_COLOR[p.type] || "#555";
                return (
                  <tr key={p.id} style={{ borderTop: i > 0 ? "1px solid #f0f0f8" : "none" }}>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#555" }}>
                      {p.date ? new Date(p.date).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{p.drivers?.name || "—"}</div>
                      {p.drivers?.phone && <div style={{ fontSize: 11, color: "#888" }}>{p.drivers.phone}</div>}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: `${color}18`, color, textTransform: "capitalize" }}>
                        {p.type}
                      </span>
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#555" }}>
                      {p.trip_id ? (trips.find(t => t.id === p.trip_id) ? `${trips.find(t => t.id === p.trip_id).origin} → ${trips.find(t => t.id === p.trip_id).destination}` : "—") : "—"}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#555", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.notes || "—"}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700, color: p.type === "deduction" ? "#c62828" : "#2e7d32" }}>
                      {p.type === "deduction" ? "-" : ""}₹{Number(p.amount || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f8f8ff", borderTop: "2px solid #e0e0ee" }}>
                <td colSpan={5} style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#555", textAlign: "right" }}>Net Total</td>
                <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 800, color: total >= 0 ? "#2e7d32" : "#c62828" }}>
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
            background: "white", borderRadius: 16, width: "100%", maxWidth: 480,
            boxShadow: "0 24px 60px rgba(0,0,0,0.2)", padding: "28px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>Log Driver Payment</h3>
              <button onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 20 }}>
                {formError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Driver <span style={{ color: "#e53935" }}>*</span></label>
                <select style={inputStyle} value={form.driver_id} onChange={e => set("driver_id", e.target.value)}>
                  <option value="">Select driver</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Payment Type <span style={{ color: "#e53935" }}>*</span></label>
                  <select style={inputStyle} value={form.type} onChange={e => set("type", e.target.value)}>
                    {PAYMENT_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Date <span style={{ color: "#e53935" }}>*</span></label>
                  <input type="date" style={inputStyle} value={form.date} onChange={e => set("date", e.target.value)} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Amount (₹) <span style={{ color: "#e53935" }}>*</span></label>
                  <input type="number" style={inputStyle} placeholder="0" value={form.amount} onChange={e => set("amount", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Trip (optional)</label>
                  <select style={inputStyle} value={form.trip_id} onChange={e => set("trip_id", e.target.value)}>
                    <option value="">No trip</option>
                    {trips.map(t => <option key={t.id} value={t.id}>{t.origin} → {t.destination}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <input style={inputStyle} placeholder="Reason, reference, etc." value={form.notes} onChange={e => set("notes", e.target.value)} />
              </div>
            </div>

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
                {saving ? "Saving…" : "Log Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
