import { useState } from "react";
import { X } from "lucide-react";
import { TyreUnit, VehicleTyreSetup, TYRE_COUNTS, genPositions, buildSetup } from "@/lib/tyreCalc";
import { lbl, inp } from "./styles";

export default function SetupModal({ existing, onSave, onClose }: {
  existing: VehicleTyreSetup | null;
  onSave: (s: VehicleTyreSetup) => void;
  onClose: () => void;
}) {
  const [count, setCount] = useState(existing?.tyre_count ?? 10);
  const [hasSpare, setHasSpare] = useState(existing?.has_spare ?? true);
  const [maxKm, setMaxKm] = useState(String(existing?.tyres[0]?.max_lifespan_km ?? 80000));

  const save = () => {
    const setup = buildSetup(count, hasSpare, parseInt(maxKm) || 80000);
    if (existing) {
      const map: Record<string, TyreUnit> = {};
      existing.tyres.forEach(t => { map[t.position] = t; });
      setup.tyres = setup.tyres.map(t => map[t.position] ? { ...map[t.position], position: t.position, is_spare: t.is_spare } : t);
      setup.synced_trip_ids = existing.synced_trip_ids;
    }
    onSave(setup);
  };

  const preview = [...genPositions(count), ...(hasSpare ? ["Spare"] : [])];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 440, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>
        <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Configure Tyre Layout</h2>
        <p style={{ margin: "0 0 20px", fontSize: 12.5, color: "#888" }}>Set up tyre positions for this vehicle</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={lbl}>Number of Tyres (even numbers only)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {TYRE_COUNTS.map(n => (
                <button key={n} type="button" onClick={() => setCount(n)}
                  style={{ width: 48, height: 40, borderRadius: 8, border: "2px solid", cursor: "pointer", fontWeight: 700, fontSize: 14,
                    borderColor: count === n ? "#1E2D8E" : "#e0e0f0",
                    background: count === n ? "#1E2D8E" : "white",
                    color: count === n ? "white" : "#555" }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={hasSpare} onChange={e => setHasSpare(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "#1E2D8E", cursor: "pointer" }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>Include spare tyre</span>
          </label>

          <div>
            <label style={lbl}>Default Max Lifespan per Tyre (km)</label>
            <input type="number" value={maxKm} min={10000} max={300000} step={5000}
              onChange={e => setMaxKm(e.target.value)} style={inp} />
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>Typical: 60,000–100,000 km. Adjustable per tyre.</div>
          </div>

          <div style={{ background: "#f0f4ff", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#1E2D8E", fontWeight: 500, lineHeight: 1.6 }}>
            <strong>{count + (hasSpare ? 1 : 0)} positions:</strong> {preview.join(" · ")}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="button" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={save}>
              {existing ? "Update Layout" : "Setup Tyres"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
