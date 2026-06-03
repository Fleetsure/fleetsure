"use client";
import React, { useEffect, useState } from "react";
import Header from "@/components/Header";
import { driverService } from "@/lib/services/driverService";
import { fmtDate, daysUntil, todayISO } from "@/lib/date";
import { Plus, Users, X, Phone, ChevronDown, ChevronRight, Edit2, Wallet, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

// ── Driver Payment Ledger Modal ───────────────────────────────────────────────
const PAYMENT_TYPES = ["advance", "salary", "bonus", "deduction", "settlement"];
const PAYMENT_COLORS: Record<string, { color: string; bg: string; sign: string }> = {
  advance:    { color: "#e65100", bg: "#fff3e0", sign: "−" },
  salary:     { color: "#1565c0", bg: "#e3f2fd", sign: "−" },
  bonus:      { color: "#2e7d32", bg: "#e8f5e9", sign: "−" },
  deduction:  { color: "#b71c1c", bg: "#fce4ec", sign: "+" },
  settlement: { color: "#6a1b9a", bg: "#f3e5f5", sign: "−" },
};

function DriverLedgerModal({ driver, onClose }: { driver: any; onClose: () => void }) {
  const [ledger, setLedger]   = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ date: todayISO(), type: "advance", amount: "", notes: "" });
  const [saving, setSaving]   = useState(false);

  const load = () => driverService.getLedger(driver.id).then(r => setLedger(r.data || []));
  useEffect(() => { load(); }, [driver.id]);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleAdd = async (e: any) => {
    e.preventDefault(); setSaving(true);
    try {
      await driverService.addPayment({ driver_id: driver.id, ...form, amount: parseFloat(form.amount) });
      setShowAdd(false);
      setForm({ date: todayISO(), type: "advance", amount: "", notes: "" });
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await driverService.deletePayment(id); load();
  };

  const pc = (type: string) => PAYMENT_COLORS[type] || PAYMENT_COLORS.advance;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "12px" }}>
      <div className="card" style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 2px", fontSize: 16, fontWeight: 700 }}>{driver.name} — Payment Ledger</h2>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{driver.phone}</div>
        </div>

        {/* Balance summary */}
        {ledger && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
            {[
              { label: "Total Paid Out", value: `₹${ledger.total_paid.toLocaleString("en-IN")}`, color: "#1565c0" },
              { label: "Deductions", value: `₹${ledger.total_deducted.toLocaleString("en-IN")}`, color: "#b71c1c" },
              { label: ledger.net_balance >= 0 ? "Driver Owes" : "You Owe Driver", value: `₹${Math.abs(ledger.net_balance).toLocaleString("en-IN")}`, color: ledger.net_balance >= 0 ? "#e65100" : "#2e7d32" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center", padding: "12px 8px", borderRadius: 10, background: "#f8f9ff", border: "1px solid #e8eaf6" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Add entry */}
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} className="btn-primary" style={{ marginBottom: 16 }}>
            <Plus size={14} /> Add Entry
          </button>
        ) : (
          <form onSubmit={handleAdd} style={{ background: "#f8f9ff", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Date</label>
                <input type="date" value={form.date} onChange={e => set("date", e.target.value)} required
                  style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #e8e8f0", borderRadius: 7, fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Type</label>
                <select value={form.type} onChange={e => set("type", e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #e8e8f0", borderRadius: 7, fontSize: 13, boxSizing: "border-box" }}>
                  {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Amount (₹)</label>
              <input type="number" min="0" step="0.01" placeholder="5000" value={form.amount} onChange={e => set("amount", e.target.value)} required
                style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #e8e8f0", borderRadius: 7, fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Notes</label>
              <input type="text" placeholder="e.g. May salary, Trip advance..." value={form.notes} onChange={e => set("notes", e.target.value)}
                style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #e8e8f0", borderRadius: 7, fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>
                {saving ? "Saving..." : "Add Entry"}
              </button>
            </div>
          </form>
        )}

        {/* Ledger entries */}
        {ledger && ledger.payments.length === 0 && (
          <div style={{ textAlign: "center", color: "#aaa", fontSize: 13, padding: "20px 0" }}>No payment entries yet.</div>
        )}
        {ledger && ledger.payments.map((p: any) => {
          const c = pc(p.type);
          return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 9, background: c.bg, border: `1px solid ${c.color}22`, marginBottom: 6 }}>
              <div style={{ minWidth: 70, fontSize: 11, color: "#888" }}>{fmtDate(p.date)}</div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: c.color, color: "white" }}>{p.type}</span>
              <div style={{ flex: 1, fontSize: 12.5, color: "#333" }}>{p.notes || "—"}</div>
              <div style={{ fontWeight: 800, fontSize: 14, color: c.color }}>{c.sign}₹{parseFloat(p.amount).toLocaleString("en-IN")}</div>
              <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 2 }}><Trash2 size={12} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


const LICENSE_CLASSES = ["LMV", "HMV", "HGMV", "HPMV", "other"];

const EMPTY_FORM = {
  name: "", phone: "", alternate_phone: "", address: "",
  license_number: "", license_class: "HGMV", license_expiry: "",
  dob: "", blood_group: "", father_name: "",
  transport_validity: "", issuing_rto: "", badge_issue_date: "",
};

// ── Compliance badge ──────────────────────────────────────────────────────────
function expiryBadge(dateStr?: string | null) {
  if (!dateStr) return null;
  const days = daysUntil(dateStr) ?? 0;
  if (days < 0) return { label: "Expired", color: "#b71c1c", bg: "#fce4ec" };
  if (days <= 30) return { label: `${days}d left`, color: "#e65100", bg: "#fff3e0" };
  if (days <= 90) return { label: `${days}d left`, color: "#f57f17", bg: "#fffde7" };
  return { label: "Valid", color: "#2e7d32", bg: "#e8f5e9" };
}

function Badge({ dateStr }: { dateStr?: string | null }) {
  const b = expiryBadge(dateStr);
  if (!b) return <span style={{ color: "#bbb" }}>—</span>;
  return (
    <span style={{ background: b.bg, color: b.color, padding: "2px 8px", borderRadius: 10, fontSize: 11.5, fontWeight: 600 }}>
      {b.label}
    </span>
  );
}

export default function DriversPage() {
  const { t } = useLanguage();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [ledgerDriver, setLedgerDriver] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);


  const load = () => driverService.getAll().then(r => setDrivers(r.data || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setShowForm(true);
  };

  const handleDelete = async (d: any) => {
    if (!confirm(`Delete ${d.name}? This cannot be undone.`)) return;
    await driverService.delete(d.id);
    load();
  };

  const openEdit = (d: any) => {
    setEditingId(d.id);
    setForm({
      name: d.name || "", phone: d.phone || "", alternate_phone: d.alternate_phone || "",
      address: d.address || "", license_number: d.license_number || "",
      license_class: d.license_class || "HGMV", license_expiry: d.license_expiry || "",
      dob: d.dob || "", blood_group: d.blood_group || "", father_name: d.father_name || "",
      transport_validity: d.transport_validity || "", issuing_rto: d.issuing_rto || "",
      badge_issue_date: d.badge_issue_date || "",
    });
    setError("");
    setShowForm(true);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      license_expiry:     form.license_expiry     || null,
      dob:                form.dob                || null,
      transport_validity: form.transport_validity || null,
      badge_issue_date:   form.badge_issue_date   || null,
      alternate_phone:    form.alternate_phone    || null,
      blood_group:        form.blood_group        || null,
      father_name:        form.father_name        || null,
      issuing_rto:        form.issuing_rto        || null,
      address:            form.address            || null,
    };
    try {
      const result = editingId
        ? await driverService.update(editingId, payload)
        : await driverService.create(payload);
      if (!result.success) throw new Error(result.error || "Something went wrong");
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally { setSaving(false); }
  };

  return (
    <div>
      <Header title={t("nav.drivers")} subtitle={`${drivers.length} ${t("driver.subtitle")}`} />
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: isMobile ? 10 : 14, marginBottom: isMobile ? 16 : 24 }}>
          {[
            { label: t("driver.total"),     value: drivers.length },
            { label: t("driver.available"), value: drivers.filter(d => d.status === "active").length },
            { label: t("driver.on_trip"),   value: drivers.filter(d => d.status === "on_trip").length },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#1E2D8E" }}>{s.value}</div>
              <div style={{ fontSize: 12.5, color: "#888", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t("nav.drivers")}</h2>
            <button className="btn-primary" onClick={openAdd}><Plus size={15} />{isMobile ? t("common.add") : t("driver.add")}</button>
          </div>

          {loading ? (
            <p style={{ color: "#aaa", textAlign: "center", padding: "32px 0" }}>{t("common.loading")}</p>
          ) : drivers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "52px 20px" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "#eef0fb",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <Users size={32} color="#1E2D8E" style={{ opacity: 0.5 }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)", marginBottom: 6 }}>
                {t("driver.add")}
              </div>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 20, maxWidth: 320, margin: "0 auto 20px" }}>
                {t("driver.subtitle")}
              </div>
              <button className="btn-primary" onClick={openAdd}>
                <Plus size={14} /> {t("driver.add")}
              </button>
            </div>
          ) : isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {drivers.map((d: any) => (
                <div key={d.id} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)", marginBottom: 3 }}>{d.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
                        <Phone size={11} color="#aaa" />
                        <a href={`tel:${d.phone}`} style={{ color: "inherit", textDecoration: "none" }}>{d.phone}</a>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                      <span className={`badge badge-${d.status}`} style={{ fontSize: 10 }}>{d.status.replace("_", " ")}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {d.license_number ? <span>DL: {d.license_number}</span> : <span style={{ color: "#ccc" }}>No license</span>}
                      {d.license_expiry && <> · <Badge dateStr={d.license_expiry} /></>}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => openEdit(d)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1E2D8E", padding: 4 }}><Edit2 size={14} /></button>
                      <button onClick={() => setLedgerDriver(d)} style={{ background: "none", border: "none", cursor: "pointer", color: "#2e7d32", padding: 4 }} title="Ledger"><Wallet size={14} /></button>
                      <button onClick={() => handleDelete(d)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c62828", padding: 4 }} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>{t("driver.name")}</th>
                  <th>{t("driver.phone")}</th>
                  <th>{t("driver.license")}</th>
                  <th>Class</th>
                  <th>{t("driver.license_expiry")}</th>
                  <th>Transport Valid</th>
                  <th>{t("vehicle.status")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d: any) => (
                  <React.Fragment key={d.id}>
                    <tr style={{ cursor: "pointer" }} onClick={() => setExpandedRow(expandedRow === d.id ? null : d.id)}>
                      <td style={{ width: 28, color: "#aaa" }}>
                        {expandedRow === d.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                      <td style={{ fontWeight: 600 }}>{d.name}</td>
                      <td style={{ display: "flex", alignItems: "center", gap: 6 }}><Phone size={13} color="#aaa" />{d.phone}</td>
                      <td style={{ fontFamily: "monospace", fontSize: 12.5 }}>{d.license_number || "—"}</td>
                      <td>{d.license_class || "—"}</td>
                      <td><Badge dateStr={d.license_expiry} /></td>
                      <td><Badge dateStr={d.transport_validity} /></td>
                      <td><span className={`badge badge-${d.status}`}>{d.status.replace("_", " ")}</span></td>
                      <td style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <button onClick={e => { e.stopPropagation(); openEdit(d); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#1E2D8E", padding: 4 }}>
                          <Edit2 size={14} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setLedgerDriver(d); }}
                          title="Payment Ledger"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#2e7d32", padding: 4 }}>
                          <Wallet size={14} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(d); }}
                          title="Delete Driver"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#c62828", padding: 4 }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                    {expandedRow === d.id && (
                      <tr>
                        <td colSpan={9} style={{ background: "var(--bg-soft, #f9f9fb)", padding: "12px 20px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px 24px", fontSize: 12.5 }}>
                            {[
                              { label: "Date of Birth",   value: d.dob },
                              { label: "Blood Group",     value: d.blood_group },
                              { label: "Father's Name",   value: d.father_name },
                              { label: "Issuing RTO",     value: d.issuing_rto },
                              { label: "Badge Issued",    value: d.badge_issue_date },
                              { label: "Address",         value: d.address },
                              { label: "Alternate Phone", value: d.alternate_phone },
                            ].map(f => (
                              <div key={f.label}>
                                <div style={{ color: "#999", fontSize: 11, marginBottom: 2 }}>{f.label}</div>
                                <div style={{ color: f.value ? "var(--text-main, #333)" : "#ccc", fontWeight: f.value ? 500 : 400 }}>
                                  {f.value || "—"}
                                </div>
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

      {/* Add / Edit Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div className="card" style={{ width: "100%", maxWidth: 500, position: "relative", maxHeight: "92vh", overflowY: "auto" }}>
            <button onClick={() => setShowForm(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}>
              <X size={18} />
            </button>
            <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>{editingId ? t("driver.edit") : t("driver.add")}</h2>
            <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "#888" }}>{t("vehicle.fill_manually")}</p>

            {error && (
              <div style={{ background: "#fce4ec", color: "#b71c1c", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 13 }}>{error}</div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", letterSpacing: "0.5px" }}>DRIVER DETAILS</div>

              {[
                { label: "Full Name *",     key: "name",           placeholder: "Ramesh Kumar",  maxLength: undefined },
                { label: "Phone *",         key: "phone",          placeholder: "9876543210",    maxLength: 10 },
                { label: "Alternate Phone", key: "alternate_phone", placeholder: "Optional",     maxLength: 10 },
                { label: "Father's Name",   key: "father_name",    placeholder: "Shiv Kumar",   maxLength: undefined },
                { label: "License Number *", key: "license_number", placeholder: "KA0120220012345", maxLength: undefined },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{f.label}</label>
                  <input type="text" required={f.label.includes("*")}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    maxLength={f.maxLength}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }} />
                </div>
              ))}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Blood Group</label>
                  <input type="text" placeholder="O+" value={form.blood_group}
                    onChange={e => setForm(p => ({ ...p, blood_group: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>License Class</label>
                  <select value={form.license_class}
                    onChange={e => setForm(p => ({ ...p, license_class: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }}>
                    {LICENSE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>License Expiry (Non-Transport) *</label>
                  <input type="date" required value={form.license_expiry}
                    onChange={e => setForm(p => ({ ...p, license_expiry: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Transport Endorsement Valid Till</label>
                  <input type="date" value={form.transport_validity}
                    onChange={e => setForm(p => ({ ...p, transport_validity: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Badge Issue Date</label>
                  <input type="date" value={form.badge_issue_date}
                    onChange={e => setForm(p => ({ ...p, badge_issue_date: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Issuing RTO *</label>
                  <input type="text" required placeholder="MH01 - Mumbai Central" value={form.issuing_rto}
                    onChange={e => setForm(p => ({ ...p, issuing_rto: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Address</label>
                <textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="Driver's home address"
                  rows={2}
                  style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box", resize: "vertical" }} />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setShowForm(false)}>{t("common.cancel")}</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>
                  {saving ? t("common.loading") : editingId ? t("settings.save_changes") : t("driver.add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Driver Payment Ledger Modal */}
      {ledgerDriver && <DriverLedgerModal driver={ledgerDriver} onClose={() => setLedgerDriver(null)} />}
    </div>
  );
}
