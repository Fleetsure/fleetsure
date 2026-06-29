import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ScrollView, RefreshControl, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { vehicleService } from "../services/vehicleService";
import type { Vehicle } from "../types";

const PRIMARY  = "#1E2D8E";
const BG       = "#F5F6FA";
const CARD     = "#ffffff";
const TEXT     = "#1A1A2E";
const MUTED    = "#6B7280";
const BORDER   = "#E9EBF0";
const DANGER   = "#DC2626";
const SUCCESS  = "#15803D";
const WARNING  = "#D97706";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:      { bg: "#F0FDF4", color: SUCCESS, label: "Active" },
  in_trip:     { bg: "#FFF7ED", color: WARNING, label: "On Trip" },
  maintenance: { bg: "#FEF2F2", color: DANGER,  label: "Maintenance" },
  inactive:    { bg: "#F3F4F6", color: MUTED,   label: "Inactive" },
};

const VEHICLE_TYPES   = ["Truck", "Trailer", "Mini-Truck", "Tanker", "Container", "Other"];
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

function PickerRow({ label, value, options, onSelect }: {
  label: string; value: string; options: string[]; onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={f.fieldGroup}>
      <Text style={f.label}>{label}</Text>
      <TouchableOpacity style={f.pickerBtn} onPress={() => setOpen(true)}>
        <Text style={f.pickerText}>{value || "Select…"}</Text>
        <Ionicons name="chevron-down" size={16} color={MUTED} />
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
                  {STATUS_STYLE[opt]?.label ?? opt}
                </Text>
                {opt === value && <Ionicons name="checkmark" size={16} color={PRIMARY} />}
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
  vehicle_type: "Truck", fuel_type: "Diesel", status: "active",
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
      year: form.year || null, vehicle_type: form.vehicle_type || "Truck",
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

  const filtered = vehicles.filter(v =>
    !search ||
    v.registration_number.toLowerCase().includes(search.toLowerCase()) ||
    v.make.toLowerCase().includes(search.toLowerCase()) ||
    v.model.toLowerCase().includes(search.toLowerCase())
  );

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
            <Ionicons name="notifications-outline" size={20} color={MUTED} />
          </TouchableOpacity>
          <TouchableOpacity style={s.searchBtn}>
            <Ionicons name="search-outline" size={15} color={MUTED} />
            <Text style={s.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary grid */}
      <View style={s.summaryGrid}>
        <SCard value={vehicles.length} label="Total Vehicles" color={PRIMARY}  bg="#EEF2FF" icon="car-outline" />
        <SCard value={available}       label="Available"       color={SUCCESS}  bg="#F0FDF4" icon="checkmark-circle-outline" />
        <SCard value={onTrip}          label="On Trip"         color={WARNING}  bg="#FFF7ED" icon="navigate-outline" />
        <SCard value={maintenance}     label="In Maintenance"  color={DANGER}   bg="#FEF2F2" icon="construct-outline" />
        <SCard value={insDue}          label="Insurance Due"   color={insDue > 0 ? DANGER : SUCCESS} bg={insDue > 0 ? "#FEF2F2" : "#F0FDF4"} icon="alert-circle-outline" />
      </View>
      {insDue > 0 && (
        <View style={s.alertBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={WARNING} />
          <Text style={s.alertText}>{insDue} vehicle{insDue > 1 ? "s" : ""} with compliance expiring within 30 days</Text>
        </View>
      )}

      {/* Search + Add */}
      <View style={s.searchRow}>
        <View style={s.searchInput}>
          <Ionicons name="search-outline" size={16} color={MUTED} />
          <TextInput
            style={s.searchText}
            placeholder="Search vehicles…"
            placeholderTextColor={MUTED}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={18} color="#fff" />
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
            <Ionicons name="car-outline" size={48} color={MUTED} />
            <Text style={s.emptyText}>No vehicles yet. Add your first truck!</Text>
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
                    {v.permit_expiry  && <DItem label="Permit"   value={v.permit_expiry} />}
                  </View>
                  <View style={s.expandActions}>
                    <TouchableOpacity style={s.editBtn} onPress={() => openEdit(v)}>
                      <Ionicons name="pencil-outline" size={14} color={PRIMARY} />
                      <Text style={s.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(v)}>
                      <Ionicons name="trash-outline" size={14} color={DANGER} />
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
                <Ionicons name="arrow-back" size={22} color={TEXT} />
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
              <PickerRow label="Vehicle Type" value={form.vehicle_type ?? "Truck"} options={VEHICLE_TYPES} onSelect={v => setF("vehicle_type", v)} />
              <PickerRow label="Fuel Type"    value={form.fuel_type ?? "Diesel"}   options={FUEL_TYPES}    onSelect={v => setF("fuel_type", v)} />
              <PickerRow label="Status"       value={form.status ?? "active"}       options={STATUS_OPTIONS} onSelect={v => setF("status", v)} />

              <Text style={f.section}>Identification</Text>
              <Field label="Chassis Number" value={form.chassis_number ?? ""} onChangeText={(v: string) => setF("chassis_number", v)} placeholder="Optional" autoCapitalize="characters" />
              <Field label="Engine Number"  value={form.engine_number ?? ""}  onChangeText={(v: string) => setF("engine_number", v)}  placeholder="Optional" autoCapitalize="characters" />
              <Field label="Owner Name"     value={form.owner_name ?? ""}     onChangeText={(v: string) => setF("owner_name", v)}     placeholder="Optional" />

              <Text style={f.section}>Compliance Dates (YYYY-MM-DD)</Text>
              <Field label="Insurance Expiry *" value={form.insurance_expiry ?? ""} onChangeText={(v: string) => setF("insurance_expiry", v)} placeholder="YYYY-MM-DD" keyboardType="numeric" autoCapitalize="none" />
              <Field label="Fitness Expiry *"   value={form.fitness_expiry ?? ""}   onChangeText={(v: string) => setF("fitness_expiry", v)}   placeholder="YYYY-MM-DD" keyboardType="numeric" autoCapitalize="none" />
              <Field label="Permit Expiry *"    value={form.permit_expiry ?? ""}    onChangeText={(v: string) => setF("permit_expiry", v)}    placeholder="YYYY-MM-DD" keyboardType="numeric" autoCapitalize="none" />
              <Field label="PUC Expiry *"       value={form.puc_expiry ?? ""}       onChangeText={(v: string) => setF("puc_expiry", v)}       placeholder="YYYY-MM-DD" keyboardType="numeric" autoCapitalize="none" />

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

function SCard({ value, label, color, bg, icon }: { value: number; label: string; color: string; bg: string; icon: string }) {
  return (
    <View style={[sc.card, { backgroundColor: bg }]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[sc.value, { color }]}>{value}</Text>
      <Text style={sc.label}>{label}</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  card: { width: "48%", borderRadius: 12, padding: 12, alignItems: "center", gap: 4 },
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
