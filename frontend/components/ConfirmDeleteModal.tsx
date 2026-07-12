"use client";
import { useState } from "react";
import { X } from "lucide-react";

export default function ConfirmDeleteModal({ title, message, onConfirm, onClose }: {
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setDeleting(true); setError("");
    try {
      await onConfirm();
    } catch (err: any) {
      setError(err?.message || "Failed to delete. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 400, position: "relative" }}>
        <button onClick={onClose} disabled={deleting} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>
        <h2 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 700 }}>{title}</h2>
        <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "var(--text-muted)" }}>{message}</p>
        {error && <div style={{ background: "#fce4ec", color: "#b71c1c", padding: "8px 12px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={onClose} disabled={deleting}>Cancel</button>
          <button type="button" className="btn-primary" style={{ flex: 1, justifyContent: "center", background: "#e53935" }} onClick={handleConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
