import { useRef } from "react";
import { Camera } from "lucide-react";

// Shared upload-button-with-thumbnail control for any document that lands in
// the `fleet-documents` public bucket. `url` is always a plain public URL —
// unlike the old private-bucket `driver-docs` variant this replaces, there's
// no signed-URL resolution step, so the thumbnail can render directly.
export default function DocumentUpload({
  label, url, mandatory, uploading, onSelect, onView,
}: {
  label: string;
  url: string;
  mandatory?: boolean;
  uploading: boolean;
  onSelect: (file: File) => void;
  onView?: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>
        {label}{mandatory && !url ? <span style={{ color: "#c62828" }}> *</span> : ""}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {url && (
          <img
            src={url} alt={label} onClick={() => onView?.(url)}
            style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, border: "1px solid #e0e0f0", cursor: onView ? "pointer" : "default" }}
          />
        )}
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: url ? "#f0f4ff" : "#eef0fb", border: "1px solid #c5cef9", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#1E2D8E", cursor: uploading ? "wait" : "pointer" }}>
          <Camera size={13} /> {uploading ? "Uploading…" : url ? "Replace" : "Upload"}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onSelect(f); e.target.value = ""; }} />
    </div>
  );
}
