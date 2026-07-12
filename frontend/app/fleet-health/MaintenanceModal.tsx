import { useState } from "react";
import type { CSSProperties } from "react";
import { X } from "lucide-react";
import { todayISO } from "@/lib/date";

const lbl: CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 };
const inp: CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1.5px solid var(--border-input)",
  borderRadius: 8, fontSize: 13.5, background: "var(--bg-card)", color: "var(--text-main)", boxSizing: "border-box",
};

export default function MaintenanceModal({ vehicles, onSave, onClose }: {
  vehicles: any[];
  onSave: (data: {
    vehicle_id: string; description: string; frequency: string; amount: number;
    last_done_date: string | null; next_due_date: string | null;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    vehicle_id: "", description: "", frequency: "monthly", amount: "", last_done_date: todayISO(), next_due_date: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        vehicle_id: form.vehicle_id,
        description: form.description,
        frequency: form.frequency,
        amount: parseFloat(form.amount) || 0,
        last_done_date: form.last_done_date || null,
        next_due_date: form.next_due_date || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 460, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>
        <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>Add Maintenance Item</h2>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={lbl}>Vehicle *</label>
            <select required value={form.vehicle_id} onChange={e => set("vehicle_id", e.target.value)} style={inp}>
              <option value="">Select vehicle</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Description *</label>
            <input type="text" required placeholder="Engine oil change" value={form.description} onChange={e => set("description", e.target.value)} style={inp} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Frequency *</label>
              <select required value={form.frequency} onChange={e => set("frequency", e.target.value)} style={inp}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="one_time">One-time</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Amount (₹) *</label>
              <input type="number" required min="0" step="0.01" placeholder="1500" value={form.amount} onChange={e => set("amount", e.target.value)} style={inp} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Last Done</label>
              <input type="date" value={form.last_done_date} onChange={e => set("last_done_date", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Next Due</label>
              <input type="date" value={form.next_due_date} onChange={e => set("next_due_date", e.target.value)} style={inp} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
