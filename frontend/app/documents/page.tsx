"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { documentService } from "@/lib/services/documentService";
import { vehicleService } from "@/lib/services/vehicleService";
import { FileText, Trash2, Download, File, Image, Search } from "lucide-react";

const DOC_TYPES = ["RC Book", "Insurance", "Fitness", "Permit", "PUC", "Road Tax", "Invoice", "Other"];

const MIME_ICONS: Record<string, any> = {
  "application/pdf": FileText,
  "image/jpeg": Image, "image/jpg": Image, "image/png": Image, "image/webp": Image,
};

function fileIcon(mime: string) {
  const Icon = MIME_ICONS[mime] || File;
  return <Icon size={20} color="#1E2D8E" />;
}

function fmtSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const [docs, setDocs]         = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const load = () => {
    Promise.all([documentService.getAll(), vehicleService.getAll()])
      .then(([d, v]) => { setDocs(d.data || []); setVehicles(v.data || []); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleDownload = (doc: any) => {
    documentService.download(doc);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await documentService.delete(id); load();
  };

  const visible = docs.filter(d => {
    if (filterVehicle && d.vehicle_id !== filterVehicle) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" };

  return (
    <div>
      <Header title="Documents" subtitle="RC books, insurance papers, permits — all in one place" />
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 10 : 14, marginBottom: isMobile ? 16 : 24 }}>
          {DOC_TYPES.slice(0, 4).map(t => {
            const count = docs.filter(d => d.doc_type === t).length;
            return (
              <div key={t} className="stat-card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#1E2D8E" }}>{loading ? "—" : count}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{t}</div>
              </div>
            );
          })}
        </div>

        <div className="card">
          {/* Toolbar */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            <div style={{ position: "relative", flex: 1, minWidth: isMobile ? 0 : 200 }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
              <input placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ ...inp, paddingLeft: 30, fontSize: 13, width: "100%" }} />
            </div>
            <select value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)} style={{ ...inp, flex: 1, fontSize: 13 }}>
              <option value="">All Vehicles</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>Loading…</div>
          ) : visible.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <FileText size={42} color="#e0e0e0" style={{ margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: "#aaa", fontSize: 14, margin: 0 }}>
                {search || filterVehicle ? "No documents match your filter." : "No documents found."}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {visible.map((d: any) => (
                <div key={d.id} style={{ border: "1.5px solid #e8eaf6", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10, background: "#fafbff" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {fileIcon(d.mime_type || "")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                      <div style={{ fontSize: 11.5, color: "#aaa", marginTop: 2 }}>{d.file_name}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#e8eaf6", color: "#1E2D8E" }}>{d.doc_type}</span>
                    {d.reg_number && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#f3e5f5", color: "#6a1b9a" }}>{d.reg_number}</span>}
                    <span style={{ fontSize: 11, color: "#bbb", padding: "2px 4px" }}>{fmtSize(d.file_size)}</span>
                  </div>
                  {d.notes && <div style={{ fontSize: 12, color: "#888" }}>{d.notes}</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    {!!d.content_b64 && (
                      <button onClick={() => handleDownload(d)}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 0", background: "#1E2D8E", color: "white", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                        <Download size={13} /> Download
                      </button>
                    )}
                    <button onClick={() => handleDelete(d.id, d.name)}
                      style={{ padding: "7px 12px", background: "none", border: "1.5px solid #fce4ec", borderRadius: 8, color: "#e53935", cursor: "pointer" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
