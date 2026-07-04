import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { fmtDate, todayISO } from "@/lib/date";
import { TyreUnit, IssueLog, TYRE_BRANDS, ISSUE_TYPES, calcHealth, healthColor, predictReplacement } from "@/lib/tyreCalc";
import { lbl, inp } from "./styles";

export default function EditTyreModal({ tyre, onSave, onClose }: {
  tyre: TyreUnit;
  onSave: (t: TyreUnit) => void;
  onClose: () => void;
}) {
  const [t, setT] = useState<TyreUnit>({ ...tyre, pressure_logs: [...(tyre.pressure_logs || [])], issue_logs: [...(tyre.issue_logs || [])] });
  const [newP, setNewP] = useState({ date: todayISO(), psi: "" });
  const [newIssue, setNewIssue] = useState({ date: todayISO(), type: "puncture_minor", health_impact: "5", description: "" });
  const set = (k: keyof TyreUnit, v: any) => setT(p => ({ ...p, [k]: v }));

  const addIssue = () => {
    const impact = parseFloat(newIssue.health_impact) || 0;
    if (impact <= 0) return;
    const kmsToAdd = Math.round((impact / 100) * t.max_lifespan_km);
    const found = ISSUE_TYPES.find(i => i.value === newIssue.type);
    const entry: IssueLog = { date: newIssue.date, type: newIssue.type, label: found?.label ?? newIssue.type, health_impact: impact, description: newIssue.description };
    setT(p => ({
      ...p,
      kms_run: Math.min(p.kms_run + kmsToAdd, p.max_lifespan_km),
      issue_logs: [...(p.issue_logs || []), entry],
    }));
    setNewIssue({ date: todayISO(), type: "puncture_minor", health_impact: "5", description: "" });
  };
  const h = calcHealth(t);
  const { color, bg, label: hlabel } = healthColor(h);
  const pred = predictReplacement(t);

  const addPressure = () => {
    if (!newP.psi) return;
    set("pressure_logs", [...t.pressure_logs, { date: newP.date, psi: parseFloat(newP.psi) }]);
    setNewP({ date: todayISO(), psi: "" });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{ padding: "5px 14px", borderRadius: 20, background: bg, color, fontWeight: 800, fontSize: 18 }}>{h}%</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{t.position}</div>
            <div style={{ fontSize: 12, color: "#888" }}>{hlabel} · {t.is_spare ? "Spare" : "Active"}</div>
          </div>
        </div>

        {pred && (
          <div style={{ padding: "7px 12px", background: pred.days < 30 ? "#fce4ec" : "#f0f4ff", borderRadius: 8, fontSize: 12.5, marginBottom: 14, color: pred.days < 30 ? "#c62828" : "#1E2D8E" }}>
            Predicted replacement: ~{pred.days} days ({fmtDate(pred.date)})
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Brand</label>
              <select value={t.brand} onChange={e => set("brand", e.target.value)} style={inp}>
                {TYRE_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Purchase Cost (₹)</label>
              <input type="number" min={0} value={t.cost} onChange={e => set("cost", parseFloat(e.target.value) || 0)} style={inp} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Max Lifespan (km)</label>
              <input type="number" min={10000} step={5000} value={t.max_lifespan_km} onChange={e => set("max_lifespan_km", parseInt(e.target.value) || 80000)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Retread Count</label>
              <input type="number" min={0} max={5} value={t.retread_count} onChange={e => set("retread_count", parseInt(e.target.value) || 0)} style={inp} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Install Date</label>
              <input type="date" value={t.install_date} onChange={e => set("install_date", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Install Odometer (km)</label>
              <input type="number" min={0} value={t.install_odometer} onChange={e => set("install_odometer", parseFloat(e.target.value) || 0)} style={inp} />
            </div>
          </div>

          <div>
            <label style={lbl}>Total KMs Run on this Tyre</label>
            <input type="number" min={0} value={t.kms_run} onChange={e => set("kms_run", parseFloat(e.target.value) || 0)} style={inp} />
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>Auto-updated from trip sync. Adjust manually if needed.</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Last Rotation Date</label>
              <input type="date" value={t.last_rotation_date} onChange={e => set("last_rotation_date", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Rotation Odometer (km)</label>
              <input type="number" min={0} value={t.last_rotation_odometer} onChange={e => set("last_rotation_odometer", parseFloat(e.target.value) || 0)} style={inp} />
            </div>
          </div>

          {/* Pressure logs */}
          <div style={{ borderTop: "1px solid #f0f0f8", paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Air Pressure Logs (PSI)</div>
            {t.pressure_logs.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                {[...t.pressure_logs].reverse().slice(0, 6).map((p, ri) => {
                  const origIdx = t.pressure_logs.length - 1 - ri;
                  return (
                    <div key={origIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 10px", background: "#f8f9ff", borderRadius: 6, fontSize: 12.5 }}>
                      <span style={{ color: "#888" }}>{fmtDate(p.date)}</span>
                      <span style={{ fontWeight: 700, color: "#1E2D8E" }}>{p.psi} PSI</span>
                      <button onClick={() => set("pressure_logs", t.pressure_logs.filter((_, i) => i !== origIdx))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 2 }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#ccc", marginBottom: 8 }}>No pressure logs yet.</div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
              <div>
                <label style={lbl}>Date</label>
                <input type="date" value={newP.date} onChange={e => setNewP(p => ({ ...p, date: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={lbl}>PSI</label>
                <input type="number" min={0} max={250} placeholder="90" value={newP.psi}
                  onChange={e => setNewP(p => ({ ...p, psi: e.target.value }))} style={inp} />
              </div>
              <button type="button" onClick={addPressure}
                style={{ padding: "8px 14px", background: "#1E2D8E", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Add
              </button>
            </div>
          </div>

          {/* Issue logs */}
          <div style={{ borderTop: "1px solid #f0f0f8", paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Issue / Damage Log</div>

            {(t.issue_logs || []).length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                {[...(t.issue_logs || [])].reverse().map((issue, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#fff3e0", borderRadius: 6, fontSize: 12.5 }}>
                    <div>
                      <span style={{ fontWeight: 700, color: "#e65100" }}>{issue.label}</span>
                      {issue.description && <span style={{ color: "#888", marginLeft: 6 }}>· {issue.description}</span>}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontSize: 11.5, color: "#c62828", fontWeight: 700 }}>−{issue.health_impact}% health</div>
                      <div style={{ fontSize: 10.5, color: "#aaa" }}>{fmtDate(issue.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#ccc", marginBottom: 8 }}>No issues logged yet.</div>
            )}

            {/* Log new issue form */}
            <div style={{ background: "#fff8f0", borderRadius: 8, padding: "12px", border: "1px solid #ffe0b2" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#e65100", marginBottom: 10 }}>Log New Issue</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={lbl}>Issue Type</label>
                  <select value={newIssue.type}
                    onChange={e => {
                      const found = ISSUE_TYPES.find(i => i.value === e.target.value);
                      setNewIssue(p => ({ ...p, type: e.target.value, health_impact: String(found?.impact ?? 5) }));
                    }} style={inp}>
                    {ISSUE_TYPES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Date</label>
                  <input type="date" value={newIssue.date} onChange={e => setNewIssue(p => ({ ...p, date: e.target.value }))} style={inp} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
                <div>
                  <label style={lbl}>Health Impact (%)</label>
                  <input type="number" min={1} max={100} value={newIssue.health_impact}
                    onChange={e => setNewIssue(p => ({ ...p, health_impact: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Description (optional)</label>
                  <input type="text" placeholder="e.g. NH-48 pothole" value={newIssue.description}
                    onChange={e => setNewIssue(p => ({ ...p, description: e.target.value }))} style={inp} />
                </div>
                <button type="button" onClick={addIssue}
                  style={{ padding: "8px 14px", background: "#e65100", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  Log
                </button>
              </div>
              <div style={{ fontSize: 11, color: "#e65100", marginTop: 7 }}>
                Reduces health by {newIssue.health_impact}% — equivalent to {Math.round(parseFloat(newIssue.health_impact || "0") / 100 * t.max_lifespan_km).toLocaleString("en-IN")} km of wear
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="button" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => onSave(t)}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
