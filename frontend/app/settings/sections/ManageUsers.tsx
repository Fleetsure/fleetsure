"use client";
import { useState, useEffect } from "react";
import { Plus, X, Trash2, Search, Users } from "lucide-react";
import { teamService } from "@/lib/services/teamService";
import type { TeamMember } from "@/lib/services/teamService";

// ─── Manage Users ────────────────────────────────────────────────────────────
const ROLES = [
  { key: "owner",      label: "Fleet Owner",    color: "#1E2D8E", bg: "#e8eaf6", desc: "Full access to everything" },
  { key: "manager",    label: "Fleet Manager",  color: "#2e7d32", bg: "#e8f5e9", desc: "Manage trips, vehicles, expenses" },
  { key: "accountant", label: "Accountant",     color: "#e65100", bg: "#fff3e0", desc: "View reports and export data only" },
  { key: "driver",     label: "Driver",         color: "#1E2D8E", bg: "#EEF0FB", desc: "Log trips, expenses & issues via /driver" },
];

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find(x => x.key === role) || ROLES[1];
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: r.bg, color: r.color }}>{r.label}</span>;
}


export default function ManageUsers() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "manager" as "manager" | "accountant", job_title: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    teamService.getMembers().then(r => {
      if (r.success && r.data) setMembers(r.data);
      setLoading(false);
    });
  }, []);

  const resetForm = () => setForm({ name: "", email: "", role: "manager", job_title: "", phone: "" });

  const handleAdd = async () => {
    if (!form.name.trim() || !form.email.trim()) { setFormError("Name and email are required."); return; }
    setSaving(true); setFormError("");
    const r = await teamService.addMember({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      job_title: form.job_title.trim() || null,
      phone: form.phone.trim() || null,
    });
    setSaving(false);
    if (r.success && r.data) {
      setMembers(prev => [...prev, r.data!]);
      setShowForm(false);
      resetForm();
    } else {
      setFormError(r.error || "Failed to add member. Check if email already exists.");
    }
  };

  const handleRemove = async (id: string) => {
    await teamService.removeMember(id);
    setMembers(prev => prev.filter(m => m.id !== id));
    setDeleteConfirm(null);
  };

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    return !q || `${m.name} ${m.email} ${m.phone || ""}`.toLowerCase().includes(q);
  });

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 11px", border: "1.5px solid var(--border-input)",
    borderRadius: 8, fontSize: 13.5, background: "var(--bg-card)", color: "var(--text-main)",
    boxSizing: "border-box"
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5 };

  const TEAM_ROLES = [
    { key: "manager" as const,    label: "Fleet Manager",  color: "#2e7d32", bg: "#e8f5e9", desc: "Manage trips, vehicles, expenses" },
    { key: "accountant" as const, label: "Accountant",     color: "#e65100", bg: "#fff3e0", desc: "View reports and export data only" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Manage Team</h2>
        <button className="btn-primary" onClick={() => { resetForm(); setFormError(""); setShowForm(true); }} style={{ fontSize: 13, padding: "7px 14px" }}>
          <Plus size={14} /> Add Member
        </button>
      </div>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-muted)" }}>
        Add managers and accountants who can access your fleet data.
      </p>

      {/* How it works */}
      <div style={{ display: "flex", gap: 10, padding: "11px 14px", borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border-input)", marginBottom: 20 }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>💡</span>
        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
          Add team members here, then share <strong style={{ color: "var(--text-main)" }}>fleetsure.in/manager</strong> or <strong style={{ color: "var(--text-main)" }}>fleetsure.in/accountant</strong> with them.
          They sign in with the same email using Google or email/password.
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search team members..."
          style={{ ...inputStyle, paddingLeft: 30 }} />
      </div>

      {/* Members list */}
      {loading ? (
        <p style={{ color: "var(--text-muted)", padding: "24px 0" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
          <Users size={40} color="var(--border-input)" style={{ margin: "0 auto 12px", display: "block" }} />
          <p style={{ margin: "0 0 14px", fontSize: 14 }}>{members.length === 0 ? "No team members yet" : "No members match your search"}</p>
          {members.length === 0 && (
            <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus size={14} /> Add First Member
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 10, border: "1.5px solid var(--border-input)", background: "var(--bg-card)" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#1E2D8E", flexShrink: 0 }}>
                {m.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>{m.name}</span>
                  <RoleBadge role={m.role} />
                  {m.firebase_uid && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, background: "#e8f5e9", color: "#2e7d32" }}>Linked</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {m.email && <span>✉️ {m.email}</span>}
                  {m.phone && <span>📱 {m.phone}</span>}
                  {m.job_title && <span>💼 {m.job_title}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {deleteConfirm === m.id ? (
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#e53935" }}>Remove?</span>
                    <button onClick={() => handleRemove(m.id)} style={{ background: "#fce4ec", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#e53935", fontSize: 11, fontWeight: 600 }}>Yes</button>
                    <button onClick={() => setDeleteConfirm(null)} style={{ background: "var(--bg-subtle)", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11 }}>No</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(m.id)} style={{ background: "var(--bg-subtle)", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "var(--text-muted)" }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Roles legend */}
      <div style={{ marginTop: 28, padding: "16px", borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border-input)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Access Levels</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ROLES.map(r => (
            <div key={r.key} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <RoleBadge role={r.key} />
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{r.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Add Member Modal ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 24px 60px rgba(0,0,0,0.25)", padding: "28px 28px 24px" }}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>Add Team Member</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}><X size={20} /></button>
            </div>

            {formError && (
              <div style={{ padding: "10px 12px", borderRadius: 8, background: "#fce4ec", color: "#b71c1c", fontSize: 13, marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Full Name <span style={{ color: "#e53935" }}>*</span></label>
                <input style={inputStyle} placeholder="Ramesh Sharma" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Email Address <span style={{ color: "#e53935" }}>*</span></label>
                <input style={inputStyle} type="email" placeholder="ramesh@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input style={inputStyle} placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Job Title</label>
                  <input style={inputStyle} placeholder="Operations Manager" value={form.job_title} onChange={e => setForm(p => ({ ...p, job_title: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Role <span style={{ color: "#e53935" }}>*</span></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {TEAM_ROLES.map(r => (
                    <label key={r.key} onClick={() => setForm(p => ({ ...p, role: r.key }))} style={{
                      display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                      border: `2px solid ${form.role === r.key ? r.color : "var(--border-input)"}`,
                      background: form.role === r.key ? r.bg : "var(--bg-card)", transition: "all 0.15s"
                    }}>
                      <input type="radio" checked={form.role === r.key} onChange={() => setForm(p => ({ ...p, role: r.key }))} style={{ accentColor: r.color, marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: form.role === r.key ? r.color : "var(--text-main)" }}>{r.label}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{r.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAdd} disabled={saving || !form.name.trim() || !form.email.trim()}>
                {saving ? "Adding..." : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
