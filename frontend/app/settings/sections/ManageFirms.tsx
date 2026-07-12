"use client";
import { useState } from "react";
import { Plus, X, Building2, Edit2 } from "lucide-react";
import { firmService } from "@/lib/services/firmService";
import { useFirm } from "@/lib/FirmContext";
import type { Firm } from "@/lib/types";

const EMPTY_FORM = { name: "", gstin: "", address: "", pan: "" };

export default function ManageFirms() {
  const { firms, loading, refresh } = useFirm();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Firm | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(""); setShowForm(true); };
  const openEdit = (f: Firm) => {
    setEditing(f);
    setForm({ name: f.name, gstin: f.gstin || "", address: f.address || "", pan: f.pan || "" });
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError("Firm name is required."); return; }
    setSaving(true); setFormError("");
    const payload = {
      name: form.name.trim(),
      gstin: form.gstin.trim() || null,
      address: form.address.trim() || null,
      pan: form.pan.trim() || null,
    };
    const res = editing
      ? await firmService.update(editing.id, payload)
      : await firmService.create(payload);
    setSaving(false);
    if (res.success) {
      setShowForm(false);
      refresh();
    } else {
      setFormError(res.error || "Failed to save firm.");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 11px", border: "1.5px solid var(--border-input)",
    borderRadius: 8, fontSize: 13.5, background: "var(--bg-card)", color: "var(--text-main)",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5 };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>My Firms</h2>
        <button className="btn-primary" onClick={openAdd} style={{ fontSize: 13, padding: "7px 14px" }}>
          <Plus size={14} /> Add Firm
        </button>
      </div>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-muted)" }}>
        Run more than one legal entity under this login? Add each firm here, then switch between them from the firm selector in the top bar.
      </p>

      {loading ? (
        <p style={{ color: "var(--text-muted)", padding: "24px 0" }}>Loading...</p>
      ) : firms.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
          <Building2 size={40} color="var(--border-input)" style={{ margin: "0 auto 12px", display: "block" }} />
          <p style={{ margin: "0 0 14px", fontSize: 14 }}>No firms yet</p>
          <button className="btn-primary" onClick={openAdd}><Plus size={14} /> Add First Firm</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {firms.map(f => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 10, border: "1.5px solid var(--border-input)", background: "var(--bg-card)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Building2 size={18} color="#1E2D8E" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>{f.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {f.gstin && <span>GSTIN: {f.gstin}</span>}
                  {f.pan && <span>PAN: {f.pan}</span>}
                  {f.address && <span>{f.address}</span>}
                </div>
              </div>
              <button onClick={() => openEdit(f)} style={{ background: "var(--bg-subtle)", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "var(--text-muted)", flexShrink: 0 }}>
                <Edit2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 24px 60px rgba(0,0,0,0.25)", padding: "28px 28px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>{editing ? "Edit Firm" : "Add Firm"}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}><X size={20} /></button>
            </div>

            {formError && (
              <div style={{ padding: "10px 12px", borderRadius: 8, background: "#fce4ec", color: "#b71c1c", fontSize: 13, marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Firm Name <span style={{ color: "#e53935" }}>*</span></label>
                <input style={inputStyle} placeholder="Sharma Transports" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>GSTIN</label>
                  <input style={inputStyle} placeholder="22AAAAA0000A1Z5" value={form.gstin} onChange={e => setForm(p => ({ ...p, gstin: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <label style={labelStyle}>PAN</label>
                  <input style={inputStyle} placeholder="AAAAA0000A" value={form.pan} onChange={e => setForm(p => ({ ...p, pan: e.target.value.toUpperCase() }))} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Address</label>
                <input style={inputStyle} placeholder="Plot 12, MIDC, Pune" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Firm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
