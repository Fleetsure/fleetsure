"use client";
import { useEffect, useState, useRef } from "react";
import Header from "@/components/Header";
import { getVehicles, getDocuments, uploadDocument, downloadDocument, deleteDocument } from "@/lib/api";
import { FileText, Upload, X, Trash2, Download, File, Image, Plus, Search } from "lucide-react";

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

const EMPTY = { name: "", doc_type: "RC Book", vehicle_id: "", notes: "" };

export default function DocumentsPage() {
  const [docs, setDocs]         = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState<any>(EMPTY);
  const [fileData, setFileData] = useState<{ name: string; size: number; mime: string; b64: string } | null>(null);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    Promise.all([getDocuments(), getVehicles()])
      .then(([d, v]) => { setDocs(d.data); setVehicles(v.data); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) { alert("File too large. Max 6MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(",")[1];
      setFileData({ name: file.name, size: file.size, mime: file.type, b64 });
      if (!form.name) set("name", file.name.replace(/\.[^/.]+$/, ""));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!fileData) { alert("Please select a file."); return; }
    setSaving(true);
    try {
      await uploadDocument({
        name: form.name || fileData.name,
        doc_type: form.doc_type,
        vehicle_id: form.vehicle_id || null,
        file_name: fileData.name,
        file_size: fileData.size,
        mime_type: fileData.mime,
        content_b64: fileData.b64,
        notes: form.notes,
      });
      setShowForm(false); setForm(EMPTY); setFileData(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } finally { setSaving(false); }
  };

  const handleDownload = async (doc: any) => {
    try {
      const res = await downloadDocument(doc.id);
      const { content_b64, mime_type, file_name } = res.data;
      const link = document.createElement("a");
      link.href = `data:${mime_type};base64,${content_b64}`;
      link.download = file_name || doc.name;
      link.click();
    } catch { alert("Download failed."); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await deleteDocument(id); load();
  };

  const visible = docs.filter(d => {
    if (filterVehicle && d.vehicle_id !== filterVehicle) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 };
  const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" };

  return (
    <div>
      <Header title="Documents" subtitle="RC books, insurance papers, permits — all in one place" />
      <div style={{ padding: "24px 28px" }}>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 10, flex: 1, flexWrap: "wrap" }}>
              <div style={{ position: "relative", minWidth: 200 }}>
                <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
                <input placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)}
                  style={{ ...inp, paddingLeft: 30, fontSize: 13, maxWidth: 220 }} />
              </div>
              <select value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)} style={{ ...inp, maxWidth: 180, fontSize: 13 }}>
                <option value="">All Vehicles</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.reg_number}</option>)}
              </select>
            </div>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Upload size={15} /> Upload Document
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>Loading…</div>
          ) : visible.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <FileText size={42} color="#e0e0e0" style={{ margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: "#aaa", fontSize: 14, margin: "0 0 16px" }}>
                {search || filterVehicle ? "No documents match your filter." : "No documents uploaded yet."}
              </p>
              {!search && !filterVehicle && (
                <button className="btn-primary" onClick={() => setShowForm(true)}><Upload size={14} /> Upload First Document</button>
              )}
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
                    {d.has_file && (
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

      {/* Upload Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 480, position: "relative" }}>
            <button onClick={() => { setShowForm(false); setFileData(null); }} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>
            <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Upload Document</h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* File drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border: `2px dashed ${fileData ? "#1E2D8E" : "#d0d0e0"}`, borderRadius: 10, padding: "24px 16px", textAlign: "center", cursor: "pointer", background: fileData ? "#f0f3ff" : "#fafafa", transition: "all 0.2s" }}>
                {fileData ? (
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1E2D8E" }}>{fileData.name}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{fmtSize(fileData.size)}</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Click to change</div>
                  </div>
                ) : (
                  <div>
                    <Upload size={28} color="#bbb" style={{ margin: "0 auto 8px", display: "block" }} />
                    <div style={{ fontSize: 13.5, color: "#888" }}>Click to select a file</div>
                    <div style={{ fontSize: 11.5, color: "#bbb", marginTop: 4 }}>PDF, JPG, PNG — max 6MB</div>
                  </div>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} style={{ display: "none" }} />
              </div>

              <div>
                <label style={lbl}>Document Name *</label>
                <input required value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Insurance Policy 2025-26" style={inp} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Type *</label>
                  <select required value={form.doc_type} onChange={e => set("doc_type", e.target.value)} style={inp}>
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Vehicle (optional)</label>
                  <select value={form.vehicle_id} onChange={e => set("vehicle_id", e.target.value)} style={inp}>
                    <option value="">All / Fleet</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.reg_number}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="e.g. Valid till March 2026" style={inp} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => { setShowForm(false); setFileData(null); }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving || !fileData}>
                  {saving ? "Uploading…" : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
