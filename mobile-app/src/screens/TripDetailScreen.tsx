import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRoute, useNavigation, useFocusEffect, RouteProp } from "@react-navigation/native";
import { tripService } from "../lib/services/tripService";
import { vehicleService } from "../lib/services/vehicleService";
import { driverService } from "../lib/services/driverService";
import { fuelService } from "../lib/services/fuelService";
import { tollService } from "../lib/services/tollService";
import { miscExpenseService } from "../lib/services/miscExpenseService";
import { haversineKm } from "../lib/distanceKm";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import DeleteButton from "../components/DeleteButton";
import FormField from "../components/FormField";
import DateField from "../components/DateField";
import ChipPicker from "../components/ChipPicker";
import PlacesAutocomplete from "../components/PlacesAutocomplete";
import { colors, radii, spacing, type, formatCurrency } from "../theme";
import type { Trip, Vehicle, Driver } from "../lib/types";
import type { TripsStackParamList } from "../navigation";

type LatLng = { lat: number; lng: number };

const STATUS_TONE: Record<string, { label: string; tone: "success" | "warning" | "neutral" | "info" }> = {
  completed: { label: "Completed", tone: "success" },
  in_progress: { label: "In Progress", tone: "info" },
  planned: { label: "Planned", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  pending_review: { label: "Pending Review", tone: "warning" },
};
const STATUS_KEYS = Object.keys(STATUS_TONE);
const PAYMENT_MODES = ["cash", "fastag"];
const MISC_CATEGORIES = ["fine", "parking", "halting", "loading_unloading", "cleaning", "battery", "weighbridge", "other"];
const EXPENSE_TABS = [{ key: "fuel", label: "Fuel" }, { key: "toll", label: "Toll" }, { key: "misc", label: "Misc" }] as const;

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function TripDetailScreen() {
  const { params } = useRoute<RouteProp<TripsStackParamList, "TripDetail">>();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicleReg, setVehicleReg] = useState<string>("—");

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editVehicleReg, setEditVehicleReg] = useState<string | null>(null);
  const [editDriverName, setEditDriverName] = useState("");
  const [editOrigin, setEditOrigin] = useState("");
  const [editDestination, setEditDestination] = useState("");
  const [editOriginLatLng, setEditOriginLatLng] = useState<LatLng | null>(null);
  const [editDestinationLatLng, setEditDestinationLatLng] = useState<LatLng | null>(null);
  const [editDistanceKm, setEditDistanceKm] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editFreight, setEditFreight] = useState("");
  const [editStatus, setEditStatus] = useState("planned");
  const [editLoadedWeightKg, setEditLoadedWeightKg] = useState("");
  const [editEmptyWeightKg, setEditEmptyWeightKg] = useState("");
  const [editWeighbridgeLocation, setEditWeighbridgeLocation] = useState("");
  const [editWeighbridgeReceipt, setEditWeighbridgeReceipt] = useState("");
  const editNetWeightKg = editLoadedWeightKg && editEmptyWeightKg ? Number(editLoadedWeightKg) - Number(editEmptyWeightKg) : null;

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseTab, setExpenseTab] = useState<(typeof EXPENSE_TABS)[number]["key"]>("fuel");
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expAmount, setExpAmount] = useState("");
  const [expLitres, setExpLitres] = useState("");
  const [expOdometer, setExpOdometer] = useState("");
  const [expStation, setExpStation] = useState("");
  const [expPaymentMode, setExpPaymentMode] = useState("cash");
  const [expTollPlaza, setExpTollPlaza] = useState("");
  const [expRoute, setExpRoute] = useState("");
  const [expCategory, setExpCategory] = useState("other");
  const [expDescription, setExpDescription] = useState("");
  const [expNotes, setExpNotes] = useState("");

  const load = useCallback(async () => {
    const [tripRes, vehRes, drvRes] = await Promise.all([
      tripService.getById(params.id), vehicleService.getAll(), driverService.getAll(),
    ]);
    if (tripRes.success && tripRes.data) {
      setTrip(tripRes.data);
      const vehicle = (vehRes.data ?? []).find((v) => v.id === tripRes.data!.vehicle_id);
      if (vehicle) setVehicleReg(vehicle.registration_number);
    }
    if (vehRes.success) setVehicles(vehRes.data ?? []);
    if (drvRes.success) setDrivers(drvRes.data ?? []);
    setLoading(false);
  }, [params.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openEdit() {
    if (!trip) return;
    setEditVehicleReg(vehicleReg !== "—" ? vehicleReg : null);
    setEditDriverName(trip.driver_name ?? "");
    setEditOrigin(trip.origin);
    setEditDestination(trip.destination);
    setEditOriginLatLng(null);
    setEditDestinationLatLng(null);
    setEditDistanceKm(trip.distance_km != null ? String(trip.distance_km) : "");
    setEditStartDate(trip.start_date);
    setEditEndDate(trip.end_date ?? "");
    setEditFreight(String(trip.freight_amount ?? ""));
    setEditStatus(trip.status);
    setEditLoadedWeightKg(trip.loaded_weight_kg != null ? String(trip.loaded_weight_kg) : "");
    setEditEmptyWeightKg(trip.empty_weight_kg != null ? String(trip.empty_weight_kg) : "");
    setEditWeighbridgeLocation(trip.weighbridge_location ?? "");
    setEditWeighbridgeReceipt(trip.weighbridge_receipt ?? "");
    setEditMode(true);
  }

  function handleSelectEditOrigin(description: string, latLng: LatLng) {
    setEditOrigin(description);
    setEditOriginLatLng(latLng);
    if (latLng.lat !== 0 && editDestinationLatLng && editDestinationLatLng.lat !== 0) {
      setEditDistanceKm(String(haversineKm(latLng.lat, latLng.lng, editDestinationLatLng.lat, editDestinationLatLng.lng)));
    }
  }

  function handleSelectEditDestination(description: string, latLng: LatLng) {
    setEditDestination(description);
    setEditDestinationLatLng(latLng);
    if (latLng.lat !== 0 && editOriginLatLng && editOriginLatLng.lat !== 0) {
      setEditDistanceKm(String(haversineKm(editOriginLatLng.lat, editOriginLatLng.lng, latLng.lat, latLng.lng)));
    }
  }

  async function handleSaveEdit() {
    if (!trip) return;
    const vehicle = vehicles.find((v) => v.registration_number === editVehicleReg);
    if (!vehicle) return Alert.alert("Vehicle required", "Select a vehicle.");
    if (!editOrigin.trim() || !editDestination.trim()) return Alert.alert("Missing route", "Enter both origin and destination.");
    if (!editDriverName.trim()) return Alert.alert("Driver required", "Select or enter a driver name.");
    setSaving(true);
    const driver = drivers.find((d) => d.name === editDriverName.trim());
    const res = await tripService.update(trip.id, {
      vehicle_id: vehicle.id,
      driver_id: driver?.id ?? null,
      driver_name: editDriverName.trim(),
      driver_phone: driver?.phone ?? trip.driver_phone,
      origin: editOrigin.trim(),
      destination: editDestination.trim(),
      distance_km: editDistanceKm ? Number(editDistanceKm) : null,
      start_date: editStartDate,
      end_date: editEndDate || null,
      freight_amount: editFreight ? Number(editFreight) : 0,
      status: editStatus as any,
      loaded_weight_kg: editLoadedWeightKg ? Number(editLoadedWeightKg) : null,
      empty_weight_kg: editEmptyWeightKg ? Number(editEmptyWeightKg) : null,
      weighbridge_location: editWeighbridgeLocation || null,
      weighbridge_receipt: editWeighbridgeReceipt || null,
    } as any);
    setSaving(false);
    if (res.success) {
      setVehicleReg(vehicle.registration_number);
      setEditMode(false);
      load();
    } else {
      Alert.alert("Couldn't save", res.error ?? "Please try again.");
    }
  }

  function resetExpenseForm() {
    setExpDate(new Date().toISOString().slice(0, 10)); setExpAmount(""); setExpLitres("");
    setExpOdometer(""); setExpStation(""); setExpPaymentMode("cash"); setExpTollPlaza("");
    setExpRoute(""); setExpCategory("other"); setExpDescription(""); setExpNotes("");
  }

  async function handleSaveExpense() {
    if (!trip) return;
    if (!expAmount) return Alert.alert("Missing details", "Amount is required.");
    setExpenseSaving(true);
    let res;
    if (expenseTab === "fuel") {
      if (!expLitres) { setExpenseSaving(false); return Alert.alert("Missing details", "Litres is required."); }
      res = await fuelService.add({
        vehicle_id: trip.vehicle_id, trip_id: trip.id, date: expDate, litres: Number(expLitres),
        amount: Number(expAmount), odometer_km: expOdometer ? Number(expOdometer) : null,
        fuel_station: expStation || null, notes: expNotes || null,
      });
    } else if (expenseTab === "toll") {
      res = await tollService.add({
        vehicle_id: trip.vehicle_id, trip_id: trip.id, date: expDate, amount: Number(expAmount),
        payment_mode: expPaymentMode, toll_plaza: expTollPlaza || null, route: expRoute || null, notes: expNotes || null,
      });
    } else {
      res = await miscExpenseService.add({
        vehicle_id: trip.vehicle_id, trip_id: trip.id, date: expDate, amount: Number(expAmount),
        category: expCategory, description: expDescription || null, notes: expNotes || null,
      });
    }
    setExpenseSaving(false);
    if (res.success) {
      resetExpenseForm();
      setShowExpenseModal(false);
      load();
    } else {
      Alert.alert("Couldn't save", res.error ?? "Please try again.");
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader title="Trip Details" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader title="Trip Details" />
        <View style={styles.center}>
          <Text style={{ color: colors.onSurfaceVariant }}>Trip not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const st = STATUS_TONE[trip.status] ?? { label: trip.status, tone: "neutral" as const };
  const fuelLogs = trip.fuel_logs ?? [];
  const tollLogs = trip.toll_logs ?? [];
  const miscLogs = trip.misc_expenses ?? [];
  const totalExpenses =
    fuelLogs.reduce((s, f) => s + f.amount, 0) +
    tollLogs.reduce((s, t) => s + t.amount, 0) +
    miscLogs.reduce((s, m) => s + m.amount, 0);

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader
        title="Trip Details"
        right={
          editMode ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <TouchableOpacity style={styles.headerBtn} onPress={() => setEditMode(false)}>
                <Text style={styles.headerBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.headerBtn, styles.headerBtnPrimary]} onPress={handleSaveEdit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="white" /> : <Text style={[styles.headerBtnText, { color: "white" }]}>Save</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <TouchableOpacity style={styles.iconBtn} onPress={openEdit}>
                <MaterialIcons name="edit" size={20} color={colors.primary} />
              </TouchableOpacity>
              <DeleteButton
                label="trip"
                onDelete={() => tripService.delete(trip.id)}
                onDeleted={() => navigation.goBack()}
              />
            </View>
          )
        }
      />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 40 }}>
        {editMode ? (
          <Card>
            <ChipPicker label="Vehicle" options={vehicles.map((v) => v.registration_number)} value={editVehicleReg} onChange={setEditVehicleReg} />
            {drivers.length > 0 ? (
              <ChipPicker label="Driver" options={drivers.map((d) => d.name)} value={editDriverName || null} onChange={setEditDriverName} />
            ) : null}
            <FormField label="Driver Name" required value={editDriverName} onChangeText={setEditDriverName} placeholder="Driver name" />
            <PlacesAutocomplete label="Origin" value={editOrigin} onChange={setEditOrigin} onSelect={handleSelectEditOrigin} />
            <PlacesAutocomplete label="Destination" value={editDestination} onChange={setEditDestination} onSelect={handleSelectEditDestination} />
            <FormField label="Distance (km)" value={editDistanceKm} onChangeText={setEditDistanceKm} placeholder="Auto-calculated from route" keyboardType="numeric" />
            <DateField label="Start Date" required value={editStartDate} onChange={setEditStartDate} />
            <DateField label="End Date" value={editEndDate} onChange={setEditEndDate} placeholder="Optional" />
            <FormField label="Freight Amount (₹)" value={editFreight} onChangeText={setEditFreight} placeholder="0" keyboardType="numeric" />
            <ChipPicker
              label="Status"
              options={STATUS_KEYS.map((k) => STATUS_TONE[k].label)}
              value={STATUS_TONE[editStatus]?.label ?? null}
              onChange={(v) => setEditStatus(STATUS_KEYS.find((k) => STATUS_TONE[k].label === v) ?? "planned")}
            />
          </Card>
        ) : null}

        {editMode ? (
          <Card>
            <Text style={styles.sectionHeading}>Weighbridge Entry</Text>
            <FormField label="Loaded Weight (kg)" value={editLoadedWeightKg} onChangeText={setEditLoadedWeightKg} placeholder="0" keyboardType="numeric" />
            <FormField label="Empty Weight (kg)" value={editEmptyWeightKg} onChangeText={setEditEmptyWeightKg} placeholder="0" keyboardType="numeric" />
            {editNetWeightKg !== null ? (
              <View style={styles.netWeightRow}>
                <Text style={styles.netWeightLabel}>Net Load</Text>
                <Text style={styles.netWeightValue}>{editNetWeightKg.toLocaleString("en-IN")} kg</Text>
              </View>
            ) : null}
            <FormField label="Weighbridge Location" value={editWeighbridgeLocation} onChangeText={setEditWeighbridgeLocation} placeholder="Optional" />
            <FormField label="Receipt / Slip Number" value={editWeighbridgeReceipt} onChangeText={setEditWeighbridgeReceipt} placeholder="Optional" />
          </Card>
        ) : (
          <>
            <Card>
              <View style={styles.routeRow}>
                <Text style={styles.routeText}>{trip.origin}</Text>
                <MaterialIcons name="arrow-right-alt" size={20} color={colors.outline} />
                <Text style={styles.routeText}>{trip.destination}</Text>
              </View>
              <StatusBadge label={st.label} tone={st.tone} />
            </Card>

            <Card>
              <Row label="Vehicle" value={vehicleReg} />
              <Row label="Driver" value={trip.driver_name} />
              {trip.driver_phone ? <Row label="Driver Phone" value={trip.driver_phone} /> : null}
              <Row label="Start Date" value={formatDate(trip.start_date)} />
              {trip.end_date ? <Row label="End Date" value={formatDate(trip.end_date)} /> : null}
              {trip.material ? <Row label="Material" value={trip.material} /> : null}
              {trip.doc_number ? <Row label="LR / Doc No." value={trip.doc_number} /> : null}
              {trip.distance_km != null ? <Row label="Distance" value={`${trip.distance_km} km`} /> : null}
              {trip.weight_tonnes != null ? <Row label="Weight" value={`${trip.weight_tonnes} T`} /> : null}
            </Card>

            {trip.loaded_weight_kg != null || trip.empty_weight_kg != null || trip.weighbridge_location || trip.weighbridge_receipt ? (
              <Card>
                <Text style={styles.sectionHeading}>Weighbridge</Text>
                <Row
                  label="Loaded / Empty / Net"
                  value={`${trip.loaded_weight_kg ?? "—"} kg | ${trip.empty_weight_kg ?? "—"} kg | ${
                    trip.loaded_weight_kg != null && trip.empty_weight_kg != null
                      ? `${trip.loaded_weight_kg - trip.empty_weight_kg} kg`
                      : "—"
                  }`}
                />
                {trip.weighbridge_location ? <Row label="Location" value={trip.weighbridge_location} /> : null}
                {trip.weighbridge_receipt ? <Row label="Receipt No." value={trip.weighbridge_receipt} /> : null}
              </Card>
            ) : null}

            <Card>
              <Row label="Freight Amount" value={formatCurrency(trip.freight_amount)} valueColor={colors.primary} />
              {trip.driver_advance ? <Row label="Driver Advance" value={formatCurrency(trip.driver_advance)} /> : null}
              <Row label="Trip Expenses" value={formatCurrency(totalExpenses)} valueColor={colors.error} />
              <Row label="Payment Status" value={trip.payment_status} />
            </Card>

            {trip.notes ? (
              <Card>
                <Text style={styles.notesLabel}>NOTES</Text>
                <Text style={styles.notesText}>{trip.notes}</Text>
              </Card>
            ) : null}

            <View>
              <View style={styles.docSectionHeader}>
                <Text style={styles.sectionHeading}>Expenses</Text>
                <TouchableOpacity style={styles.addExpenseBtn} onPress={() => setShowExpenseModal(true)}>
                  <MaterialIcons name="add" size={16} color={colors.onPrimaryContainer} />
                  <Text style={styles.addExpenseBtnText}>Add Expense</Text>
                </TouchableOpacity>
              </View>
              {fuelLogs.length === 0 && tollLogs.length === 0 && miscLogs.length === 0 ? (
                <Card><Text style={{ color: colors.onSurfaceVariant }}>No expenses logged for this trip yet.</Text></Card>
              ) : (
                <View style={{ gap: spacing.stackGap }}>
                  {fuelLogs.map((f) => (
                    <Card key={`fuel-${f.id}`}>
                      <View style={styles.expenseRow}>
                        <View>
                          <Text style={styles.expenseLabel}>Fuel{f.fuel_station ? ` · ${f.fuel_station}` : ""}</Text>
                          <Text style={styles.expenseMeta}>{new Date(f.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {f.litres} L</Text>
                        </View>
                        <Text style={styles.expenseAmount}>{formatCurrency(f.amount)}</Text>
                      </View>
                    </Card>
                  ))}
                  {tollLogs.map((t) => (
                    <Card key={`toll-${t.id}`}>
                      <View style={styles.expenseRow}>
                        <View>
                          <Text style={styles.expenseLabel}>Toll{t.toll_plaza ? ` · ${t.toll_plaza}` : ""}</Text>
                          <Text style={styles.expenseMeta}>{new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {t.payment_mode === "fastag" ? "FASTag" : "Cash"}</Text>
                        </View>
                        <Text style={styles.expenseAmount}>{formatCurrency(t.amount)}</Text>
                      </View>
                    </Card>
                  ))}
                  {miscLogs.map((m) => (
                    <Card key={`misc-${m.id}`}>
                      <View style={styles.expenseRow}>
                        <View>
                          <Text style={styles.expenseLabel}>{m.category}{m.description ? ` · ${m.description}` : ""}</Text>
                          <Text style={styles.expenseMeta}>{new Date(m.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
                        </View>
                        <Text style={styles.expenseAmount}>{formatCurrency(m.amount)}</Text>
                      </View>
                    </Card>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={showExpenseModal} animationType="slide" transparent onRequestClose={() => setShowExpenseModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Expense</Text>
              <TouchableOpacity onPress={() => setShowExpenseModal(false)}>
                <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <View style={styles.expenseTabRow}>
              {EXPENSE_TABS.map((t) => (
                <TouchableOpacity key={t.key} style={[styles.expenseTab, expenseTab === t.key && styles.expenseTabActive]} onPress={() => setExpenseTab(t.key)}>
                  <Text style={[styles.expenseTabText, expenseTab === t.key && styles.expenseTabTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <DateField label="Date" required value={expDate} onChange={setExpDate} />

              {expenseTab === "fuel" ? (
                <>
                  <FormField label="Litres" required value={expLitres} onChangeText={setExpLitres} placeholder="0" keyboardType="numeric" />
                  <FormField label="Amount (₹)" required value={expAmount} onChangeText={setExpAmount} placeholder="0" keyboardType="numeric" />
                  <FormField label="Odometer (km)" value={expOdometer} onChangeText={setExpOdometer} placeholder="Optional" keyboardType="numeric" />
                  <FormField label="Fuel Station" value={expStation} onChangeText={setExpStation} placeholder="Optional" />
                </>
              ) : null}

              {expenseTab === "toll" ? (
                <>
                  <FormField label="Amount (₹)" required value={expAmount} onChangeText={setExpAmount} placeholder="0" keyboardType="numeric" />
                  <ChipPicker label="Payment Mode" options={PAYMENT_MODES} value={expPaymentMode} onChange={setExpPaymentMode} />
                  <FormField label="Toll Plaza" value={expTollPlaza} onChangeText={setExpTollPlaza} placeholder="Optional" />
                  <FormField label="Route" value={expRoute} onChangeText={setExpRoute} placeholder="Optional" />
                </>
              ) : null}

              {expenseTab === "misc" ? (
                <>
                  <ChipPicker label="Category" options={MISC_CATEGORIES} value={expCategory} onChange={setExpCategory} />
                  <FormField label="Amount (₹)" required value={expAmount} onChangeText={setExpAmount} placeholder="0" keyboardType="numeric" />
                  <FormField label="Description" value={expDescription} onChangeText={setExpDescription} placeholder="Optional" />
                </>
              ) : null}

              <FormField label="Notes" value={expNotes} onChangeText={setExpNotes} placeholder="Optional" />

              <TouchableOpacity style={[styles.saveBtn, expenseSaving && { opacity: 0.6 }]} onPress={handleSaveExpense} disabled={expenseSaving}>
                {expenseSaving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Expense</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  routeText: { ...type.headlineSm, color: colors.onBackground, flexShrink: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  rowLabel: { ...type.bodyMd, color: colors.onSurfaceVariant },
  rowValue: { ...type.bodyMd, color: colors.onSurface, fontWeight: "600" },
  notesLabel: { fontSize: 10, fontWeight: "700", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  notesText: { ...type.bodyMd, color: colors.onSurface },
  netWeightRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: colors.amberBg, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
  },
  netWeightLabel: { fontSize: 13, fontWeight: "700", color: colors.amber },
  netWeightValue: { fontSize: 16, fontWeight: "800", color: colors.amber },
  iconBtn: { width: 36, height: 36, borderRadius: radii.full, justifyContent: "center", alignItems: "center", backgroundColor: colors.surfaceContainerLow },
  headerBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.full, backgroundColor: colors.surfaceContainerLow },
  headerBtnPrimary: { backgroundColor: colors.primary },
  headerBtnText: { ...type.labelMd, color: colors.onSurfaceVariant },
  docSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.stackGap },
  sectionHeading: { ...type.headlineSm, color: colors.onBackground },
  addExpenseBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primaryContainer, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 7 },
  addExpenseBtnText: { ...type.labelMd, color: colors.onPrimaryContainer },
  expenseRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  expenseLabel: { ...type.bodyMd, fontWeight: "600", color: colors.onSurface },
  expenseMeta: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  expenseAmount: { ...type.bodyLg, fontWeight: "700", color: colors.primary },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.containerMargin, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.stackGap },
  modalTitle: { ...type.headlineSm, color: colors.onBackground },
  expenseTabRow: { flexDirection: "row", gap: 8, marginBottom: spacing.stackGap },
  expenseTab: { flex: 1, paddingVertical: 10, borderRadius: radii.md, borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLow, alignItems: "center" },
  expenseTabActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  expenseTabText: { ...type.labelMd, color: colors.onSurfaceVariant },
  expenseTabTextActive: { color: colors.onPrimaryContainer },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 14, alignItems: "center", marginTop: 8, marginBottom: 8 },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
});
