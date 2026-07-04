import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, RefreshControl,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronDown, Check, Bell, Search, Map, Plus, ArrowLeft } from "lucide-react-native";

import { tripService } from "../services/tripService";
import { vehicleService } from "../services/vehicleService";
import { driverService } from "../services/driverService";
import type { Trip, Vehicle, Driver } from "../types";
import type { TripsStackParamList } from "../navigation";

import { PRIMARY, BG, CARD, TEXT, MUTED, BORDER, DANGER, SUCCESS, WARNING } from "../theme";
import { TRIP_STATUS_STYLE as STATUS_STYLE } from "../constants/tripStatus";

type Nav = NativeStackNavigationProp<TripsStackParamList>;

function EntityPicker({ label, value, options, onSelect, placeholder }: {
  label: string; value: string;
  options: { id: string; label: string }[];
  onSelect: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);
  return (
    <View style={f.fieldGroup}>
      <Text style={f.label}>{label}</Text>
      <TouchableOpacity style={f.pickerBtn} onPress={() => setOpen(true)}>
        <Text style={[f.pickerText, !selected && { color: MUTED }]} numberOfLines={1}>
          {selected?.label ?? placeholder ?? "Select…"}
        </Text>
        <ChevronDown size={16} color={MUTED} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={f.overlay} onPress={() => setOpen(false)}>
          <View style={f.sheet}>
            <Text style={f.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[f.sheetOption, item.id === value && f.sheetOptionActive]}
                  onPress={() => { onSelect(item.id); setOpen(false); }}
                >
                  <Text style={[f.sheetOptionText, item.id === value && { color: PRIMARY, fontWeight: "700" }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {item.id === value && <Check size={16} color={PRIMARY} />}
                </TouchableOpacity>
              )}
            />
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

const emptyForm = () => ({
  vehicle_id: "", driver_id: "", origin: "", destination: "",
  start_date: new Date().toISOString().slice(0, 10), end_date: "",
  freight_amount: "", driver_advance: "", material: "",
  weight_tonnes: "", doc_number: "", distance_km: "", notes: "",
});

const FILTER_TABS = [
  { key: "all",         label: "All" },
  { key: "planned",     label: "planned" },
  { key: "in_progress", label: "in progress" },
  { key: "completed",   label: "completed" },
  { key: "cancelled",   label: "cancelled" },
];

export default function TripsScreen() {
  const navigation = useNavigation<Nav>();
  const [trips,    setTrips]    = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers,  setDrivers]  = useState<Driver[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab]   = useState("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState(emptyForm());

  const load = useCallback(async () => {
    const [t, v, d] = await Promise.all([
      tripService.getAll(200),
      vehicleService.getAll(),
      driverService.getAll(),
    ]);
    if (t.success) setTrips(t.data ?? []);
    if (v.success) setVehicles(v.data ?? []);
    if (d.success) setDrivers(d.data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const counts = {
    all:         trips.length,
    planned:     trips.filter(t => t.status === "planned").length,
    in_progress: trips.filter(t => t.status === "in_progress").length,
    completed:   trips.filter(t => t.status === "completed").length,
    cancelled:   trips.filter(t => t.status === "cancelled").length,
  };

  const filtered = trips.filter(t => activeTab === "all" || t.status === activeTab);

  const vehicleOptions = vehicles.map(v => ({ id: v.id, label: `${v.registration_number} — ${v.make} ${v.model}` }));
  const driverOptions  = drivers.map(d => ({ id: d.id, label: `${d.name} (${d.phone})` }));

  const handleSave = async () => {
    if (!form.vehicle_id)         { Alert.alert("Required", "Please select a vehicle."); return; }
    if (!form.origin.trim())      { Alert.alert("Required", "Origin is required.");      return; }
    if (!form.destination.trim()) { Alert.alert("Required", "Destination is required."); return; }
    setSaving(true);
    const driver = drivers.find(d => d.id === form.driver_id);
    const res = await tripService.create({
      vehicle_id:    form.vehicle_id,
      driver_id:     form.driver_id || null,
      driver_name:   driver?.name ?? "TBD",
      driver_phone:  driver?.phone ?? null,
      origin:        form.origin.trim(),
      destination:   form.destination.trim(),
      start_date:    form.start_date,
      end_date:      form.end_date || null,
      freight_amount: parseFloat(form.freight_amount) || 0,
      driver_advance: parseFloat(form.driver_advance) || null,
      material:      form.material.trim() || null,
      weight_tonnes: parseFloat(form.weight_tonnes) || null,
      doc_number:    form.doc_number.trim() || null,
      distance_km:   parseFloat(form.distance_km) || null,
      notes:         form.notes.trim() || null,
      status: "planned",
    } as any);
    if (res.success) { setModalVisible(false); setForm(emptyForm()); load(); }
    else Alert.alert("Error", res.error ?? "Could not create trip.");
    setSaving(false);
  };

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const completeTrip = (tripId: string) => {
    Alert.alert("Complete Trip", "Mark this trip as completed?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete", onPress: async () => {
          await tripService.update(tripId, { status: "completed" } as any);
          load();
        },
      },
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={PRIMARY} size="large" /></View>;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Trips</Text>
          <Text style={s.headerSub}>{trips.length} Total Trips</Text>
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

      {/* Summary 2×2 */}
      <View style={s.summaryGrid}>
        <SummaryCard value={counts.all}         label="Total Trips"  color={PRIMARY}  bg="#EEF2FF" />
        <SummaryCard value={counts.planned}      label="Planned"      color={MUTED}    bg="#F3F4F6" />
        <SummaryCard value={counts.in_progress}  label="In Progress"  color={WARNING}  bg="#FFF7ED" />
        <SummaryCard value={counts.completed}    label="Completed"    color={SUCCESS}  bg="#F0FDF4" />
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabsContainer} style={s.tabsScroll}
      >
        {FILTER_TABS.map(tab => {
          const active = activeTab === tab.key;
          const cnt = counts[tab.key as keyof typeof counts];
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[s.tabText, active && s.tabTextActive]}>
                {tab.label} ({cnt})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Map size={48} color={MUTED} />
            <Text style={s.emptyText}>No trips in this category.</Text>
          </View>
        }
        renderItem={({ item: t }) => {
          const ss  = STATUS_STYLE[t.status] ?? STATUS_STYLE.planned;
          const veh = vehicles.find(v => v.id === t.vehicle_id);
          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => navigation.navigate("TripDetail", { tripId: t.id })}
              activeOpacity={0.85}
            >
              <View style={s.cardTop}>
                <Text style={s.route} numberOfLines={1}>
                  {t.origin} → {t.destination}
                </Text>
                <View style={[s.badge, { backgroundColor: ss.bg }]}>
                  <Text style={[s.badgeText, { color: ss.color }]}>{ss.label}</Text>
                </View>
              </View>
              <View style={s.cardMid}>
                <Text style={s.meta}>
                  {t.driver_name} · {veh?.registration_number ?? "—"}
                </Text>
                <Text style={s.meta}>{t.start_date}</Text>
              </View>
              <View style={s.cardBottom}>
                {t.material ? <Text style={s.material}>{t.material}</Text> : <View />}
                <View style={s.cardBottomRight}>
                  <Text style={s.freight}>₹{Number(t.freight_amount).toLocaleString("en-IN")}</Text>
                  {t.status === "in_progress" && (
                    <TouchableOpacity
                      style={s.completeBtn}
                      onPress={() => completeTrip(t.id)}
                    >
                      <Text style={s.completeBtnText}>Complete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => setModalVisible(true)}>
        <Plus size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Trip Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
            <View style={f.header}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={f.backBtn}>
                <ArrowLeft size={22} color={TEXT} />
              </TouchableOpacity>
              <Text style={f.title}>New Trip</Text>
              <View style={{ width: 36 }} />
            </View>
            <ScrollView contentContainerStyle={f.scroll} showsVerticalScrollIndicator={false}>
              <Text style={f.section}>Vehicle & Driver</Text>
              <EntityPicker label="Vehicle *" value={form.vehicle_id} options={vehicleOptions} onSelect={id => setF("vehicle_id", id)} placeholder="Select vehicle" />
              <EntityPicker label="Driver" value={form.driver_id} options={driverOptions} onSelect={id => setF("driver_id", id)} placeholder="Select driver (optional)" />

              <Text style={f.section}>Route</Text>
              <Field label="Origin *" value={form.origin} onChangeText={(v: string) => setF("origin", v)} placeholder="Departure city" />
              <Field label="Destination *" value={form.destination} onChangeText={(v: string) => setF("destination", v)} placeholder="Arrival city" />
              <Field label="Distance (km)" value={form.distance_km} onChangeText={(v: string) => setF("distance_km", v)} placeholder="e.g. 450" keyboardType="numeric" />

              <Text style={f.section}>Schedule</Text>
              <Field label="Start Date" value={form.start_date} onChangeText={(v: string) => setF("start_date", v)} placeholder="YYYY-MM-DD" keyboardType="numeric" autoCapitalize="none" />
              <Field label="Expected End Date" value={form.end_date} onChangeText={(v: string) => setF("end_date", v)} placeholder="YYYY-MM-DD" keyboardType="numeric" autoCapitalize="none" />

              <Text style={f.section}>Freight & Payment</Text>
              <Field label="Freight Amount (₹) *" value={form.freight_amount} onChangeText={(v: string) => setF("freight_amount", v)} placeholder="e.g. 45000" keyboardType="numeric" autoCapitalize="none" />
              <Field label="Driver Advance (₹)" value={form.driver_advance} onChangeText={(v: string) => setF("driver_advance", v)} placeholder="e.g. 5000" keyboardType="numeric" autoCapitalize="none" />

              <Text style={f.section}>Cargo Details</Text>
              <Field label="Material" value={form.material} onChangeText={(v: string) => setF("material", v)} placeholder="e.g. Steel Coils" />
              <Field label="Weight (tonnes)" value={form.weight_tonnes} onChangeText={(v: string) => setF("weight_tonnes", v)} placeholder="e.g. 20" keyboardType="decimal-pad" autoCapitalize="none" />
              <Field label="LR / Document Number" value={form.doc_number} onChangeText={(v: string) => setF("doc_number", v)} placeholder="e.g. LR001234" autoCapitalize="characters" />
              <Field label="Notes" value={form.notes} onChangeText={(v: string) => setF("notes", v)} placeholder="Optional" />
            </ScrollView>
            <View style={f.footer}>
              <TouchableOpacity style={[f.saveBtn, saving && f.disabled]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                  <Text style={f.saveBtnText}>Create Trip</Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function SummaryCard({ value, label, color, bg }: { value: number; label: string; color: string; bg: string }) {
  return (
    <View style={[sc2.card, { backgroundColor: bg }]}>
      <Text style={[sc2.value, { color }]}>{value}</Text>
      <Text style={sc2.label}>{label}</Text>
    </View>
  );
}

const sc2 = StyleSheet.create({
  card: { flex: 1, borderRadius: 12, padding: 12, alignItems: "center", gap: 2 },
  value: { fontSize: 24, fontWeight: "800" },
  label: { fontSize: 11, color: MUTED, fontWeight: "500", textAlign: "center" },
});

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
  pickerText: { fontSize: 14, color: TEXT, flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "60%" as any },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: TEXT, marginBottom: 16, textAlign: "center" },
  sheetOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  sheetOptionActive: { backgroundColor: "#F0F4FF" },
  sheetOptionText: { fontSize: 14, color: TEXT, flex: 1 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: BORDER },
  saveBtn: { backgroundColor: PRIMARY, borderRadius: 12, padding: 16, alignItems: "center" },
  disabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: TEXT },
  headerSub: { fontSize: 13, color: MUTED },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: CARD, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },
  searchBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: BORDER },
  searchBtnText: { fontSize: 13, color: MUTED },
  summaryGrid: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  tabsScroll: { maxHeight: 52 },
  tabsContainer: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  tabActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  tabText: { fontSize: 12, fontWeight: "600", color: MUTED, textTransform: "capitalize" },
  tabTextActive: { color: "#fff" },
  list: { padding: 12, gap: 10, paddingBottom: 100 },
  card: {
    backgroundColor: CARD, borderRadius: 14, padding: 14, gap: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  route: { fontSize: 14, fontWeight: "700", color: PRIMARY, flex: 1, marginRight: 8 },
  cardMid: { flexDirection: "row", justifyContent: "space-between" },
  meta: { fontSize: 12, color: MUTED },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardBottomRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  material: { fontSize: 12, color: MUTED },
  freight: { fontSize: 16, fontWeight: "800", color: TEXT },
  completeBtn: { backgroundColor: "#16A34A", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  completeBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  empty: { padding: 60, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, color: MUTED, textAlign: "center" },
  fab: {
    position: "absolute", bottom: 28, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center",
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 10,
  },
});
