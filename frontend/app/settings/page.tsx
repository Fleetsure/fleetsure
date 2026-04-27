"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import {
  UserCircle, Bell, Lock, Palette,
  Settings, CreditCard, Download,
  Users, MessageCircle, Globe, Receipt, Plug, AlertTriangle,
  Search, Upload, Mail, Smartphone, Route, Wrench, FileText, IndianRupee,
  Sun, Moon, Eye, EyeOff, CheckCircle, XCircle,
  Plus, Pencil, Trash2, Phone, ShieldCheck, X, Truck
} from "lucide-react";

// ─── Sidebar sections ────────────────────────────────────────────────────────
const SECTIONS = [
  {
    label: "My Account",
    items: [
      { id: "profile",       label: "User Profile",          icon: UserCircle, desc: "Your name, email, and personal details" },
      { id: "notifications", label: "Notification Settings", icon: Bell,       desc: "How and when you get notified" },
      { id: "password",      label: "Login & Password",      icon: Lock,       desc: "Change your password securely" },
      { id: "appearance",    label: "Appearance & Theme",    icon: Palette,    desc: "Day / night mode and display preferences" },
    ]
  },
  {
    label: "Fleet Settings",
    items: [
      { id: "general",  label: "General Settings",        icon: Settings,    desc: "Organization name, timezone, currency" },
      { id: "billing",  label: "Billing & Subscriptions", icon: CreditCard,  desc: "Plan, invoices, and payment methods" },
      { id: "export",   label: "Export Account Data",     icon: Download,    desc: "Download all your fleet data" },
    ]
  },
  {
    label: "User Access",
    items: [
      { id: "manage-users", label: "Manage Users", icon: Users, desc: "Invite team members and set permissions" },
    ]
  },
  {
    label: "Recommended for India 🇮🇳",
    items: [
      { id: "language",     label: "Language & Region",  icon: Globe,         desc: "Hindi, regional language and date format support" },
      { id: "gst",          label: "GST & Tax Settings", icon: Receipt,       desc: "GST number, tax rates for invoicing" },
      { id: "integrations", label: "Integrations",       icon: Plug,          desc: "Vahan API, FASTag, GPS device connections" },
      { id: "alerts",       label: "Alert Thresholds",   icon: AlertTriangle, desc: "Set limits for fuel cost, maintenance due, expiry warnings" },
    ]
  },
];

// ─── Generic form content ─────────────────────────────────────────────────────
const CONTENT: any = {
  profile: {
    title: "User Profile",
    fields: [
      { label: "Full Name",     key: "name",    type: "text",  placeholder: "Fleet Owner" },
      { label: "Email Address", key: "email",   type: "email", placeholder: "owner@example.com" },
      { label: "Phone Number",  key: "phone",   type: "tel",   placeholder: "+91 98765 43210" },
      { label: "Company Name",  key: "company", type: "text",  placeholder: "My Transport Co." },
    ]
  },
  general: {
    title: "General Settings",
    fields: [
      { label: "Organization Name", key: "org_name", type: "text",   placeholder: "My Transport Co." },
      { label: "Organization Logo", key: "org_logo", type: "logo_upload" },
      { label: "Timezone",          key: "timezone", type: "select", options: ["Asia/Kolkata (IST)", "Asia/Dubai", "UTC"] },
      { label: "Currency",          key: "currency", type: "select", options: ["INR (₹)", "USD ($)", "AED"] },
      { label: "Distance Unit",     key: "distance", type: "select", options: ["Kilometers (km)", "Miles (mi)"] },
      { label: "Fuel Unit",         key: "fuel",     type: "select", options: ["Litres", "Gallons"] },
    ]
  },
  // password handled by <PasswordSettings> component below

  gst: {
    title: "GST & Tax Settings",
    fields: [
      { label: "GST Number",       key: "gstin",    type: "text",   placeholder: "22AAAAA0000A1Z5" },
      { label: "Business Name",    key: "biz_name", type: "text",   placeholder: "As per GST registration" },
      { label: "State",            key: "state",    type: "text",   placeholder: "Maharashtra" },
      { label: "Default Tax Rate", key: "tax_rate", type: "select", options: ["5%", "12%", "18%", "28%", "None"] },
    ]
  },
  alerts: {
    title: "Alert Thresholds",
    fields: [
      { label: "Fuel Cost Alert (₹ per litre above)", key: "fuel_alert",   type: "number", placeholder: "100" },
      { label: "Maintenance Due (days before)",       key: "maint_alert",  type: "number", placeholder: "7" },
      { label: "Insurance Expiry Warning (days)",     key: "ins_alert",    type: "number", placeholder: "30" },
      { label: "License Expiry Warning (days)",       key: "lic_alert",    type: "number", placeholder: "30" },
      { label: "Low FASTag Balance (₹)",              key: "fastag_alert", type: "number", placeholder: "500" },
    ]
  },
  language: {
    title: "Language & Region",
    fields: [
      { label: "Language",      key: "lang",   type: "select", options: ["English", "Hindi (हिंदी)", "Marathi", "Gujarati", "Tamil", "Telugu"] },
      { label: "Date Format",   key: "date",   type: "select", options: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] },
      { label: "Number Format", key: "number", type: "select", options: ["Indian (1,00,000)", "International (100,000)"] },
    ]
  },
};

// ─── Notification config (India-first) ───────────────────────────────────────
const NOTIF_CATEGORIES = [
  {
    id: "trips",
    label: "Trips",
    icon: Route,
    color: "#1E2D8E",
    bg: "#e8eaf6",
    items: [
      { key: "trip_started",   label: "Trip started",                desc: "Alert when a driver begins a trip" },
      { key: "trip_completed", label: "Trip completed",              desc: "Alert when a trip is marked done" },
      { key: "trip_delayed",   label: "Trip not updated (12+ hrs)", desc: "Alert if a trip has no update for 12 hours" },
    ]
  },
  {
    id: "documents",
    label: "Documents & Compliance",
    icon: FileText,
    color: "#c62828",
    bg: "#ffebee",
    items: [
      { key: "insurance_expiry", label: "Insurance expiring",           desc: "Alert before vehicle insurance expires" },
      { key: "puc_expiry",       label: "Pollution certificate (PUC)",  desc: "Alert before PUC certificate expires" },
      { key: "fitness_expiry",   label: "Fitness certificate expiring", desc: "Alert before fitness cert expires" },
      { key: "permit_expiry",    label: "Permit expiring",              desc: "Alert before vehicle permit expires" },
      { key: "dl_expiry",        label: "Driver license expiring",      desc: "Alert before a driver's DL expires" },
      { key: "rc_renewal",       label: "RC renewal due",               desc: "Alert before vehicle RC renewal date" },
    ]
  },
  {
    id: "finance",
    label: "Finance",
    icon: IndianRupee,
    color: "#2e7d32",
    bg: "#e8f5e9",
    items: [
      { key: "fastag_low",       label: "FASTag low balance",     desc: "Alert when FASTag balance falls below threshold" },
      { key: "monthly_expense",  label: "Monthly expense report", desc: "Summary of all fleet expenses sent monthly" },
      { key: "weekly_profit",    label: "Weekly profit summary",  desc: "Trip profitability snapshot every Monday" },
    ]
  },
  {
    id: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    color: "#e65100",
    bg: "#fff3e0",
    items: [
      { key: "service_due",    label: "Service / maintenance due", desc: "Reminder when a vehicle is due for service" },
      { key: "breakdown",      label: "Breakdown reported",        desc: "Instant alert when a breakdown is logged" },
    ]
  },
];

// ─── Manage Users ────────────────────────────────────────────────────────────
const ROLES = [
  { key: "owner",      label: "Fleet Owner",    color: "#1E2D8E", bg: "#e8eaf6", desc: "Full access to everything" },
  { key: "manager",    label: "Fleet Manager",  color: "#2e7d32", bg: "#e8f5e9", desc: "Manage trips, vehicles, expenses" },
  { key: "accountant", label: "Accountant",     color: "#e65100", bg: "#fff3e0", desc: "View reports and export data only" },
  { key: "driver",     label: "Driver",         color: "#6d4c41", bg: "#efebe9", desc: "Log trips via mobile (coming soon)" },
];

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh",
];

const LICENSE_CLASSES = ["LMV","HMV","HGMV","HPMV","Transport","Other"];

type User = {
  id: string; firstName: string; lastName: string; email: string; phone: string;
  role: string; jobTitle: string; startDate: string; state: string; city: string;
  licenseNumber: string; licenseClass: string; licenseExpiry: string;
  status: "active" | "inactive"; photo: string;
};

const EMPTY_USER: Omit<User,"id"> = {
  firstName:"", lastName:"", email:"", phone:"", role:"manager",
  jobTitle:"", startDate:"", state:"", city:"",
  licenseNumber:"", licenseClass:"", licenseExpiry:"", status:"active", photo:""
};

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find(x => x.key === role) || ROLES[1];
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: r.bg, color: r.color }}>{r.label}</span>;
}

function Avatar({ user, size = 36 }: { user: Partial<User>; size?: number }) {
  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "?";
  return user.photo
    ? <img src={user.photo} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
    : <div style={{ width: size, height: size, borderRadius: "50%", background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: "#1E2D8E", flexShrink: 0 }}>{initials}</div>;
}

function ManageUsers() {
  const LS_KEY = "fleetUsers";
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<Omit<User,"id">>(EMPTY_USER);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) setUsers(JSON.parse(stored));
  }, []);

  const persist = (updated: User[]) => {
    setUsers(updated);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  };

  const openAdd = () => { setEditing(null); setForm(EMPTY_USER); setShowForm(true); };
  const openEdit = (u: User) => { setEditing(u); setForm({ ...u }); setShowForm(true); };

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.firstName.trim() || !form.phone.trim()) return;
    if (editing) {
      persist(users.map(u => u.id === editing.id ? { ...form, id: editing.id } : u));
    } else {
      persist([...users, { ...form, id: crypto.randomUUID() }]);
    }
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    setShowForm(false);
  };

  const handleDelete = (id: string) => { persist(users.filter(u => u.id !== id)); setDeleteConfirm(null); };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("photo", ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${u.firstName} ${u.lastName} ${u.email} ${u.phone}`.toLowerCase().includes(q);
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const isDriver = form.role === "driver";

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 11px", border: "1.5px solid var(--border-input)",
    borderRadius: 8, fontSize: 13.5, background: "var(--bg-card)", color: "var(--text-main)",
    boxSizing: "border-box"
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5 };
  const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Manage Users</h2>
        <button className="btn-primary" onClick={openAdd} style={{ fontSize: 13, padding: "7px 14px" }}>
          <Plus size={14} /> Add User
        </button>
      </div>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-muted)" }}>
        Invite team members and set their access level.
      </p>

      {/* Info banner — auth not wired yet */}
      <div style={{ display: "flex", gap: 10, padding: "11px 14px", borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border-input)", marginBottom: 20 }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>🔐</span>
        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--text-main)" }}>Authentication coming soon.</strong> Users added here are saved locally.
          Once login/auth is set up, they will receive an invite to your fleet on their email.
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
            style={{ ...inputStyle, paddingLeft: 30 }} />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          style={{ padding: "8px 12px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13, background: "var(--bg-card)", color: "var(--text-main)" }}>
          <option value="all">All Roles</option>
          {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
      </div>

      {/* Users table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
          <Users size={40} color="var(--border-input)" style={{ margin: "0 auto 12px", display: "block" }} />
          <p style={{ margin: "0 0 14px", fontSize: 14 }}>{users.length === 0 ? "No users added yet" : "No users match your filter"}</p>
          {users.length === 0 && <button className="btn-primary" onClick={openAdd}><Plus size={14} /> Add First User</button>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(u => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 10, border: "1.5px solid var(--border-input)", background: "var(--bg-card)" }}>
              <Avatar user={u} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>{u.firstName} {u.lastName}</span>
                  <RoleBadge role={u.role} />
                  {u.status === "inactive" && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, background: "var(--bg-subtle)", color: "var(--text-muted)" }}>Inactive</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {u.phone && <span>📱 {u.phone}</span>}
                  {u.email && <span>✉️ {u.email}</span>}
                  {u.jobTitle && <span>💼 {u.jobTitle}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => openEdit(u)} style={{ background: "var(--bg-subtle)", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "var(--text-muted)" }}>
                  <Pencil size={14} />
                </button>
                {deleteConfirm === u.id ? (
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#e53935" }}>Delete?</span>
                    <button onClick={() => handleDelete(u.id)} style={{ background: "#fce4ec", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#e53935", fontSize: 11, fontWeight: 600 }}>Yes</button>
                    <button onClick={() => setDeleteConfirm(null)} style={{ background: "var(--bg-subtle)", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11 }}>No</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(u.id)} style={{ background: "var(--bg-subtle)", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "var(--text-muted)" }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Roles legend */}
      <div style={{ marginTop: 28, padding: "16px", borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border-input)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Access Levels</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ROLES.map(r => (
            <div key={r.key} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <RoleBadge role={r.key} />
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{r.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Add/Edit Modal ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 16, width: "100%", maxWidth: 620, boxShadow: "0 24px 60px rgba(0,0,0,0.25)", padding: "28px 28px 24px" }}>

            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>{editing ? "Edit User" : "Add New User"}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}><X size={20} /></button>
            </div>

            {/* Photo + Basic */}
            <div style={{ background: "var(--bg-subtle)", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>Basic Details</div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <Avatar user={form} size={56} />
                <div>
                  <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
                  <button className="btn-outline" onClick={() => photoRef.current?.click()} style={{ fontSize: 12, padding: "5px 12px" }}>
                    <Upload size={12} /> {form.photo ? "Change Photo" : "Upload Photo"}
                  </button>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>PNG or JPG, max 2MB</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>First Name <span style={{ color: "#e53935" }}>*</span></label>
                  <input style={inputStyle} placeholder="Ramesh" value={form.firstName} onChange={e => set("firstName", e.target.value)} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Last Name</label>
                  <input style={inputStyle} placeholder="Sharma" value={form.lastName} onChange={e => set("lastName", e.target.value)} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Mobile Number <span style={{ color: "#e53935" }}>*</span></label>
                  <input style={inputStyle} placeholder="+91 98765 43210" value={form.phone} onChange={e => set("phone", e.target.value)} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Email Address</label>
                  <input style={inputStyle} type="email" placeholder="ramesh@example.com" value={form.email} onChange={e => set("email", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Role & Access */}
            <div style={{ background: "var(--bg-subtle)", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>Role & Access</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {ROLES.map(r => (
                  <label key={r.key} onClick={() => set("role", r.key)} style={{
                    display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${form.role === r.key ? r.color : "var(--border-input)"}`,
                    background: form.role === r.key ? r.bg : "var(--bg-card)", transition: "all 0.15s"
                  }}>
                    <input type="radio" checked={form.role === r.key} onChange={() => set("role", r.key)} style={{ accentColor: r.color, marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: form.role === r.key ? r.color : "var(--text-main)" }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{r.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Job Title</label>
                  <input style={inputStyle} placeholder="e.g. Operations Manager" value={form.jobTitle} onChange={e => set("jobTitle", e.target.value)} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={form.status} onChange={e => set("status", e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Location */}
            <div style={{ background: "var(--bg-subtle)", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>Location</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>City</label>
                  <input style={inputStyle} placeholder="Mumbai" value={form.city} onChange={e => set("city", e.target.value)} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>State</label>
                  <select style={inputStyle} value={form.state} onChange={e => set("state", e.target.value)}>
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Driver-specific */}
            {isDriver && (
              <div style={{ background: "var(--bg-subtle)", borderRadius: 12, padding: "16px", marginBottom: 20, border: "1.5px solid #efebe9" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6d4c41", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
                  🚛 Driver Details
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>License Number</label>
                    <input style={inputStyle} placeholder="MH-0120230012345" value={form.licenseNumber} onChange={e => set("licenseNumber", e.target.value)} />
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>License Class</label>
                    <select style={inputStyle} value={form.licenseClass} onChange={e => set("licenseClass", e.target.value)}>
                      <option value="">Select Class</option>
                      {LICENSE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>License Expiry Date</label>
                    <input type="date" style={inputStyle} value={form.licenseExpiry} onChange={e => set("licenseExpiry", e.target.value)} />
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Start Date</label>
                    <input type="date" style={inputStyle} value={form.startDate} onChange={e => set("startDate", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Required field error */}
            {(!form.firstName.trim() || !form.phone.trim()) && (
              <div style={{ fontSize: 12, color: "#e53935", marginBottom: 12 }}>* First Name and Mobile Number are required.</div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={!form.firstName.trim() || !form.phone.trim()}>
                {saved ? <><CheckCircle size={14} /> Saved!</> : editing ? "Save Changes" : "Add User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Export Account Data ─────────────────────────────────────────────────────
const EXPORT_TYPES = [
  { key: "vehicles",    label: "Vehicles",             desc: "Registration, make, model, status" },
  { key: "drivers",     label: "Drivers",              desc: "Name, phone, license details, expiry" },
  { key: "trips",       label: "Trips",                desc: "Routes, freight amounts, dates" },
  { key: "expenses",    label: "All Expenses",         desc: "Every expense — fuel, toll, maintenance, etc." },
  { key: "fuel",        label: "Fuel Log",             desc: "Only fuel entries with amounts" },
  { key: "profit_loss", label: "Profit & Loss Report", desc: "Trip-wise revenue, expenses, profit & margin" },
];

function ExportSettings() {
  const [selected, setSelected] = useState<Record<string,boolean>>({
    vehicles: true, drivers: true, trips: true,
    expenses: true, fuel: true, profit_loss: true,
  });
  const [format, setFormat]       = useState<"xlsx"|"csv">("xlsx");
  const [exporting, setExporting] = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState("");

  const toggle = (key: string) => setSelected(p => ({ ...p, [key]: !p[key] }));
  const allOn  = Object.values(selected).every(Boolean);
  const toggleAll = () => {
    const val = !allOn;
    setSelected(Object.fromEntries(EXPORT_TYPES.map(t => [t.key, val])));
  };

  const handleExport = async () => {
    const types = Object.entries(selected).filter(([,v]) => v).map(([k]) => k).join(",");
    if (!types) { setError("Select at least one data type."); return; }
    setError(""); setExporting(true); setDone(false);

    const orgName = localStorage.getItem("orgName") || "My Fleet";
    const url = `${process.env.NEXT_PUBLIC_API_URL}/export/?format=${format}&types=${types}&org_name=${encodeURIComponent(orgName)}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `fleetsure_export_${new Date().toISOString().slice(0,10)}.${format === "xlsx" ? "xlsx" : "zip"}`;
      a.click();
      URL.revokeObjectURL(a.href);
      setDone(true);
      setTimeout(() => setDone(false), 4000);
    } catch {
      setError("Export failed. Make sure the backend is running.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>Export Account Data</h2>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-muted)" }}>
        Download your fleet data for accounting, backup, or reporting.
      </p>

      {/* Info banner */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border-input)", marginBottom: 24 }}>
        <span style={{ fontSize: 16, marginTop: 1 }}>💡</span>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
          XLSX format includes all data in one file with multiple sheets — best for sharing with your accountant.
          CSV exports a ZIP folder, useful for large datasets or importing into other software.
        </div>
      </div>

      {/* Select Data */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Select Data to Include</span>
          <button onClick={toggleAll} style={{ fontSize: 12, color: "#1E2D8E", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
            {allOn ? "Deselect All" : "Select All"}
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {EXPORT_TYPES.map(t => (
            <label key={t.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${selected[t.key] ? "#1E2D8E" : "var(--border-input)"}`, background: selected[t.key] ? "var(--bg-hover)" : "var(--bg-card)", cursor: "pointer", transition: "all 0.15s" }}>
              <input
                type="checkbox"
                checked={selected[t.key]}
                onChange={() => toggle(t.key)}
                style={{ width: 16, height: 16, accentColor: "#1E2D8E", cursor: "pointer", flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-main)" }}>{t.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 1 }}>{t.desc}</div>
              </div>
              {selected[t.key] && <CheckCircle size={15} color="#1E2D8E" style={{ marginLeft: "auto", flexShrink: 0 }} />}
            </label>
          ))}
        </div>
      </div>

      {/* Export Format */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Export Format</div>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { val: "xlsx", label: "Excel (.xlsx)", icon: "📊", desc: "One file, multiple sheets. Best for accountants." },
            { val: "csv",  label: "CSV (.zip)",    icon: "📁", desc: "Multiple CSV files in a ZIP. For large data." },
          ].map(f => (
            <label key={f.val} onClick={() => setFormat(f.val as any)} style={{
              flex: 1, padding: "14px 16px", borderRadius: 12, cursor: "pointer",
              border: `2px solid ${format === f.val ? "#1E2D8E" : "var(--border-input)"}`,
              background: format === f.val ? "var(--bg-hover)" : "var(--bg-card)",
              transition: "all 0.15s"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <input type="radio" checked={format === f.val} onChange={() => setFormat(f.val as any)} style={{ accentColor: "#1E2D8E" }} />
                <span style={{ fontSize: 15 }}>{f.icon}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-main)" }}>{f.label}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", paddingLeft: 26 }}>{f.desc}</div>
            </label>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>
          For large fleets, use CSV to avoid Excel row limits.
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#fce4ec", color: "#b71c1c", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <XCircle size={15} /> {error}
        </div>
      )}

      {/* Success */}
      {done && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#e6f4ea", color: "#1a7a34", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle size={15} /> Export downloaded successfully!
        </div>
      )}

      {/* CTA */}
      <button
        className="btn-primary"
        onClick={handleExport}
        disabled={exporting}
        style={{ fontSize: 14, padding: "10px 24px", opacity: exporting ? 0.7 : 1, gap: 8 }}
      >
        <Download size={16} />
        {exporting ? "Preparing export..." : "Export Data"}
      </button>
    </div>
  );
}

// ─── Billing & Subscriptions ──────────────────────────────────────────────────
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 799,
    trucks: "Up to 5 trucks",
    color: "#1E2D8E",
    bg: "#eef0fb",
    border: "#c5caf5",
    features: [
      "Vehicle & driver management",
      "Trip sheet & expense logging",
      "Compliance date tracking",
      "Basic P&L per trip",
      "Data export (Excel / CSV)",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 1999,
    trucks: "6 – 20 trucks",
    color: "#1565c0",
    bg: "#e3f2fd",
    border: "#90caf9",
    popular: true,
    features: [
      "Everything in Starter",
      "Monthly P&L report per truck",
      "Driver payment ledger",
      "Fuel theft detection (km/L analysis)",
      "Compliance alerts (SMS / WhatsApp)",
      "Priority support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 3999,
    trucks: "21 – 50 trucks",
    color: "#6a1b9a",
    bg: "#f3e5f5",
    border: "#ce93d8",
    features: [
      "Everything in Growth",
      "WhatsApp trip sheet sharing",
      "Customer / party ledger",
      "Accounts receivable tracker",
      "Multi-user access with roles",
      "Dedicated account manager",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    trucks: "50+ trucks",
    color: "#2e7d32",
    bg: "#e8f5e9",
    border: "#a5d6a7",
    features: [
      "Everything in Pro",
      "Custom integrations (GPS, ERP)",
      "SLA-backed uptime guarantee",
      "Bulk data migration support",
      "Custom reporting & dashboards",
      "On-site onboarding",
    ],
  },
];

function BillingSettings() {
  const [currentPlan] = useState("trial");
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>Billing & Subscriptions</h2>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-muted)" }}>
        Choose the plan that fits your fleet size. All plans include a 14-day free trial — no credit card required.
      </p>

      {/* Current plan banner */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "13px 18px", borderRadius: 12, marginBottom: 24,
        background: "linear-gradient(135deg, #1E2D8E 0%, #3949ab 100%)",
        color: "white",
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7, marginBottom: 2 }}>Current Plan</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Free Trial — Explore all features. Upgrade anytime.</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 8, background: "rgba(255,255,255,0.18)", color: "white", whiteSpace: "nowrap" }}>
          Payment coming soon
        </span>
      </div>

      {/* Plan cards — 4 in a row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {PLANS.map(plan => {
          const isHovered = hoveredPlan === plan.id;
          return (
          <div
            key={plan.id}
            onMouseEnter={() => setHoveredPlan(plan.id)}
            onMouseLeave={() => setHoveredPlan(null)}
            style={{
              border: `2px solid ${isHovered || plan.popular ? plan.color : plan.border}`,
              borderRadius: 14, padding: "18px 16px 16px",
              background: isHovered ? plan.bg : "var(--bg-card)",
              position: "relative", cursor: "default",
              transform: isHovered ? "translateY(-6px) scale(1.02)" : "translateY(0) scale(1)",
              boxShadow: isHovered
                ? `0 16px 40px ${plan.color}33`
                : plan.popular ? `0 4px 16px ${plan.color}22` : "none",
              transition: "all 0.2s ease",
              display: "flex", flexDirection: "column",
            }}>
            {plan.popular && (
              <div style={{
                position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                background: plan.color, color: "white",
                fontSize: 9.5, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
              }}>
                Most Popular
              </div>
            )}

            {/* Plan header */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: plan.color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>
                {plan.name}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3, marginBottom: 10 }}>
                <Truck size={10} style={{ flexShrink: 0 }} /> {plan.trucks}
              </div>
              {plan.price ? (
                <div>
                  <span style={{ fontSize: 26, fontWeight: 800, color: plan.color }}>₹{plan.price.toLocaleString("en-IN")}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}> /mo</span>
                </div>
              ) : (
                <span style={{ fontSize: 20, fontWeight: 800, color: plan.color }}>Custom</span>
              )}
            </div>
            <div style={{ height: 1, background: `${plan.color}22`, marginBottom: 14 }} />

            {/* Features */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16, flex: 1 }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 11.5, color: "var(--text-main)", lineHeight: 1.4 }}>
                  <CheckCircle size={12} color={plan.color} style={{ flexShrink: 0, marginTop: 1 }} />
                  {f}
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              disabled
              title="Payment integration coming soon — Razorpay setup in progress"
              style={{
                width: "100%", padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
                border: `1.5px solid ${plan.color}`,
                background: isHovered || plan.popular ? plan.color : "transparent",
                color: isHovered || plan.popular ? "white" : plan.color,
                cursor: "not-allowed",
                transition: "all 0.2s ease",
              }}>
              {plan.price ? "Upgrade — Coming Soon" : "Contact Us"}
            </button>
          </div>
          );
        })}
      </div>

      {/* FAQ strip */}
      <div style={{ borderRadius: 12, background: "var(--bg-subtle)", border: "1px solid var(--border)", padding: "18px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
          Common Questions
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
          {[
            { q: "Is billing per truck or per fleet?", a: "Per fleet — one flat price regardless of how many trucks you manage within the plan limit." },
            { q: "Can I change plans later?", a: "Yes. Upgrade or downgrade anytime. Prorated billing will be applied." },
            { q: "What payment methods are accepted?", a: "UPI, cards, net banking via Razorpay. GST invoice provided automatically." },
            { q: "What happens after the free trial?", a: "You'll be prompted to pick a plan. Your data is never deleted — we give you 7 days grace period." },
          ].map(item => (
            <div key={item.q}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-main)", marginBottom: 3 }}>{item.q}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{item.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Integrations ─────────────────────────────────────────────────────────────
function IntegrationsSettings() {
  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>Integrations</h2>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--text-muted)" }}>Services connected to your FleetSure account</p>

      {/* ── Vahan RC Lookup ── */}
      <div style={{ border: "1.5px solid var(--border-input)", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, background: "var(--bg-subtle)" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🚗</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)" }}>Vahan RC Lookup</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: "#fff3e0", color: "#e65100" }}>Coming Soon</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Auto-fill make, model, fuel type, insurance & PUC expiry from any registration number
            </div>
          </div>
        </div>
      </div>

      {/* ── Coming soon ── */}
      {[
        { icon: "🏷️", label: "FASTag Integration", desc: "Auto-import toll transactions from your FASTag account" },
        { icon: "📍", label: "GPS Tracking",        desc: "Live vehicle location from Jio GPS, Tracksolid, and others" },
      ].map(item => (
        <div key={item.label} style={{ border: "1.5px solid var(--border-input)", borderRadius: 12, overflow: "hidden", opacity: 0.6, marginBottom: 10 }}>
          <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, background: "var(--bg-subtle)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f0f0f8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>{item.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, background: "#fff3e0", color: "#e65100" }}>Coming Soon</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{item.desc}</div>
            </div>
          </div>
        </div>
      ))}

    </div>
  );
}

// ─── Appearance & Theme ───────────────────────────────────────────────────────
function AppearanceSettings() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [saved, setSaved]  = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as "light" | "dark") || "light";
    setTheme(stored);
  }, []);

  const apply = (t: "light" | "dark") => {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const card = (mode: "light" | "dark") => {
    const active = theme === mode;
    return (
      <div onClick={() => apply(mode)} style={{
        flex: 1, borderRadius: 14, border: active ? "2.5px solid #1E2D8E" : "2px solid #e8e8f0",
        background: mode === "dark" ? "#1a1d2e" : "#f4f5f9",
        padding: "24px 20px 18px", cursor: "pointer", transition: "all 0.18s",
        boxShadow: active ? "0 0 0 3px rgba(30,45,142,0.12)" : "none",
        position: "relative"
      }}>
        {active && (
          <div style={{ position: "absolute", top: 10, right: 10, background: "#1E2D8E", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={13} color="white" />
          </div>
        )}
        {/* Mini UI preview */}
        <div style={{ borderRadius: 8, background: mode === "dark" ? "#0f1117" : "#fff", padding: "10px 12px", marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
          <div style={{ height: 8, width: "60%", borderRadius: 4, background: mode === "dark" ? "#2a2d42" : "#e8eaf6", marginBottom: 6 }} />
          <div style={{ height: 6, width: "40%", borderRadius: 4, background: mode === "dark" ? "#1e2235" : "#f0f0f5" }} />
          <div style={{ marginTop: 10, height: 24, borderRadius: 6, background: "#1E2D8E", width: "50%", opacity: 0.8 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {mode === "light" ? <Sun size={15} color="#e65100" /> : <Moon size={15} color="#7c8ef0" />}
          <span style={{ fontSize: 13.5, fontWeight: 600, color: mode === "dark" ? "#e8e8f2" : "#1a1a2e" }}>
            {mode === "light" ? "Day Mode" : "Night Mode"}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: mode === "dark" ? "#6b7280" : "#999", marginTop: 4 }}>
          {mode === "light" ? "Clean white interface" : "Easy on the eyes at night"}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>Appearance & Theme</h2>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--text-muted)" }}>Choose how FleetSure looks for you</p>

      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12 }}>THEME</div>
      <div style={{ display: "flex", gap: 16, maxWidth: 400 }}>
        {card("light")}
        {card("dark")}
      </div>

      {saved && (
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6, color: "#1a7a34", fontSize: 13, fontWeight: 500 }}>
          <CheckCircle size={15} /> Theme applied instantly
        </div>
      )}
    </div>
  );
}

// ─── Login & Password ─────────────────────────────────────────────────────────
function PasswordSettings() {
  const [form, setForm]   = useState({ current: "", newPw: "", confirm: "" });
  const [show, setShow]   = useState({ current: false, newPw: false, confirm: false });
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const set = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setStatus("idle"); };
  const toggleShow = (k: string) => setShow(p => ({ ...p, [k]: !p[k as keyof typeof p] }));

  // Strength calculation
  const strength = (() => {
    const p = form.newPw;
    let score = 0;
    if (p.length >= 8)  score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  })();
  const strengthLabel = ["", "Weak", "Weak", "Fair", "Strong", "Very Strong"][strength];
  const strengthColor = ["#ddd", "#e53935", "#e53935", "#f57c00", "#1a7a34", "#1a7a34"][strength];

  const handleSave = () => {
    if (!form.current) { setErrMsg("Enter your current password"); setStatus("error"); return; }
    if (form.newPw.length < 8) { setErrMsg("New password must be at least 8 characters"); setStatus("error"); return; }
    if (form.newPw !== form.confirm) { setErrMsg("Passwords do not match"); setStatus("error"); return; }
    // TODO: wire to real API when auth is added
    setStatus("success");
    setForm({ current: "", newPw: "", confirm: "" });
    setTimeout(() => setStatus("idle"), 3000);
  };

  const field = (key: "current" | "newPw" | "confirm", label: string) => (
    <div>
      <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show[key] ? "text" : "password"}
          value={form[key]}
          placeholder="••••••••"
          onChange={e => set(key, e.target.value)}
          style={{ width: "100%", padding: "9px 40px 9px 12px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13.5, background: "var(--bg-card)", color: "var(--text-main)" }}
        />
        <button onClick={() => toggleShow(key)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}>
          {show[key] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>Login & Password</h2>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--text-muted)" }}>Update your password to keep your account secure</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 }}>
        {field("current", "Current Password")}
        {field("newPw", "New Password")}

        {/* Strength bar */}
        {form.newPw.length > 0 && (
          <div>
            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= strength ? strengthColor : "#e8e8f0", transition: "background 0.2s" }} />
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: strengthColor, fontWeight: 600 }}>{strengthLabel}</div>
          </div>
        )}

        {field("confirm", "Confirm New Password")}

        {/* Match indicator */}
        {form.confirm.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
            {form.newPw === form.confirm
              ? <><CheckCircle size={14} color="#1a7a34" /><span style={{ color: "#1a7a34" }}>Passwords match</span></>
              : <><XCircle size={14} color="#e53935" /><span style={{ color: "#e53935" }}>Passwords do not match</span></>
            }
          </div>
        )}
      </div>

      {/* Status messages */}
      {status === "error" && (
        <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "#fce4ec", color: "#b71c1c", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <XCircle size={15} /> {errMsg}
        </div>
      )}
      {status === "success" && (
        <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "#e6f4ea", color: "#1a7a34", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle size={15} /> Password updated successfully!
        </div>
      )}

      <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
        <button className="btn-primary" onClick={handleSave}>Update Password</button>
        <button className="btn-outline" onClick={() => { setForm({ current: "", newPw: "", confirm: "" }); setStatus("idle"); }}>Cancel</button>
      </div>
    </div>
  );
}

// Toggle switch component
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{
      width: 38, height: 22, borderRadius: 11, cursor: "pointer", flexShrink: 0,
      background: on ? "#1E2D8E" : "#ddd", transition: "background 0.2s", position: "relative"
    }}>
      <div style={{
        position: "absolute", top: 3, left: on ? 19 : 3, width: 16, height: 16,
        borderRadius: "50%", background: "var(--bg-card)", transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
      }} />
    </div>
  );
}

// ─── Notification Settings panel ──────────────────────────────────────────────
function NotificationSettings() {
  const LS_KEY = "notifSettings";
  const defaultSettings = () => {
    const base: Record<string, any> = {
      channel_email: true,
      channel_whatsapp: false,
      channel_mobile: false,
      wa_number: "",
    };
    NOTIF_CATEGORIES.forEach(cat =>
      cat.items.forEach(item => {
        base[`${item.key}_email`]     = false;
        base[`${item.key}_whatsapp`]  = false;
      })
    );
    // Sensible defaults on
    ["insurance_expiry","puc_expiry","fitness_expiry","permit_expiry","dl_expiry","fastag_low","trip_completed"].forEach(k => {
      base[`${k}_email`]    = true;
      base[`${k}_whatsapp`] = true;
    });
    ["trip_started","service_due","breakdown","monthly_expense"].forEach(k => {
      base[`${k}_email`] = true;
    });
    return base;
  };

  const [s, setS] = useState<Record<string, any>>(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) setS(JSON.parse(stored));
  }, []);

  const toggle = (key: string) => setS(prev => ({ ...prev, [key]: !prev[key] }));
  const set    = (key: string, val: any) => setS(prev => ({ ...prev, [key]: val }));

  const save = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const channelActive = (ch: string) => s[`channel_${ch}`];

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>Notification Settings</h2>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--text-muted)" }}>Choose how and when FleetSure alerts you</p>

      {/* ── How you get notified ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
          How You Get Notified
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Email */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 10, border: "1.5px solid var(--border-input)", background: s.channel_email ? "var(--bg-hover)" : "var(--bg-card)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Mail size={17} color="#1E2D8E" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>Email</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Alerts sent to your registered email</div>
              </div>
            </div>
            <Toggle on={s.channel_email} onChange={() => toggle("channel_email")} />
          </div>

          {/* WhatsApp */}
          <div style={{ border: "1.5px solid var(--border-input)", borderRadius: 10, overflow: "hidden", background: s.channel_whatsapp ? "var(--bg-hover)" : "var(--bg-card)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MessageCircle size={17} color="#2e7d32" />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>WhatsApp</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 8, background: "#e8f5e9", color: "#2e7d32" }}>Recommended</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Instant alerts on WhatsApp — most fleet owners prefer this</div>
                </div>
              </div>
              <Toggle on={s.channel_whatsapp} onChange={() => toggle("channel_whatsapp")} />
            </div>
            {s.channel_whatsapp && (
              <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--border)" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", margin: "10px 0 6px" }}>WhatsApp Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={s.wa_number}
                  onChange={e => set("wa_number", e.target.value)}
                  style={{ width: "100%", maxWidth: 280, padding: "8px 12px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }}
                />
              </div>
            )}
          </div>

          {/* Mobile App */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 10, border: "1.5px solid var(--border-input)", opacity: 0.6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Smartphone size={17} color="#aaa" />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>Mobile App Push</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 8, background: "#fff3e0", color: "#e65100" }}>Coming Soon</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Push notifications on Android & iOS</div>
              </div>
            </div>
            <Toggle on={false} onChange={() => {}} />
          </div>

        </div>
      </div>

      {/* ── What you get notified about ── */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        What You Get Notified About
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px" }}>
        Toggle per channel. Channels must be enabled above to receive alerts.
      </p>

      {/* Column headers */}
      <div style={{ display: "flex", alignItems: "center", padding: "6px 14px", marginBottom: 4 }}>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 32, marginRight: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: s.channel_email ? "#1E2D8E" : "#bbb", width: 52, textAlign: "center" }}>Email</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: s.channel_whatsapp ? "#2e7d32" : "#bbb", width: 52, textAlign: "center" }}>WhatsApp</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {NOTIF_CATEGORIES.map(cat => (
          <div key={cat.id} style={{ border: "1.5px solid var(--border-input)", borderRadius: 12, overflow: "hidden" }}>
            {/* Category header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
              <cat.icon size={15} color={cat.color} />
              <span style={{ fontSize: 13, fontWeight: 700, color: cat.color }}>{cat.label}</span>
            </div>

            {/* Notification rows */}
            {cat.items.map((item, idx) => (
              <div key={item.key} style={{
                display: "flex", alignItems: "center", padding: "11px 16px",
                borderBottom: idx < cat.items.length - 1 ? "1px solid var(--border)" : "none",
                background: "var(--bg-card)"
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-main)" }}>{item.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{item.desc}</div>
                </div>
                <div style={{ display: "flex", gap: 32, marginRight: 4 }}>
                  {/* Email toggle */}
                  <div style={{ width: 52, display: "flex", justifyContent: "center", opacity: s.channel_email ? 1 : 0.35 }}>
                    <Toggle
                      on={s[`${item.key}_email`]}
                      onChange={() => s.channel_email && toggle(`${item.key}_email`)}
                    />
                  </div>
                  {/* WhatsApp toggle */}
                  <div style={{ width: 52, display: "flex", justifyContent: "center", opacity: s.channel_whatsapp ? 1 : 0.35 }}>
                    <Toggle
                      on={s[`${item.key}_whatsapp`]}
                      onChange={() => s.channel_whatsapp && toggle(`${item.key}_whatsapp`)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28, display: "flex", gap: 10 }}>
        <button className="btn-primary" onClick={save}>
          {saved ? "✓ Saved!" : "Save Changes"}
        </button>
        <button className="btn-outline">Cancel</button>
      </div>
    </div>
  );
}

// ─── Main settings page ───────────────────────────────────────────────────────
function SettingsInner() {
  const searchParams = useSearchParams();
  const [active, setActive] = useState(() => searchParams.get("tab") || "profile");
  const [search, setSearch] = useState("");

  // Sync active tab when URL param changes (e.g. clicking dropdown links)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActive(tab);
  }, [searchParams]);
  const [saved, setSaved]         = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [orgLogo, setOrgLogo]     = useState<string>("");
  const logoInputRef              = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormValues(prev => ({
      ...prev,
      org_name: localStorage.getItem("orgName") || "",
      name: localStorage.getItem("userName") || "",
    }));
    setOrgLogo(localStorage.getItem("orgLogo") || "");
  }, []);

  const content = CONTENT[active];

  const filteredSections = SECTIONS.map(s => ({
    ...s,
    items: s.items.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
  })).filter(s => s.items.length > 0);

  const handleSave = () => {
    if (formValues.org_name !== undefined) localStorage.setItem("orgName", formValues.org_name);
    if (orgLogo)                           localStorage.setItem("orgLogo", orgLogo);
    if (formValues.name !== undefined)     localStorage.setItem("userName", formValues.name);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    window.dispatchEvent(new Event("orgSettingsUpdated"));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setOrgLogo(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <Header title="Settings" subtitle="Manage your account and fleet preferences" />
      <div style={{ display: "flex", padding: "24px 28px", gap: 24, alignItems: "flex-start" }}>

        {/* ── Left sidebar ── */}
        <div className="card" style={{ width: 260, flexShrink: 0, padding: "12px 8px", color: "var(--text-main)" }}>
          <div style={{ position: "relative", marginBottom: 12, padding: "0 6px" }}>
            <Search size={14} style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search settings..."
              style={{ width: "100%", padding: "7px 10px 7px 32px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
          </div>

          {filteredSections.map(section => (
            <div key={section.label} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "6px 12px" }}>
                {section.label}
              </div>
              {section.items.map(item => (
                <button key={item.id} onClick={() => setActive(item.id)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left",
                    background: active === item.id ? "var(--bg-hover)" : "transparent", transition: "background 0.15s" }}
                  onMouseEnter={e => { if (active !== item.id) e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => { if (active !== item.id) e.currentTarget.style.background = "transparent"; }}>
                  <item.icon size={15} color={active === item.id ? "#1E2D8E" : "var(--text-muted)"} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: active === item.id ? "#1E2D8E" : "var(--text-sub)", flex: 1 }}>{item.label}</span>
                  {(item as any).badge && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10,
                      background: (item as any).badge === "Recommended" ? "#e8f5e9" : "#fff3e0",
                      color: (item as any).badge === "Recommended" ? "#2e7d32" : "#e65100" }}>
                      {(item as any).badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* ── Right content ── */}
        <div className="card" style={{ flex: 1, color: "var(--text-main)" }}>

          {/* Custom panels */}
          {active === "notifications" ? (
            <NotificationSettings />
          ) : active === "appearance" ? (
            <AppearanceSettings />
          ) : active === "password" ? (
            <PasswordSettings />
          ) : active === "export" ? (
            <ExportSettings />
          ) : active === "manage-users" ? (
            <ManageUsers />
          ) : active === "billing" ? (
            <BillingSettings />
          ) : active === "integrations" ? (
            <IntegrationsSettings />

          ) : content ? (
            <>
              <h2 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700 }}>{content.title}</h2>
              <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--text-muted)" }}>
                {SECTIONS.flatMap(s => s.items).find(i => i.id === active)?.desc}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
                {content.fields.map((f: any) => (
                  <div key={f.key}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>{f.label}</label>

                    {f.type === "logo_upload" ? (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                          {orgLogo
                            ? <img src={orgLogo} alt="Logo preview" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", border: "2px solid #e8e8f0" }} />
                            : <div style={{ width: 56, height: 56, borderRadius: 10, background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#1E2D8E" }}>F</div>
                          }
                          <div>
                            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 4 }}>{orgLogo ? "Logo uploaded ✓" : "No logo uploaded yet"}</div>
                            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>PNG, JPG or SVG. Recommended 64×64px.</div>
                          </div>
                        </div>
                        <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn-outline" onClick={() => logoInputRef.current?.click()}
                            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                            <Upload size={13} /> Upload Logo
                          </button>
                          {orgLogo && (
                            <button className="btn-outline" onClick={() => { setOrgLogo(""); localStorage.removeItem("orgLogo"); window.dispatchEvent(new Event("orgSettingsUpdated")); }}
                              style={{ fontSize: 13, color: "#e53935", borderColor: "#e53935" }}>
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                    ) : f.type === "select" ? (
                      <select style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13.5, color: "var(--text-main)", background: "var(--bg-card)" }}>
                        {f.options.map((o: string) => <option key={o}>{o}</option>)}
                      </select>

                    ) : (
                      <input type={f.type} placeholder={f.placeholder}
                        value={formValues[f.key] ?? ""}
                        onChange={e => setFormValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                        style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13.5, color: "var(--text-main)", background: "var(--bg-card)" }} />
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 28, display: "flex", gap: 10 }}>
                <button className="btn-primary" onClick={handleSave}>{saved ? "✓ Saved!" : "Save Changes"}</button>
                <button className="btn-outline">Cancel</button>
              </div>
            </>

          ) : (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <Settings size={40} color="#e8eaf6" style={{ margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Select a setting from the left to configure it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense — required by Next.js App Router when using useSearchParams()
export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "var(--text-muted)", fontSize: 14 }}>
        Loading settings...
      </div>
    }>
      <SettingsInner />
    </Suspense>
  );
}
