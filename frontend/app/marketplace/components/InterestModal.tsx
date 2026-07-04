import { useState } from "react";
import { X } from "lucide-react";
import { marketplaceService } from "@/lib/services/marketplaceService";
import { fmtDate } from "@/lib/date";

export default function InterestModal({ load, onClose, onSuccess }: { load: any; onClose: () => void; onSuccess: () => void }) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await marketplaceService.expressInterest(load.id, { message: message.trim() || undefined });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px" }}>
      <div style={{ background: "white", borderRadius: 16, padding: "20px 16px", width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>Express Interest</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color="#888" /></button>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#555" }}>
          <strong>{load.from_city} → {load.to_city}</strong> · {fmtDate(load.available_date)} · {load.owner_name}
        </p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 4 }}>
              Your message (optional)
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. I can do ₹42K, full load of cotton bales, ready to load on the same day"
              maxLength={500}
              style={{
                width: "100%", padding: "9px 12px", borderRadius: 8,
                border: "1.5px solid #e0e0ee", fontSize: 13,
                resize: "vertical", minHeight: 80, boxSizing: "border-box", outline: "none",
              }}
            />
            <p style={{ fontSize: 11, color: "#bbb", margin: "3px 0 0", textAlign: "right" }}>{message.length}/500</p>
          </div>
          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", color: "#dc2626", fontSize: 13 }}>{error}</div>
          )}
          <button type="submit" disabled={saving} style={{
            background: "#1E2D8E", color: "white", border: "none", borderRadius: 8,
            padding: "12px", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "Sending…" : "Send Interest"}
          </button>
        </form>
      </div>
    </div>
  );
}
