"use client";
import React, { useEffect, useState } from "react";
import Header from "@/components/Header";
import { vehicleService } from "@/lib/services/vehicleService";
import { insightService } from "@/lib/services/insightService";
import { Plus, Truck, X, Search, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Wrench, Navigation, AlertTriangle } from "lucide-react";
import { parseLocalDate, fmtDate } from "@/lib/date";
import { useLanguage } from "@/lib/LanguageContext";
import { mergeMileage, saveMileage } from "@/lib/mileageStore";

// ── Types ─────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  registration_number: "", make: "", model: "", year: "",
  vehicle_type: "truck", fuel_type: "", chassis_number: "",
  engine_number: "", vehicle_class: "", owner_name: "", rto_code: "",
  color: "", insurance_expiry: "", fitness_expiry: "", puc_expiry: "", permit_expiry: "",
  status: "active", avg_mileage_kmpl: "",
};

const VEHICLE_TYPES = ["truck", "mini_truck", "trailer", "tanker", "container", "other"];
const FUEL_TYPES    = ["Diesel", "Petrol", "CNG", "Electric", "LNG", "Other"];

// ── Compliance badge helper ────────────────────────────────────────────────────

function complianceBadge(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const d = parseLocalDate(dateStr);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
  const { t } = useLanguage();
  const [vehicles, setVehicles]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editVehicle, setEditVehicle] = useState<any>(null);
  const [form, setForm]             = useState<any>({ ...EMPTY_FORM });
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [isMobile, setIsMobile]     = useState(false);
  const [cpkMap, setCpkMap]         = useState<Record<string, number>>({});  // vehicle_id → cost/km

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Expanded compliance row
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const load = () => vehicleService.getAll().then(r => setVehicles(mergeMileage(r.data || []))).finally(() => setLoading(false));
  useEffect(() => {
    load();
    // Pull cost-per-km from insights (non-blocking)
    insightService.getAll().then(res => {
      const map: Record<string, number> = {};
      (res.data || []).forEach((ins: any) => {
        if (ins.insight_type === "cost_per_km" && ins.vehicle_id && ins.meta?.cost_per_km) {
          map[ins.vehicle_id] = ins.meta.cost_per_km;
        }
      });
      setCpkMap(map);
    }).catch(() => {});
  }, []);

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
      avg_mileage_kmpl: v.avg_mileage_kmpl != null ? String(v.avg_mileage_kmpl) : "",
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
        insurance_expiry:  form.insurance_expiry  || null,
        fitness_expiry:    form.fitness_expiry    || null,
        puc_expiry:        form.puc_expiry        || null,
        permit_expiry:     form.permit_expiry     || null,
        avg_mileage_kmpl:  form.avg_mileage_kmpl  ? parseFloat(form.avg_mileage_kmpl) : null,
      };
      if (editVehicle) {
        await vehicleService.update(editVehicle.id, payload);
        saveMileage(editVehicle.id, payload.avg_mileage_kmpl ?? null);
      } else {
        const res = await vehicleService.create(payload);
        if (res.data?.id) saveMileage(res.data.id, payload.avg_mileage_kmpl ?? null);
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

  const statusLabel: any = { active: t("status.open"), inactive: "Inactive", in_trip: t("vehicle.on_trip"), maintenance: t("vehicle.in_maintenance") };

  // ── Stat cards ──────────────────────────────────────────────────────────────

  const expiringInsurance = vehicles.filter(v => {
    if (!v.insurance_expiry) return false;
    const d = parseLocalDate(v.insurance_expiry);
    if (!d) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Math.ceil((d.getTime() - today.getTime()) / 86400000);
    return days >= 0 && days <= 30;
  }).length;

  return (
    <div>
      <Header title={t("nav.vehicles")} subtitle={`${vehicles.length} ${t("vehicle.subtitle")}`} />
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)", gap: isMobile ? 10 : 14, marginBottom: isMobile ? 16 : 24 }}>
          {[
            { label: t("vehicle.total"),          value: vehicles.length,                                         icon: <Truck size={18} />,         color: "#1E2D8E", bg: "#eef0fb" },
            { label: t("driver.available"),       value: vehicles.filter(v => v.status === "active").length,       icon: <CheckCircle size={18} />,    color: "#2e7d32", bg: "#e8f5e9" },
            { label: t("vehicle.on_trip"),        value: vehicles.filter(v => v.status === "in_trip").length,      icon: <Navigation size={18} />,    color: "#0277bd", bg: "#e1f5fe" },
            { label: t("vehicle.in_maintenance"), value: vehicles.filter(v => v.status === "maintenance").length,  icon: <Wrench size={18} />,        color: "#6a1b9a", bg: "#f3e5f5" },
            { label: t("vehicle.insurance_due"),  value: expiringInsurance,                                        icon: <AlertTriangle size={18} />, color: expiringInsurance > 0 ? "#e65100" : "#888", bg: expiringInsurance > 0 ? "#fff3e0" : "#f5f5f5" },
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
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", marginBottom: 16, gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t("vehicle.your_fleet")}</h2>
            <div style={{ display: "flex", gap: 10, flex: isMobile ? undefined : 1, maxWidth: isMobile ? undefined : 380 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("vehicle.search")}
                  style={{ width: "100%", padding: "7px 10px 7px 32px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13, background: "var(--bg-subtle)", color: "var(--text-main)" }} />
              </div>
              <button className="btn-primary" onClick={openAdd}><Plus size={15} />{isMobile ? t("common.add") : t("vehicle.add")}</button>
            </div>
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
                {search ? t("form.no_data") : t("vehicle.add")}
              </div>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 20, maxWidth: 300, margin: "0 auto 20px" }}>
                {search
                  ? `${t("form.no_data")}: "${search}"`
                  : t("vehicle.fill_manually")}
              </div>
              {!search && (
                <button className="btn-primary" onClick={openAdd}>
                  <Plus size={14} /> {t("vehicle.add")}
                </button>
              )}
            </div>
          ) : isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((v: any) => (
                <div key={v.id} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1E2D8E" }}>
                        {v.registration_number}
                        {v.rto_code && <span style={{ fontSize: 10, color: "#aaa", marginLeft: 4 }}>({v.rto_code})</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {v.make} {v.model}{v.year ? ` · ${v.year}` : ""}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize", marginTop: 1 }}>
                        {[v.fuel_type, v.vehicle_type?.replace("_", " ")].filter(Boolean).join(" · ")}
                        {v.avg_mileage_kmpl != null && (
                          <span style={{ marginLeft: 6, padding: "1px 5px", borderRadius: 4, background: "#e8f5e9", color: "#2e7d32", fontWeight: 700, textTransform: "none" }}>
                            {v.avg_mileage_kmpl} km/l
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 10 }}>
                      <span className={`badge badge-${v.status}`} style={{ fontSize: 10 }}>{statusLabel[v.status]}</span>
                      <button onClick={() => openEdit(v)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#1E2D8E", padding: 4, minHeight: 44, minWidth: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 13 }}>{t("common.edit")}</span>
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                    {[
                      { label: "Insurance", val: v.insurance_expiry },
                      { label: "Fitness", val: v.fitness_expiry },
                      { label: "PUC", val: v.puc_expiry },
                    ].map(f => (
                      <div key={f.label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#aaa", marginBottom: 3 }}>{f.label}</div>
                        <ComplianceDot dateStr={f.val} />
                      </div>
                    ))}
                  </div>
                  {cpkMap[v.id] && (
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 5, background: cpkMap[v.id] >= 45 ? "#fce4ec" : cpkMap[v.id] >= 30 ? "#fff8e1" : "#e8f5e9", color: cpkMap[v.id] >= 45 ? "#b71c1c" : cpkMap[v.id] >= 30 ? "#e65100" : "#2e7d32" }}>
                        ₹{cpkMap[v.id]}/km
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t("vehicle.reg_number")}</th>
                  <th>{t("vehicle.make_model")}</th>
                  <th>{t("vehicle.fuel_type")} / {t("vehicle.type")}</th>
                  <th>{t("vehicle.insurance_expiry")}</th>
                  <th>{t("vehicle.fitness_expiry")}</th>
                  <th>{t("vehicle.puc_expiry")}</th>
                  <th>{t("vehicle.status")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v: any) => (
                  <React.Fragment key={v.id}>
                    <tr style={{ cursor: "pointer" }} onClick={() => setExpandedRow(expandedRow === v.id ? null : v.id)}>
                      <td style={{ fontWeight: 700, color: "#1E2D8E" }}>
                        {v.registration_number}
                        {v.rto_code && <span style={{ fontSize: 10, color: "#aaa", marginLeft: 4 }}>({v.rto_code})</span>}
                        {cpkMap[v.id] && (
                          <div style={{ marginTop: 3 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 5, background: cpkMap[v.id] >= 45 ? "#fce4ec" : cpkMap[v.id] >= 30 ? "#fff8e1" : "#e8f5e9", color: cpkMap[v.id] >= 45 ? "#b71c1c" : cpkMap[v.id] >= 30 ? "#e65100" : "#2e7d32" }}>
                              ₹{cpkMap[v.id]}/km
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{v.make} {v.model}</div>
                        {v.year && <div style={{ fontSize: 11, color: "#aaa" }}>{v.year}</div>}
                      </td>
                      <td>
                        <div>{v.fuel_type || <span style={{ color: "#ccc" }}>—</span>}</div>
                        <div style={{ fontSize: 11, color: "#aaa", textTransform: "capitalize" }}>
                          {v.vehicle_type?.replace("_", " ")}
                          {v.avg_mileage_kmpl != null && (
                            <span style={{ marginLeft: 6, padding: "1px 5px", borderRadius: 4, background: "#e8f5e9", color: "#2e7d32", fontWeight: 700, textTransform: "none" }}>
                              {v.avg_mileage_kmpl} km/l
                            </span>
                          )}
                        </div>
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
                          {t("common.edit")}
                        </button>
                        {expandedRow === v.id
                          ? <ChevronUp size={13} style={{ color: "#aaa", verticalAlign: "middle", marginLeft: 4 }} />
                          : <ChevronDown size={13} style={{ color: "#aaa", verticalAlign: "middle", marginLeft: 4 }} />}
                      </td>
                    </tr>
                    {expandedRow === v.id && (
                      <tr>
                        <td colSpan={8} style={{ background: "var(--bg-subtle)", padding: "12px 20px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                            {[
                              { icon: "🏷️",  label: t("vehicle.chassis"),          val: v.chassis_number },
                              { icon: "⚙️",  label: t("vehicle.engine"),           val: v.engine_number },
                              { icon: "👤",  label: t("vehicle.owner"),            val: v.owner_name },
                              { icon: "🎨",  label: t("vehicle.color"),            val: v.color },
                              { icon: "⛽",  label: "Avg Mileage",                 val: v.avg_mileage_kmpl != null ? `${v.avg_mileage_kmpl} km/l` : null },
                              { icon: "🛡️",  label: t("vehicle.insurance_expiry"), val: v.insurance_expiry ? fmtDate(v.insurance_expiry) : null },
                              { icon: "📋",  label: t("vehicle.fitness_expiry"),   val: v.fitness_expiry ? fmtDate(v.fitness_expiry) : null },
                              { icon: "💨",  label: t("vehicle.puc_expiry"),       val: v.puc_expiry ? fmtDate(v.puc_expiry) : null },
                              { icon: "📄",  label: t("vehicle.permit_expiry"),    val: v.permit_expiry ? fmtDate(v.permit_expiry) : null },
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
                  </React.Fragment>
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
              {editVehicle ? t("vehicle.edit") : t("vehicle.add")}
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 12.5, color: "var(--text-muted)" }}>
              {t("vehicle.fill_manually")}
            </p>

            {error && (
              <div style={{ background: "#fce4ec", color: "#b71c1c", padding: "8px 12px", borderRadius: 8, marginBottom: 14, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* ── Registration Number ── */}
              <div>
                <label style={labelStyle}>{t("vehicle.reg_number")} *</label>
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
                  {t("vehicle.basic_details")}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>{t("vehicle.make")} *</label>
                    <input required value={form.make} onChange={e => set("make", e.target.value)} placeholder="Tata, Ashok Leyland..." style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("vehicle.model")} *</label>
                    <input required value={form.model} onChange={e => set("model", e.target.value)} placeholder="LPT 2518, Ecomet..." style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("vehicle.year")}</label>
                    <input value={form.year} onChange={e => set("year", e.target.value)} placeholder="2021" type="number" min="1980" max="2030" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("vehicle.color")}</label>
                    <input value={form.color} onChange={e => set("color", e.target.value)} placeholder="White, Red..." style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("vehicle.type")} *</label>
                    <select value={form.vehicle_type} onChange={e => set("vehicle_type", e.target.value)} style={inputStyle}>
                      {VEHICLE_TYPES.map(vt => (
                        <option key={vt} value={vt}>{vt.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{t("vehicle.fuel_type")}</label>
                    <select value={form.fuel_type} onChange={e => set("fuel_type", e.target.value)} style={inputStyle}>
                      <option value="">{t("form.select_vehicle")}</option>
                      {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{t("vehicle.status")}</label>
                    <select value={form.status} onChange={e => set("status", e.target.value)} style={inputStyle}>
                      <option value="active">{t("driver.available")}</option>
                      <option value="in_trip">{t("vehicle.on_trip")}</option>
                      <option value="maintenance">{t("vehicle.in_maintenance")}</option>
                      <option value="inactive">{t("status.cancelled")}</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Avg Mileage (km/l)</label>
                    <input
                      type="number" step="0.1" min="0" max="30"
                      value={form.avg_mileage_kmpl}
                      onChange={e => set("avg_mileage_kmpl", e.target.value)}
                      placeholder="e.g. 3.5"
                      style={inputStyle}
                    />
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>Used to project fuel consumption per trip</div>
                  </div>
                </div>
              </div>

              {/* ── Section 3: Identification ── */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  {t("vehicle.identification")}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>{t("vehicle.chassis")}</label>
                    <input value={form.chassis_number} onChange={e => set("chassis_number", e.target.value.toUpperCase())} placeholder="MAT..." style={{ ...inputStyle, fontFamily: "monospace" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("vehicle.engine")}</label>
                    <input value={form.engine_number} onChange={e => set("engine_number", e.target.value.toUpperCase())} placeholder="Engine no." style={{ ...inputStyle, fontFamily: "monospace" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("vehicle.owner")}</label>
                    <input value={form.owner_name} onChange={e => set("owner_name", e.target.value)} placeholder="As per RC" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("vehicle.rto")}</label>
                    <input value={form.rto_code} onChange={e => set("rto_code", e.target.value.toUpperCase())} placeholder="MH12, DL01..." style={inputStyle} />
                  </div>
                </div>
              </div>

              {/* ── Section 4: Compliance Dates ── */}
              <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: 14, border: "1.5px solid var(--border)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#e65100", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  📋 {t("vehicle.compliance_dates")}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: t("vehicle.insurance_expiry"), key: "insurance_expiry" },
                    { label: t("vehicle.fitness_expiry"),   key: "fitness_expiry" },
                    { label: t("vehicle.puc_expiry"),       key: "puc_expiry" },
                    { label: t("vehicle.permit_expiry"),    key: "permit_expiry" },
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
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setShowForm(false)}>{t("common.cancel")}</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>
                  {saving ? t("common.loading") : editVehicle ? t("settings.save_changes") : t("vehicle.add")}
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
