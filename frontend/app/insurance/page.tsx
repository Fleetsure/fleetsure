"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { getVehicles, getPolicies, createPolicy, deletePolicy } from "@/lib/api";
import { ShieldCheck, Plus, X, AlertTriangle, CheckCircle, Clock, Trash2 } from "lucide-react";

const POLICY_TYPES = [
  { value: "insurance",  label: "Insurance" },
  { value: "fitness",    label: "Fitness Certificate" },
  { value: "permit",     label: "Permit" },
  { value: "puc",        label: "PUC / Pollution" },
  { value: "road_tax",   label: "Road Tax" },
  { value: "other",      label: "Other" },
];

const TYPE_COLOR: Record<string, string> = {
  insurance: "#1565c0", fitness: "#2e7d32", permit: "#6a1b9a",
  puc: "#e65100", road_tax: "#00695c", other: "#546e7a",
};

const EMPTY = {
  vehicle_id: "", policy_type: "insurance", policy_number: "",
  insurer: "", start_date: "", expiry_date: "", premium: "", notes: "",
};

function StatusBadge({ status, days }: { status: string; days: number }) {
  const cfg: Record<string, { bg: string; color: string; icon: any; text: string }> = {
    active:        { bg: "#e8f5e9", color: "#2e7d32", icon: CheckCircle, text: `${days}d left` },
    expiring_soon: { bg: "#fff3e0", color: "#e65100", icon: Clock,       text: `${days}d left` },
    expired:       { bg: "#fce4ec", color: "#b71c1c", icon: AlertTriangle, text: `Expired ${Math.abs(days)}d ago` },
  };
  const c = cfg[status] || cfg.active;
  const Icon = c.icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, background: c.bg, color: c.color, fontSize: 12, fontWeight: 700 }}>
      <Icon size={12} /> {c.text}
    </span>
  );
}

export default function InsurancePage() {
  const [policies, setPolicies]   = useState<any[]>([]);
  const [vehicles, setVehicles]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState<any>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [filterType, setFilterType] = useState("all");

  const load = () => {
    Promise.all([getPolicies(), getVehicles()])
      .then(([p, v]) => { setPolicies(p.data); setVehicles(v.data); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: any) => {
    e.preventDefault(); setSaving(true);
    try {
      await createPolicy({
        ...form,
        premium: form.premium ? parseFloat(form.premium) : null,
        start_date: form.start_date || null,
      });
      setShowForm(false); setForm(EMPTY); load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    await deletePolicy(id); load();
  };

  const visible = filterType === "all" ? policies : policies.filter(p => p.policy_type === filterType);

  const expired      = policies.filter(p => p.status === "expired").length;
  const expiringSoon = policies.filter(p => p.status === "expiring_soon").length;
  const active       = policies.filter(p => p.status === "active").length;

  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 };
  const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" };

  return (
    <div>
      <Header title="Insurance & Renewals" subtitle="Track insurance, permits, and fitness certificates" />
      <div style={{ padding: "24px 28px" }}>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total Policies", value: policies.length, color: "#1E2D8E", bg: "#e8eaf6" },
            { label: "Active",         value: active,          color: "#2e7d32", bg: "#e8f5e9" },
            { label: "Expiring ≤30d",  value: expiringSoon,    color: "#e65100", bg: "#fff3e0" },
            { label: "Expired",        value: expired,         color: "#b71c1c", bg: "#fce4ec" },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ textAlign: "center", borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{loading ? "—" : s.value}</div>
              <div style={{ fontSize: 12.5, color: "#888", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Expiry alerts banner */}
        {(expired > 0 || expiringSoon > 0) && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, background: "#fff3e0", border: "1px solid #ffcc80", marginBottom: 20 }}>
            <AlertTriangle size={18} color="#e65100" />
            <span style={{ fontSize: 13.5, color: "#bf360c" }}>
              {expired > 0 && <strong>{expired} policy{expired > 1 ? "ies" : ""} expired. </strong>}
              {expiringSoon > 0 && <strong>{expiringSoon} expiring within 30 days. </strong>}
              Renew immediately to stay compliant.
            </span>
          </div>
        )}

        <div className="card">
          {/* Toolbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["all", ...POLICY_TYPES.map(t => t.value)].map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  style={{
                    padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    border: filterType === t ? `1.5px solid ${TYPE_COLOR[t] || "#1E2D8E"}` : "1.5px solid #e8e8f0",
                    background: filterType === t ? (TYPE_COLOR[t] ? TYPE_COLOR[t] + "18" : "#e8eaf6") : "white",
                    color: filterType === t ? (TYPE_COLOR[t] || "#1E2D8E") : "#888",
                  }}>
                  {t === "all" ? "All" : POLICY_TYPES.find(p => p.value === t)?.label}
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={15} /> Add Record
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>Loading…</div>
          ) : visible.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <ShieldCheck size={42} color="#e0e0e0" style={{ margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: "#aaa", fontSize: 14, margin: "0 0 16px" }}>No records yet. Add your first policy.</p>
              <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Add Record</button>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f0f0f8" }}>
                  {["Vehicle", "Type", "Policy No.", "Insurer", "Expiry Date", "Premium", "Status", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "#aaa", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f5f5fa", background: p.status === "expired" ? "#fff8f8" : p.status === "expiring_soon" ? "#fffdf5" : "transparent" }}>
                    <td style={{ padding: "12px 10px", fontWeight: 700 }}>{p.reg_number || "—"}</td>
                    <td style={{ padding: "12px 10px" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: (TYPE_COLOR[p.policy_type] || "#888") + "18", color: TYPE_COLOR[p.policy_type] || "#888" }}>
                        {POLICY_TYPES.find(t => t.value === p.policy_type)?.label || p.policy_type}
                      </span>
                    </td>
                    <td style={{ padding: "12px 10px", color: "#555", fontFamily: "monospace", fontSize: 12.5 }}>{p.policy_number || "—"}</td>
                    <td style={{ padding: "12px 10px", color: "#555" }}>{p.insurer || "—"}</td>
                    <td style={{ padding: "12px 10px", fontWeight: 600 }}>{new Date(p.expiry_date).toLocaleDateString("en-IN")}</td>
                    <td style={{ padding: "12px 10px", color: "#555" }}>{p.premium ? `₹${Number(p.premium).toLocaleString("en-IN")}` : "—"}</td>
                    <td style={{ padding: "12px 10px" }}><StatusBadge status={p.status} days={p.days_left} /></td>
                    <td style={{ padding: "12px 10px" }}>
                      <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e53935", padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button onClick={() => setShowForm(false)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>
            <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Add Policy / Certificate</h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>Vehicle *</label>
                <select required value={form.vehicle_id} onChange={e => set("vehicle_id", e.target.value)} style={inp}>
                  <option value="">Select vehicle…</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.reg_number} — {v.make} {v.model}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Document Type *</label>
                <select required value={form.policy_type} onChange={e => set("policy_type", e.target.value)} style={inp}>
                  {POLICY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Policy / Certificate No.</label>
                  <input value={form.policy_number} onChange={e => set("policy_number", e.target.value)} placeholder="MH-123456" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Insurer / Authority</label>
                  <input value={form.insurer} onChange={e => set("insurer", e.target.value)} placeholder="HDFC Ergo, RTO…" style={inp} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Expiry Date *</label>
                  <input type="date" required value={form.expiry_date} onChange={e => set("expiry_date", e.target.value)} style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Premium / Fee (₹)</label>
                <input type="number" min="0" step="0.01" value={form.premium} onChange={e => set("premium", e.target.value)} placeholder="25000" style={inp} />
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any additional info…" style={inp} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>
                  {saving ? "Saving…" : "Add Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
