import { useState } from "react";
import type { CSSProperties } from "react";
import { X } from "lucide-react";
import { todayISO } from "@/lib/date";

const lbl: CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 };
const inp: CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1.5px solid var(--border-input)",
  borderRadius: 8, fontSize: 13.5, background: "var(--bg-card)", color: "var(--text-main)", boxSizing: "border-box",
};

export default function BatteryModal({ vehicles, onSave, onClose }: {
  vehicles: any[];
  onSave: (data: {
    vehicle_id: string; brand: string | null; capacity_ah: number | null;
    installation_date: string | null; warranty_expiry: string | null; cost: number | null; condition: string;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    vehicle_id: "", brand: "", capacity_ah: "", installation_date: todayISO(), warranty_expiry: "", cost: "", condition: "good",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        vehicle_id: form.vehicle_id,
        brand: form.brand || null,
        capacity_ah: form.capacity_ah ? parseFloat(form.capacity_ah) : null,
        installation_date: form.installation_date || null,
        warranty_expiry: form.warranty_expiry || null,
        cost: form.cost ? parseFloat(form.cost) : null,
        condition: form.condition,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 460, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>
        <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>Add Battery</h2>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={lbl}>Vehicle *</label>
            <select required value={form.vehicle_id} onChange={e => set("vehicle_id", e.target.value)} style={inp}>
              <option value="">Select vehicle</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Brand</label>
              <input type="text" placeholder="Exide, Amaron…" value={form.brand} onChange={e => set("brand", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Capacity (Ah)</label>
              <input type="number" min="0" placeholder="150" value={form.capacity_ah} onChange={e => set("capacity_ah", e.target.value)} style={inp} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Installation Date</label>
              <input type="date" value={form.installation_date} onChange={e => set("installation_date", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Warranty Expiry</label>
              <input type="date" value={form.warranty_expiry} onChange={e => set("warranty_expiry", e.target.value)} style={inp} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Cost (₹)</label>
              <input type="number" min="0" step="0.01" placeholder="8500" value={form.cost} onChange={e => set("cost", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Condition</label>
              <select value={form.condition} onChange={e => set("condition", e.target.value)} style={inp}>
                <option value="good">Good</option>
                <option value="weak">Weak</option>
                <option value="dead">Dead</option>
              </select>
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
