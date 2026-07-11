import { X, Zap, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import LocationInput from "@/components/LocationInput";
import UnitInput from "./UnitInput";
import type { TranslationKey } from "@/lib/translations";

export default function LogTripModal({
  editingTrip, form, setForm, formErr, vehicles, drivers, distCalc,
  vehicleSuggestions, fatigueLoading, fatigueStatus, isMobile, saving, t,
  onDriverChange, onOriginChange, onApplySuggestion, onSubmit, onClose,
}: {
  editingTrip: any;
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  formErr: string;
  vehicles: any[];
  drivers: any[];
  distCalc: "idle" | "loading" | "done" | "error";
  vehicleSuggestions: any[];
  fatigueLoading: boolean;
  fatigueStatus: any;
  isMobile: boolean;
  saving: boolean;
  t: (key: TranslationKey) => string;
  onDriverChange: (driverId: string) => void;
  onOriginChange: (value: string) => void;
  onApplySuggestion: (s: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? "12px" : "20px" }}>
      <div className="card" style={{ width: "100%", maxWidth: 540, position: "relative", maxHeight: "92vh", overflowY: "auto" }}>
        <button onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
          <X size={18} />
        </button>
        <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>{editingTrip ? "Edit Trip" : t("trip.new")}</h2>
        <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "#888" }}>{editingTrip ? "Update trip details below." : t("vehicle.fill_manually")}</p>

        {formErr && (
          <div style={{ background: "#fce4ec", color: "#b71c1c", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 13 }}>
            {formErr}
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Vehicle */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{t("trip.vehicle")} *</label>
            <select required value={form.vehicle_id}
              onChange={e => setForm((p: any) => ({ ...p, vehicle_id: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }}>
              <option value="">{t("form.select_vehicle")}</option>
              {/* In_trip vehicles stay selectable so a future trip can still be
                  planned/scheduled with them — dispatch (not scheduling) is
                  what actually gets blocked, in advanceStatus. Only exclude
                  vehicles that are out of service. */}
              {vehicles.filter(v => v.status !== "maintenance").map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.registration_number} — {v.make} {v.model}{v.status === "in_trip" ? " (currently on trip)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Driver */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Driver</label>
            <div style={{ position: "relative" }}>
              <select value={form.driver_id} onChange={e => onDriverChange(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box", appearance: "auto" }}>
                <option value="">— Select driver (or type name below) —</option>
                {drivers.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}{d.phone ? ` · ${d.phone}` : ""}</option>
                ))}
              </select>
            </div>

            {/* Fatigue badge */}
            {fatigueLoading && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#888" }}>Checking driver status…</div>
            )}
            {!fatigueLoading && fatigueStatus && (() => {
              const cfg: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
                available: { bg: "#e8f5e9", color: "#2e7d32", icon: <CheckCircle size={12} /> },
                caution:   { bg: "#fff8e1", color: "#f57f17", icon: <AlertTriangle size={12} /> },
                blocked:   { bg: "#fce4ec", color: "#b71c1c", icon: <AlertTriangle size={12} /> },
                on_trip:   { bg: "#e3f2fd", color: "#1565c0", icon: <Clock size={12} /> },
              };
              const c = cfg[fatigueStatus.status] ?? cfg.available;
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, padding: "5px 10px", background: c.bg, borderRadius: 6, width: "fit-content" }}>
                  <span style={{ color: c.color, display: "flex" }}>{c.icon}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: c.color, textTransform: "capitalize" }}>
                    {fatigueStatus.status.replace("_", " ")} — {fatigueStatus.reason}
                  </span>
                </div>
              );
            })()}

            {/* Manual name/phone fallback if no driver selected from list */}
            {!form.driver_id && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                {[
                  { label: "Driver Name *", key: "driver_name", placeholder: "Ramesh Kumar", required: true },
                  { label: "Driver Phone",  key: "driver_phone", placeholder: "9876543210",  required: false },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#888", display: "block", marginBottom: 3 }}>{f.label}</label>
                    <input required={f.required} value={(form as any)[f.key]} placeholder={f.placeholder}
                      onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Route */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <LocationInput
              label="From *"
              value={form.origin}
              onChange={v => onOriginChange(v)}
              placeholder="e.g. Mumbai, Andheri"
              required
            />
            <LocationInput
              label="To *"
              value={form.destination}
              onChange={v => setForm((p: any) => ({ ...p, destination: v }))}
              placeholder="e.g. Delhi, Gurgaon"
              required
            />
          </div>

          {/* Smart vehicle suggestions */}
          {vehicleSuggestions.length > 0 && (
            <div style={{ background: "#f0f4ff", border: "1.5px solid #c5cef9", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Zap size={13} color="#1E2D8E" />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "#1E2D8E" }}>
                  Vehicles near {form.origin} — reduce empty run
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {vehicleSuggestions.map((s: any) => (
                  <div key={s.vehicle_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "white", borderRadius: 8, padding: "8px 10px", border: "1px solid #dde3fa" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{s.registration_number}</div>
                      <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>
                        Last trip: {s.last_trip_from} → {s.last_trip_to} · {s.idle_days}d ago
                        {s.last_driver_name ? ` · ${s.last_driver_name}` : ""}
                      </div>
                    </div>
                    <button type="button" onClick={() => onApplySuggestion(s)}
                      style={{ fontSize: 12, fontWeight: 700, color: "#1E2D8E", background: "#eef0fb", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap" }}>
                      Use this
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LR / Material */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "LR No. / Doc No.", key: "doc_number", placeholder: "LR/2024/001" },
              { label: "Material / Goods", key: "material",   placeholder: "Steel Coils" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{f.label}</label>
                <input value={(form as any)[f.key]} placeholder={f.placeholder}
                  onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }} />
              </div>
            ))}
          </div>

          {/* Freight / Advance / Weight */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10 }}>
            {[
              { label: "Freight (₹)", key: "freight_amount", placeholder: "85000", required: false, type: "number" },
              { label: "Driver Advance (₹)", key: "driver_advance", placeholder: "5000", required: false, type: "number" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{f.label}</label>
                <input type={f.type} required={f.required} value={(form as any)[f.key]} placeholder={f.placeholder}
                  onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }} />
              </div>
            ))}
            <UnitInput
              label="Tentative Weight"
              valueCanonical={form.weight_tonnes}
              canonicalUnit="tonnes"
              onChangeCanonical={v => setForm((p: any) => ({ ...p, weight_tonnes: v }))}
              placeholder="25"
            />
          </div>

          {/* Dates / Distance */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10 }}>
            {[
              { label: "Start Date *", key: "start_date",  type: "date",   required: true },
              { label: "End Date",     key: "end_date",    type: "date",   required: false },
              { label: distCalc === "loading" ? "Distance (km) — calculating…" : distCalc === "done" ? "Distance (km) — estimated ✓" : distCalc === "error" ? "Distance (km) — enter manually" : "Distance (km)", key: "distance_km", type: "number", required: false, placeholder: "1200" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{f.label}</label>
                <input type={f.type} required={f.required} value={(form as any)[f.key]}
                  placeholder={(f as any).placeholder || ""}
                  onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }} />
              </div>
            ))}
          </div>

          {/* Projected fuel banner */}
          {(() => {
            const veh = vehicles.find(v => v.id === form.vehicle_id);
            const dist = parseFloat(form.distance_km);
            if (!veh?.avg_mileage_kmpl || !dist || isNaN(dist)) return null;
            const litres = (dist / veh.avg_mileage_kmpl).toFixed(1);
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "#e8f5e9", borderRadius: 8, border: "1px solid #a5d6a7", fontSize: 13 }}>
                <span style={{ fontSize: 18 }}>⛽</span>
                <div>
                  <span style={{ fontWeight: 700, color: "#2e7d32" }}>Projected Fuel: ~{litres} litres</span>
                  <span style={{ color: "#555", marginLeft: 8 }}>({dist} km ÷ {veh.avg_mileage_kmpl} km/l)</span>
                </div>
              </div>
            );
          })()}

          {/* Notes */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Notes</label>
            <textarea value={form.notes} rows={2} placeholder="Optional..."
              onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, resize: "vertical", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={onClose}>{t("common.cancel")}</button>
            <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>
              {saving ? t("common.loading") : editingTrip ? t("common.save") : t("trip.new")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
