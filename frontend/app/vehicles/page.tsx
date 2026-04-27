"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { getVehicles, createVehicle, updateVehicle } from "@/lib/api";
import { Plus, Truck, X, AlertCircle, ChevronDown, ChevronUp, Wrench, Navigation, AlertTriangle } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  registration_number: "", make: "", model: "", year: "",
  vehicle_type: "truck", fuel_type: "", chassis_number: "",
  engine_number: "", vehicle_class: "", owner_name: "", rto_code: "",
  color: "", insurance_expiry: "", fitness_expiry: "", puc_expiry: "", permit_expiry: "",
  status: "active",
};

const VEHICLE_TYPES = ["truck", "mini_truck", "trailer", "tanker", "container", "other"];
const FUEL_TYPES    = ["Diesel", "Petrol", "CNG", "Electric", "LNG", "Other"];

// ── Compliance badge helper ────────────────────────────────────────────────────

function complianceBadge(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  const daysLeft = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { label: "Expired", color: "#b71c1c", bg: "#fce4ec" };
  } else if (daysLeft <= 30) {
    return { label: `${daysLeft}d left`, color: "#e65100", bg: "#fff3e0" };
  } else if (daysLeft <= 90) {
    return { label: `${daysLeft}d left`, color: "#f57f17", bg: "#fffde7" };
  }
  return { label: "OK", color: "#2e7d32", bg: "#e8f5e9" };
}

function ComplianceDot({ dateStr }: { dateStr?: string }) {
  const b = complianceBadge(dateStr);
  if (!b) return <span style={{ color: "#ccc", fontSize: 12 }}>—</span>;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: b.bg, color: b.color }}>
      {b.label}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
  const [vehicles, setVehicles]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editVehicle, setEditVehicle] = useState<any>(null);
  const [form, setForm]             = useState<any>({ ...EMPTY_FORM });
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");


  // Expanded compliance row
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const load = () => getVehicles().then(r => setVehicles(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ ...EMPTY_FORM });
    setEditVehicle(null);
    setError("");
    setShowForm(true);
  };

  const openEdit = (v: any) => {
    setForm({
      registration_number: v.registration_number || "",
      make: v.make || "", model: v.model || "",
      year: v.year ? String(v.year) : "", vehicle_type: v.vehicle_type || "truck",
      fuel_type: v.fuel_type || "", chassis_number: v.chassis_number || "",
      engine_number: v.engine_number || "", vehicle_class: v.vehicle_class || "",
      owner_name: v.owner_name || "", rto_code: v.rto_code || "", color: v.color || "",
      insurance_expiry: v.insurance_expiry || "", fitness_expiry: v.fitness_expiry || "",
      puc_expiry: v.puc_expiry || "", permit_expiry: v.permit_expiry || "",
      status: v.status || "active",
    });
    setEditVehicle(v);
    setError("");
    setShowForm(true);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        year: form.year ? parseInt(form.year) : null,
        insurance_expiry: form.insurance_expiry || null,
        fitness_expiry:   form.fitness_expiry   || null,
        puc_expiry:       form.puc_expiry       || null,
        permit_expiry:    form.permit_expiry     || null,
      };
      if (editVehicle) {
        await updateVehicle(editVehicle.id, payload);
      } else {
        await createVehicle(payload);
      }
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      setEditVehicle(null);
      load();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((e: any) => `${e.loc?.slice(-1)[0]}: ${e.msg}`).join(", ")
        : detail || err.message || "Something went wrong";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, val: string) => setForm((p: any) => ({ ...p, [key]: val }));

  const filtered = vehicles.filter(v =>
    !search || `${v.registration_number} ${v.make} ${v.model}`.toLowerCase().includes(search.toLowerCase())
  );

  const statusLabel: any = { active: "Active", inactive: "Inactive", in_trip: "On Trip", maintenance: "Maintenance" };

  // ── Stat cards ──────────────────────────────────────────────────────────────

  const expiringInsurance = vehicles.filter(v => {
    if (!v.insurance_expiry) return false;
    const d = Math.ceil((new Date(v.insurance_expiry).getTime() - Date.now()) / 86400000);
    return d >= 0 && d <= 30;
  }).length;

  return (
    <div>
      <Header title="Vehicles" subtitle={`${vehicles.length} vehicles in your fleet`} />
      <div style={{ padding: "24px 28px" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total Vehicles", value: vehicles.length,                                         icon: <Truck size={18} />,         color: "#1E2D8E", bg: "#eef0fb" },
            { label: "Active",         value: vehicles.filter(v => v.status === "active").length,       icon: <CheckCircle size={18} />,    color: "#2e7d32", bg: "#e8f5e9" },
            { label: "On Trip",        value: vehicles.filter(v => v.status === "in_trip").length,      icon: <Navigation size={18} />,    color: "#0277bd", bg: "#e1f5fe" },
            { label: "In Maintenance", value: vehicles.filter(v => v.status === "maintenance").length,  icon: <Wrench size={18} />,        color: "#6a1b9a", bg: "#f3e5f5" },
            { label: "Insurance Due",  value: expiringInsurance,                                        icon: <AlertTriangle size={18} />, color: expiringInsurance > 0 ? "#e65100" : "#888", bg: expiringInsurance > 0 ? "#fff3e0" : "#f5f5f5" },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ textAlign: "center" }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: s.bg, color: s.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 10px"
              }}>
                {s.icon}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Your Fleet</h2>
            <div style={{ display: "flex", gap: 10, flex: 1, maxWidth: 380 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vehicles..."
                  style={{ width: "100%", padding: "7px 10px 7px 32px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13, background: "var(--bg-subtle)", color: "var(--text-main)" }} />
              </div>
            </div>
            <button className="btn-primary" onClick={openAdd}><Plus size={15} />Add Vehicle</button>
          </div>

          {loading ? (
            <p style={{ color: "#aaa", textAlign: "center", padding: "32px 0" }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "52px 20px" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: search ? "#f5f5f5" : "#eef0fb",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <Truck size={32} color={search ? "#ccc" : "#1E2D8E"} style={{ opacity: search ? 1 : 0.5 }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)", marginBottom: 6 }}>
                {search ? "No vehicles found" : "Add your first vehicle"}
              </div>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 20, maxWidth: 300, margin: "0 auto 20px" }}>
                {search
                  ? `No vehicles match "${search}". Try a different registration number or name.`
                  : "Add your trucks, trailers, or tankers to start tracking trips, expenses and compliance."}
              </div>
              {!search && (
                <button className="btn-primary" onClick={openAdd}>
                  <Plus size={14} /> Add Vehicle
                </button>
              )}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Reg. Number</th>
                  <th>Make & Model</th>
                  <th>Fuel / Type</th>
                  <th>Insurance</th>
                  <th>Fitness Cert</th>
                  <th>PUC</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v: any) => (
                  <>
                    <tr key={v.id} style={{ cursor: "pointer" }} onClick={() => setExpandedRow(expandedRow === v.id ? null : v.id)}>
                      <td style={{ fontWeight: 700, color: "#1E2D8E" }}>
                        {v.registration_number}
                        {v.rto_code && <span style={{ fontSize: 10, color: "#aaa", marginLeft: 4 }}>({v.rto_code})</span>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{v.make} {v.model}</div>
                        {v.year && <div style={{ fontSize: 11, color: "#aaa" }}>{v.year}</div>}
                      </td>
                      <td>
                        <div>{v.fuel_type || <span style={{ color: "#ccc" }}>—</span>}</div>
                        <div style={{ fontSize: 11, color: "#aaa", textTransform: "capitalize" }}>{v.vehicle_type?.replace("_", " ")}</div>
                      </td>
                      <td><ComplianceDot dateStr={v.insurance_expiry} /></td>
                      <td><ComplianceDot dateStr={v.fitness_expiry} /></td>
                      <td><ComplianceDot dateStr={v.puc_expiry} /></td>
                      <td><span className={`badge badge-${v.status}`}>{statusLabel[v.status]}</span></td>
                      <td style={{ textAlign: "right" }}>
                        <button onClick={e => { e.stopPropagation(); openEdit(v); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 12, padding: "4px 8px", borderRadius: 6 }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#f0f0f8")}
                          onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                          Edit
                        </button>
                        {expandedRow === v.id
                          ? <ChevronUp size={13} style={{ color: "#aaa", verticalAlign: "middle", marginLeft: 4 }} />
                          : <ChevronDown size={13} style={{ color: "#aaa", verticalAlign: "middle", marginLeft: 4 }} />}
                      </td>
                    </tr>
                    {expandedRow === v.id && (
                      <tr key={`${v.id}-expanded`}>
                        <td colSpan={8} style={{ background: "var(--bg-subtle)", padding: "12px 20px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                            {[
                              { icon: "🏷️",  label: "Chassis No",     val: v.chassis_number },
                              { icon: "⚙️",  label: "Engine No",      val: v.engine_number },
                              { icon: "👤",  label: "Registered Owner", val: v.owner_name },
                              { icon: "🎨",  label: "Color",           val: v.color },
                              { icon: "🛡️",  label: "Insurance Expiry", val: v.insurance_expiry },
                              { icon: "📋",  label: "Fitness Expiry",  val: v.fitness_expiry },
                              { icon: "💨",  label: "PUC Expiry",      val: v.puc_expiry },
                              { icon: "📄",  label: "Permit Expiry",   val: v.permit_expiry },
                            ].map(f => (
                              <div key={f.label}>
                                <div style={{ fontSize: 10.5, color: "#aaa", fontWeight: 600, marginBottom: 2 }}>{f.icon} {f.label}</div>
                                <div style={{ fontSize: 13, color: "var(--text-main)", fontWeight: 500 }}>{f.val || "—"}</div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Add / Edit Vehicle Modal ───────────────────────────────────────────── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button onClick={() => setShowForm(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}>
              <X size={18} />
            </button>
            <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>
              {editVehicle ? "Edit Vehicle" : "Add Vehicle"}
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 12.5, color: "var(--text-muted)" }}>
              Fill in the vehicle details manually.
            </p>

            {error && (
              <div style={{ background: "#fce4ec", color: "#b71c1c", padding: "8px 12px", borderRadius: 8, marginBottom: 14, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* ── Registration Number ── */}
              <div>
                <label style={labelStyle}>Registration Number *</label>
                <input
                  required
                  value={form.registration_number}
                  onChange={e => set("registration_number", e.target.value.toUpperCase().replace(/\s/g, ""))}
                  placeholder="MH12AB1234"
                  style={{ ...inputStyle, fontFamily: "monospace", fontSize: 15, fontWeight: 700, letterSpacing: 1 }}
                />
              </div>

              {/* ── Section 2: Basic Details ── */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  Basic Details
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Make (Brand) *</label>
                    <input required value={form.make} onChange={e => set("make", e.target.value)} placeholder="Tata, Ashok Leyland..." style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Model *</label>
                    <input required value={form.model} onChange={e => set("model", e.target.value)} placeholder="LPT 2518, Ecomet..." style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Year</label>
                    <input value={form.year} onChange={e => set("year", e.target.value)} placeholder="2021" type="number" min="1980" max="2030" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Color</label>
                    <input value={form.color} onChange={e => set("color", e.target.value)} placeholder="White, Red..." style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Vehicle Type *</label>
                    <select value={form.vehicle_type} onChange={e => set("vehicle_type", e.target.value)} style={inputStyle}>
                      {VEHICLE_TYPES.map(t => (
                        <option key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Fuel Type</label>
                    <select value={form.fuel_type} onChange={e => set("fuel_type", e.target.value)} style={inputStyle}>
                      <option value="">Select fuel type</option>
                      {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Status</label>
                    <select value={form.status} onChange={e => set("status", e.target.value)} style={inputStyle}>
                      <option value="active">Active</option>
                      <option value="in_trip">On Trip</option>
                      <option value="maintenance">In Maintenance</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Section 3: Identification ── */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  Identification
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Chassis Number</label>
                    <input value={form.chassis_number} onChange={e => set("chassis_number", e.target.value.toUpperCase())} placeholder="MAT..." style={{ ...inputStyle, fontFamily: "monospace" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Engine Number</label>
                    <input value={form.engine_number} onChange={e => set("engine_number", e.target.value.toUpperCase())} placeholder="Engine no." style={{ ...inputStyle, fontFamily: "monospace" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Registered Owner</label>
                    <input value={form.owner_name} onChange={e => set("owner_name", e.target.value)} placeholder="As per RC" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>RTO Code</label>
                    <input value={form.rto_code} onChange={e => set("rto_code", e.target.value.toUpperCase())} placeholder="MH12, DL01..." style={inputStyle} />
                  </div>
                </div>
              </div>

              {/* ── Section 4: Compliance Dates ── */}
              <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: 14, border: "1.5px solid var(--border)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#e65100", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  📋 Compliance Dates
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Insurance Expiry", key: "insurance_expiry" },
                    { label: "Fitness Certificate Expiry", key: "fitness_expiry" },
                    { label: "PUC Expiry", key: "puc_expiry" },
                    { label: "Permit Expiry", key: "permit_expiry" },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={labelStyle}>{f.label}</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="date"
                          value={form[f.key]}
                          onChange={e => set(f.key, e.target.value)}
                          style={inputStyle}
                        />
                        {form[f.key] && (() => {
                          const b = complianceBadge(form[f.key]);
                          return b ? (
                            <span style={{
                              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                              fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 5,
                              background: b.bg, color: b.color, pointerEvents: "none"
                            }}>{b.label}</span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>
                  {saving ? "Saving..." : editVehicle ? "Save Changes" : "Add Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Style constants ────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1.5px solid var(--border-input)",
  borderRadius: 8, fontSize: 13.5, background: "var(--bg-card)", color: "var(--text-main)",
  boxSizing: "border-box",
};
