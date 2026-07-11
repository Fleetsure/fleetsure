import { useState } from "react";
import { X } from "lucide-react";
import { documentService, type LinkedType } from "@/lib/services/documentService";
import { DOCUMENT_CATEGORIES } from "@/lib/constants/documentCategory";

type LinkOption = { id: string; label: string };

export default function DocumentUploadModal({
  drivers, vehicles, trips, onClose, onSaved,
}: {
  drivers: LinkOption[];
  vehicles: LinkOption[];
  trips: LinkOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [linkedType, setLinkedType] = useState<LinkedType | "">("");
  const [linkedId, setLinkedId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const linkOptions: LinkOption[] =
    linkedType === "driver" ? drivers : linkedType === "vehicle" ? vehicles : linkedType === "trip" ? trips : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Document name is required."); return; }
    if (!file) { setError("Please choose a file to upload."); return; }
    setSaving(true);
    try {
      const res = await documentService.create(file, {
        name: name.trim(),
        category,
        linked_type: linkedType || null,
        linked_id: linkedType ? (linkedId || null) : null,
        expiry_date: expiryDate || null,
        notes: notes.trim() || null,
      });
      if (!res.success) throw new Error(res.error || "Upload failed");
      onSaved();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally { setSaving(false); }
  };

  const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" };
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 16 }}>
      <div className="card" style={{ width: "100%", maxWidth: 480, position: "relative", maxHeight: "92vh", overflowY: "auto" }}>
        <button onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}>
          <X size={18} />
        </button>
        <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>Upload Document</h2>

        {error && (
          <div style={{ background: "#fce4ec", color: "#b71c1c", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 13 }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={label}>Document Name <span style={{ color: "#c62828" }}>*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} style={inp} placeholder="e.g. Insurance Policy 2026" />
          </div>

          <div>
            <label style={label}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inp}>
              {DOCUMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Linked To (optional)</label>
              <select value={linkedType} onChange={e => { setLinkedType(e.target.value as LinkedType | ""); setLinkedId(""); }} style={inp}>
                <option value="">None</option>
                <option value="driver">Driver</option>
                <option value="vehicle">Vehicle</option>
                <option value="trip">Trip</option>
              </select>
            </div>
            {linkedType && (
              <div style={{ flex: 1 }}>
                <label style={label}>&nbsp;</label>
                <select value={linkedId} onChange={e => setLinkedId(e.target.value)} style={inp}>
                  <option value="">Select {linkedType}…</option>
                  {linkOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <label style={label}>Expiry Date (optional)</label>
            <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} style={inp} />
          </div>

          <div>
            <label style={label}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inp, minHeight: 60, resize: "vertical" }} />
          </div>

          <div>
            <label style={label}>File <span style={{ color: "#c62828" }}>*</span></label>
            <input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} style={inp} />
          </div>

          <button type="submit" disabled={saving} className="btn-primary" style={{ marginTop: 6, justifyContent: "center", cursor: saving ? "wait" : "pointer" }}>
            {saving ? "Uploading…" : "Upload Document"}
          </button>
        </form>
      </div>
    </div>
  );
}
