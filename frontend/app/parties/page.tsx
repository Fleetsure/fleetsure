"use client";
import React, { useEffect, useState } from "react";
import Header from "@/components/Header";
import { partyService } from "@/lib/services/partyService";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Plus, X, Users, Truck, Wrench, Phone, Building2,
  Search, Edit2, Trash2, IndianRupee, ChevronDown, ChevronUp
} from "lucide-react";

const PARTY_TYPES = ["customer", "transporter", "vendor"] as const;
type PartyType = typeof PARTY_TYPES[number];

const TYPE_META: Record<PartyType, { label: string; color: string; bg: string; icon: any }> = {
  customer:    { label: "Customer",    color: "#1565c0", bg: "#e3f2fd", icon: Users },
  transporter: { label: "Transporter", color: "#6a1b9a", bg: "#f3e5f5", icon: Truck },
  vendor:      { label: "Vendor",      color: "#e65100", bg: "#fff3e0", icon: Wrench },
};

const EMPTY: any = {
  name: "", phone: "", gstin: "", address: "",
  party_type: "customer", opening_balance: "", notes: "",
};

export default function PartiesPage() {
  const { t } = useLanguage();
  const [parties, setParties]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<PartyType | "all">("all");
  const [search, setSearch]       = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<any>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const load = () => {
    setLoading(true);
    partyService.getAll().then(r => setParties(r.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const openAdd = () => {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (p: any) => {
    setForm({
      name: p.name || "",
      phone: p.phone || "",
      gstin: p.gstin || "",
      address: p.address || "",
      party_type: p.party_type || "customer",
      opening_balance: p.opening_balance ?? "",
      notes: p.notes || "",
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        opening_balance: form.opening_balance !== "" ? parseFloat(form.opening_balance) : 0,
      };
      if (editingId) await partyService.update(editingId, payload);
      else await partyService.create(payload);
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await partyService.delete(id);
    load();
  };

  // Filter + search
  const visible = parties.filter(p => {
    if (filter !== "all" && p.party_type !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !(p.phone || "").includes(search)) return false;
    return true;
  });

  // Counts
  const counts = {
    all: parties.length,
    customer: parties.filter(p => p.party_type === "customer").length,
    transporter: parties.filter(p => p.party_type === "transporter").length,
    vendor: parties.filter(p => p.party_type === "vendor").length,
  };

  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 };
  const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8f0", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" };

  return (
    <div>
      <Header
        title={t("party.title")}
        subtitle={`${parties.length} contacts in your network`}
      />
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {(["all", ...PARTY_TYPES] as const).map(pt => {
            const isAll = pt === "all";
            const meta  = isAll ? null : TYPE_META[pt];
            const Icon  = isAll ? Building2 : meta!.icon;
            const count = counts[pt];
            const active = filter === pt;
            return (
              <div key={pt}
                onClick={() => setFilter(pt)}
                className="stat-card"
                style={{
                  display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
                  border: active ? "2px solid #1E2D8E" : "2px solid transparent",
                  background: active ? "#f0f3ff" : undefined,
                }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: isAll ? "#e8eaf6" : meta!.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={18} color={isAll ? "#1E2D8E" : meta!.color} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", lineHeight: 1 }}>{count}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>
                    {isAll ? "All Contacts" : meta!.label + "s"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Table card */}
        <div className="card">
          {/* Toolbar */}
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", marginBottom: 18, gap: 12 }}>
            <div style={{ position: "relative", flex: 1, maxWidth: isMobile ? undefined : 300 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
              <input
                placeholder="Search name or phone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ ...inp, paddingLeft: 32, fontSize: 13 }}
              />
            </div>
            <button className="btn-primary" onClick={openAdd} style={{ justifyContent: isMobile ? "center" : undefined }}>
              <Plus size={15} /> {t("party.add")}
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>{t("common.loading")}</div>
          ) : visible.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <Building2 size={40} color="#e0e0e0" style={{ margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: "#aaa", fontSize: 14, margin: "0 0 16px" }}>
                {search ? "No matches found" : "No parties added yet"}
              </p>
              {!search && <button className="btn-primary" onClick={openAdd}><Plus size={14} /> {t("party.add")}</button>}
            </div>
          ) : isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {visible.map(p => {
                const meta = TYPE_META[p.party_type as PartyType] || TYPE_META.customer;
                const Icon = meta.icon;
                const bal = parseFloat(p.opening_balance || 0);
                return (
                  <div key={p.id} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon size={15} color={meta.color} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: meta.bg, color: meta.color }}>{meta.label}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 8 }}>
                        {bal !== 0 && (
                          <span style={{ fontWeight: 700, fontSize: 13, color: bal > 0 ? "#2e7d32" : "#e53935" }}>
                            {bal > 0 ? "+" : "−"}₹{Math.abs(bal).toLocaleString("en-IN")}
                          </span>
                        )}
                        <button onClick={() => openEdit(p)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1E2D8E", padding: 4 }}><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(p.id, p.name)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e53935", padding: 4 }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)" }}>
                      <span>{p.phone ? <a href={`tel:${p.phone}`} style={{ color: "inherit", textDecoration: "none" }}>{p.phone}</a> : "—"}</span>
                      <span>{p.gstin || "—"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f0f0f8" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: "#aaa", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Name</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: "#aaa", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Type</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: "#aaa", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Phone</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: "#aaa", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>GSTIN</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", color: "#aaa", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Opening Bal.</th>
                  <th style={{ padding: "8px 10px" }}></th>
                </tr>
              </thead>
              <tbody>
                {visible.map(p => {
                  const meta = TYPE_META[p.party_type as PartyType] || TYPE_META.customer;
                  const Icon = meta.icon;
                  const isExpanded = expandedId === p.id;
                  const bal = parseFloat(p.opening_balance || 0);
                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        style={{ borderBottom: "1px solid #f5f5fa", cursor: "pointer" }}
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      >
                        <td style={{ padding: "12px 10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 9, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <Icon size={15} color={meta.color} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: "#1a1a2e" }}>{p.name}</div>
                              {p.address && <div style={{ fontSize: 11.5, color: "#aaa" }}>{p.address.slice(0, 40)}{p.address.length > 40 ? "…" : ""}</div>}
                            </div>
                            {isExpanded ? <ChevronUp size={13} color="#aaa" /> : <ChevronDown size={13} color="#aaa" />}
                          </div>
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: meta.bg, color: meta.color }}>
                            {meta.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px 10px", color: "#555" }}>
                          {p.phone ? (
                            <a href={`tel:${p.phone}`} style={{ color: "#555", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }} onClick={e => e.stopPropagation()}>
                              <Phone size={12} color="#aaa" /> {p.phone}
                            </a>
                          ) : <span style={{ color: "#ddd" }}>—</span>}
                        </td>
                        <td style={{ padding: "12px 10px", color: "#555", fontFamily: "monospace", fontSize: 12.5 }}>
                          {p.gstin || <span style={{ color: "#ddd" }}>—</span>}
                        </td>
                        <td style={{ padding: "12px 10px", textAlign: "right" }}>
                          {bal !== 0 ? (
                            <span style={{ fontWeight: 700, color: bal > 0 ? "#2e7d32" : "#e53935" }}>
                              {bal > 0 ? "+" : "−"}₹{Math.abs(bal).toLocaleString("en-IN")}
                            </span>
                          ) : <span style={{ color: "#ddd" }}>₹0</span>}
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => openEdit(p)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#1E2D8E", padding: 4 }}>
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(p.id, p.name)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#e53935", padding: 4 }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ background: "#fafbff", borderBottom: "1px solid #f0f0f8" }}>
                          <td colSpan={6} style={{ padding: "12px 20px 14px 56px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, fontSize: 13 }}>
                              <div>
                                <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Address</div>
                                <div style={{ color: "#333" }}>{p.address || "—"}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>GSTIN</div>
                                <div style={{ color: "#333", fontFamily: "monospace" }}>{p.gstin || "—"}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Notes</div>
                                <div style={{ color: "#333" }}>{p.notes || "—"}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button onClick={() => setShowForm(false)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "#888" }}>
              <X size={18} />
            </button>
            <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>
              {editingId ? t("common.edit") + " " + t("party.title") : t("party.add")}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Type selector */}
              <div>
                <label style={lbl}>Type *</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {PARTY_TYPES.map(pt => {
                    const m = TYPE_META[pt];
                    const active = form.party_type === pt;
                    return (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => set("party_type", pt)}
                        style={{
                          flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                          border: active ? `2px solid ${m.color}` : "2px solid #e8e8f0",
                          background: active ? m.bg : "white",
                          color: active ? m.color : "#aaa",
                          transition: "all 0.15s",
                        }}>
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={lbl}>{t("party.name")} *</label>
                <input required value={form.name} onChange={e => set("name", e.target.value)}
                  placeholder="e.g. Sharma Transport Co." style={inp} />
              </div>

              {/* Phone + GSTIN */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Phone</label>
                  <input value={form.phone} onChange={e => set("phone", e.target.value)}
                    placeholder="9876543210" style={inp} />
                </div>
                <div>
                  <label style={lbl}>GSTIN</label>
                  <input value={form.gstin} onChange={e => set("gstin", e.target.value.toUpperCase())}
                    placeholder="27AABCU9603R1ZX" style={{ ...inp, fontFamily: "monospace", fontSize: 12.5 }} />
                </div>
              </div>

              {/* Opening Balance */}
              <div>
                <label style={lbl}>Opening Balance (₹)</label>
                <input type="number" step="0.01" value={form.opening_balance}
                  onChange={e => set("opening_balance", e.target.value)}
                  placeholder="Positive = they owe you · Negative = you owe them"
                  style={inp} />
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Leave blank for ₹0. Use negative if you owe this party.</div>
              </div>

              {/* Address */}
              <div>
                <label style={lbl}>Address</label>
                <textarea value={form.address} onChange={e => set("address", e.target.value)}
                  rows={2} placeholder="City, State"
                  style={{ ...inp, resize: "vertical" }} />
              </div>

              {/* Notes */}
              <div>
                <label style={lbl}>Notes</label>
                <input value={form.notes} onChange={e => set("notes", e.target.value)}
                  placeholder="Any additional info…" style={inp} />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setShowForm(false)}>{t("common.cancel")}</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>
                  {saving ? t("common.loading") : editingId ? t("common.save") : t("party.add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
