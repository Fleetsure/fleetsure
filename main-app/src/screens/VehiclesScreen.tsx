import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ScrollView, RefreshControl, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { ChevronDown, Check, Bell, Search, AlertCircle, Plus, Truck, Pencil, Trash2, ArrowLeft, type LucideIcon } from "lucide-react-native";
import { vehicleService } from "../services/vehicleService";
import type { Vehicle } from "../types";

import { PRIMARY, BG, CARD, TEXT, MUTED, BORDER, DANGER, SUCCESS, WARNING } from "../theme";
import { DateField, isoToDisplay } from "../components/DateField";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:      { bg: "#F0FDF4", color: SUCCESS, label: "Active" },
  in_trip:     { bg: "#FFF7ED", color: WARNING, label: "On Trip" },
  maintenance: { bg: "#FEF2F2", color: DANGER,  label: "Maintenance" },
  inactive:    { bg: "#F3F4F6", color: MUTED,   label: "Inactive" },
};

// Must match the `vehicletype` Postgres enum (lowercase/snake_case) — the
// DB rejects anything else. Display labels are mapped separately below.
const VEHICLE_TYPES = ["truck", "mini_truck", "trailer", "tanker", "container", "other"];
const VEHICLE_TYPE_LABELS: Record<string, string> = {
  truck: "Truck", mini_truck: "Mini-Truck", trailer: "Trailer",
  tanker: "Tanker", container: "Container", other: "Other",
};
const FUEL_TYPES      = ["Diesel", "Petrol", "CNG", "Electric"];
const STATUS_OPTIONS  = ["active", "in_trip", "maintenance", "inactive"];

function daysUntil(d: string | null | undefined) {
  if (!d) return null;
  return Math.floor((new Date(d).getTime() - Date.now()) / 86_400_000);
}

function ComplianceBadge({ label, days }: { label: string; days: number | null }) {
  if (days === null) return null;
  const ok = days > 30;
  const warn = days >= 0 && days <= 30;
  const color = days < 0 ? DANGER : warn ? WARNING : SUCCESS;
  const bg    = days < 0 ? "#FEF2F2" : warn ? "#FFF7ED" : "#F0FDF4";
  return (
    <View style={{ alignItems: "center", minWidth: 64 }}>
      <Text style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>{label}</Text>
      <View style={{ backgroundColor: bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
        <Text style={{ fontSize: 11, fontWeight: "700", color }}>
          {days < 0 ? "Expired" : ok ? "OK" : `${days}d`}
        </Text>
      </View>
    </View>
  );
}

function PickerRow({ label, value, options, onSelect, labels }: {
  label: string; value: string; options: string[]; onSelect: (v: string) => void; labels?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const displayFor = (opt: string) => labels?.[opt] ?? STATUS_STYLE[opt]?.label ?? opt;
  return (
    <View style={f.fieldGroup}>
      <Text style={f.label}>{label}</Text>
      <TouchableOpacity style={f.pickerBtn} onPress={() => setOpen(true)}>
        <Text style={f.pickerText}>{value ? displayFor(value) : "Select…"}</Text>
        <ChevronDown size={16} color={MUTED} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={f.overlay} onPress={() => setOpen(false)}>
          <View style={f.sheet}>
            <Text style={f.sheetTitle}>{label}</Text>
            {options.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[f.sheetOption, opt === value && f.sheetOptionActive]}
                onPress={() => { onSelect(opt); setOpen(false); }}
              >
                <Text style={[f.sheetOptionText, opt === value && { color: PRIMARY, fontWeight: "700" }]}>
                  {displayFor(opt)}
                </Text>
                {opt === value && <Check size={16} color={PRIMARY} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize }: any) {
  return (
    <View style={f.fieldGroup}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={f.input} value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor={MUTED}
        keyboardType={keyboardType ?? "default"} autoCapitalize={autoCapitalize ?? "words"}
      />
    </View>
  );
}

const emptyForm = (): Partial<Vehicle> => ({
  registration_number: "", make: "", model: "", year: undefined,
  vehicle_type: "truck", fuel_type: "Diesel", status: "active",
  color: "", chassis_number: "", engine_number: "", owner_name: "",
  insurance_expiry: "", fitness_expiry: "", permit_expiry: "",
  puc_expiry: "", avg_mileage_kmpl: undefined,
});

export default function VehiclesScreen() {
  const [vehicles,   setVehicles]   = useState<Vehicle[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState("");
  const [modal,      setModal]      = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);
  const [form,       setForm]       = useState<Partial<Vehicle>>(emptyForm());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "maintenance" | "insurance_due">("all");

  const load = useCallback(async () => {
    const r = await vehicleService.getAll();
    if (r.success) setVehicles(r.data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openAdd  = () => { setEditId(null); setForm(emptyForm()); setModal(true); };
  const openEdit = (v: Vehicle) => {
    setEditId(v.id);
    setForm({
      registration_number: v.registration_number, make: v.make, model: v.model,
      year: v.year ?? undefined, vehicle_type: v.vehicle_type ?? "Truck",
      fuel_type: v.fuel_type ?? "Diesel", status: v.status ?? "active",
      color: v.color ?? "", chassis_number: v.chassis_number ?? "",
      engine_number: v.engine_number ?? "", owner_name: v.owner_name ?? "",
      insurance_expiry: v.insurance_expiry ?? "", fitness_expiry: v.fitness_expiry ?? "",
      permit_expiry: v.permit_expiry ?? "", puc_expiry: v.puc_expiry ?? "",
      avg_mileage_kmpl: v.avg_mileage_kmpl ?? undefined,
    });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.registration_number?.trim()) { Alert.alert("Required", "Registration number is required."); return; }
    if (!form.make?.trim() || !form.model?.trim()) { Alert.alert("Required", "Make and model are required."); return; }
    if (!form.insurance_expiry) { Alert.alert("Required", "Insurance expiry date is required."); return; }
    if (!form.fitness_expiry)   { Alert.alert("Required", "Fitness certificate expiry is required."); return; }
    if (!form.permit_expiry)    { Alert.alert("Required", "Permit expiry date is required."); return; }
    if (!form.puc_expiry)       { Alert.alert("Required", "PUC expiry date is required."); return; }
    setSaving(true);
    const payload = {
      registration_number: form.registration_number.trim().toUpperCase(),
      make: form.make.trim(), model: form.model.trim(),
      year: form.year || null, vehicle_type: form.vehicle_type || "truck",
      fuel_type: form.fuel_type || "Diesel", status: form.status || "active",
      color: form.color?.trim() || null, chassis_number: form.chassis_number?.trim() || null,
      engine_number: form.engine_number?.trim() || null, owner_name: form.owner_name?.trim() || null,
      insurance_expiry: form.insurance_expiry || null, fitness_expiry: form.fitness_expiry || null,
      permit_expiry: form.permit_expiry || null, puc_expiry: form.puc_expiry || null,
      avg_mileage_kmpl: form.avg_mileage_kmpl || null,
    };
    const res = editId
      ? await vehicleService.update(editId, payload)
      : await vehicleService.create(payload as any);
    if (res.success) { setModal(false); load(); }
    else Alert.alert("Error", res.error ?? "Could not save vehicle.");
    setSaving(false);
  };

  const handleDelete = (v: Vehicle) => {
    Alert.alert("Delete Vehicle", `Delete ${v.registration_number}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await vehicleService.delete(v.id); load(); } },
    ]);
  };

  const setF = (k: keyof Vehicle, v: any) => setForm(f => ({ ...f, [k]: v }));

  // Summary counts
  const available    = vehicles.filter(v => v.status === "active").length;
  const onTrip       = vehicles.filter(v => v.status === "in_trip").length;
  const maintenance  = vehicles.filter(v => v.status === "maintenance").length;
  const insDue       = vehicles.filter(v => {
    const d = daysUntil(v.insurance_expiry);
    return d !== null && d <= 30;
  }).length;

  const filtered = vehicles
    .filter(v =>
      !search ||
      v.registration_number.toLowerCase().includes(search.toLowerCase()) ||
      v.make.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase())
    )
    .filter(v => {
      if (statusFilter === "maintenance") return v.status === "maintenance";
      if (statusFilter === "insurance_due") {
        const d = daysUntil(v.insurance_expiry);
        return d !== null && d <= 30;
      }
      return true;
    });

  // Tapping a stat card jumps straight to the matching vehicle(s); if there's
  // exactly one match, expand it directly instead of leaving the user to find
  // it in the filtered list.
  const applyStatusFilter = (mode: "maintenance" | "insurance_due") => {
    const next = statusFilter === mode ? "all" : mode;
    setStatusFilter(next);
    if (next === "all") { setExpandedId(null); return; }
    const matches = vehicles.filter(v =>
      next === "maintenance"
        ? v.status === "maintenance"
        : (d => d !== null && d <= 30)(daysUntil(v.insurance_expiry))
    );
    setExpandedId(matches.length === 1 ? matches[0].id : null);
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={PRIMARY} size="large" /></View>;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Vehicles</Text>
          <Text style={s.sub}>{vehicles.length} vehicles in your fleet</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.iconBtn}>
            <Bell size={20} color={MUTED} />
          </TouchableOpacity>
          <TouchableOpacity style={s.searchBtn}>
            <Search size={15} color={MUTED} />
            <Text style={s.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary grid */}
      <View style={s.summaryGrid}>
        <SCard value={vehicles.length} label="Total Vehicles" color={PRIMARY}  bg="#EEF2FF" icon={Truck} />
        <SCard value={available}       label="Available"       color={SUCCESS}  bg="#F0FDF4" icon={Check} />
        <SCard value={onTrip}          label="On Trip"         color={WARNING}  bg="#FFF7ED" icon={Bell} />
        <SCard
          value={maintenance} label="In Maintenance" color={DANGER} bg="#FEF2F2" icon={AlertCircle}
          active={statusFilter === "maintenance"}
          onPress={maintenance > 0 ? () => applyStatusFilter("maintenance") : undefined}
        />
        <SCard
          value={insDue} label="Insurance Due" color={insDue > 0 ? DANGER : SUCCESS} bg={insDue > 0 ? "#FEF2F2" : "#F0FDF4"} icon={AlertCircle}
          active={statusFilter === "insurance_due"}
          onPress={insDue > 0 ? () => applyStatusFilter("insurance_due") : undefined}
        />
      </View>
      {insDue > 0 && (
        <TouchableOpacity style={s.alertBanner} onPress={() => applyStatusFilter("insurance_due")} activeOpacity={0.7}>
          <AlertCircle size={16} color={WARNING} />
          <Text style={s.alertText}>{insDue} vehicle{insDue > 1 ? "s" : ""} with compliance expiring within 30 days</Text>
        </TouchableOpacity>
      )}
      {statusFilter !== "all" && (
        <TouchableOpacity style={s.clearFilterChip} onPress={() => { setStatusFilter("all"); setExpandedId(null); }}>
          <Text style={s.clearFilterText}>
            Showing {statusFilter === "maintenance" ? "vehicles in maintenance" : "vehicles with insurance due"} · Clear
          </Text>
        </TouchableOpacity>
      )}

      {/* Search + Add */}
      <View style={s.searchRow}>
        <View style={s.searchInput}>
          <Search size={16} color={MUTED} />
          <TextInput
            style={s.searchText}
            placeholder="Search vehicles…"
            placeholderTextColor={MUTED}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Plus size={18} color="#fff" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Truck size={48} color={MUTED} />
            <Text style={s.emptyText}>
              {statusFilter !== "all" ? "No vehicles match this filter." : "No vehicles yet. Add your first truck!"}
            </Text>
          </View>
        }
        renderItem={({ item: v }) => {
          const ss       = STATUS_STYLE[v.status ?? "inactive"] ?? STATUS_STYLE.inactive;
          const expanded = expandedId === v.id;
          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => setExpandedId(expanded ? null : v.id)}
              activeOpacity={0.85}
            >
              <View style={s.cardTop}>
                <View style={s.cardLeft}>
                  <Text style={s.regNum}>{v.registration_number}</Text>
                  <Text style={s.makeModel}>{v.make} {v.model}{v.year ? ` · ${v.year}` : ""}</Text>
                  {(v.fuel_type || v.vehicle_type || v.avg_mileage_kmpl) && (
                    <Text style={s.detail}>
                      {[v.fuel_type, v.vehicle_type, v.avg_mileage_kmpl ? `${v.avg_mileage_kmpl} km/l` : null]
                        .filter(Boolean).join(" · ")}
                    </Text>
                  )}
                </View>
                <View style={s.cardRight}>
                  <View style={[s.badge, { backgroundColor: ss.bg }]}>
                    <Text style={[s.badgeText, { color: ss.color }]}>{ss.label}</Text>
                  </View>
                </View>
              </View>

              {/* Compliance row */}
              <View style={s.compRow}>
                <ComplianceBadge label="Insurance" days={daysUntil(v.insurance_expiry)} />
                <ComplianceBadge label="Fitness"   days={daysUntil(v.fitness_expiry)} />
                <ComplianceBadge label="PUC"       days={daysUntil(v.puc_expiry)} />
              </View>

              {expanded && (
                <View style={s.expanded}>
                  <View style={s.detailGrid}>
                    {v.chassis_number && <DItem label="Chassis"  value={v.chassis_number} />}
                    {v.engine_number  && <DItem label="Engine"   value={v.engine_number} />}
                    {v.owner_name     && <DItem label="Owner"    value={v.owner_name} />}
                    {v.color          && <DItem label="Color"    value={v.color} />}
                    {v.permit_expiry  && <DItem label="Permit"   value={isoToDisplay(v.permit_expiry)} />}
                  </View>
                  <View style={s.expandActions}>
                    <TouchableOpacity style={s.editBtn} onPress={() => openEdit(v)}>
                      <Pencil size={14} color={PRIMARY} />
                      <Text style={s.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(v)}>
                      <Trash2 size={14} color={DANGER} />
                      <Text style={s.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Add/Edit Modal */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
            <View style={f.header}>
              <TouchableOpacity onPress={() => setModal(false)} style={f.backBtn}>
                <ArrowLeft size={22} color={TEXT} />
              </TouchableOpacity>
              <Text style={f.title}>{editId ? "Edit Vehicle" : "Add Vehicle"}</Text>
              <View style={{ width: 36 }} />
            </View>
            <ScrollView contentContainerStyle={f.scroll} showsVerticalScrollIndicator={false}>
              <Text style={f.section}>Basic Details</Text>
              <Field label="Registration Number *" value={form.registration_number ?? ""} onChangeText={(v: string) => setF("registration_number", v)} placeholder="e.g. KA01AB1234" autoCapitalize="characters" />
              <Field label="Make *" value={form.make ?? ""} onChangeText={(v: string) => setF("make", v)} placeholder="e.g. Tata" />
              <Field label="Model *" value={form.model ?? ""} onChangeText={(v: string) => setF("model", v)} placeholder="e.g. Prima 2528" />
              <Field label="Year" value={form.year?.toString() ?? ""} onChangeText={(v: string) => setF("year", parseInt(v) || undefined)} placeholder="e.g. 2020" keyboardType="numeric" autoCapitalize="none" />
              <Field label="Color" value={form.color ?? ""} onChangeText={(v: string) => setF("color", v)} placeholder="e.g. White" />
              <PickerRow label="Vehicle Type" value={form.vehicle_type ?? "truck"} options={VEHICLE_TYPES} onSelect={v => setF("vehicle_type", v)} labels={VEHICLE_TYPE_LABELS} />
              <PickerRow label="Fuel Type"    value={form.fuel_type ?? "Diesel"}   options={FUEL_TYPES}    onSelect={v => setF("fuel_type", v)} />
              <PickerRow label="Status"       value={form.status ?? "active"}       options={STATUS_OPTIONS} onSelect={v => setF("status", v)} />

              <Text style={f.section}>Identification</Text>
              <Field label="Chassis Number" value={form.chassis_number ?? ""} onChangeText={(v: string) => setF("chassis_number", v)} placeholder="Optional" autoCapitalize="characters" />
              <Field label="Engine Number"  value={form.engine_number ?? ""}  onChangeText={(v: string) => setF("engine_number", v)}  placeholder="Optional" autoCapitalize="characters" />
              <Field label="Owner Name"     value={form.owner_name ?? ""}     onChangeText={(v: string) => setF("owner_name", v)}     placeholder="Optional" />

              <Text style={f.section}>Compliance Dates</Text>
              <DateField label="Insurance Expiry *" value={form.insurance_expiry} onChangeIso={(v) => setF("insurance_expiry", v)} />
              <DateField label="Fitness Expiry *"   value={form.fitness_expiry}   onChangeIso={(v) => setF("fitness_expiry", v)} />
              <DateField label="Permit Expiry *"    value={form.permit_expiry}    onChangeIso={(v) => setF("permit_expiry", v)} />
              <DateField label="PUC Expiry *"       value={form.puc_expiry}       onChangeIso={(v) => setF("puc_expiry", v)} />

              <Text style={f.section}>Performance</Text>
              <Field label="Avg Mileage (km/L)" value={form.avg_mileage_kmpl?.toString() ?? ""} onChangeText={(v: string) => setF("avg_mileage_kmpl", parseFloat(v) || undefined)} placeholder="e.g. 4.5" keyboardType="decimal-pad" autoCapitalize="none" />
            </ScrollView>
            <View style={f.footer}>
              <TouchableOpacity style={[f.saveBtn, saving && f.disabled]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                  <Text style={f.saveBtnText}>{editId ? "Save Changes" : "Add Vehicle"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function SCard({ value, label, color, bg, icon: Icon, onPress, active }: {
  value: number; label: string; color: string; bg: string; icon: LucideIcon;
  onPress?: () => void; active?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[sc.card, { backgroundColor: bg }, active && sc.cardActive]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <Icon size={20} color={color} />
      <Text style={[sc.value, { color }]}>{value}</Text>
      <Text style={sc.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const sc = StyleSheet.create({
  card: { width: "48%", borderRadius: 12, padding: 12, alignItems: "center", gap: 4 },
  cardActive: { borderWidth: 2, borderColor: PRIMARY },
  value: { fontSize: 22, fontWeight: "800" },
  label: { fontSize: 10, color: MUTED, fontWeight: "500", textAlign: "center" },
});

function DItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 8, flex: 1, minWidth: "45%" }}>
      <Text style={{ fontSize: 11, color: MUTED }}>{label}</Text>
      <Text style={{ fontSize: 13, color: TEXT, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

const f = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: "#C7D2FE" },
  title: { flex: 1, fontSize: 17, fontWeight: "800", color: TEXT, textAlign: "center" },
  section: { fontSize: 12, fontWeight: "700", color: PRIMARY, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 18, marginBottom: 6 },
  scroll: { padding: 16, paddingBottom: 8 },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: MUTED, marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, fontSize: 14, color: TEXT },
  pickerBtn: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pickerText: { fontSize: 14, color: TEXT },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: 400 },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: TEXT, marginBottom: 16, textAlign: "center" },
  sheetOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  sheetOptionActive: { backgroundColor: "#F0F4FF" },
  sheetOptionText: { fontSize: 15, color: TEXT },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: BORDER },
  saveBtn: { backgroundColor: PRIMARY, borderRadius: 12, padding: 16, alignItems: "center" },
  disabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", color: TEXT },
  sub: { fontSize: 13, color: MUTED },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: CARD, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },
  searchBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: BORDER },
  searchBtnText: { fontSize: 13, color: MUTED },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  alertBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA",
    marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 10,
  },
  alertText: { fontSize: 12, color: WARNING, fontWeight: "600", flex: 1 },
  clearFilterChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#EEF2FF", marginHorizontal: 16, marginBottom: 8,
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
  },
  clearFilterText: { fontSize: 12, color: PRIMARY, fontWeight: "700" },
  searchRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 8, alignItems: "center" },
  searchInput: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchText: { flex: 1, fontSize: 14, color: TEXT },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  list: { padding: 12, gap: 10, paddingBottom: 40 },
  card: {
    backgroundColor: CARD, borderRadius: 14, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  cardLeft: { flex: 1 },
  cardRight: {},
  regNum: { fontSize: 16, fontWeight: "800", color: PRIMARY },
  makeModel: { fontSize: 13, color: TEXT, fontWeight: "600", marginTop: 2 },
  detail: { fontSize: 12, color: MUTED, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  compRow: { flexDirection: "row", justifyContent: "space-around", borderTopWidth: 1, borderTopColor: "#F0F0F5", paddingTop: 10 },
  expanded: { marginTop: 12, borderTopWidth: 1, borderTopColor: "#F0F0F5", paddingTop: 12 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  expandActions: { flexDirection: "row", gap: 10 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EEF2FF", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  editBtnText: { color: PRIMARY, fontWeight: "600", fontSize: 13 },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF2F2", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  deleteBtnText: { color: DANGER, fontWeight: "600", fontSize: 13 },
  empty: { padding: 60, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, color: MUTED, textAlign: "center" },
});
