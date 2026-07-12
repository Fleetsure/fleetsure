import { useState } from "react";
import { X } from "lucide-react";
import { todayISO } from "@/lib/date";
import { lbl, inp } from "./styles";

export default function RotationModal({ vehicles, onSave, onClose }: {
  vehicles: any[];
  onSave: (data: { vehicle_id: string; date: string; positions_rotated: string; odometer_km: number | null }) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ vehicle_id: "", date: todayISO(), positions_rotated: "", odometer_km: "" });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        vehicle_id: form.vehicle_id,
        date: form.date,
        positions_rotated: form.positions_rotated,
        odometer_km: form.odometer_km ? parseFloat(form.odometer_km) : null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 440, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>
        <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>Log Tyre Rotation</h2>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Vehicle *</label>
              <select required value={form.vehicle_id} onChange={e => set("vehicle_id", e.target.value)} style={inp}>
                <option value="">Select vehicle</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Date *</label>
              <input type="date" required value={form.date} onChange={e => set("date", e.target.value)} style={inp} />
            </div>
          </div>
          <div>
            <label style={lbl}>Positions Rotated *</label>
            <input type="text" required placeholder="Front-Left ↔ Rear-Left" value={form.positions_rotated} onChange={e => set("positions_rotated", e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Odometer (km)</label>
            <input type="number" min="0" placeholder="142500" value={form.odometer_km} onChange={e => set("odometer_km", e.target.value)} style={inp} />
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
