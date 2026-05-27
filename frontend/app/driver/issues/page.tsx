"use client";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, X, Loader2, Phone } from "lucide-react";
import { useDriverAuth } from "@/lib/driverAuth";
import { driverPortalService, DriverTrip } from "@/lib/services/driverPortalService";

const PRIMARY = "#1E2D8E";
const RED     = "#DC2626";
const AMBER   = "#D97706";
const GREEN   = "#059669";

const ISSUE_TYPES = [
  { value: "breakdown",  label: "Breakdown",    emoji: "🚨" },
  { value: "tyre",       label: "Tyre",         emoji: "🔄" },
  { value: "accident",   label: "Accident",     emoji: "💥" },
  { value: "mechanical", label: "Mechanical",   emoji: "🔧" },
  { value: "electrical", label: "Electrical",   emoji: "⚡" },
  { value: "other",      label: "Other",        emoji: "📋" },
];

const SEVERITY_META = [
  { value: "low",      label: "Low",      color: GREEN, desc: "Can wait"          },
  { value: "medium",   label: "Medium",   color: AMBER, desc: "Needs attention"   },
  { value: "high",     label: "High",     color: RED,   desc: "Affects trip"      },
  { value: "critical", label: "Critical", color: RED,   desc: "Stopped on road"   },
];

export default function IssuesPage() {
  const { driver } = useDriverAuth();
  const [trips,        setTrips]        = useState<DriverTrip[]>([]);
  const [issues,       setIssues]       = useState<any[]>([]);
  const [ownerContact, setOwnerContact] = useState<{ name: string; phone: string | null } | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [savedMsg,     setSavedMsg]     = useState("");

  const [issueType,   setIssueType]   = useState("breakdown");
  const [severity,    setSeverity]    = useState("medium");
  const [tripId,      setTripId]      = useState("");
  const [vehicleId,   setVehicleId]   = useState("");
  const [description, setDescription] = useState("");
  const [photo,       setPhoto]       = useState<File | null>(null);

  const imgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!driver) return;
    Promise.all([
      driverPortalService.getActiveTrips(),
      driverPortalService.getMyIssues(driver.id),
      driverPortalService.getOwnerContact(driver.owner_id),
    ]).then(([tr, ir, oc]) => {
      if (tr.success && tr.data) setTrips(tr.data);
      if (ir.success && ir.data) setIssues(ir.data);
      if (oc.success && oc.data) setOwnerContact(oc.data);
      setLoading(false);
    });
  }, [driver]);

  useEffect(() => {
    const active = trips.find(t => t.status === "in_progress");
    if (active && !tripId) { setTripId(active.id); setVehicleId(active.vehicle_id); }
  }, [trips]);

  async function handleSubmit() {
    if (!driver || !vehicleId) return;
    setSaving(true);

    let imageUrl: string | null = null;
    if (photo) {
      const r = await driverPortalService.uploadExpenseImage(photo, driver.id, tripId || "no-trip");
      if (r.success) imageUrl = r.data ?? null;
    }

    const r = await driverPortalService.reportIssue({
      owner_id:    driver.owner_id,
      driver_id:   driver.id,
      vehicle_id:  vehicleId,
      trip_id:     tripId || null,
      issue_type:  issueType,
      description: description.trim() || issueType,
      severity,
      image_url:   imageUrl,
    });

    setSaving(false);
    if (r.success) {
      setSavedMsg("Issue reported successfully.");
      setShowForm(false);
      setDescription(""); setPhoto(null);
      const fresh = await driverPortalService.getMyIssues(driver.id);
      if (fresh.success && fresh.data) setIssues(fresh.data);
    } else {
      setSavedMsg(r.error ?? "Failed to report. Try again.");
    }
    setTimeout(() => setSavedMsg(""), 4000);
  }

  function severityColor(s: string) {
    return SEVERITY_META.find(x => x.value === s)?.color ?? "#64748B";
  }

  const canSubmit = !saving && !!vehicleId;

  return (
    <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#0F172A" }}>Report Issue</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            style={{ padding: "9px 16px", background: RED, color: "white", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            + New Issue
          </button>
        )}
      </div>

      {/* ── Call Manager card ─────────────────────────────────────────────── */}
      {ownerContact && (
        <div style={{ background: "white", borderRadius: 14, padding: "16px", border: "1.5px solid #E0E7FF", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Fleet Manager</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>{ownerContact.name}</div>
            {ownerContact.phone && (
              <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{ownerContact.phone}</div>
            )}
          </div>
          {ownerContact.phone ? (
            <a
              href={`tel:${ownerContact.phone.replace(/\s/g, "")}`}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", background: GREEN, color: "white", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 14, flexShrink: 0, boxShadow: "0 4px 12px rgba(5,150,105,0.3)" }}
            >
              <Phone size={16} /> Call Now
            </a>
          ) : (
            <div style={{ fontSize: 12, color: "#94A3B8", fontStyle: "italic" }}>No phone on file</div>
          )}
        </div>
      )}

      {savedMsg && (
        <div style={{ padding: "12px 14px", background: "#DCFCE7", border: "1px solid #86EFAC", borderRadius: 10, fontSize: 13, color: GREEN, fontWeight: 600 }}>
          <CheckCircle2 size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />{savedMsg}
        </div>
      )}

      {/* ── Report form ───────────────────────────────────────────────────── */}
      {showForm && (
        <div style={{ background: "white", borderRadius: 16, border: `1.5px solid ${RED}30`, overflow: "hidden" }}>
          <div style={{ background: RED, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: "white", fontWeight: 800, fontSize: 15 }}>🚨 Report a Problem</div>
            <button onClick={() => setShowForm(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6, padding: "4px 8px", color: "white", cursor: "pointer" }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: "18px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Issue type */}
            <div>
              <div style={labelStyle}>Issue Type</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {ISSUE_TYPES.map(it => (
                  <button key={it.value} onClick={() => setIssueType(it.value)}
                    style={{ padding: "10px 6px", borderRadius: 10, border: `1.5px solid ${issueType === it.value ? RED : "#E2E8F0"}`, background: issueType === it.value ? "#FEF2F2" : "white", fontWeight: 700, fontSize: 12, cursor: "pointer", color: issueType === it.value ? RED : "#334155", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 18 }}>{it.emoji}</span>
                    {it.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <div style={labelStyle}>Severity</div>
              <div style={{ display: "flex", gap: 8 }}>
                {SEVERITY_META.map(s => (
                  <button key={s.value} onClick={() => setSeverity(s.value)}
                    style={{ flex: 1, padding: "9px 4px", borderRadius: 8, border: `1.5px solid ${severity === s.value ? s.color : "#E2E8F0"}`, background: severity === s.value ? `${s.color}12` : "white", fontWeight: 700, fontSize: 11, cursor: "pointer", color: severity === s.value ? s.color : "#94A3B8", textTransform: "uppercase" }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Trip / Vehicle */}
            <div>
              <div style={labelStyle}>Related Trip</div>
              <select value={tripId} onChange={e => {
                setTripId(e.target.value);
                const t = trips.find(t => t.id === e.target.value);
                if (t) setVehicleId(t.vehicle_id);
              }} style={inputStyle}>
                <option value="">Select trip (optional)</option>
                {trips.map(t => (
                  <option key={t.id} value={t.id}>{t.origin} → {t.destination} · {t.vehicles?.registration_number}</option>
                ))}
              </select>
              {!vehicleId && trips.length === 0 && (
                <div style={{ fontSize: 11, color: RED, marginTop: 4 }}>No active trips found. You must have an active trip to report an issue.</div>
              )}
            </div>

            {/* Description — optional */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={labelStyle}>Details</div>
                <span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 500 }}>Optional</span>
              </div>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what happened, your location, what you need…"
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            {/* Photo */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={labelStyle}>Photo</div>
                <span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 500 }}>Optional</span>
              </div>
              {photo ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#F0FDF4", borderRadius: 8, border: "1px solid #86EFAC" }}>
                  <Camera size={14} color={GREEN} />
                  <span style={{ fontSize: 13, color: GREEN, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{photo.name}</span>
                  <button onClick={() => setPhoto(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}><X size={14} /></button>
                </div>
              ) : (
                <button onClick={() => imgRef.current?.click()}
                  style={{ width: "100%", padding: "11px", border: "1.5px dashed #C7D2FE", borderRadius: 8, background: "#F8FAFC", color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Camera size={14} /> Add photo of the issue
                </button>
              )}
              <input ref={imgRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowForm(false)}
                style={{ flex: 1, padding: "12px", background: "#F1F5F9", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#64748B", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={!canSubmit}
                style={{ flex: 2, padding: "12px", background: !canSubmit ? "#FCA5A5" : RED, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: !canSubmit ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {saving ? <><Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> Reporting…</> : "Report Issue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Past issues ───────────────────────────────────────────────────── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>
          Reported Issues ({issues.length})
        </div>

        {loading && <div style={{ textAlign: "center", padding: "24px", color: "#94A3B8" }}>Loading…</div>}

        {!loading && issues.length === 0 && (
          <div style={{ background: "white", borderRadius: 12, padding: "32px 20px", textAlign: "center", border: "1.5px solid #E2E8F0" }}>
            <CheckCircle2 size={32} color="#86EFAC" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>No issues reported</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>All clear!</div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {issues.map((issue: any) => {
            const meta = ISSUE_TYPES.find(it => it.value === issue.issue_type);
            const sc   = severityColor(issue.severity);
            return (
              <div key={issue.id} style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1.5px solid #F1F5F9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{meta?.emoji ?? "📋"}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{meta?.label ?? issue.issue_type}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>
                        {issue.vehicles?.registration_number ?? ""} · {new Date(issue.created_at).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: `${sc}14`, color: sc, textTransform: "uppercase" }}>{issue.severity}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: "#F1F5F9", color: "#64748B" }}>{issue.status}</span>
                  </div>
                </div>
                {issue.description && issue.description !== issue.issue_type && (
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{issue.description}</div>
                )}
                {issue.image_url && (
                  <img src={issue.image_url} alt="issue" style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 8, marginTop: 10 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.6px" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none", background: "#F8FAFC", boxSizing: "border-box", color: "#0F172A" };
