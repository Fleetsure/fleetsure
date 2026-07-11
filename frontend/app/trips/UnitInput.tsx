import { useState } from "react";

// A number input with a kg/tonnes toggle. `valueCanonical` and
// `onChangeCanonical` always deal in `canonicalUnit` (whatever unit the
// value is actually stored in) — the toggle only affects what's typed/shown,
// converting to/from the canonical unit under the hood.
export default function UnitInput({
  label, valueCanonical, canonicalUnit, onChangeCanonical, placeholder,
}: {
  label: string;
  valueCanonical: string;
  canonicalUnit: "kg" | "tonnes";
  onChangeCanonical: (v: string) => void;
  placeholder?: string;
}) {
  const [displayUnit, setDisplayUnit] = useState<"kg" | "tonnes">(canonicalUnit);

  const toDisplay = (canonicalStr: string, unit: "kg" | "tonnes") => {
    if (!canonicalStr) return "";
    const n = parseFloat(canonicalStr);
    if (isNaN(n)) return "";
    if (unit === canonicalUnit) return canonicalStr;
    return unit === "kg" ? String(n * 1000) : String(+(n / 1000).toFixed(3));
  };

  const handleChange = (raw: string) => {
    if (!raw) { onChangeCanonical(""); return; }
    const n = parseFloat(raw);
    if (isNaN(n)) return;
    const canonical = displayUnit === canonicalUnit ? n : (displayUnit === "kg" ? n / 1000 : n * 1000);
    onChangeCanonical(String(canonical));
  };

  return (
    <div>
      <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 3 }}>{label}</label>
      <div style={{ display: "flex", gap: 6 }}>
        <input type="number" value={toDisplay(valueCanonical, displayUnit)} placeholder={placeholder}
          onChange={e => handleChange(e.target.value)}
          style={{ flex: 1, minWidth: 0, padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }} />
        <select value={displayUnit} onChange={e => setDisplayUnit(e.target.value as "kg" | "tonnes")}
          style={{ padding: "8px 6px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}>
          <option value="tonnes">tonnes</option>
          <option value="kg">kg</option>
        </select>
      </div>
    </div>
  );
}
