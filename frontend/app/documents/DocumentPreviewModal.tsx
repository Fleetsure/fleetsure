import { X, Download } from "lucide-react";
import type { Document } from "@/lib/types";
import { documentService } from "@/lib/services/documentService";

function isPdf(doc: Document): boolean {
  if (doc.mime_type) return doc.mime_type === "application/pdf";
  return /\.pdf($|\?)/i.test(doc.file_url || doc.file_name || "");
}

export default function DocumentPreviewModal({ doc, onClose }: { doc: Document; onClose: () => void }) {
  const src = doc.file_url || (doc.content_b64 ? `data:${doc.mime_type || "application/octet-stream"};base64,${doc.content_b64}` : "");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: 16 }}
      onClick={onClose}>
      <div className="card" style={{ width: "100%", maxWidth: 720, maxHeight: "92vh", overflowY: "auto", position: "relative" }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}>
          <X size={18} />
        </button>
        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, paddingRight: 28 }}>{doc.name}</h2>

        <div style={{ background: "#f5f6fa", borderRadius: 10, overflow: "hidden", marginBottom: 16, minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {!src ? (
            <div style={{ color: "#aaa", fontSize: 13, padding: "60px 0" }}>No preview available</div>
          ) : isPdf(doc) ? (
            <iframe src={src} title={doc.name} style={{ width: "100%", height: "70vh", border: "none" }} />
          ) : (
            <img src={src} alt={doc.name} style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }} />
          )}
        </div>

        <button onClick={() => documentService.download(doc)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", width: "100%", background: "#1E2D8E", color: "white", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
          <Download size={14} /> Download
        </button>
      </div>
    </div>
  );
}
