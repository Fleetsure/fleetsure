import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp, useFocusEffect } from "@react-navigation/native";
import { ArrowLeft, MessageCircle, Plus, Trash2, X, ChevronDown, Check } from "lucide-react-native";

import { tripService } from "../services/tripService";
import { vehicleService } from "../services/vehicleService";
import type { Trip, Vehicle, Expense } from "../types";
import type { TripsStackParamList } from "../navigation";

const PRIMARY = "#1E2D8E";
const BG = "#F0F4FF";
const CARD = "#ffffff";
const TEXT = "#1A1A2E";
const TEXT_MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const DANGER = "#DC2626";
const SUCCESS = "#15803D";
const WARNING = "#D97706";

const EXPENSE_TYPES = [
  { value: "fuel", label: "Fuel (HSD)" },
  { value: "toll", label: "Toll / Bridge" },
  { value: "rto", label: "RTO" },
  { value: "police_challan", label: "Police / Naka" },
  { value: "maintenance", label: "Parts & Repairs" },
  { value: "tyre", label: "Tyre Repair" },
  { value: "oil", label: "Oil" },
  { value: "loading_unloading", label: "Loading / Unloading" },
  { value: "driver_payment", label: "Driver Payment" },
  { value: "telephone", label: "Telephone" },
  { value: "other", label: "Other" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  planned: { label: "Planned", color: PRIMARY, bg: "#EEF2FF" },
  in_progress: { label: "In Progress", color: WARNING, bg: "#FFF7ED" },
  completed: { label: "Completed", color: SUCCESS, bg: "#F0FDF4" },
  cancelled: { label: "Cancelled", color: DANGER, bg: "#FEF2F2" },
};

const NEXT_STATUS: Record<string, string | null> = {
  planned: "in_progress",
  in_progress: "completed",
  completed: null,
  cancelled: null,
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  planned: "Start Trip",
  in_progress: "Mark Delivered",
};

type RouteType = RouteProp<TripsStackParamList, "TripDetail">;

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TripDetailScreen() {
  const route = useRoute<RouteType>();
  const navigation = useNavigation();
  const { tripId } = route.params;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Expense form
  const [expModal, setExpModal] = useState(false);
  const [expType, setExpType] = useState("fuel");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expDesc, setExpDesc] = useState("");
  const [savingExp, setSavingExp] = useState(false);
  const [expTypePicker, setExpTypePicker] = useState(false);

  const load = useCallback(async () => {
    const res = await tripService.getById(tripId);
    if (res.success && res.data) {
      setTrip(res.data);
      if (res.data.vehicle_id) {
        const vr = await vehicleService.getAll();
        const v = (vr.data ?? []).find((vv) => vv.id === res.data!.vehicle_id);
        if (v) setVehicle(v);
      }
    }
    setLoading(false);
  }, [tripId]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleStatusUpdate = async () => {
    if (!trip) return;
    const next = NEXT_STATUS[trip.status];
    if (!next) return;
    const label = NEXT_STATUS_LABEL[trip.status];
    Alert.alert(
      label,
      `Change status to "${next.replace("_", " ")}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: label,
          onPress: async () => {
            setUpdatingStatus(true);
            const updates: Partial<Trip> = { status: next };
            if (next === "completed") updates.end_date = new Date().toISOString().slice(0, 10);
            await tripService.update(trip.id, updates);
            await load();
            setUpdatingStatus(false);
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert("Cancel Trip", "Are you sure you want to cancel this trip?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          await tripService.update(tripId, { status: "cancelled" });
          await load();
        },
      },
    ]);
  };

  const handleAddExpense = async () => {
    if (!expAmount) { Alert.alert("Required", "Enter expense amount."); return; }
    setSavingExp(true);
    const res = await tripService.addExpense(tripId, {
      expense_type: expType,
      amount: parseFloat(expAmount),
      date: expDate,
      description: expDesc.trim() || null,
    });
    if (res.success) {
      setExpModal(false);
      setExpAmount("");
      setExpDesc("");
      setExpType("fuel");
      await load();
    } else {
      Alert.alert("Error", res.error ?? "Could not add expense.");
    }
    setSavingExp(false);
  };

  const handleDeleteExpense = (id: string) => {
    Alert.alert("Delete Expense", "Remove this expense?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await tripService.deleteExpense(id); await load(); } },
    ]);
  };

  const shareOnWhatsApp = async () => {
    if (!trip) return;
    const allExpenses = [
      ...(trip.expenses ?? []),
      ...(trip.fuel_logs ?? []).map((f) => ({ ...f, expense_type: "Fuel", description: f.fuel_station })),
      ...(trip.toll_logs ?? []).map((t) => ({ ...t, expense_type: "Toll", description: t.toll_plaza })),
      ...(trip.misc_expenses ?? []).map((m) => ({ ...m, expense_type: m.category })),
    ];
    const totalExp = allExpenses.reduce((s, e) => s + parseFloat((e as any).amount || 0), 0);
    const freight = parseFloat(String(trip.freight_amount)) || 0;
    const profit = freight - totalExp;

    const lines = [
      `*Trip Sheet*`,
      `*${trip.origin} → ${trip.destination}*`,
      ``,
      `*Vehicle:* ${vehicle?.registration_number ?? "—"}`,
      `*Driver:* ${trip.driver_name}${trip.driver_phone ? `  |  ${trip.driver_phone}` : ""}`,
      `*Dates:* ${fmtDate(trip.start_date)} → ${fmtDate(trip.end_date)}`,
      trip.doc_number ? `*LR No:* ${trip.doc_number}` : null,
      trip.material ? `*Material:* ${trip.material}${trip.weight_tonnes ? `  |  ${trip.weight_tonnes}T` : ""}` : null,
      ``,
      `*Freight:* ₹${freight.toLocaleString("en-IN")}`,
      totalExp > 0 ? `*Expenses:* ₹${totalExp.toLocaleString("en-IN")}` : null,
      totalExp > 0 ? `*Net:* ₹${profit.toLocaleString("en-IN")}` : null,
      `*Status:* ${trip.status.replace("_", " ")}`,
      ``,
      `_FleetSure_`,
    ].filter(Boolean);

    const url = `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
    await Linking.openURL(url);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={PRIMARY} size="large" /></View>;
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <Text style={{ color: TEXT_MUTED }}>Trip not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sc = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG.planned;
  const nextStatus = NEXT_STATUS[trip.status];

  const allExpenses: (Expense & { _source?: string })[] = [
    ...(trip.expenses ?? []),
    ...(trip.fuel_logs ?? []).map((f) => ({
      id: f.id, trip_id: tripId, expense_type: "fuel",
      amount: f.amount, date: f.date,
      description: f.fuel_station ? `${f.litres}L — ${f.fuel_station}` : `${f.litres}L`,
      _source: "fuel_logs",
    })),
    ...(trip.toll_logs ?? []).map((t) => ({
      id: t.id, trip_id: tripId, expense_type: "toll",
      amount: t.amount, date: t.date,
      description: t.toll_plaza ?? undefined,
      _source: "toll_logs",
    })),
    ...(trip.misc_expenses ?? []).map((m) => ({
      id: m.id, trip_id: tripId, expense_type: m.category,
      amount: m.amount, date: m.date,
      description: m.description ?? undefined,
      _source: "misc_expenses",
    })),
  ];

  const totalExp = allExpenses.reduce((s, e) => s + parseFloat(String(e.amount)), 0);
  const freight = parseFloat(String(trip.freight_amount)) || 0;
  const advance = parseFloat(String(trip.driver_advance ?? 0)) || 0;
  const profit = freight - totalExp;
  const margin = freight > 0 ? ((profit / freight) * 100).toFixed(1) : "0.0";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={TEXT} />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarRoute} numberOfLines={1}>
            {trip.origin} → {trip.destination}
          </Text>
        </View>
        <TouchableOpacity onPress={shareOnWhatsApp} style={styles.waBtn}>
          <MessageCircle size={22} color="#25D366" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      >
        {/* Status Badge + Actions */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
          </View>
          <View style={styles.statusActions}>
            {nextStatus && (
              <TouchableOpacity
                style={[styles.statusBtn, { backgroundColor: sc.color }]}
                onPress={handleStatusUpdate}
                disabled={updatingStatus}
              >
                {updatingStatus ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.statusBtnText}>{NEXT_STATUS_LABEL[trip.status]}</Text>
                )}
              </TouchableOpacity>
            )}
            {["planned", "in_progress"].includes(trip.status) && (
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Trip Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip Details</Text>
          <View style={styles.detailGrid}>
            <DetailRow label="Vehicle" value={vehicle?.registration_number ?? "—"} />
            <DetailRow label="Driver" value={trip.driver_name} />
            {trip.driver_phone && <DetailRow label="Driver Phone" value={trip.driver_phone} />}
            <DetailRow label="Start Date" value={fmtDate(trip.start_date)} />
            <DetailRow label="End Date" value={fmtDate(trip.end_date)} />
            {trip.distance_km && <DetailRow label="Distance" value={`${trip.distance_km} km`} />}
            {trip.doc_number && <DetailRow label="LR Number" value={trip.doc_number} />}
            {trip.material && <DetailRow label="Material" value={trip.material} />}
            {trip.weight_tonnes && <DetailRow label="Weight" value={`${trip.weight_tonnes} T`} />}
          </View>
        </View>

        {/* Freight & Advance */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Freight & Payment</Text>
          <View style={styles.fRow}>
            <View style={styles.fItem}>
              <Text style={styles.fLabel}>Freight</Text>
              <Text style={styles.fValue}>₹{freight.toLocaleString("en-IN")}</Text>
            </View>
            <View style={styles.fDivider} />
            <View style={styles.fItem}>
              <Text style={styles.fLabel}>Driver Advance</Text>
              <Text style={styles.fValue}>₹{advance.toLocaleString("en-IN")}</Text>
            </View>
          </View>
        </View>

        {/* Expenses */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Expenses ({allExpenses.length})</Text>
            <TouchableOpacity
              style={styles.addExpBtn}
              onPress={() => setExpModal(true)}
            >
              <Plus size={16} color={PRIMARY} />
              <Text style={styles.addExpBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {allExpenses.length === 0 ? (
            <Text style={styles.noExpText}>No expenses logged yet.</Text>
          ) : (
            allExpenses.map((e) => (
              <View key={e.id} style={styles.expRow}>
                <View style={styles.expLeft}>
                  <Text style={styles.expType}>
                    {EXPENSE_TYPES.find((t) => t.value === e.expense_type)?.label ?? e.expense_type}
                  </Text>
                  <Text style={styles.expMeta}>{e.date}{e.description ? ` — ${e.description}` : ""}</Text>
                </View>
                <View style={styles.expRight}>
                  <Text style={styles.expAmount}>₹{parseFloat(String(e.amount)).toLocaleString("en-IN")}</Text>
                  {!e._source && (
                    <TouchableOpacity onPress={() => handleDeleteExpense(e.id)}>
                      <Trash2 size={16} color={DANGER} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* P&L Summary */}
        <View style={[styles.card, styles.pnlCard]}>
          <Text style={styles.cardTitle}>Trip P&L</Text>
          <View style={styles.pnlRow}>
            <PnLItem label="Freight" value={`₹${freight.toLocaleString("en-IN")}`} color={SUCCESS} />
            <PnLItem label="Expenses" value={`₹${totalExp.toLocaleString("en-IN")}`} color={DANGER} />
            <PnLItem
              label="Net"
              value={`${profit >= 0 ? "+" : ""}₹${Math.abs(profit).toLocaleString("en-IN")}`}
              color={profit >= 0 ? SUCCESS : DANGER}
              large
            />
          </View>
          <View style={styles.marginRow}>
            <View style={styles.marginBarBg}>
              <View style={[styles.marginBarFill, {
                width: `${Math.max(0, Math.min(100, parseFloat(margin)))}%` as any,
                backgroundColor: parseFloat(margin) < 0 ? DANGER : parseFloat(margin) < 15 ? WARNING : SUCCESS,
              }]} />
            </View>
            <Text style={[styles.marginPct, { color: parseFloat(margin) < 0 ? DANGER : parseFloat(margin) < 15 ? WARNING : SUCCESS }]}>
              {margin}% margin
            </Text>
          </View>
        </View>

        {trip.notes ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{trip.notes}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal visible={expModal} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
          <View style={expStyles.header}>
            <Text style={expStyles.title}>Add Expense</Text>
            <TouchableOpacity onPress={() => setExpModal(false)}>
              <X size={24} color={TEXT} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={expStyles.content}>
            {/* Type */}
            <Text style={expStyles.label}>Type *</Text>
            <TouchableOpacity style={expStyles.typeBtn} onPress={() => setExpTypePicker(true)}>
              <Text style={expStyles.typeBtnText}>
                {EXPENSE_TYPES.find((t) => t.value === expType)?.label ?? expType}
              </Text>
              <ChevronDown size={16} color={TEXT_MUTED} />
            </TouchableOpacity>

            <Text style={expStyles.label}>Amount (₹) *</Text>
            <TextInput
              style={expStyles.input}
              value={expAmount}
              onChangeText={setExpAmount}
              placeholder="e.g. 2500"
              placeholderTextColor={TEXT_MUTED}
              keyboardType="numeric"
            />

            <Text style={expStyles.label}>Date</Text>
            <TextInput
              style={expStyles.input}
              value={expDate}
              onChangeText={setExpDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={TEXT_MUTED}
              keyboardType="numeric"
            />

            <Text style={expStyles.label}>Description (optional)</Text>
            <TextInput
              style={expStyles.input}
              value={expDesc}
              onChangeText={setExpDesc}
              placeholder="e.g. Fuel station name, toll plaza"
              placeholderTextColor={TEXT_MUTED}
            />
          </ScrollView>
          <View style={expStyles.footer}>
            <TouchableOpacity
              style={[expStyles.saveBtn, savingExp && { opacity: 0.6 }]}
              onPress={handleAddExpense}
              disabled={savingExp}
            >
              {savingExp ? <ActivityIndicator color="#fff" size="small" /> : (
                <Text style={expStyles.saveBtnText}>Add Expense</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Type Picker Modal */}
      <Modal visible={expTypePicker} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} onPress={() => setExpTypePicker(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Expense Type</Text>
            <ScrollView>
              {EXPENSE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.pickerOption, t.value === expType && styles.pickerOptionActive]}
                  onPress={() => { setExpType(t.value); setExpTypePicker(false); }}
                >
                  <Text style={[styles.pickerOptionText, t.value === expType && { color: PRIMARY, fontWeight: "700" }]}>
                    {t.label}
                  </Text>
                  {t.value === expType && <Check size={16} color={PRIMARY} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function PnLItem({ label, value, color, large }: { label: string; value: string; color: string; large?: boolean }) {
  return (
    <View style={styles.pnlItem}>
      <Text style={styles.pnlLabel}>{label}</Text>
      <Text style={[styles.pnlValue, { color }, large && { fontSize: 18 }]}>{value}</Text>
    </View>
  );
}

const expStyles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  title: { fontSize: 18, fontWeight: "800", color: TEXT },
  content: { padding: 16, gap: 4 },
  label: { fontSize: 13, fontWeight: "600", color: TEXT_MUTED, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, fontSize: 14, color: TEXT },
  typeBtn: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  typeBtnText: { fontSize: 14, color: TEXT },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: BORDER },
  saveBtn: { backgroundColor: PRIMARY, borderRadius: 12, padding: 16, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn: { padding: 4, marginRight: 8 },
  topBarCenter: { flex: 1 },
  topBarRoute: { fontSize: 15, fontWeight: "700", color: TEXT },
  waBtn: { padding: 6 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 13, fontWeight: "700" },
  statusActions: { flexDirection: "row", gap: 8, flex: 1 },
  statusBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignItems: "center", justifyContent: "center", minHeight: 36 },
  statusBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" },
  cancelBtnText: { color: DANGER, fontWeight: "700", fontSize: 13 },
  card: { backgroundColor: CARD, borderRadius: 14, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  pnlCard: { borderWidth: 1, borderColor: "#D1FAE5" },
  cardTitle: { fontSize: 14, fontWeight: "800", color: TEXT, marginBottom: 12 },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  detailGrid: { gap: 8 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  detailLabel: { fontSize: 12, color: TEXT_MUTED, flex: 1 },
  detailValue: { fontSize: 13, fontWeight: "600", color: TEXT, flex: 2, textAlign: "right" },
  fRow: { flexDirection: "row" },
  fItem: { flex: 1, alignItems: "center" },
  fDivider: { width: 1, backgroundColor: BORDER },
  fLabel: { fontSize: 11, color: TEXT_MUTED, marginBottom: 4 },
  fValue: { fontSize: 16, fontWeight: "800", color: TEXT },
  addExpBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EEF2FF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addExpBtnText: { color: PRIMARY, fontWeight: "700", fontSize: 13 },
  noExpText: { fontSize: 13, color: TEXT_MUTED, textAlign: "center", paddingVertical: 12 },
  expRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  expLeft: { flex: 1 },
  expType: { fontSize: 13, fontWeight: "600", color: TEXT },
  expMeta: { fontSize: 11, color: TEXT_MUTED, marginTop: 2 },
  expRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  expAmount: { fontSize: 14, fontWeight: "700", color: TEXT },
  pnlRow: { flexDirection: "row", marginBottom: 12 },
  pnlItem: { flex: 1, alignItems: "center" },
  pnlLabel: { fontSize: 11, color: TEXT_MUTED, marginBottom: 4 },
  pnlValue: { fontSize: 15, fontWeight: "800" },
  marginRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  marginBarBg: { flex: 1, height: 6, backgroundColor: "#F0F0F5", borderRadius: 9, overflow: "hidden" },
  marginBarFill: { height: "100%", borderRadius: 9 },
  marginPct: { fontSize: 12, fontWeight: "700", minWidth: 70, textAlign: "right" },
  notesText: { fontSize: 13, color: TEXT_MUTED, lineHeight: 20 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  pickerSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "60%" as any },
  pickerTitle: { fontSize: 16, fontWeight: "700", color: TEXT, marginBottom: 16, textAlign: "center" },
  pickerOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  pickerOptionActive: { backgroundColor: "#F0F4FF" },
  pickerOptionText: { fontSize: 15, color: TEXT },
});
