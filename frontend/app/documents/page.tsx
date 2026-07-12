"use client";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { documentService, expiryStatus } from "@/lib/services/documentService";
import { driverService } from "@/lib/services/driverService";
import { vehicleService } from "@/lib/services/vehicleService";
import { tripService } from "@/lib/services/tripService";
import { fmtDate } from "@/lib/date";
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_CONFIG } from "@/lib/constants/documentCategory";
import { FileText, Trash2, Download, File, Image as ImageIcon, Search, Plus, LayoutGrid, List, X } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import DocumentUploadModal from "./DocumentUploadModal";
import DocumentPreviewModal from "./DocumentPreviewModal";
import type { Document } from "@/lib/types";
import { useFirm } from "@/lib/FirmContext";

const MIME_ICONS: Record<string, any> = {
  "application/pdf": FileText,
  "image/jpeg": ImageIcon, "image/jpg": ImageIcon, "image/png": ImageIcon, "image/webp": ImageIcon,
};

function isImage(d: Document): boolean {
  if (d.mime_type) return d.mime_type.startsWith("image/");
  return /\.(jpe?g|png|webp|gif)($|\?)/i.test(d.file_url || d.file_name || "");
}

function fileIcon(d: Document) {
  if (isImage(d)) return <ImageIcon size={20} color="#1E2D8E" />;
  const Icon = MIME_ICONS[d.mime_type || ""] || File;
  return <Icon size={20} color="#1E2D8E" />;
}

function ExpiryBadge({ expiry_date }: { expiry_date: string | null }) {
  const status = expiryStatus(expiry_date);
  if (!status) return null;
  const cfg = status === "expired"
    ? { bg: "#fce4ec", color: "#c62828", label: "Expired" }
    : { bg: "#fff8e1", color: "#e65100", label: "Expiring Soon" };
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

export default function DocumentsPage() {
  const { activeFirmId, firms } = useFirm();
  const [docs, setDocs] = useState<Document[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expirySummary, setExpirySummary] = useState({ expiringSoon: 0, expired: 0 });
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const [showUpload, setShowUpload] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  const isMobile = useIsMobile();

  const load = () => {
    if (!activeFirmId) {
      setDocs([]); setDrivers([]); setVehicles([]); setTrips([]);
      setExpirySummary({ expiringSoon: 0, expired: 0 }); setLoading(false);
      return;
    }
    Promise.all([
      documentService.getAll(),
      driverService.getAll(),
      vehicleService.getAll(),
      tripService.getAll(),
      documentService.getExpirySummary(),
    ]).then(([d, dr, v, t, ex]) => {
      setDocs(d.data || []);
      setDrivers(dr.data || []);
      setVehicles(v.data || []);
      setTrips(t.data || []);
      if (ex.success && ex.data) setExpirySummary(ex.data);
    }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [activeFirmId]);

  const handleDownload = (doc: Document) => documentService.download(doc);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await documentService.delete(id); load();
  };

  const visible = useMemo(() => docs.filter(d => {
    if (category && d.category !== category) return false;
    if (driverFilter && !(d.linked_type === "driver" && d.linked_id === driverFilter)) return false;
    if (vehicleFilter && !(d.linked_type === "vehicle" && d.linked_id === vehicleFilter)) return false;
    if (dateFrom && d.created_at.slice(0, 10) < dateFrom) return false;
    if (dateTo && d.created_at.slice(0, 10) > dateTo) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [docs, category, driverFilter, vehicleFilter, dateFrom, dateTo, search]);

  const driverOptions = drivers.map(d => ({ id: d.id, label: d.name }));
  const vehicleOptions = vehicles.map(v => ({ id: v.id, label: v.registration_number }));
  const tripOptions = trips.map(t => ({ id: t.id, label: `${t.origin} → ${t.destination} (${t.start_date})` }));

  const inp: React.CSSProperties = { padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" };
  const hasFilters = search || category || driverFilter || vehicleFilter || dateFrom || dateTo;

  return (
    <div>
      <Header title="Documents" subtitle="Every document across your fleet, in one place" />
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>

        {!bannerDismissed && expirySummary.expiringSoon > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#fff8e1", border: "1px solid #ffe0a3", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#8a5a00" }}>
            <span>
              <strong>{expirySummary.expiringSoon}</strong> document{expirySummary.expiringSoon === 1 ? "" : "s"} expiring in 30 days
              {expirySummary.expired > 0 && <> · <strong>{expirySummary.expired}</strong> already expired</>}
            </span>
            <button onClick={() => setBannerDismissed(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8a5a00" }}>
              <X size={15} />
            </button>
          </div>
        )}

        {/* Category chips */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <button onClick={() => setCategory("")}
            style={{ padding: "6px 14px", borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: category === "" ? "1.5px solid #1E2D8E" : "1.5px solid #e8e8f0", background: category === "" ? "#1E2D8E" : "white", color: category === "" ? "white" : "#555" }}>
            All ({docs.length})
          </button>
          {DOCUMENT_CATEGORIES.map(c => {
            const cfg = DOCUMENT_CATEGORY_CONFIG[c];
            const count = docs.filter(d => d.category === c).length;
            const active = category === c;
            return (
              <button key={c} onClick={() => setCategory(active ? "" : c)}
                style={{ padding: "6px 14px", borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: active ? `1.5px solid ${cfg.color}` : "1.5px solid #e8e8f0", background: active ? cfg.bg : "white", color: active ? cfg.color : "#555" }}>
                {c} ({count})
              </button>
            );
          })}
        </div>

        <div className="card">
          {/* Toolbar */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 2, minWidth: isMobile ? "100%" : 200 }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
              <input placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ ...inp, paddingLeft: 30, width: "100%" }} />
            </div>
            <select value={driverFilter} onChange={e => setDriverFilter(e.target.value)} style={{ ...inp, flex: 1, minWidth: 140 }}>
              <option value="">All Drivers</option>
              {driverOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)} style={{ ...inp, flex: 1, minWidth: 140 }}>
              <option value="">All Vehicles</option>
              {vehicleOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inp, minWidth: 130 }} title="From date" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inp, minWidth: 130 }} title="To date" />
            {hasFilters && (
              <button onClick={() => { setSearch(""); setCategory(""); setDriverFilter(""); setVehicleFilter(""); setDateFrom(""); setDateTo(""); }}
                style={{ ...inp, background: "none", cursor: "pointer", color: "#888" }}>
                Clear
              </button>
            )}
            <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
              <button onClick={() => setView("grid")} title="Grid view"
                style={{ padding: 8, borderRadius: 8, border: "1.5px solid #e8e8f0", background: view === "grid" ? "#eef0fb" : "white", cursor: "pointer", color: view === "grid" ? "#1E2D8E" : "#aaa" }}>
                <LayoutGrid size={15} />
              </button>
              <button onClick={() => setView("list")} title="List view"
                style={{ padding: 8, borderRadius: 8, border: "1.5px solid #e8e8f0", background: view === "list" ? "#eef0fb" : "white", cursor: "pointer", color: view === "list" ? "#1E2D8E" : "#aaa" }}>
                <List size={15} />
              </button>
            </div>
            <button className="btn-primary" onClick={() => setShowUpload(true)}>
              <Plus size={15} /> {isMobile ? "Upload" : "Upload Document"}
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>Loading…</div>
          ) : visible.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <FileText size={42} color="#e0e0e0" style={{ margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: "#aaa", fontSize: 14, margin: 0 }}>
                {hasFilters ? "No documents match your filters." : "No documents found."}
              </p>
              {!hasFilters && firms.length > 1 && (
                <p style={{ color: "#e65100", fontSize: 12.5, marginTop: 8, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
                  You have {firms.length} firms — documents are scoped to whichever one is active
                  ({firms.find(f => f.id === activeFirmId)?.name ?? "none selected"}). Switch firms
                  from the top bar if you're looking for documents uploaded under a different one.
                </p>
              )}
            </div>
          ) : view === "grid" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {visible.map(d => {
                const cfg = DOCUMENT_CATEGORY_CONFIG[d.category || "Other"] || DOCUMENT_CATEGORY_CONFIG.Other;
                const thumb = d.file_url && isImage(d) ? d.file_url : null;
                return (
                  <div key={d.id} style={{ border: "1.5px solid #e8eaf6", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10, background: "#fafbff", cursor: "pointer" }}
                    onClick={() => setPreviewDoc(d)}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      {thumb ? (
                        <img src={thumb} alt={d.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {fileIcon(d)}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                        <div style={{ fontSize: 11.5, color: "#aaa", marginTop: 2 }}>{fmtDate(d.created_at.slice(0, 10))}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: cfg.bg, color: cfg.color }}>{d.category}</span>
                      {d.linked_label && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#f3e5f5", color: "#6a1b9a" }}>{d.linked_label}</span>}
                      <ExpiryBadge expiry_date={d.expiry_date} />
                    </div>
                    {d.expiry_date && <div style={{ fontSize: 11.5, color: "#888" }}>Expires {fmtDate(d.expiry_date)}</div>}
                    {d.notes && <div style={{ fontSize: 12, color: "#888" }}>{d.notes}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleDownload(d)}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 0", background: "#1E2D8E", color: "white", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                        <Download size={13} /> Download
                      </button>
                      <button onClick={() => handleDelete(d.id, d.name)}
                        style={{ padding: "7px 12px", background: "none", border: "1.5px solid #fce4ec", borderRadius: 8, color: "#e53935", cursor: "pointer" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Category</th><th>Linked To</th><th>Uploaded</th><th>Expiry</th><th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map(d => {
                  const cfg = DOCUMENT_CATEGORY_CONFIG[d.category || "Other"] || DOCUMENT_CATEGORY_CONFIG.Other;
                  return (
                    <tr key={d.id} style={{ cursor: "pointer" }} onClick={() => setPreviewDoc(d)}>
                      <td style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>{fileIcon(d)}{d.name}</td>
                      <td><span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: cfg.bg, color: cfg.color }}>{d.category}</span></td>
                      <td>{d.linked_label || "—"}</td>
                      <td>{fmtDate(d.created_at.slice(0, 10))}</td>
                      <td>{d.expiry_date ? (<>{fmtDate(d.expiry_date)} <ExpiryBadge expiry_date={d.expiry_date} /></>) : "—"}</td>
                      <td style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleDownload(d)} title="Download"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#1E2D8E", padding: 4 }}>
                          <Download size={14} />
                        </button>
                        <button onClick={() => handleDelete(d.id, d.name)} title="Delete"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#c62828", padding: 4 }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showUpload && (
        <DocumentUploadModal
          drivers={driverOptions} vehicles={vehicleOptions} trips={tripOptions}
          onClose={() => setShowUpload(false)}
          onSaved={() => { setShowUpload(false); load(); }}
        />
      )}
      {previewDoc && <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
    </div>
  );
}
