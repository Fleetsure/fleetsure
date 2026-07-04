"use client";
import { useEffect, useState } from "react";
import { teamService } from "@/lib/services/teamService";
import { useTeamAuth } from "@/lib/teamAuth";
import { Plus, Pencil, Filter, X } from "lucide-react";
import { TRIP_STATUS_COLOR as STATUS_COLOR, TRIP_STATUS_BG as STATUS_BG } from "@/lib/constants/tripStatus";

const STATUSES = ["all", "planned", "in_progress", "completed", "cancelled"];

const EMPTY_FORM = {
  origin: "", destination: "", start_date: "", end_date: "",
  vehicle_id: "", driver_id: "", freight_amount: "", status: "planned", notes: "",
};

export default function ManagerTrips() {
  const { member } = useTeamAuth();
  const [trips, setTrips]         = useState<any[]>([]);
  const [vehicles, setVehicles]   = useState<any[]>([]);
  const [drivers, setDrivers]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatus] = useState("all");
  const [from, setFrom]           = useState("");
  const [to, setTo]               = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<any | null>(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setLoading(true);
    const filters: any = {};
    if (statusFilter !== "all") filters.status = statusFilter;
    if (from) filters.from = from;
    if (to)   filters.to   = to;
    const r = await teamService.getTrips(filters);
    setTrips(r.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter, from, to]);

  useEffect(() => {
    Promise.all([teamService.getVehicles(), teamService.getDrivers()]).then(([v, d]) => {
      setVehicles(v.data ?? []);
      setDrivers(d.data ?? []);
    });
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (trip: any) => {
    setEditing(trip);
    setForm({
      origin:         trip.origin        ?? "",
      destination:    trip.destination   ?? "",
      start_date:     trip.start_date    ?? "",
      end_date:       trip.end_date      ?? "",
      vehicle_id:     trip.vehicle_id    ?? "",
      driver_id:      trip.driver_id     ?? "",
      freight_amount: trip.freight_amount ?? "",
      status:         trip.status        ?? "planned",
      notes:          trip.notes         ?? "",
    });
    setFormError("");
    setShowModal(true);
  };

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.origin.trim() || !form.destination.trim() || !form.start_date || !form.vehicle_id) {
      setFormError("Vehicle, origin, destination and start date are required.");
      return;
    }
    setSaving(true); setFormError("");

    const payload = {
      origin:         form.origin.trim(),
      destination:    form.destination.trim(),
      start_date:     form.start_date,
      end_date:       form.end_date       || undefined,
      vehicle_id:     form.vehicle_id,
      driver_id:      form.driver_id      || undefined,
      driver_name:    drivers.find(d => d.id === form.driver_id)?.name ?? "",
      freight_amount: form.freight_amount ? Number(form.freight_amount) : undefined,
      status:         form.status as "planned" | "in_progress" | "completed" | "cancelled",
      notes:          form.notes.trim()   || undefined,
    };

    let result;
    if (editing) {
      result = await teamService.updateTrip(editing.id, payload);
    } else {
      result = await teamService.addTrip({ ...payload, owner_id: member!.owner_id });
    }

    setSaving(false);
    if (result.success) {
      setShowModal(false);
      load();
    } else {
      setFormError(result.error || "Failed to save trip.");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1.5px solid #e0e0ee",
    borderRadius: 8, fontSize: 13.5, background: "white", color: "#333",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 5,
  };

  return (
    <div style={{ padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 4 }}>Trips</div>
          <div style={{ fontSize: 13, color: "#888" }}>{trips.length} trip{trips.length !== 1 ? "s" : ""} found</div>
        </div>
        <button onClick={openAdd} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 18px", background: "#1E2D8E", color: "white",
          border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>
          <Plus size={16} /> Add Trip
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <Filter size={15} color="#888" />
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatus(s)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 600,
            cursor: "pointer", border: "none",
            background: statusFilter === s ? "#1E2D8E" : "#f0f0f8",
            color: statusFilter === s ? "white" : "#555",
          }}>
            {s === "all" ? "All" : s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ padding: "7px 10px", border: "1.5px solid #e0e0ee", borderRadius: 8, fontSize: 13, background: "white" }} />
          <span style={{ color: "#aaa", fontSize: 12 }}>to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ padding: "7px 10px", border: "1.5px solid #e0e0ee", borderRadius: 8, fontSize: 13, background: "white" }} />
          {(from || to) && (
            <button onClick={() => { setFrom(""); setTo(""); }}
              style={{ fontSize: 12, color: "#e53935", background: "none", border: "none", cursor: "pointer" }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#aaa", fontSize: 14 }}>Loading...</div>
        ) : trips.length === 0 ? (
          <div style={{ padding: "64px", textAlign: "center", color: "#aaa" }}>
            <div style={{ fontSize: 14, marginBottom: 16 }}>No trips found.</div>
            <button onClick={openAdd} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 18px", background: "#1E2D8E", color: "white",
              border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              <Plus size={14} /> Add First Trip
            </button>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f8ff" }}>
                {["Date", "Route", "Vehicle", "Driver", "Freight", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trips.map((t, i) => (
                <tr key={t.id} style={{ borderTop: i > 0 ? "1px solid #f0f0f8" : "none" }}>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#555" }}>
                    {t.start_date ? new Date(t.start_date).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
                    {t.origin} → {t.destination}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#555" }}>
                    {t.vehicles?.registration_number || "—"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#555" }}>
                    {t.drivers?.name || "—"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#2e7d32" }}>
                    {t.freight_amount ? `₹${Number(t.freight_amount).toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8,
                      background: STATUS_BG[t.status] || "#f5f5f5",
                      color: STATUS_COLOR[t.status] || "#555",
                      textTransform: "capitalize",
                    }}>
                      {t.status?.replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button onClick={() => openEdit(t)} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 12px", background: "#f0f0f8", border: "none",
                      borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#555", cursor: "pointer",
                    }}>
                      <Pencil size={12} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 1000, display: "flex", alignItems: "flex-start",
          justifyContent: "center", padding: "40px 16px", overflowY: "auto",
        }}>
          <div style={{
            background: "white", borderRadius: 16, width: "100%", maxWidth: 560,
            boxShadow: "0 24px 60px rgba(0,0,0,0.2)", padding: "28px",
          }}>
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>
                {editing ? "Edit Trip" : "Add New Trip"}
              </h3>
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

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Route */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Origin <span style={{ color: "#e53935" }}>*</span></label>
                  <input style={inputStyle} placeholder="Mumbai" value={form.origin} onChange={e => set("origin", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Destination <span style={{ color: "#e53935" }}>*</span></label>
                  <input style={inputStyle} placeholder="Delhi" value={form.destination} onChange={e => set("destination", e.target.value)} />
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Start Date <span style={{ color: "#e53935" }}>*</span></label>
                  <input type="date" style={inputStyle} value={form.start_date} onChange={e => set("start_date", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>End Date</label>
                  <input type="date" style={inputStyle} value={form.end_date} onChange={e => set("end_date", e.target.value)} />
                </div>
              </div>

              {/* Vehicle & Driver */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Vehicle</label>
                  <select style={inputStyle} value={form.vehicle_id} onChange={e => set("vehicle_id", e.target.value)}>
                    <option value="">Select vehicle</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.registration_number} {v.make ? `— ${v.make}` : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Driver</label>
                  <select style={inputStyle} value={form.driver_id} onChange={e => set("driver_id", e.target.value)}>
                    <option value="">Select driver</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Freight & Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Freight Amount (₹)</label>
                  <input type="number" style={inputStyle} placeholder="0" value={form.freight_amount} onChange={e => set("freight_amount", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={form.status} onChange={e => set("status", e.target.value)}>
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea
                  style={{ ...inputStyle, height: 80, resize: "vertical" }}
                  placeholder="Any additional notes..."
                  value={form.notes}
                  onChange={e => set("notes", e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{
                padding: "10px 20px", background: "#f0f0f8", border: "none",
                borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#555", cursor: "pointer",
              }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: "10px 24px", background: saving ? "#9ba4c4" : "#1E2D8E",
                color: "white", border: "none", borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
              }}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Trip"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
