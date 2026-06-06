import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { fuelService } from "../services/fuelService";
import { vehicleService } from "../services/vehicleService";
import type { FuelLog, Vehicle } from "../types";

const PRIMARY = "#1E2D8E";
const BG = "#F0F4FF";
const CARD = "#ffffff";
const TEXT = "#1A1A2E";
const TEXT_MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const DANGER = "#DC2626";
const SUCCESS = "#15803D";

function EntityPicker({
  label,
  value,
  options,
  onSelect,
  placeholder,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onSelect: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);
  return (
    <View style={formStyles.fieldGroup}>
      <Text style={formStyles.label}>{label}</Text>
      <TouchableOpacity style={formStyles.pickerBtn} onPress={() => setOpen(true)}>
        <Text style={[formStyles.pickerText, !selected && { color: TEXT_MUTED }]}>
          {selected?.label ?? placeholder ?? "Select…"}
        </Text>
        <Ionicons name="chevron-down" size={16} color={TEXT_MUTED} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={formStyles.overlay} onPress={() => setOpen(false)}>
          <View style={formStyles.pickerSheet}>
            <Text style={formStyles.pickerTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[formStyles.pickerOption, item.id === value && formStyles.pickerOptionActive]}
                  onPress={() => { onSelect(item.id); setOpen(false); }}
                >
                  <Text style={[formStyles.pickerOptionText, item.id === value && { color: PRIMARY, fontWeight: "700" }]}>
                    {item.label}
                  </Text>
                  {item.id === value && <Ionicons name="checkmark" size={16} color={PRIMARY} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const emptyForm = () => ({
  vehicle_id: "",
  date: new Date().toISOString().slice(0, 10),
  litres: "",
  amount: "",
  odometer_km: "",
  fuel_station: "",
  notes: "",
});

export default function FuelScreen() {
  const [logs, setLogs] = useState<(FuelLog & { vehicles?: any })[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [filterVehicle, setFilterVehicle] = useState("");

  const load = useCallback(async () => {
    const [l, v] = await Promise.all([
      fuelService.getAll(),
      vehicleService.getAll(),
    ]);
    if (l.success) setLogs(l.data ?? []);
    if (v.success) setVehicles(v.data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSave = async () => {
    if (!form.vehicle_id) { Alert.alert("Required", "Select a vehicle."); return; }
    if (!form.litres || !form.amount) { Alert.alert("Required", "Litres and amount are required."); return; }
    setSaving(true);
    const res = await fuelService.add({
      vehicle_id: form.vehicle_id,
      date: form.date,
      litres: parseFloat(form.litres),
      amount: parseFloat(form.amount),
      odometer_km: parseFloat(form.odometer_km) || null,
      fuel_station: form.fuel_station.trim() || null,
      notes: form.notes.trim() || null,
      trip_id: null,
    });
    if (res.success) { setModalVisible(false); setForm(emptyForm()); load(); }
    else Alert.alert("Error", res.error ?? "Could not save fuel log.");
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete", "Remove this fuel log?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await fuelService.delete(id); load(); } },
    ]);
  };

  const vehicleOptions = [
    { id: "", label: "All Vehicles" },
    ...vehicles.map((v) => ({ id: v.id, label: `${v.registration_number} — ${v.make} ${v.model}` })),
  ];

  const filtered = filterVehicle
    ? logs.filter((l) => l.vehicle_id === filterVehicle)
    : logs;

  const totalLitres = filtered.reduce((s, l) => s + parseFloat(String(l.litres)), 0);
  const totalSpend = filtered.reduce((s, l) => s + parseFloat(String(l.amount)), 0);

  const setF = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={PRIMARY} size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fuel Logs</Text>
        <Text style={styles.headerSub}>{logs.length} entries</Text>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Litres</Text>
          <Text style={styles.summaryValue}>{totalLitres.toFixed(1)} L</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Spend</Text>
          <Text style={[styles.summaryValue, { color: DANGER }]}>₹{totalSpend.toLocaleString("en-IN")}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Entries</Text>
          <Text style={styles.summaryValue}>{filtered.length}</Text>
        </View>
      </View>

      {/* Vehicle Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {vehicleOptions.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.filterChip, filterVehicle === opt.id && styles.filterChipActive]}
            onPress={() => setFilterVehicle(opt.id)}
          >
            <Text style={[styles.filterChipText, filterVehicle === opt.id && styles.filterChipTextActive]}>
              {opt.id === "" ? "All" : vehicles.find((v) => v.id === opt.id)?.registration_number ?? opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="water-outline" size={48} color={TEXT_MUTED} />
            <Text style={styles.emptyText}>No fuel logs yet.</Text>
          </View>
        }
        renderItem={({ item: l }) => {
          const veh = vehicles.find((v) => v.id === l.vehicle_id);
          return (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardLeft}>
                  <Text style={styles.regNum}>{veh?.registration_number ?? "—"}</Text>
                  <Text style={styles.logDate}>{l.date}</Text>
                  {l.fuel_station && <Text style={styles.station}>{l.fuel_station}</Text>}
                  {l.odometer_km && <Text style={styles.odometer}>Odometer: {l.odometer_km} km</Text>}
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.litres}>{parseFloat(String(l.litres)).toFixed(1)} L</Text>
                  <Text style={styles.amount}>₹{parseFloat(String(l.amount)).toLocaleString("en-IN")}</Text>
                  <TouchableOpacity onPress={() => handleDelete(l.id)} style={styles.deleteIconBtn}>
                    <Ionicons name="trash-outline" size={16} color={DANGER} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Fuel Log Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SafeAreaView style={formStyles.safe} edges={["top", "bottom"]}>
            <View style={formStyles.header}>
              <Text style={formStyles.title}>Add Fuel Log</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={TEXT} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={formStyles.scroll}>
              <EntityPicker
                label="Vehicle *"
                value={form.vehicle_id}
                options={vehicles.map((v) => ({ id: v.id, label: `${v.registration_number} — ${v.make} ${v.model}` }))}
                onSelect={(id) => setF("vehicle_id", id)}
                placeholder="Select vehicle"
              />
              <View style={formStyles.fieldGroup}>
                <Text style={formStyles.label}>Date</Text>
                <TextInput style={formStyles.input} value={form.date} onChangeText={(v) => setF("date", v)} placeholder="YYYY-MM-DD" placeholderTextColor={TEXT_MUTED} keyboardType="numeric" />
              </View>
              <View style={formStyles.row}>
                <View style={[formStyles.fieldGroup, { flex: 1 }]}>
                  <Text style={formStyles.label}>Litres *</Text>
                  <TextInput style={formStyles.input} value={form.litres} onChangeText={(v) => setF("litres", v)} placeholder="e.g. 120" placeholderTextColor={TEXT_MUTED} keyboardType="decimal-pad" />
                </View>
                <View style={[formStyles.fieldGroup, { flex: 1 }]}>
                  <Text style={formStyles.label}>Amount (₹) *</Text>
                  <TextInput style={formStyles.input} value={form.amount} onChangeText={(v) => setF("amount", v)} placeholder="e.g. 11400" placeholderTextColor={TEXT_MUTED} keyboardType="numeric" />
                </View>
              </View>
              <View style={formStyles.fieldGroup}>
                <Text style={formStyles.label}>Odometer (km)</Text>
                <TextInput style={formStyles.input} value={form.odometer_km} onChangeText={(v) => setF("odometer_km", v)} placeholder="e.g. 45230" placeholderTextColor={TEXT_MUTED} keyboardType="numeric" />
              </View>
              <View style={formStyles.fieldGroup}>
                <Text style={formStyles.label}>Fuel Station</Text>
                <TextInput style={formStyles.input} value={form.fuel_station} onChangeText={(v) => setF("fuel_station", v)} placeholder="e.g. HP Petrol Pump" placeholderTextColor={TEXT_MUTED} />
              </View>
              <View style={formStyles.fieldGroup}>
                <Text style={formStyles.label}>Notes</Text>
                <TextInput style={formStyles.input} value={form.notes} onChangeText={(v) => setF("notes", v)} placeholder="Optional" placeholderTextColor={TEXT_MUTED} />
              </View>
            </ScrollView>
            <View style={formStyles.footer}>
              <TouchableOpacity
                style={[formStyles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                  <Text style={formStyles.saveBtnText}>Save Fuel Log</Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const formStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  title: { fontSize: 18, fontWeight: "800", color: TEXT },
  scroll: { padding: 16 },
  row: { flexDirection: "row", gap: 12 },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: TEXT_MUTED, marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, fontSize: 14, color: TEXT },
  pickerBtn: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pickerText: { fontSize: 14, color: TEXT, flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  pickerSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "60%" as any },
  pickerTitle: { fontSize: 16, fontWeight: "700", color: TEXT, marginBottom: 16, textAlign: "center" },
  pickerOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  pickerOptionActive: { backgroundColor: "#F0F4FF" },
  pickerOptionText: { fontSize: 14, color: TEXT, flex: 1 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: BORDER },
  saveBtn: { backgroundColor: PRIMARY, borderRadius: 12, padding: 16, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: TEXT },
  headerSub: { fontSize: 13, color: TEXT_MUTED },
  summaryRow: { flexDirection: "row", backgroundColor: CARD, marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 14 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryDivider: { width: 1, backgroundColor: BORDER },
  summaryLabel: { fontSize: 11, color: TEXT_MUTED, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: "800", color: TEXT },
  filterRow: { paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  filterChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  filterChipText: { fontSize: 12, fontWeight: "600", color: TEXT_MUTED },
  filterChipTextActive: { color: "#fff" },
  list: { padding: 12, gap: 10, paddingBottom: 80 },
  card: { backgroundColor: CARD, borderRadius: 12, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: "flex-end", gap: 4 },
  regNum: { fontSize: 15, fontWeight: "800", color: TEXT },
  logDate: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  station: { fontSize: 12, color: TEXT_MUTED },
  odometer: { fontSize: 11, color: TEXT_MUTED },
  litres: { fontSize: 15, fontWeight: "700", color: PRIMARY },
  amount: { fontSize: 14, fontWeight: "700", color: TEXT },
  deleteIconBtn: { padding: 4 },
  empty: { padding: 60, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, color: TEXT_MUTED, textAlign: "center" },
  fab: { position: "absolute", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
});
