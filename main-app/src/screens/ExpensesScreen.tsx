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

import { expenseService } from "../services/expenseService";
import { vehicleService } from "../services/vehicleService";
import type { MiscExpense, Vehicle } from "../types";

const PRIMARY = "#1E2D8E";
const BG = "#F0F4FF";
const CARD = "#ffffff";
const TEXT = "#1A1A2E";
const TEXT_MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const DANGER = "#DC2626";

const EXPENSE_CATEGORIES = [
  { value: "maintenance", label: "Parts & Repairs" },
  { value: "tyre", label: "Tyre" },
  { value: "oil", label: "Oil / Lubricant" },
  { value: "rto", label: "RTO / Tax" },
  { value: "police_challan", label: "Police / Challan" },
  { value: "loading_unloading", label: "Loading / Unloading" },
  { value: "driver_payment", label: "Driver Payment" },
  { value: "telephone", label: "Telephone" },
  { value: "insurance", label: "Insurance" },
  { value: "cleaning", label: "Cleaning" },
  { value: "other", label: "Other" },
];

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
  category: "maintenance",
  vehicle_id: "",
  date: new Date().toISOString().slice(0, 10),
  amount: "",
  description: "",
  notes: "",
});

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<(MiscExpense & { vehicles?: any })[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    const [e, v] = await Promise.all([
      expenseService.getAll(),
      vehicleService.getAll(),
    ]);
    if (e.success) setExpenses(e.data ?? []);
    if (v.success) setVehicles(v.data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSave = async () => {
    if (!form.amount) { Alert.alert("Required", "Amount is required."); return; }
    setSaving(true);
    const res = await expenseService.add({
      category: form.category,
      vehicle_id: form.vehicle_id || null,
      date: form.date,
      amount: parseFloat(form.amount),
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
    });
    if (res.success) { setModalVisible(false); setForm(emptyForm()); load(); }
    else Alert.alert("Error", res.error ?? "Could not save expense.");
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete", "Remove this expense?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await expenseService.delete(id); load(); } },
    ]);
  };

  const totalAmount = expenses.reduce((s, e) => s + parseFloat(String(e.amount)), 0);
  const setF = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={PRIMARY} size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Expenses</Text>
        <Text style={styles.headerSub}>{expenses.length} entries</Text>
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
          <Text style={[styles.summaryValue, { color: DANGER }]}>₹{totalAmount.toLocaleString("en-IN")}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Entries</Text>
          <Text style={styles.summaryValue}>{expenses.length}</Text>
        </View>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={TEXT_MUTED} />
            <Text style={styles.emptyText}>No expenses logged yet.</Text>
          </View>
        }
        renderItem={({ item: e }) => {
          const veh = vehicles.find((v) => v.id === e.vehicle_id);
          const catLabel = EXPENSE_CATEGORIES.find((c) => c.value === e.category)?.label ?? e.category;
          return (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardLeft}>
                  <View style={styles.catRow}>
                    <View style={styles.catDot} />
                    <Text style={styles.category}>{catLabel}</Text>
                  </View>
                  <Text style={styles.dateText}>{e.date}</Text>
                  {veh && <Text style={styles.vehicleText}>{veh.registration_number}</Text>}
                  {e.description && <Text style={styles.descText}>{e.description}</Text>}
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.amount}>₹{parseFloat(String(e.amount)).toLocaleString("en-IN")}</Text>
                  <TouchableOpacity onPress={() => handleDelete(e.id)}>
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

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SafeAreaView style={formStyles.safe} edges={["top", "bottom"]}>
            <View style={formStyles.header}>
              <Text style={formStyles.title}>Add Expense</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={TEXT} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={formStyles.scroll}>
              <EntityPicker
                label="Category *"
                value={form.category}
                options={EXPENSE_CATEGORIES.map((c) => ({ id: c.value, label: c.label }))}
                onSelect={(id) => setF("category", id)}
              />
              <EntityPicker
                label="Vehicle (optional)"
                value={form.vehicle_id}
                options={[
                  { id: "", label: "No specific vehicle" },
                  ...vehicles.map((v) => ({ id: v.id, label: `${v.registration_number} — ${v.make} ${v.model}` })),
                ]}
                onSelect={(id) => setF("vehicle_id", id)}
                placeholder="No specific vehicle"
              />
              <View style={formStyles.fieldGroup}>
                <Text style={formStyles.label}>Date</Text>
                <TextInput style={formStyles.input} value={form.date} onChangeText={(v) => setF("date", v)} placeholder="YYYY-MM-DD" placeholderTextColor={TEXT_MUTED} keyboardType="numeric" />
              </View>
              <View style={formStyles.fieldGroup}>
                <Text style={formStyles.label}>Amount (₹) *</Text>
                <TextInput style={formStyles.input} value={form.amount} onChangeText={(v) => setF("amount", v)} placeholder="e.g. 3500" placeholderTextColor={TEXT_MUTED} keyboardType="numeric" />
              </View>
              <View style={formStyles.fieldGroup}>
                <Text style={formStyles.label}>Description</Text>
                <TextInput style={formStyles.input} value={form.description} onChangeText={(v) => setF("description", v)} placeholder="e.g. Tyre replaced at Nagpur" placeholderTextColor={TEXT_MUTED} />
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
                  <Text style={formStyles.saveBtnText}>Save Expense</Text>
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
  summaryCard: { flexDirection: "row", backgroundColor: CARD, marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 14 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryDivider: { width: 1, backgroundColor: BORDER },
  summaryLabel: { fontSize: 11, color: TEXT_MUTED, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: "800", color: TEXT },
  list: { padding: 12, gap: 10, paddingBottom: 80 },
  card: { backgroundColor: CARD, borderRadius: 12, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: "flex-end", gap: 8 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  catDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY },
  category: { fontSize: 14, fontWeight: "700", color: TEXT },
  dateText: { fontSize: 12, color: TEXT_MUTED },
  vehicleText: { fontSize: 12, color: TEXT_MUTED },
  descText: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: "800", color: TEXT },
  empty: { padding: 60, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, color: TEXT_MUTED, textAlign: "center" },
  fab: { position: "absolute", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
});
