"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { getDrivers, createDriver, updateDriver, dlLookup, getDriverLedger, addDriverPayment, deleteDriverPayment } from "@/lib/api";
import { Plus, Users, X, Phone, Search, ChevronDown, ChevronRight, Edit2, Wallet, Trash2 } from "lucide-react";

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
  const [form, setForm]       = useState({ date: new Date().toISOString().slice(0, 10), type: "advance", amount: "", notes: "" });
  const [saving, setSaving]   = useState(false);

  const load = () => getDriverLedger(driver.id).then((r: any) => setLedger(r.data));
  useEffect(() => { load(); }, [driver.id]);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleAdd = async (e: any) => {
    e.preventDefault(); setSaving(true);
    try {
      await addDriverPayment({ driver_id: driver.id, ...form, amount: parseFloat(form.amount) });
      setShowAdd(false);
      setForm({ date: new Date().toISOString().slice(0, 10), type: "advance", amount: "", notes: "" });
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await deleteDriverPayment(id); load();
  };

  const pc = (type: string) => PAYMENT_COLORS[type] || PAYMENT_COLORS.advance;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 2px", fontSize: 16, fontWeight: 700 }}>{driver.name} — Payment Ledger</h2>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{driver.phone}</div>
        </div>

        {/* Balance summary */}
        {ledger && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
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
              <div style={{ minWidth: 70, fontSize: 11, color: "#888" }}>{new Date(p.date).toLocaleDateString("en-IN")}</div>
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
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
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
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [ledgerDriver, setLedgerDriver] = useState<any>(null);

  // DL fetch state
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "success" | "demo" | "error">("idle");
  const [fetchMsg, setFetchMsg] = useState("");

  const load = () => getDrivers().then(r => setDrivers(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFetchStatus("idle");
    setFetchMsg("");
    setError("");
    setShowForm(true);
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
    setFetchStatus("idle");
    setFetchMsg("");
    setError("");
    setShowForm(true);
  };

  const fetchFromParivahan = async () => {
    if (!form.license_number || !form.dob) return;
    setFetchStatus("loading");
    setFetchMsg("");
    try {
      const res = await dlLookup(form.license_number, form.dob);
      const { success, live, data, error: apiErr } = res.data;
      if (!success) {
        setFetchStatus("error");
        setFetchMsg(apiErr || "DL not found in Parivahan database");
        return;
      }
      // Map DL response → form fields
      const lc = (data.license_class || "").toUpperCase();
      const mappedClass = LICENSE_CLASSES.find(c => lc.includes(c)) || "HGMV";
      setForm(prev => ({
        ...prev,
        name:               data.name          || prev.name,
        father_name:        data.father_name   || prev.father_name,
        address:            data.address       || prev.address,
        dob:                data.dob           || prev.dob,
        blood_group:        data.blood_group   || prev.blood_group,
        license_class:      mappedClass,
        license_expiry:     data.license_expiry || prev.license_expiry,
        transport_validity: data.transport_validity || prev.transport_validity,
        issuing_rto:        data.issuing_rto   || prev.issuing_rto,
        badge_issue_date:   data.badge_issue_date || prev.badge_issue_date,
      }));
      setFetchStatus(live ? "success" : "demo");
      setFetchMsg(live
        ? "Details fetched from Parivahan (live data)"
        : "Preview data — will use live Parivahan data in production");
    } catch (err: any) {
      setFetchStatus("error");
      setFetchMsg(err.response?.data?.detail || err.message || "Fetch failed");
    }
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
      if (editingId) {
        await updateDriver(editingId, payload);
      } else {
        await createDriver(payload);
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail)
        ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
        : detail || "Something went wrong");
    } finally { setSaving(false); }
  };

  const canFetch = form.license_number.trim().length >= 6 && form.dob.length === 10;

  return (
    <div>
      <Header title="Drivers" subtitle={`${drivers.length} drivers in your fleet`} />
      <div style={{ padding: "24px 28px" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total Drivers", value: drivers.length },
            { label: "Available",     value: drivers.filter(d => d.status === "available").length },
            { label: "On Trip",       value: drivers.filter(d => d.status === "on_trip").length },
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
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>All Drivers</h2>
            <button className="btn-primary" onClick={openAdd}><Plus size={15} />Add Driver</button>
          </div>

          {loading ? (
            <p style={{ color: "#aaa", textAlign: "center", padding: "32px 0" }}>Loading...</p>
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
                Add your first driver
              </div>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 20, maxWidth: 320, margin: "0 auto 20px" }}>
                Add drivers to assign them to trips, track payment ledgers and monitor licence expiry dates.
              </div>
              <button className="btn-primary" onClick={openAdd}>
                <Plus size={14} /> Add Driver
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>License No.</th>
                  <th>Class</th>
                  <th>License Expiry</th>
                  <th>Transport Valid</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d: any) => (
                  <>
                    <tr key={d.id} style={{ cursor: "pointer" }} onClick={() => setExpandedRow(expandedRow === d.id ? null : d.id)}>
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
                      </td>
                    </tr>
                    {expandedRow === d.id && (
                      <tr key={`${d.id}-exp`}>
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
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: 500, position: "relative", maxHeight: "92vh", overflowY: "auto" }}>
            <button onClick={() => setShowForm(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}>
              <X size={18} />
            </button>
            <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>{editingId ? "Edit Driver" : "Add Driver"}</h2>
            <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "#888" }}>Enter the DL number and DOB, then fetch details from Parivahan automatically.</p>

            {error && (
              <div style={{ background: "#fce4ec", color: "#b71c1c", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 13 }}>{error}</div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* ── Parivahan fetch section ── */}
              <div style={{ background: "#f5f6ff", border: "1.5px solid #e0e3ff", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1E2D8E", marginBottom: 10 }}>
                  Fetch from Parivahan
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Driving Licence No. *</label>
                    <input
                      type="text" placeholder="MH1220210012345"
                      value={form.license_number}
                      onChange={e => { setForm(p => ({ ...p, license_number: e.target.value })); setFetchStatus("idle"); }}
                      style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Date of Birth *</label>
                    <input
                      type="date"
                      value={form.dob}
                      onChange={e => { setForm(p => ({ ...p, dob: e.target.value })); setFetchStatus("idle"); }}
                      style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                </div>
                <button type="button" onClick={fetchFromParivahan} disabled={!canFetch || fetchStatus === "loading"}
                  style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "8px 16px",
                    background: canFetch ? "#1E2D8E" : "#ccc", color: "#fff",
                    border: "none", borderRadius: 8, cursor: canFetch ? "pointer" : "not-allowed",
                    fontSize: 13, fontWeight: 600, transition: "background 0.2s",
                  }}>
                  <Search size={14} />
                  {fetchStatus === "loading" ? "Fetching..." : "Fetch from Parivahan"}
                </button>

                {/* Status feedback */}
                {fetchStatus === "success" && (
                  <div style={{ marginTop: 10, background: "#e8f5e9", color: "#2e7d32", padding: "7px 12px", borderRadius: 7, fontSize: 12.5, fontWeight: 500 }}>
                    ✓ {fetchMsg}
                  </div>
                )}
                {fetchStatus === "demo" && (
                  <div style={{ marginTop: 10, background: "#e8eaf6", color: "#3949ab", padding: "7px 12px", borderRadius: 7, fontSize: 12.5, fontWeight: 500 }}>
                    ✓ {fetchMsg}
                  </div>
                )}
                {fetchStatus === "error" && (
                  <div style={{ marginTop: 10, background: "#fce4ec", color: "#b71c1c", padding: "7px 12px", borderRadius: 7, fontSize: 12.5 }}>
                    ✗ {fetchMsg}
                  </div>
                )}
              </div>

              {/* ── Manual fields ── */}
              <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", marginTop: 4, letterSpacing: "0.5px" }}>DRIVER DETAILS</div>

              {[
                { label: "Full Name *",     key: "name",           placeholder: "Ramesh Kumar" },
                { label: "Phone *",         key: "phone",          placeholder: "9876543210" },
                { label: "Alternate Phone", key: "alternate_phone", placeholder: "Optional" },
                { label: "Father's Name",   key: "father_name",    placeholder: "Shiv Kumar" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{f.label}</label>
                  <input type="text" required={f.label.includes("*")}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
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
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>License Expiry (Non-Transport)</label>
                  <input type="date" value={form.license_expiry}
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
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Issuing RTO</label>
                  <input type="text" placeholder="MH01 - Mumbai Central" value={form.issuing_rto}
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
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Add Driver"}
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
