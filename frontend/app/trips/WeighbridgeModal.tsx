import { useRef, useState } from "react";
import { X, Camera } from "lucide-react";
import { tripService } from "@/lib/services/tripService";
import UnitInput from "./UnitInput";

function SlipUpload({ url, uploading, onSelect }: { url: string; uploading: boolean; onSelect: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {url && (
        <img src={url} alt="Weighbridge slip" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, border: "1px solid #e0e0f0" }} />
      )}
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: url ? "#f0f4ff" : "#eef0fb", border: "1px solid #c5cef9", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#1E2D8E", cursor: uploading ? "wait" : "pointer" }}>
        <Camera size={13} /> {uploading ? "Uploading…" : url ? "Replace slip" : "Upload slip"}
      </button>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onSelect(f); e.target.value = ""; }} />
    </div>
  );
}

export default function WeighbridgeModal({ trip, isMobile, onClose, onSaved }: {
  trip: any;
  isMobile: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  // empty_truck_weight / loading_quantity / unloading_quantity are stored in
  // kg. The kg/tonnes toggle on each field is purely a display/input
  // convenience — UnitInput converts to/from kg before it ever reaches form
  // state.
  const [form, setForm] = useState({
    loading_date:       trip.loading_date       || "",
    unloading_date:     trip.unloading_date     || "",
    loading_quantity:   trip.loading_quantity   != null ? String(trip.loading_quantity)   : "",
    unloading_quantity: trip.unloading_quantity != null ? String(trip.unloading_quantity) : "",
    empty_truck_weight: trip.empty_truck_weight != null ? String(trip.empty_truck_weight) : "",
    weighbridge_slip_1_url: trip.weighbridge_slip_1_url || "",
    weighbridge_slip_2_url: trip.weighbridge_slip_2_url || "",
    weighbridge_slip_3_url: trip.weighbridge_slip_3_url || "",
  });
  const [uploading, setUploading] = useState<{ 1?: boolean; 2?: boolean; 3?: boolean }>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSlipUpload = async (slot: 1 | 2 | 3, file: File) => {
    setUploading(u => ({ ...u, [slot]: true }));
    const res = await tripService.uploadWeighbridgeSlip(file, trip.id, slot, {
      origin: trip.origin, destination: trip.destination, start_date: trip.start_date,
    });
    if (res.success) {
      setForm(p => ({ ...p, [`weighbridge_slip_${slot}_url`]: res.data as string }));
    } else {
      setErr(res.error || "Upload failed");
    }
    setUploading(u => ({ ...u, [slot]: false }));
  };

  const loadingQty   = parseFloat(form.loading_quantity);
  const unloadingQty = parseFloat(form.unloading_quantity);
  const qtyLostKg = (!isNaN(loadingQty) && !isNaN(unloadingQty)) ? +(loadingQty - unloadingQty).toFixed(2) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    const res = await tripService.update(trip.id, {
      loading_date:       form.loading_date       || null,
      unloading_date:     form.unloading_date     || null,
      loading_quantity:   form.loading_quantity   ? parseFloat(form.loading_quantity)   : null,
      unloading_quantity: form.unloading_quantity ? parseFloat(form.unloading_quantity) : null,
      empty_truck_weight: form.empty_truck_weight ? parseFloat(form.empty_truck_weight) : null,
      weighbridge_slip_1_url: form.weighbridge_slip_1_url || null,
      weighbridge_slip_2_url: form.weighbridge_slip_2_url || null,
      weighbridge_slip_3_url: form.weighbridge_slip_3_url || null,
    } as any);
    if (res.success) {
      await onSaved();
      onClose();
    } else {
      setErr(res.error || "Could not save weighbridge details");
    }
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: isMobile ? "12px" : "20px" }}>
      <div className="card" style={{ width: "100%", maxWidth: 520, position: "relative", maxHeight: "92vh", overflowY: "auto" }}>
        <button onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
          <X size={18} />
        </button>
        <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>⚖️ Weighbridge & Quantity</h2>
        <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "#888" }}>Record the three weighbridge slips for this trip.</p>

        {err && (
          <div style={{ background: "#fce4ec", color: "#b71c1c", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 13 }}>
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Slip 1 — Empty truck */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Slip 1 — Empty Truck</div>
            <div style={{ marginBottom: 10 }}>
              <UnitInput
                label="Empty Truck Weight"
                valueCanonical={form.empty_truck_weight}
                canonicalUnit="kg"
                onChangeCanonical={v => setForm(p => ({ ...p, empty_truck_weight: v }))}
                placeholder="9500"
              />
            </div>
            <SlipUpload url={form.weighbridge_slip_1_url} uploading={!!uploading[1]} onSelect={f => handleSlipUpload(1, f)} />
          </div>

          {/* Slip 2 — After loading */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Slip 2 — After Loading</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 3 }}>Loading Date</label>
                <input type="date" value={form.loading_date}
                  onChange={e => setForm(p => ({ ...p, loading_date: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }} />
              </div>
              <UnitInput
                label="Loaded Quantity"
                valueCanonical={form.loading_quantity}
                canonicalUnit="kg"
                onChangeCanonical={v => setForm(p => ({ ...p, loading_quantity: v }))}
                placeholder="25000"
              />
            </div>
            <SlipUpload url={form.weighbridge_slip_2_url} uploading={!!uploading[2]} onSelect={f => handleSlipUpload(2, f)} />
          </div>

          {/* Slip 3 — After delivery */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Slip 3 — After Delivery</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 3 }}>Unloading Date</label>
                <input type="date" value={form.unloading_date}
                  onChange={e => setForm(p => ({ ...p, unloading_date: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }} />
              </div>
              <UnitInput
                label="Delivered Quantity"
                valueCanonical={form.unloading_quantity}
                canonicalUnit="kg"
                onChangeCanonical={v => setForm(p => ({ ...p, unloading_quantity: v }))}
                placeholder="24500"
              />
            </div>
            <SlipUpload url={form.weighbridge_slip_3_url} uploading={!!uploading[3]} onSelect={f => handleSlipUpload(3, f)} />
          </div>

          {/* Quantity lost preview (kg, converted to tonnes for readability) */}
          {qtyLostKg !== null && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: qtyLostKg < 0 ? "#fce4ec" : "#f5f6ff" }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: qtyLostKg < 0 ? "#c62828" : "#555" }}>
                Quantity Lost{qtyLostKg < 0 ? " · Data Error" : ""}
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: qtyLostKg < 0 ? "#c62828" : "#1E2D8E" }}>
                {(qtyLostKg / 1000).toFixed(3)} tonnes
              </span>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>
              {saving ? "Saving…" : "Save Weighbridge Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
