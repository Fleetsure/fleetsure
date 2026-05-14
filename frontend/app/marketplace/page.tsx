"use client";
import { useEffect, useState, useCallback } from "react";
import Header from "@/components/Header";
import LocationInput from "@/components/LocationInput";
import {
  getMarketplaceLoads, getMyLoads, postReturnLoad, cancelReturnLoad,
  expressInterest, getInterestsReceived, getInterestsSent, updateInterest,
  getVehicles,
} from "@/lib/api";
import {
  Truck, Plus, X, MessageCircle, CheckCircle,
  Clock, Star, ChevronRight, MapPin, Package,
  IndianRupee, RefreshCw,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const today = () => new Date().toISOString().slice(0, 10);

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  open:      { bg: "#e8f5e9", color: "#2e7d32", label: "Open" },
  matched:   { bg: "#e3f2fd", color: "#1565c0", label: "Matched" },
  expired:   { bg: "#f5f5f5", color: "#999",    label: "Expired" },
  cancelled: { bg: "#fce4ec", color: "#c62828", label: "Cancelled" },
  pending:   { bg: "#fff8e1", color: "#e65100", label: "Pending" },
  accepted:  { bg: "#e8f5e9", color: "#2e7d32", label: "Accepted" },
  rejected:  { bg: "#fce4ec", color: "#c62828", label: "Rejected" },
  withdrawn: { bg: "#f5f5f5", color: "#999",    label: "Withdrawn" },
};

function Badge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || { bg: "#f0f0f0", color: "#666", label: status };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99 }}>
      {s.label}
    </span>
  );
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={16}
          fill={i <= value ? "#f59e0b" : "none"}
          color={i <= value ? "#f59e0b" : "#ddd"}
          style={{ cursor: onChange ? "pointer" : "default" }}
          onClick={() => onChange && onChange(i)}
        />
      ))}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function Empty({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 0", color: "#aaa" }}>
      <Icon size={36} style={{ margin: "0 auto 10px", display: "block", opacity: 0.4 }} />
      <p style={{ margin: "0 0 4px", fontSize: 14, color: "#888", fontWeight: 600 }}>{title}</p>
      <p style={{ margin: 0, fontSize: 13, color: "#bbb" }}>{sub}</p>
    </div>
  );
}

// ── Load Card ─────────────────────────────────────────────────────────────────

function LoadCard({
  load, isMine, onInterest, onCancel, currentUserId,
}: {
  load: any;
  isMine: boolean;
  onInterest: (load: any) => void;
  onCancel: (id: string) => void;
  currentUserId: string;
}) {
  const alreadyInterested = !!load.my_interest_id;

  const openWhatsApp = () => {
    const phone = load.contact_phone
      ? `91${load.contact_phone.replace(/\D/g, "").replace(/^91/, "")}`
      : "";
    const msg = encodeURIComponent(
      `Hi ${load.contact_name || load.owner_name}, I saw your return load listing on FleetSure — ${load.from_city} → ${load.to_city} on ${fmtDate(load.available_date)}. I'm interested. Can we discuss?`
    );
    const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank");
  };

  return (
    <div style={{
      background: "white", border: "1px solid #eee", borderRadius: 12,
      padding: "16px", marginBottom: 12,
      borderLeft: isMine ? "3px solid #1E2D8E" : "1px solid #eee",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <MapPin size={14} color="#1E2D8E" />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>
              {load.from_city} → {load.to_city}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#888" }}>
            Available: {fmtDate(load.available_date)}
            {load.owner_name && !isMine && (
              <span style={{ marginLeft: 8 }}>· {load.owner_name}</span>
            )}
            {load.owner_trips != null && !isMine && (
              <span style={{ marginLeft: 6, color: "#1E2D8E", fontWeight: 600 }}>
                {load.owner_trips} trips completed
              </span>
            )}
          </div>
        </div>
        <Badge status={load.status} />
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
        {[
          { label: "Capacity", value: load.capacity_tonnes ? `${load.capacity_tonnes}T` : "—", icon: Package },
          { label: "Asking", value: load.asking_price ? fmt(load.asking_price) : "Negotiable", icon: IndianRupee },
          { label: "Truck", value: load.vehicle_reg || "—", icon: Truck },
        ].map(s => (
          <div key={s.label} style={{ background: "#f8f9ff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {load.cargo_accepted && (
        <p style={{ fontSize: 12, color: "#666", margin: "0 0 10px", background: "#f8f9ff", padding: "6px 10px", borderRadius: 6 }}>
          Accepts: {load.cargo_accepted}
        </p>
      )}
      {load.notes && (
        <p style={{ fontSize: 12, color: "#888", margin: "0 0 10px", fontStyle: "italic" }}>{load.notes}</p>
      )}

      {/* Interest count */}
      {load.interest_count > 0 && (
        <p style={{ fontSize: 11.5, color: "#888", margin: "0 0 10px" }}>
          {load.interest_count} fleet owner{load.interest_count !== 1 ? "s" : ""} interested
        </p>
      )}

      {/* Action buttons */}
      {isMine ? (
        load.status === "open" && (
          <button
            onClick={() => onCancel(load.id)}
            style={{ fontSize: 12, color: "#c62828", background: "none", border: "1px solid #fca5a5", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>
            Cancel Listing
          </button>
        )
      ) : load.status === "open" ? (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={openWhatsApp}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: "#25D366", color: "white", border: "none", borderRadius: 8,
              padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
            <MessageCircle size={15} /> WhatsApp
          </button>
          <button
            onClick={() => !alreadyInterested && onInterest(load)}
            disabled={alreadyInterested}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: alreadyInterested ? "#f0f1fa" : "#1E2D8E",
              color: alreadyInterested ? "#888" : "white",
              border: "none", borderRadius: 8,
              padding: "9px 14px", fontSize: 13, fontWeight: 700,
              cursor: alreadyInterested ? "not-allowed" : "pointer",
            }}>
            {alreadyInterested ? <CheckCircle size={15} /> : <ChevronRight size={15} />}
            {alreadyInterested ? "Interested" : "Express Interest"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ── Post Form ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  from_city: "", to_city: "", available_date: today(),
  vehicle_id: "", vehicle_reg: "", capacity_tonnes: "", cargo_accepted: "",
  asking_price: "", contact_phone: "", notes: "",
};

function PostForm({ vehicles, onSuccess, onClose }: { vehicles: any[]; onSuccess: () => void; onClose: () => void }) {
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleVehicle = (id: string) => {
    const v = vehicles.find((x: any) => x.id === id);
    setForm((p: any) => ({
      ...p,
      vehicle_id: id,
      vehicle_reg: v ? v.registration_number : "",
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.from_city || !form.to_city || !form.available_date) {
      setError("From city, To city, and Available date are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: any = {
        from_city: form.from_city.trim(),
        to_city: form.to_city.trim(),
        available_date: form.available_date,
        vehicle_reg: form.vehicle_reg || undefined,
        vehicle_id: form.vehicle_id || undefined,
        capacity_tonnes: form.capacity_tonnes ? Number(form.capacity_tonnes) : undefined,
        cargo_accepted: form.cargo_accepted || undefined,
        asking_price: form.asking_price ? Number(form.asking_price) : undefined,
        contact_phone: form.contact_phone || undefined,
        notes: form.notes || undefined,
      };
      await postReturnLoad(payload);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to post. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inp = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1.5px solid #e0e0ee", background: "white",
    fontSize: 13, boxSizing: "border-box" as const, outline: "none",
  };
  const lbl = { display: "block" as const, fontSize: 12, fontWeight: 600 as const, color: "#555", marginBottom: 4 };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "white", borderRadius: 16, padding: "28px 32px",
        width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>Post Return Availability</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={20} color="#888" />
          </button>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <LocationInput
              label="From City *"
              value={form.from_city}
              onChange={v => set("from_city", v)}
              placeholder="e.g. Electronic City, Bangalore"
              required
            />
            <LocationInput
              label="To City *"
              value={form.to_city}
              onChange={v => set("to_city", v)}
              placeholder="e.g. Pune"
              required
            />
          </div>

          <div>
            <label style={lbl}>Available From *</label>
            <input type="date" style={inp} value={form.available_date} min={today()} onChange={e => set("available_date", e.target.value)} required />
          </div>

          <div>
            <label style={lbl}>Select Vehicle (optional)</label>
            <select style={inp} value={form.vehicle_id} onChange={e => handleVehicle(e.target.value)}>
              <option value="">— Manual entry —</option>
              {vehicles.map((v: any) => (
                <option key={v.id} value={v.id}>{v.registration_number} ({v.make} {v.model})</option>
              ))}
            </select>
          </div>

          {!form.vehicle_id && (
            <div>
              <label style={lbl}>Truck Registration</label>
              <input style={inp} value={form.vehicle_reg} onChange={e => set("vehicle_reg", e.target.value)} placeholder="MH-12-AB-1234" />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Capacity (tonnes)</label>
              <input type="number" style={inp} value={form.capacity_tonnes} onChange={e => set("capacity_tonnes", e.target.value)} placeholder="10" min="0" step="0.5" />
            </div>
            <div>
              <label style={lbl}>Asking Price (₹)</label>
              <input type="number" style={inp} value={form.asking_price} onChange={e => set("asking_price", e.target.value)} placeholder="45000" min="0" />
            </div>
          </div>

          <div>
            <label style={lbl}>Cargo Accepted</label>
            <input style={inp} value={form.cargo_accepted} onChange={e => set("cargo_accepted", e.target.value)} placeholder="Any dry goods, no chemicals" />
          </div>

          <div>
            <label style={lbl}>Contact Phone</label>
            <input type="tel" style={inp} value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)} placeholder="9876543210" />
          </div>

          <div>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, resize: "vertical" as const, minHeight: 64 }} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any extra information..." />
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", color: "#dc2626", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={saving} style={{
            background: "#1E2D8E", color: "white", border: "none", borderRadius: 8,
            padding: "12px", fontSize: 14, fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "Posting…" : "Post Return Availability"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Interest Modal ────────────────────────────────────────────────────────────

function InterestModal({ load, onClose, onSuccess }: { load: any; onClose: () => void; onSuccess: () => void }) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await expressInterest(load.id, { message: message.trim() || undefined });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "white", borderRadius: 16, padding: "28px 32px", width: "100%", maxWidth: 420 }}>
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

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "browse" | "my_loads" | "received" | "sent";

export default function MarketplacePage() {
  const [tab, setTab]               = useState<Tab>("browse");
  const [loads, setLoads]           = useState<any[]>([]);
  const [myLoads, setMyLoads]       = useState<any[]>([]);
  const [received, setReceived]     = useState<any[]>([]);
  const [sent, setSent]             = useState<any[]>([]);
  const [vehicles, setVehicles]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showPost, setShowPost]     = useState(false);
  const [interestLoad, setInterestLoad] = useState<any>(null);
  const [isMobile, setIsMobile]     = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  // Filters
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo]     = useState("");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    const uid = localStorage.getItem("userId") || "";
    setCurrentUserId(uid);
    return () => window.removeEventListener("resize", check);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [l, ml, r, s, v] = await Promise.all([
        getMarketplaceLoads(),
        getMyLoads(),
        getInterestsReceived(),
        getInterestsSent(),
        getVehicles(),
      ]);
      setLoads(l.data || []);
      setMyLoads(ml.data || []);
      setReceived(r.data || []);
      setSent(s.data || []);
      setVehicles(v.data || []);
    } catch { /* non-blocking */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this listing?")) return;
    await cancelReturnLoad(id);
    loadAll();
  };

  const handleInterestAction = async (interestId: string, action: "accepted" | "rejected") => {
    await updateInterest(interestId, { status: action });
    loadAll();
  };

  const filteredLoads = loads.filter(l =>
    (!filterFrom || l.from_city.toLowerCase().includes(filterFrom.toLowerCase())) &&
    (!filterTo   || l.to_city.toLowerCase().includes(filterTo.toLowerCase()))
  );

  const pendingReceivedCount = received.filter(i => i.status === "pending").length;

  const pad = isMobile ? "14px" : "24px 28px";

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: "browse",   label: "Browse Loads" },
    { key: "my_loads", label: "My Listings" },
    { key: "received", label: "Received", badge: pendingReceivedCount },
    { key: "sent",     label: "Sent" },
  ];

  return (
    <div>
      <Header
        title="Load Marketplace"
        subtitle="Find backhaul loads · kill empty return trips"
      />

      {/* Tabs */}
      <div style={{ padding: `0 ${isMobile ? "14px" : "28px"}`, borderBottom: "1px solid #f0f0f8", display: "flex", gap: 4 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: "10px 16px", fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? "#1E2D8E" : "#888", background: "none", border: "none",
              borderBottom: tab === t.key ? "2px solid #1E2D8E" : "2px solid transparent",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}>
            {t.label}
            {t.badge ? (
              <span style={{ background: "#e53935", color: "white", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99 }}>
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowPost(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#1E2D8E", color: "white", border: "none",
            borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700,
            cursor: "pointer", margin: "6px 0",
          }}>
          <Plus size={15} /> Post Return
        </button>
      </div>

      <div style={{ padding: pad }}>

        {/* ── Browse tab ── */}
        {tab === "browse" && (
          <>
            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
              <LocationInput
                value={filterFrom}
                onChange={setFilterFrom}
                placeholder="Filter by From city…"
                style={{ flex: 1, minWidth: 140 }}
              />
              <LocationInput
                value={filterTo}
                onChange={setFilterTo}
                placeholder="Filter by To city…"
                style={{ flex: 1, minWidth: 140 }}
              />
              <button onClick={loadAll} style={{ background: "#f0f1fa", border: "none", borderRadius: 8, padding: "9px 12px", cursor: "pointer", flexShrink: 0 }}>
                <RefreshCw size={15} color="#555" />
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", color: "#aaa", padding: "40px 0" }}>Loading loads…</div>
            ) : filteredLoads.length === 0 ? (
              <Empty icon={Truck} title="No open loads right now" sub="Be the first — post your return availability above" />
            ) : (
              filteredLoads.map(l => (
                <LoadCard key={l.id} load={l} isMine={false} currentUserId={currentUserId}
                  onInterest={setInterestLoad} onCancel={handleCancel} />
              ))
            )}
          </>
        )}

        {/* ── My Listings tab ── */}
        {tab === "my_loads" && (
          <>
            {loading ? (
              <div style={{ textAlign: "center", color: "#aaa", padding: "40px 0" }}>Loading…</div>
            ) : myLoads.length === 0 ? (
              <Empty icon={Truck} title="No listings yet" sub="Post your first return availability to start getting enquiries" />
            ) : (
              myLoads.map(l => (
                <LoadCard key={l.id} load={l} isMine={true} currentUserId={currentUserId}
                  onInterest={setInterestLoad} onCancel={handleCancel} />
              ))
            )}
          </>
        )}

        {/* ── Received Interests tab ── */}
        {tab === "received" && (
          <>
            {loading ? (
              <div style={{ textAlign: "center", color: "#aaa", padding: "40px 0" }}>Loading…</div>
            ) : received.length === 0 ? (
              <Empty icon={Clock} title="No interests received yet" sub="When someone shows interest in your load, it appears here" />
            ) : (
              received.map(i => (
                <div key={i.id} style={{ background: "white", border: "1px solid #eee", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>
                        {i.load_from_city} → {i.load_to_city}
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                        {i.interested_user_name || "Fleet owner"} is interested
                        {i.load_date && ` · ${fmtDate(i.load_date)}`}
                      </div>
                    </div>
                    <Badge status={i.status} />
                  </div>
                  {i.message && (
                    <p style={{ fontSize: 13, color: "#555", margin: "0 0 10px", background: "#f8f9ff", padding: "8px 10px", borderRadius: 6, fontStyle: "italic" }}>
                      "{i.message}"
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {i.interested_user_phone && (
                      <button
                        onClick={() => {
                          const ph = `91${i.interested_user_phone.replace(/\D/g, "").replace(/^91/, "")}`;
                          window.open(`https://wa.me/${ph}`, "_blank");
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 5, background: "#25D366", color: "white", border: "none", borderRadius: 7, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        <MessageCircle size={13} /> WhatsApp
                      </button>
                    )}
                    {i.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleInterestAction(i.id, "accepted")}
                          style={{ display: "flex", alignItems: "center", gap: 5, background: "#e8f5e9", color: "#2e7d32", border: "none", borderRadius: 7, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          <CheckCircle size={13} /> Accept
                        </button>
                        <button
                          onClick={() => handleInterestAction(i.id, "rejected")}
                          style={{ display: "flex", alignItems: "center", gap: 5, background: "#fce4ec", color: "#c62828", border: "none", borderRadius: 7, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          <X size={13} /> Decline
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* ── Sent Interests tab ── */}
        {tab === "sent" && (
          <>
            {loading ? (
              <div style={{ textAlign: "center", color: "#aaa", padding: "40px 0" }}>Loading…</div>
            ) : sent.length === 0 ? (
              <Empty icon={Search} title="No interests sent yet" sub="Browse loads and express interest to connect with other fleet owners" />
            ) : (
              sent.map(i => (
                <div key={i.id} style={{ background: "white", border: "1px solid #eee", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>
                        {i.load_from_city} → {i.load_to_city}
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                        Owner: {i.load_owner_name || "—"}
                        {i.load_date && ` · ${fmtDate(i.load_date)}`}
                      </div>
                    </div>
                    <Badge status={i.status} />
                  </div>
                  {i.message && (
                    <p style={{ fontSize: 13, color: "#555", margin: "0 0 10px", fontStyle: "italic" }}>"{i.message}"</p>
                  )}
                  {i.status === "accepted" && i.load_owner_phone && (
                    <button
                      onClick={() => {
                        const ph = `91${i.load_owner_phone.replace(/\D/g, "").replace(/^91/, "")}`;
                        window.open(`https://wa.me/${ph}`, "_blank");
                      }}
                      style={{ display: "flex", alignItems: "center", gap: 5, background: "#25D366", color: "white", border: "none", borderRadius: 7, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      <MessageCircle size={13} /> Connect on WhatsApp
                    </button>
                  )}
                  {i.status === "accepted" && !i.rating && (
                    <div style={{ marginTop: 10 }}>
                      <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px" }}>Rate this match:</p>
                      <StarRating
                        value={0}
                        onChange={async (v) => {
                          await updateInterest(i.id, { rating: v });
                          loadAll();
                        }}
                      />
                    </div>
                  )}
                  {i.rating && (
                    <div style={{ marginTop: 8 }}>
                      <StarRating value={i.rating} />
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showPost && (
        <PostForm
          vehicles={vehicles}
          onSuccess={() => { setShowPost(false); loadAll(); setTab("my_loads"); }}
          onClose={() => setShowPost(false)}
        />
      )}
      {interestLoad && (
        <InterestModal
          load={interestLoad}
          onSuccess={() => { setInterestLoad(null); loadAll(); setTab("sent"); }}
          onClose={() => setInterestLoad(null)}
        />
      )}
    </div>
  );
}
