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

import { driverService } from "../services/driverService";
import type { Driver, DriverPayment } from "../types";

const PRIMARY = "#1E2D8E";
const BG = "#F0F4FF";
const CARD = "#ffffff";
const TEXT = "#1A1A2E";
const TEXT_MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const DANGER = "#DC2626";
const SUCCESS = "#15803D";
const WARNING = "#D97706";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "#F0FDF4", text: SUCCESS },
  inactive: { bg: "#F3F4F6", text: TEXT_MUTED },
};

const PAYMENT_TYPES = ["advance", "salary", "bonus", "deduction", "settlement", "other"];
const STATUS_OPTIONS = ["active", "inactive"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const emptyDriver = (): Partial<Driver> => ({
  name: "",
  phone: "",
  alternate_phone: "",
  license_number: "",
  license_expiry: "",
  transport_validity: "",
  status: "active",
  address: "",
  blood_group: "",
  dob: "",
});

const emptyPayment = () => ({
  type: "advance",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
});

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function PickerRow({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={formStyles.fieldGroup}>
      <Text style={formStyles.label}>{label}</Text>
      <TouchableOpacity style={formStyles.pickerBtn} onPress={() => setOpen(true)}>
        <Text style={formStyles.pickerText}>{value || "Select…"}</Text>
        <Ionicons name="chevron-down" size={16} color={TEXT_MUTED} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={formStyles.overlay} onPress={() => setOpen(false)}>
          <View style={formStyles.pickerSheet}>
            <Text style={formStyles.pickerTitle}>{label}</Text>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[formStyles.pickerOption, opt === value && formStyles.pickerOptionActive]}
                onPress={() => { onSelect(opt); setOpen(false); }}
              >
                <Text style={[formStyles.pickerOptionText, opt === value && { color: PRIMARY, fontWeight: "700" }]}>
                  {opt}
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

export default function DriversScreen() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Driver>>(emptyDriver());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Ledger
  const [ledgerVisible, setLedgerVisible] = useState(false);
  const [ledgerDriver, setLedgerDriver] = useState<Driver | null>(null);
  const [payments, setPayments] = useState<DriverPayment[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [payForm, setPayForm] = useState(emptyPayment());
  const [savingPay, setSavingPay] = useState(false);

  const load = useCallback(async () => {
    const res = await driverService.getAll();
    if (res.success) setDrivers(res.data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openLedger = async (d: Driver) => {
    setLedgerDriver(d);
    setLedgerVisible(true);
    setLoadingLedger(true);
    const res = await driverService.getLedger(d.id);
    if (res.success) setPayments(res.data ?? []);
    setLoadingLedger(false);
  };

  const handleAddPayment = async () => {
    if (!ledgerDriver || !payForm.amount) return;
    setSavingPay(true);
    const res = await driverService.addPayment({
      driver_id: ledgerDriver.id,
      date: payForm.date,
      type: payForm.type,
      amount: parseFloat(payForm.amount),
      notes: payForm.notes || null,
    });
    if (res.success) {
      setPayForm(emptyPayment());
      const lr = await driverService.getLedger(ledgerDriver.id);
      if (lr.success) setPayments(lr.data ?? []);
    } else {
      Alert.alert("Error", res.error ?? "Could not add payment.");
    }
    setSavingPay(false);
  };

  const handleDeletePayment = (id: string) => {
    Alert.alert("Delete Payment", "Remove this payment entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await driverService.deletePayment(id);
          if (ledgerDriver) {
            const lr = await driverService.getLedger(ledgerDriver.id);
            if (lr.success) setPayments(lr.data ?? []);
          }
        },
      },
    ]);
  };

  const openAdd = () => { setEditId(null); setForm(emptyDriver()); setModalVisible(true); };
  const openEdit = (d: Driver) => {
    setEditId(d.id);
    setForm({
      name: d.name,
      phone: d.phone,
      alternate_phone: d.alternate_phone ?? "",
      license_number: d.license_number ?? "",
      license_expiry: d.license_expiry ?? "",
      transport_validity: d.transport_validity ?? "",
      status: d.status ?? "active",
      address: d.address ?? "",
      blood_group: d.blood_group ?? "",
      dob: d.dob ?? "",
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim())           { Alert.alert("Required", "Name is required."); return; }
    if (!form.phone?.trim())          { Alert.alert("Required", "Phone is required."); return; }
    if (!form.license_number?.trim()) { Alert.alert("Required", "License number is required."); return; }
    if (!form.license_expiry)         { Alert.alert("Required", "License expiry date is required."); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      alternate_phone: form.alternate_phone?.trim() || null,
      license_number: form.license_number?.trim() || null,
      license_expiry: form.license_expiry || null,
      transport_validity: form.transport_validity || null,
      status: form.status ?? "active",
      address: form.address?.trim() || null,
      blood_group: form.blood_group?.trim() || null,
      dob: form.dob || null,
    };
    const res = editId
      ? await driverService.update(editId, payload)
      : await driverService.create(payload as any);
    if (res.success) { setModalVisible(false); load(); }
    else Alert.alert("Error", res.error ?? "Could not save driver.");
    setSaving(false);
  };

  const handleDelete = (d: Driver) => {
    Alert.alert("Delete Driver", `Delete ${d.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await driverService.delete(d.id); load(); } },
    ]);
  };

  const setF = (key: keyof Driver, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const filtered = drivers.filter((d) =>
    !search ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.phone.includes(search)
  );

  const totalPaid = payments.filter((p) => ["advance", "salary", "bonus", "settlement"].includes(p.type))
    .reduce((s, p) => s + Number(p.amount), 0);
  const totalDeducted = payments.filter((p) => p.type === "deduction")
    .reduce((s, p) => s + Number(p.amount), 0);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={PRIMARY} size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Drivers</Text>
        <Text style={styles.headerSub}>{drivers.length} drivers</Text>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={TEXT_MUTED} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search drivers…"
          placeholderTextColor={TEXT_MUTED}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="person-outline" size={48} color={TEXT_MUTED} />
            <Text style={styles.emptyText}>No drivers yet. Add your first driver!</Text>
          </View>
        }
        renderItem={({ item: d }) => {
          const sc = STATUS_COLORS[d.status ?? "inactive"] ?? STATUS_COLORS.inactive;
          const licDays = daysUntil(d.license_expiry);
          const expanded = expandedId === d.id;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setExpandedId(expanded ? null : d.id)}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <Text style={styles.driverName}>{d.name}</Text>
                  <Text style={styles.driverPhone}>{d.phone}</Text>
                </View>
                <View style={styles.cardRight}>
                  <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.badgeText, { color: sc.text }]}>{d.status ?? "inactive"}</Text>
                  </View>
                  <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={TEXT_MUTED} />
                </View>
              </View>

              {d.license_number && (
                <View style={styles.licRow}>
                  <Ionicons name="card-outline" size={12} color={TEXT_MUTED} />
                  <Text style={styles.licText}>{d.license_number}</Text>
                  {licDays !== null && (
                    <View style={[styles.smallBadge, { backgroundColor: licDays < 30 ? "#FEF2F2" : "#F0FDF4" }]}>
                      <Text style={[styles.smallBadgeText, { color: licDays < 30 ? DANGER : SUCCESS }]}>
                        {licDays < 0 ? "Expired" : `${licDays}d`}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {expanded && (
                <View style={styles.expandedContent}>
                  <View style={styles.detailGrid}>
                    {d.alternate_phone && <DetailItem label="Alt Phone" value={d.alternate_phone} />}
                    {d.blood_group && <DetailItem label="Blood Group" value={d.blood_group} />}
                    {d.transport_validity && <DetailItem label="Transport Valid" value={d.transport_validity} />}
                    {d.address && <DetailItem label="Address" value={d.address} />}
                  </View>
                  <View style={styles.expandedActions}>
                    <TouchableOpacity style={styles.ledgerBtn} onPress={() => openLedger(d)}>
                      <Ionicons name="wallet-outline" size={14} color={SUCCESS} />
                      <Text style={styles.ledgerBtnText}>Ledger</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(d)}>
                      <Ionicons name="pencil-outline" size={14} color={PRIMARY} />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(d)}>
                      <Ionicons name="trash-outline" size={14} color={DANGER} />
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SafeAreaView style={formStyles.safe} edges={["top", "bottom"]}>
            <View style={formStyles.header}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={formStyles.backBtn}>
                <Ionicons name="arrow-back" size={22} color={TEXT} />
              </TouchableOpacity>
              <Text style={formStyles.title}>{editId ? "Edit Driver" : "Add Driver"}</Text>
              <View style={{ width: 36 }} />
            </View>
            <ScrollView contentContainerStyle={formStyles.scroll} showsVerticalScrollIndicator={false}>
              <SectionHeader title="Basic Details" />
              <Field label="Name *" value={form.name ?? ""} onChangeText={(v) => setF("name", v)} placeholder="Full name" />
              <Field label="Phone *" value={form.phone ?? ""} onChangeText={(v) => setF("phone", v)} placeholder="10-digit mobile" keyboardType="phone-pad" />
              <Field label="Alternate Phone" value={form.alternate_phone ?? ""} onChangeText={(v) => setF("alternate_phone", v)} placeholder="Optional" keyboardType="phone-pad" />
              <PickerRow label="Status" value={form.status ?? "active"} options={STATUS_OPTIONS} onSelect={(v) => setF("status", v)} />

              <SectionHeader title="License & Compliance" />
              <Field label="License Number *" value={form.license_number ?? ""} onChangeText={(v) => setF("license_number", v)} placeholder="e.g. KA1234567890" autoCapitalize="characters" />
              <Field label="License Expiry * (YYYY-MM-DD)" value={form.license_expiry ?? ""} onChangeText={(v) => setF("license_expiry", v)} placeholder="YYYY-MM-DD" keyboardType="numeric" />
              <Field label="Transport Validity (YYYY-MM-DD)" value={form.transport_validity ?? ""} onChangeText={(v) => setF("transport_validity", v)} placeholder="YYYY-MM-DD" keyboardType="numeric" />

              <SectionHeader title="Personal Details" />
              <Field label="Date of Birth (YYYY-MM-DD)" value={form.dob ?? ""} onChangeText={(v) => setF("dob", v)} placeholder="YYYY-MM-DD" keyboardType="numeric" />
              <PickerRow label="Blood Group" value={form.blood_group ?? ""} options={BLOOD_GROUPS} onSelect={(v) => setF("blood_group", v)} />
              <Field label="Address" value={form.address ?? ""} onChangeText={(v) => setF("address", v)} placeholder="Home address" />
            </ScrollView>
            <View style={formStyles.footer}>
              <TouchableOpacity
                style={[formStyles.saveBtn, saving && formStyles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                  <Text style={formStyles.saveBtnText}>{editId ? "Save Changes" : "Add Driver"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Ledger Modal */}
      <Modal visible={ledgerVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={formStyles.safe} edges={["top", "bottom"]}>
          <View style={formStyles.header}>
            <TouchableOpacity onPress={() => setLedgerVisible(false)} style={formStyles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={TEXT} />
            </TouchableOpacity>
            <Text style={formStyles.title}>{ledgerDriver?.name} — Ledger</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Summary */}
          <View style={ledgerStyles.summary}>
            <View style={ledgerStyles.summaryItem}>
              <Text style={ledgerStyles.summaryLabel}>Total Paid</Text>
              <Text style={[ledgerStyles.summaryValue, { color: SUCCESS }]}>₹{totalPaid.toLocaleString("en-IN")}</Text>
            </View>
            <View style={ledgerStyles.summaryDivider} />
            <View style={ledgerStyles.summaryItem}>
              <Text style={ledgerStyles.summaryLabel}>Deductions</Text>
              <Text style={[ledgerStyles.summaryValue, { color: DANGER }]}>₹{totalDeducted.toLocaleString("en-IN")}</Text>
            </View>
            <View style={ledgerStyles.summaryDivider} />
            <View style={ledgerStyles.summaryItem}>
              <Text style={ledgerStyles.summaryLabel}>Net</Text>
              <Text style={ledgerStyles.summaryValue}>₹{(totalPaid - totalDeducted).toLocaleString("en-IN")}</Text>
            </View>
          </View>

          {/* Add Payment Form */}
          <View style={ledgerStyles.addForm}>
            <Text style={ledgerStyles.addTitle}>Add Entry</Text>
            <View style={ledgerStyles.addRow}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={ledgerStyles.amtInput}
                  placeholder="Amount"
                  placeholderTextColor={TEXT_MUTED}
                  keyboardType="numeric"
                  value={payForm.amount}
                  onChangeText={(v) => setPayForm((f) => ({ ...f, amount: v }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={ledgerStyles.amtInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={TEXT_MUTED}
                  value={payForm.date}
                  onChangeText={(v) => setPayForm((f) => ({ ...f, date: v }))}
                />
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {PAYMENT_TYPES.map((pt) => (
                  <TouchableOpacity
                    key={pt}
                    style={[ledgerStyles.typeChip, payForm.type === pt && ledgerStyles.typeChipActive]}
                    onPress={() => setPayForm((f) => ({ ...f, type: pt }))}
                  >
                    <Text style={[ledgerStyles.typeChipText, payForm.type === pt && { color: "#fff" }]}>
                      {pt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TextInput
              style={ledgerStyles.notesInput}
              placeholder="Notes (optional)"
              placeholderTextColor={TEXT_MUTED}
              value={payForm.notes}
              onChangeText={(v) => setPayForm((f) => ({ ...f, notes: v }))}
            />
            <TouchableOpacity
              style={[ledgerStyles.addBtn, savingPay && { opacity: 0.6 }]}
              onPress={handleAddPayment}
              disabled={savingPay}
            >
              {savingPay ? <ActivityIndicator color="#fff" size="small" /> : (
                <Text style={ledgerStyles.addBtnText}>Add Payment</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Payment List */}
          {loadingLedger ? (
            <ActivityIndicator color={PRIMARY} style={{ margin: 24 }} />
          ) : (
            <FlatList
              data={payments}
              keyExtractor={(p) => p.id}
              contentContainerStyle={{ padding: 16, gap: 8 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No payment entries yet.</Text>}
              renderItem={({ item: p }) => (
                <View style={ledgerStyles.payRow}>
                  <View style={ledgerStyles.payLeft}>
                    <Text style={ledgerStyles.payType}>{p.type}</Text>
                    <Text style={ledgerStyles.payDate}>{p.date}</Text>
                    {p.notes && <Text style={ledgerStyles.payNotes}>{p.notes}</Text>}
                  </View>
                  <View style={ledgerStyles.payRight}>
                    <Text style={[ledgerStyles.payAmount, { color: p.type === "deduction" ? DANGER : SUCCESS }]}>
                      {p.type === "deduction" ? "-" : "+"}₹{Number(p.amount).toLocaleString("en-IN")}
                    </Text>
                    <TouchableOpacity onPress={() => handleDeletePayment(p.id)}>
                      <Ionicons name="trash-outline" size={16} color={DANGER} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 8, width: "45%" }}>
      <Text style={{ fontSize: 11, color: TEXT_MUTED }}>{label}</Text>
      <Text style={{ fontSize: 13, color: TEXT, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={formStyles.sectionHeader}>{title}</Text>;
}

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize }: any) {
  return (
    <View style={formStyles.fieldGroup}>
      <Text style={formStyles.label}>{label}</Text>
      <TextInput
        style={formStyles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={TEXT_MUTED}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "words"}
      />
    </View>
  );
}

const ledgerStyles = StyleSheet.create({
  summary: { flexDirection: "row", backgroundColor: CARD, margin: 16, borderRadius: 12, padding: 16, gap: 0 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryDivider: { width: 1, backgroundColor: BORDER },
  summaryLabel: { fontSize: 11, color: TEXT_MUTED, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: "800", color: TEXT },
  addForm: { backgroundColor: CARD, marginHorizontal: 16, borderRadius: 12, padding: 14, marginBottom: 8 },
  addTitle: { fontSize: 13, fontWeight: "700", color: TEXT, marginBottom: 10 },
  addRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  amtInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 10, fontSize: 13, color: TEXT },
  notesInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 10, fontSize: 13, color: TEXT, marginBottom: 10 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F0F0F5" },
  typeChipActive: { backgroundColor: PRIMARY },
  typeChipText: { fontSize: 12, fontWeight: "600", color: TEXT, textTransform: "capitalize" },
  addBtn: { backgroundColor: PRIMARY, borderRadius: 8, padding: 12, alignItems: "center" },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  payRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: CARD, borderRadius: 10, padding: 12, gap: 12 },
  payLeft: { flex: 1 },
  payType: { fontSize: 13, fontWeight: "700", color: TEXT, textTransform: "capitalize" },
  payDate: { fontSize: 11, color: TEXT_MUTED, marginTop: 2 },
  payNotes: { fontSize: 11, color: TEXT_MUTED },
  payRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  payAmount: { fontSize: 15, fontWeight: "800" },
});

const formStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: "#C7D2FE" },
  title: { flex: 1, fontSize: 17, fontWeight: "800", color: TEXT, textAlign: "center" },
  scroll: { padding: 16, paddingBottom: 8 },
  sectionHeader: { fontSize: 12, fontWeight: "700", color: PRIMARY, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 16, marginBottom: 4 },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: TEXT_MUTED, marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, fontSize: 14, color: TEXT },
  pickerBtn: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pickerText: { fontSize: 14, color: TEXT },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  pickerSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: 400 },
  pickerTitle: { fontSize: 16, fontWeight: "700", color: TEXT, marginBottom: 16, textAlign: "center" },
  pickerOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  pickerOptionActive: { backgroundColor: "#F0F4FF" },
  pickerOptionText: { fontSize: 15, color: TEXT },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: BORDER },
  saveBtn: { backgroundColor: PRIMARY, borderRadius: 12, padding: 16, alignItems: "center" },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: TEXT },
  headerSub: { fontSize: 13, color: TEXT_MUTED, marginTop: 2 },
  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: CARD, marginHorizontal: 16, marginBottom: 12, borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: TEXT },
  list: { padding: 16, paddingTop: 4, gap: 10, paddingBottom: 80 },
  card: { backgroundColor: CARD, borderRadius: 14, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  cardLeft: { flex: 1 },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  driverName: { fontSize: 16, fontWeight: "800", color: TEXT },
  driverPhone: { fontSize: 13, color: TEXT_MUTED, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  licRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  licText: { fontSize: 12, color: TEXT_MUTED },
  smallBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  smallBadgeText: { fontSize: 10, fontWeight: "700" },
  expandedContent: { marginTop: 12, borderTopWidth: 1, borderTopColor: "#F0F0F5", paddingTop: 12 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  expandedActions: { flexDirection: "row", gap: 8 },
  ledgerBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F0FDF4", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  ledgerBtnText: { color: SUCCESS, fontWeight: "600", fontSize: 13 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EEF2FF", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  editBtnText: { color: PRIMARY, fontWeight: "600", fontSize: 13 },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF2F2", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  deleteBtnText: { color: DANGER, fontWeight: "600", fontSize: 13 },
  empty: { padding: 60, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, color: TEXT_MUTED, textAlign: "center" },
  fab: { position: "absolute", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
});
