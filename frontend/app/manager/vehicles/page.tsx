"use client";
import { useEffect, useState } from "react";
import { teamService } from "@/lib/services/teamService";
import { useTeamAuth } from "@/lib/teamAuth";
import { Truck, Plus, Pencil, X } from "lucide-react";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:      { bg: "#e8f5e9", color: "#2e7d32" },
  maintenance: { bg: "#fff3e0", color: "#e65100" },
  inactive:    { bg: "#f5f5f5", color: "#888"    },
};
const FUEL_TYPES  = ["Diesel", "Petrol", "CNG", "Electric", "LNG"];
const VEH_TYPES   = ["Truck", "Trailer", "Tanker", "Container", "LCV", "HCV", "Bus", "Other"];
const STATUSES    = ["active", "maintenance", "inactive"];

const EMPTY_FORM = {
  registration_number: "", make: "", model: "", year: "",
  fuel_type: "", vehicle_type: "", status: "active",
};

export default function ManagerVehicles() {
  const { member } = useTeamAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<any | null>(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState("");

  const load = () =>
    teamService.getVehicles().then(r => { setVehicles(r.data ?? []); setLoading(false); });

  useEffect(() => { load(); }, []);

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase();
    return !q || `${v.registration_number} ${v.make || ""} ${v.model || ""}`.toLowerCase().includes(q);
  });

  const openAdd = () => {
    setEditing(null); setForm(EMPTY_FORM); setFormError(""); setShowModal(true);
  };
  const openEdit = (v: any) => {
    setEditing(v);
    setForm({
      registration_number: v.registration_number ?? "",
      make:         v.make         ?? "",
      model:        v.model        ?? "",
      year:         v.year         ? String(v.year) : "",
      fuel_type:    v.fuel_type    ?? "",
      vehicle_type: v.vehicle_type ?? "",
      status:       v.status       ?? "active",
    });
    setFormError(""); setShowModal(true);
  };

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.registration_number.trim() || !form.make.trim() || !form.model.trim()) {
      setFormError("Registration number, make and model are required."); return;
    }
    setSaving(true); setFormError("");
    const payload = {
      registration_number: form.registration_number.trim().toUpperCase(),
      make:         form.make.trim(),
      model:        form.model.trim(),
      year:         form.year ? Number(form.year) : undefined,
      fuel_type:    form.fuel_type           || undefined,
      vehicle_type: (form.vehicle_type || undefined) as "truck" | "mini_truck" | "trailer" | "tanker" | "container" | "other" | undefined,
      status:       form.status as "active" | "inactive" | "in_trip" | "maintenance",
    };
    let result;
    if (editing) {
      result = await teamService.updateVehicle(editing.id, payload);
    } else {
      result = await teamService.addVehicle({ ...payload, owner_id: member!.owner_id });
    }
    setSaving(false);
    if (result.success) { setShowModal(false); load(); }
    else setFormError(result.error || "Failed to save vehicle.");
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
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 4 }}>Vehicles</div>
          <div style={{ fontSize: 13, color: "#888" }}>{vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} in fleet</div>
        </div>
        <button onClick={openAdd} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 18px", background: "#1E2D8E", color: "white",
          border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by registration or model..."
          style={{ padding: "9px 14px", border: "1.5px solid #e0e0ee", borderRadius: 10, fontSize: 13, width: 320, background: "white" }}
        />
      </div>

      <div style={{ background: "white", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#aaa", fontSize: 14 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "64px", textAlign: "center", color: "#aaa" }}>
            <Truck size={40} color="#e0e0ee" style={{ marginBottom: 12, display: "block", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, marginBottom: 16 }}>{vehicles.length === 0 ? "No vehicles in fleet." : "No vehicles match your search."}</div>
            {vehicles.length === 0 && (
              <button onClick={openAdd} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 18px", background: "#1E2D8E", color: "white",
                border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                <Plus size={14} /> Add First Vehicle
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f8ff" }}>
                {["Registration", "Make / Model", "Type", "Year", "Fuel", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => {
                const st = STATUS_STYLE[v.status] || STATUS_STYLE.active;
                return (
                  <tr key={v.id} style={{ borderTop: i > 0 ? "1px solid #f0f0f8" : "none" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Truck size={15} color="#1E2D8E" />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", fontFamily: "monospace" }}>
                          {v.registration_number}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#555" }}>
                      {[v.make, v.model].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#555" }}>{v.vehicle_type || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#555" }}>{v.year || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#555" }}>{v.fuel_type || "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, ...st, textTransform: "capitalize" }}>
                        {v.status || "Active"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button onClick={() => openEdit(v)} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", background: "#f0f0f8", border: "none",
                        borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#555", cursor: "pointer",
                      }}>
                        <Pencil size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>
                {editing ? "Edit Vehicle" : "Add New Vehicle"}
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

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Registration Number <span style={{ color: "#e53935" }}>*</span></label>
                <input style={inputStyle} placeholder="MH04AB1234"
                  value={form.registration_number} onChange={e => set("registration_number", e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Make (Brand)</label>
                  <input style={inputStyle} placeholder="Tata, Ashok Leyland..." value={form.make} onChange={e => set("make", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Model</label>
                  <input style={inputStyle} placeholder="407, 1109..." value={form.model} onChange={e => set("model", e.target.value)} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Vehicle Type</label>
                  <select style={inputStyle} value={form.vehicle_type} onChange={e => set("vehicle_type", e.target.value)}>
                    <option value="">Select type</option>
                    {VEH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Year</label>
                  <input type="number" style={inputStyle} placeholder="2022" min="1990" max="2030"
                    value={form.year} onChange={e => set("year", e.target.value)} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Fuel Type</label>
                  <select style={inputStyle} value={form.fuel_type} onChange={e => set("fuel_type", e.target.value)}>
                    <option value="">Select fuel</option>
                    {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={form.status} onChange={e => set("status", e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
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
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Vehicle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
