import { useState } from "react";
import { X } from "lucide-react";
import LocationInput from "@/components/LocationInput";
import { marketplaceService } from "@/lib/services/marketplaceService";
import { todayISO } from "@/lib/date";

const EMPTY_FORM = {
  from_city: "", to_city: "", available_date: todayISO(),
  vehicle_id: "", vehicle_reg: "", capacity_tonnes: "", cargo_accepted: "",
  asking_price: "", contact_phone: "", notes: "",
};

export default function PostForm({ vehicles, onSuccess, onClose }: { vehicles: any[]; onSuccess: () => void; onClose: () => void }) {
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleVehicle = (id: string) => {
    const v = vehicles.find((x: any) => x.id === id);
    setForm((p: any) => ({
      ...p,
      vehicle_id: id,
      vehicle_reg: v ? v.registration_number : "",
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.from_city || !form.to_city || !form.available_date) {
      setError("From city, To city, and Available date are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: any = {
        from_city: form.from_city.trim(),
        to_city: form.to_city.trim(),
        available_date: form.available_date,
        vehicle_reg: form.vehicle_reg || undefined,
        vehicle_id: form.vehicle_id || undefined,
        capacity_tonnes: form.capacity_tonnes ? Number(form.capacity_tonnes) : undefined,
        cargo_accepted: form.cargo_accepted || undefined,
        asking_price: form.asking_price ? Number(form.asking_price) : undefined,
        contact_phone: form.contact_phone || undefined,
        notes: form.notes || undefined,
      };
      await marketplaceService.post(payload);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to post. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inp = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1.5px solid #e0e0ee", background: "white",
    fontSize: 13, boxSizing: "border-box" as const, outline: "none",
  };
  const lbl = { display: "block" as const, fontSize: 12, fontWeight: 600 as const, color: "#555", marginBottom: 4 };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      padding: "12px",
    }}>
      <div style={{
        background: "white", borderRadius: 16, padding: "20px 16px",
        width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>Post Return Availability</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={20} color="#888" />
          </button>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <LocationInput
              label="From City *"
              value={form.from_city}
              onChange={v => set("from_city", v)}
              placeholder="e.g. Electronic City, Bangalore"
              required
            />
            <LocationInput
              label="To City *"
              value={form.to_city}
              onChange={v => set("to_city", v)}
              placeholder="e.g. Pune"
              required
            />
          </div>

          <div>
            <label style={lbl}>Available From *</label>
            <input type="date" style={inp} value={form.available_date} min={todayISO()} onChange={e => set("available_date", e.target.value)} required />
          </div>

          <div>
            <label style={lbl}>Select Vehicle (optional)</label>
            <select style={inp} value={form.vehicle_id} onChange={e => handleVehicle(e.target.value)}>
              <option value="">— Manual entry —</option>
              {vehicles.map((v: any) => (
                <option key={v.id} value={v.id}>{v.registration_number} ({v.make} {v.model})</option>
              ))}
            </select>
          </div>

          {!form.vehicle_id && (
            <div>
              <label style={lbl}>Truck Registration</label>
              <input style={inp} value={form.vehicle_reg} onChange={e => set("vehicle_reg", e.target.value)} placeholder="MH-12-AB-1234" />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Capacity (tonnes)</label>
              <input type="number" style={inp} value={form.capacity_tonnes} onChange={e => set("capacity_tonnes", e.target.value)} placeholder="10" min="0" step="0.5" />
            </div>
            <div>
              <label style={lbl}>Asking Price (₹)</label>
              <input type="number" style={inp} value={form.asking_price} onChange={e => set("asking_price", e.target.value)} placeholder="45000" min="0" />
            </div>
          </div>

          <div>
            <label style={lbl}>Cargo Accepted</label>
            <input style={inp} value={form.cargo_accepted} onChange={e => set("cargo_accepted", e.target.value)} placeholder="Any dry goods, no chemicals" />
          </div>

          <div>
            <label style={lbl}>Contact Phone</label>
            <input type="tel" style={inp} value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)} placeholder="9876543210" />
          </div>

          <div>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, resize: "vertical" as const, minHeight: 64 }} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any extra information..." />
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", color: "#dc2626", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={saving} style={{
            background: "#1E2D8E", color: "white", border: "none", borderRadius: 8,
            padding: "12px", fontSize: 14, fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "Posting…" : "Post Return Availability"}
          </button>
        </form>
      </div>
    </div>
  );
}
