"use client";
import { useEffect, useState } from "react";
import { teamService } from "@/lib/services/teamService";
import { useTeamAuth } from "@/lib/teamAuth";
import { Users, Phone, Plus, Pencil, X } from "lucide-react";

const EMPTY_FORM = {
  name: "", phone: "", license_number: "", license_class: "",
  address: "", blood_group: "", dob: "", license_expiry: "",
};

export default function ManagerDrivers() {
  const { member } = useTeamAuth();
  const [drivers, setDrivers]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<any | null>(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState("");

  const load = () =>
    teamService.getDrivers().then(r => { setDrivers(r.data ?? []); setLoading(false); });

  useEffect(() => { load(); }, []);

  const filtered = drivers.filter(d => {
    const q = search.toLowerCase();
    return !q || `${d.name} ${d.phone || ""} ${d.license_number || ""}`.toLowerCase().includes(q);
  });

  const openAdd = () => {
    setEditing(null); setForm(EMPTY_FORM); setFormError(""); setShowModal(true);
  };
  const openEdit = (d: any) => {
    setEditing(d);
    setForm({
      name:           d.name          ?? "",
      phone:          d.phone         ?? "",
      license_number: d.license_number ?? "",
      license_class:  d.license_class  ?? "",
      address:        d.address        ?? "",
      blood_group:    d.blood_group    ?? "",
      dob:            d.dob            ?? "",
      license_expiry: d.license_expiry ?? "",
    });
    setFormError(""); setShowModal(true);
  };

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError("Driver name is required."); return; }
    setSaving(true); setFormError("");
    const payload = {
      name:           form.name.trim(),
      phone:          form.phone.trim()          || undefined,
      license_number: form.license_number.trim() || undefined,
      license_class:  form.license_class.trim()  || undefined,
      address:        form.address.trim()         || undefined,
      blood_group:    form.blood_group.trim()     || undefined,
      dob:            form.dob                   || undefined,
      license_expiry: form.license_expiry         || undefined,
    };
    let result;
    if (editing) {
      result = await teamService.updateDriver(editing.id, payload);
    } else {
      result = await teamService.addDriver({ ...payload, owner_id: member!.owner_id });
    }
    setSaving(false);
    if (result.success) { setShowModal(false); load(); }
    else setFormError(result.error || "Failed to save driver.");
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
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 4 }}>Drivers</div>
          <div style={{ fontSize: 13, color: "#888" }}>{drivers.length} driver{drivers.length !== 1 ? "s" : ""} in fleet</div>
        </div>
        <button onClick={openAdd} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 18px", background: "#1E2D8E", color: "white",
          border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>
          <Plus size={16} /> Add Driver
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone or license..."
          style={{ padding: "9px 14px", border: "1.5px solid #e0e0ee", borderRadius: 10, fontSize: 13, width: 320, background: "white" }}
        />
      </div>

      <div style={{ background: "white", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#aaa", fontSize: 14 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "64px", textAlign: "center", color: "#aaa" }}>
            <Users size={40} color="#e0e0ee" style={{ marginBottom: 12, display: "block", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, marginBottom: 16 }}>{drivers.length === 0 ? "No drivers in fleet." : "No drivers match your search."}</div>
            {drivers.length === 0 && (
              <button onClick={openAdd} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 18px", background: "#1E2D8E", color: "white",
                border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                <Plus size={14} /> Add First Driver
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f8ff" }}>
                {["Driver", "Phone", "License", "Class", "Blood Group", "License Expiry", ""].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={d.id} style={{ borderTop: i > 0 ? "1px solid #f0f0f8" : "none" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%", background: "#e8eaf6",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 700, color: "#1E2D8E", flexShrink: 0,
                      }}>
                        {d.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{d.name}</div>
                        {d.address && <div style={{ fontSize: 11, color: "#888" }}>{d.address}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#555" }}>
                    {d.phone ? (
                      <a href={`tel:${d.phone}`} style={{ color: "#1565c0", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                        <Phone size={12} /> {d.phone}
                      </a>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#555", fontFamily: "monospace" }}>
                    {d.license_number || "—"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#555" }}>{d.license_class || "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#555" }}>{d.blood_group || "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: d.license_expiry && new Date(d.license_expiry) < new Date() ? "#c62828" : "#555" }}>
                    {d.license_expiry ? new Date(d.license_expiry).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button onClick={() => openEdit(d)} style={{
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>
                {editing ? "Edit Driver" : "Add New Driver"}
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
                <label style={labelStyle}>Full Name <span style={{ color: "#e53935" }}>*</span></label>
                <input style={inputStyle} placeholder="Ramesh Kumar" value={form.name} onChange={e => set("name", e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input style={inputStyle} placeholder="+91 98765 43210" value={form.phone} onChange={e => set("phone", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Blood Group</label>
                  <select style={inputStyle} value={form.blood_group} onChange={e => set("blood_group", e.target.value)}>
                    <option value="">Select</option>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>License Number</label>
                  <input style={inputStyle} placeholder="MH1220XXXXXXX" value={form.license_number} onChange={e => set("license_number", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>License Class</label>
                  <select style={inputStyle} value={form.license_class} onChange={e => set("license_class", e.target.value)}>
                    <option value="">Select</option>
                    {["LMV", "MCWG", "HMV", "HPMV", "HTV", "MGV", "PSV", "Transport"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Date of Birth</label>
                  <input type="date" style={inputStyle} value={form.dob} onChange={e => set("dob", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>License Expiry</label>
                  <input type="date" style={inputStyle} value={form.license_expiry} onChange={e => set("license_expiry", e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Address</label>
                <input style={inputStyle} placeholder="City, State" value={form.address} onChange={e => set("address", e.target.value)} />
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
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Driver"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
