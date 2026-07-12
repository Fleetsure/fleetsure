import { useState } from "react";
import { X } from "lucide-react";
import { todayISO } from "@/lib/date";
import { lbl, inp } from "./styles";

export default function ScrapModal({ vehicles, onSave, onClose }: {
  vehicles: any[];
  onSave: (data: {
    vehicle_id: string; date: string; tyre_count: number;
    construction: string | null; scrap_amount: number; dealer_name: string | null;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    vehicle_id: "", date: todayISO(), tyre_count: "1", construction: "", scrap_amount: "", dealer_name: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        vehicle_id: form.vehicle_id,
        date: form.date,
        tyre_count: parseInt(form.tyre_count) || 1,
        construction: form.construction || null,
        scrap_amount: parseFloat(form.scrap_amount) || 0,
        dealer_name: form.dealer_name || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 440, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>
        <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>Scrap Tyres</h2>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}># Tyres Scrapped *</label>
              <input type="number" required min="1" value={form.tyre_count} onChange={e => set("tyre_count", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Construction</label>
              <select value={form.construction} onChange={e => set("construction", e.target.value)} style={inp}>
                <option value="">—</option>
                <option value="nylon">Nylon</option>
                <option value="radial">Radial</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Scrap Amount Received (₹) *</label>
              <input type="number" required min="0" step="0.01" placeholder="500" value={form.scrap_amount} onChange={e => set("scrap_amount", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Dealer Name</label>
              <input type="text" placeholder="Scrap dealer" value={form.dealer_name} onChange={e => set("dealer_name", e.target.value)} style={inp} />
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
