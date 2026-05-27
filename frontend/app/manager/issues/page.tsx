"use client";
import { useEffect, useState } from "react";
import { teamService } from "@/lib/services/teamService";
import { useTeamAuth } from "@/lib/teamAuth";
import { AlertTriangle, Plus, X, Pencil } from "lucide-react";

const SEV_STYLE: Record<string, { bg: string; color: string }> = {
  low:      { bg: "#f5f5f5",  color: "#555"    },
  medium:   { bg: "#fff3e0",  color: "#e65100" },
  high:     { bg: "#fff3e0",  color: "#bf360c" },
  critical: { bg: "#ffebee",  color: "#c62828" },
};
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  open:        { bg: "#ffebee", color: "#c62828" },
  in_progress: { bg: "#fff3e0", color: "#e65100" },
  resolved:    { bg: "#e8f5e9", color: "#2e7d32" },
};
const ISSUE_TYPES = [
  "Engine Problem", "Tyre Issue", "Brake Failure", "Electrical Fault",
  "Body Damage", "AC/Cooling", "Fuel System", "Transmission", "Suspension", "Other",
];
const SEVERITY_OPTS = ["low", "medium", "high", "critical"];

const EMPTY_FORM = { vehicle_id: "", driver_id: "", issue_type: "", severity: "medium", description: "", status: "open" };

export default function ManagerIssues() {
  const { member }  = useTeamAuth();
  const [issues, setIssues]     = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sevFilter, setSev]     = useState("all");
  const [statusFilter, setStatus] = useState("open");
  const [updating, setUpdating] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<any | null>(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState("");

  const load = () =>
    teamService.getVehicleIssues().then(r => { setIssues(r.data ?? []); setLoading(false); });

  useEffect(() => {
    load();
    Promise.all([teamService.getVehicles(), teamService.getDrivers()]).then(([v, d]) => {
      setVehicles(v.data ?? []);
      setDrivers(d.data ?? []);
    });
  }, []);

  const filtered = issues.filter(i => {
    const matchSev    = sevFilter    === "all" || i.severity === sevFilter;
    const matchStatus = statusFilter === "all" || i.status   === statusFilter;
    return matchSev && matchStatus;
  });

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    await teamService.updateIssueStatus(id, status);
    setIssues(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    setUpdating(null);
  };

  const openAdd = () => {
    setEditing(null); setForm(EMPTY_FORM); setFormError(""); setShowModal(true);
  };
  const openEdit = (issue: any) => {
    setEditing(issue);
    setForm({
      vehicle_id:  issue.vehicle_id  ?? "",
      driver_id:   issue.driver_id   ?? "",
      issue_type:  issue.issue_type  ?? "",
      severity:    issue.severity    ?? "medium",
      description: issue.description ?? "",
      status:      issue.status      ?? "open",
    });
    setFormError(""); setShowModal(true);
  };

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.vehicle_id || !form.issue_type) {
      setFormError("Vehicle and issue type are required."); return;
    }
    setSaving(true); setFormError("");
    const payload = {
      vehicle_id:  form.vehicle_id,
      driver_id:   form.driver_id   || undefined,
      issue_type:  form.issue_type,
      severity:    form.severity,
      description: form.description.trim() || undefined,
      status:      form.status,
    };
    let result;
    if (editing) {
      result = await teamService.updateIssue(editing.id, payload);
    } else {
      result = await teamService.addIssue({ ...payload, owner_id: member!.owner_id });
    }
    setSaving(false);
    if (result.success) { setShowModal(false); load(); }
    else setFormError(result.error || "Failed to save issue.");
  };

  const SEV_OPTS    = ["all", "low", "medium", "high", "critical"];
  const STATUS_OPTS = ["all", "open", "in_progress", "resolved"];

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
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 4 }}>Vehicle Issues</div>
          <div style={{ fontSize: 13, color: "#888" }}>{filtered.length} issue{filtered.length !== 1 ? "s" : ""} shown</div>
        </div>
        <button onClick={openAdd} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 18px", background: "#c62828", color: "white",
          border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>
          <Plus size={16} /> Report Issue
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>Status</span>
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
              background: statusFilter === s ? "#1E2D8E" : "#f0f0f8",
              color: statusFilter === s ? "white" : "#555",
            }}>
              {s === "all" ? "All" : s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: "auto" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>Severity</span>
          {SEV_OPTS.map(s => (
            <button key={s} onClick={() => setSev(s)} style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
              background: sevFilter === s ? "#c62828" : "#f0f0f8",
              color: sevFilter === s ? "white" : "#555",
            }}>
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#aaa", background: "white", borderRadius: 14 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "64px", textAlign: "center", color: "#aaa", background: "white", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <AlertTriangle size={36} color="#e0e0ee" style={{ marginBottom: 12, display: "block", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, marginBottom: 16 }}>No issues match your filters.</div>
            <button onClick={openAdd} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 18px", background: "#c62828", color: "white",
              border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              <Plus size={14} /> Report Issue
            </button>
          </div>
        ) : filtered.map(issue => {
          const sev = SEV_STYLE[issue.severity] || SEV_STYLE.low;
          const st  = STATUS_STYLE[issue.status] || STATUS_STYLE.open;
          return (
            <div key={issue.id} style={{ background: "white", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: sev.bg,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <AlertTriangle size={18} color={sev.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{issue.issue_type}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8, ...sev, textTransform: "capitalize" }}>
                    {issue.severity}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8, ...st, textTransform: "capitalize" }}>
                    {issue.status?.replace("_", " ")}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
                  {issue.vehicles?.registration_number || "—"} · Driver: {issue.drivers?.name || "—"}
                  {issue.created_at && ` · ${new Date(issue.created_at).toLocaleDateString("en-IN")}`}
                </div>
                {issue.description && (
                  <div style={{ fontSize: 13, color: "#555" }}>{issue.description}</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                <button onClick={() => openEdit(issue)} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 10px", background: "#f0f0f8", border: "none",
                  borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#555", cursor: "pointer",
                }}>
                  <Pencil size={11} /> Edit
                </button>
                <select
                  value={issue.status}
                  disabled={updating === issue.id}
                  onChange={e => updateStatus(issue.id, e.target.value)}
                  style={{
                    padding: "6px 10px", border: "1.5px solid #e0e0ee", borderRadius: 8,
                    fontSize: 12, background: "white", cursor: "pointer",
                    opacity: updating === issue.id ? 0.5 : 1,
                  }}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 1000, display: "flex", alignItems: "flex-start",
          justifyContent: "center", padding: "40px 16px", overflowY: "auto",
        }}>
          <div style={{
            background: "white", borderRadius: 16, width: "100%", maxWidth: 500,
            boxShadow: "0 24px 60px rgba(0,0,0,0.2)", padding: "28px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>
                {editing ? "Edit Issue" : "Report Vehicle Issue"}
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Vehicle <span style={{ color: "#e53935" }}>*</span></label>
                  <select style={inputStyle} value={form.vehicle_id} onChange={e => set("vehicle_id", e.target.value)}>
                    <option value="">Select vehicle</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Driver (optional)</label>
                  <select style={inputStyle} value={form.driver_id} onChange={e => set("driver_id", e.target.value)}>
                    <option value="">No driver</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Issue Type <span style={{ color: "#e53935" }}>*</span></label>
                <select style={inputStyle} value={form.issue_type} onChange={e => set("issue_type", e.target.value)}>
                  <option value="">Select issue type</option>
                  {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Severity</label>
                  <select style={inputStyle} value={form.severity} onChange={e => set("severity", e.target.value)}>
                    {SEVERITY_OPTS.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                {editing && (
                  <div>
                    <label style={labelStyle}>Status</label>
                    <select style={inputStyle} value={form.status} onChange={e => set("status", e.target.value)}>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...inputStyle, height: 80, resize: "vertical" }}
                  placeholder="Describe the issue in detail..."
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{
                padding: "10px 20px", background: "#f0f0f8", border: "none",
                borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#555", cursor: "pointer",
              }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: "10px 24px", background: saving ? "#e57373" : "#c62828",
                color: "white", border: "none", borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
              }}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Report Issue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
