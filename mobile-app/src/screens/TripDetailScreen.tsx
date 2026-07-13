import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRoute, useNavigation, useFocusEffect, RouteProp } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { tripService } from "../lib/services/tripService";
import { vehicleService } from "../lib/services/vehicleService";
import { driverService } from "../lib/services/driverService";
import { fuelService } from "../lib/services/fuelService";
import { tollService } from "../lib/services/tollService";
import { miscExpenseService } from "../lib/services/miscExpenseService";
import { documentService } from "../lib/services/documentService";
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
type PickedFile = { uri: string; name: string; mimeType: string | null };
type Unit = "kg" | "tonnes";

function toKg(value: string, unit: Unit): number {
  const n = Number(value);
  return unit === "tonnes" ? n * 1000 : n;
}

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
  const [editEmptyWeight, setEditEmptyWeight] = useState("");
  const [editEmptyWeightUnit, setEditEmptyWeightUnit] = useState<Unit>("kg");
  const [editSlip1File, setEditSlip1File] = useState<PickedFile | null>(null);
  const [editLoadingDate, setEditLoadingDate] = useState("");
  const [editLoadedQty, setEditLoadedQty] = useState("");
  const [editLoadedQtyUnit, setEditLoadedQtyUnit] = useState<Unit>("kg");
  const [editSlip2File, setEditSlip2File] = useState<PickedFile | null>(null);
  const [editUnloadingDate, setEditUnloadingDate] = useState("");
  const [editDeliveredQty, setEditDeliveredQty] = useState("");
  const [editDeliveredQtyUnit, setEditDeliveredQtyUnit] = useState<Unit>("kg");
  const [editSlip3File, setEditSlip3File] = useState<PickedFile | null>(null);

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
    setEditEmptyWeight(trip.empty_truck_weight != null ? String(trip.empty_truck_weight) : "");
    setEditEmptyWeightUnit("kg");
    setEditSlip1File(null);
    setEditLoadingDate(trip.loading_date ?? "");
    setEditLoadedQty(trip.loading_quantity != null ? String(trip.loading_quantity) : "");
    setEditLoadedQtyUnit("kg");
    setEditSlip2File(null);
    setEditUnloadingDate(trip.unloading_date ?? "");
    setEditDeliveredQty(trip.unloading_quantity != null ? String(trip.unloading_quantity) : "");
    setEditDeliveredQtyUnit("kg");
    setEditSlip3File(null);
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
    if (!editOrigin.trim()) return Alert.alert("Required", "Origin is mandatory.");
    if (!editDestination.trim()) return Alert.alert("Required", "Destination is mandatory.");
    if (!editDriverName.trim()) return Alert.alert("Driver required", "Select or enter a driver name.");
    if (!editEmptyWeight) return Alert.alert("Required", "Slip 1 empty truck weight is required.");
    if (!editSlip1File && !trip.weighbridge_slip_1_url) return Alert.alert("Required", "Slip 1 image upload is mandatory.");
    if (!editLoadingDate) return Alert.alert("Required", "Slip 2 loading date is required.");
    if (!editLoadedQty) return Alert.alert("Required", "Slip 2 loaded quantity is required.");
    if (!editSlip2File && !trip.weighbridge_slip_2_url) return Alert.alert("Required", "Slip 2 image upload is mandatory.");
    if (!editUnloadingDate) return Alert.alert("Required", "Slip 3 unloading date is required.");
    if (!editDeliveredQty) return Alert.alert("Required", "Slip 3 delivered quantity is required.");
    if (!editSlip3File && !trip.weighbridge_slip_3_url) return Alert.alert("Required", "Slip 3 image upload is mandatory.");

    setSaving(true);
    const driver = drivers.find((d) => d.name === editDriverName.trim());
    const updateData: Record<string, unknown> = {
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
      empty_truck_weight: toKg(editEmptyWeight, editEmptyWeightUnit),
      loading_date: editLoadingDate,
      loading_quantity: toKg(editLoadedQty, editLoadedQtyUnit),
      unloading_date: editUnloadingDate,
      unloading_quantity: toKg(editDeliveredQty, editDeliveredQtyUnit),
    };

    const slips = [
      { file: editSlip1File, column: "weighbridge_slip_1_url", name: "Weighbridge Slip 1 - Empty Truck" },
      { file: editSlip2File, column: "weighbridge_slip_2_url", name: "Weighbridge Slip 2 - After Loading" },
      { file: editSlip3File, column: "weighbridge_slip_3_url", name: "Weighbridge Slip 3 - After Delivery" },
    ];
    for (const slip of slips) {
      if (slip.file) {
        const docRes = await documentService.create(slip.file, {
          name: slip.name,
          category: "Weighbridge Slip",
          linked_type: "trip",
          linked_id: trip.id,
        });
        if (docRes.success && docRes.data?.file_url) updateData[slip.column] = docRes.data.file_url;
      }
    }

    const res = await tripService.update(trip.id, updateData as any);
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
            <PlacesAutocomplete label="Origin" required value={editOrigin} onChange={setEditOrigin} onSelect={handleSelectEditOrigin} />
            <PlacesAutocomplete label="Destination" required value={editDestination} onChange={setEditDestination} onSelect={handleSelectEditDestination} />
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
            <Text style={styles.wbTitle}>Weighbridge & Quantity</Text>
            <Text style={styles.wbSubtitle}>Record the three weighbridge slips for this trip.</Text>

            <Text style={styles.slipHeading}>Slip 1 — Empty Truck</Text>
            <View style={styles.weightRow}>
              <FormField
                label="Empty Truck Weight *"
                value={editEmptyWeight}
                onChangeText={setEditEmptyWeight}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
              <UnitPicker value={editEmptyWeightUnit} onChange={setEditEmptyWeightUnit} />
            </View>
            <SlipField existingUrl={trip.weighbridge_slip_1_url} newFile={editSlip1File} onPick={setEditSlip1File} label="Upload slip *" />

            <View style={styles.slipDivider} />

            <Text style={styles.slipHeading}>Slip 2 — After Loading</Text>
            <DateField label="Loading Date *" value={editLoadingDate} onChange={setEditLoadingDate} />
            <View style={styles.weightRow}>
              <FormField
                label="Loaded Quantity *"
                value={editLoadedQty}
                onChangeText={setEditLoadedQty}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
              <UnitPicker value={editLoadedQtyUnit} onChange={setEditLoadedQtyUnit} />
            </View>
            <SlipField existingUrl={trip.weighbridge_slip_2_url} newFile={editSlip2File} onPick={setEditSlip2File} label="Upload slip *" />

            <View style={styles.slipDivider} />

            <Text style={styles.slipHeading}>Slip 3 — After Delivery</Text>
            <DateField label="Unloading Date *" value={editUnloadingDate} onChange={setEditUnloadingDate} />
            <View style={styles.weightRow}>
              <FormField
                label="Delivered Quantity *"
                value={editDeliveredQty}
                onChangeText={setEditDeliveredQty}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
              <UnitPicker value={editDeliveredQtyUnit} onChange={setEditDeliveredQtyUnit} />
            </View>
            <SlipField existingUrl={trip.weighbridge_slip_3_url} newFile={editSlip3File} onPick={setEditSlip3File} label="Upload slip *" />
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

            {trip.empty_truck_weight != null || trip.loading_quantity != null || trip.unloading_quantity != null || trip.weighbridge_slip_1_url ? (
              <Card>
                <Text style={styles.sectionHeading}>Weighbridge & Quantity</Text>
                <Row label="Empty Truck Weight" value={trip.empty_truck_weight != null ? `${trip.empty_truck_weight.toLocaleString("en-IN")} kg` : "—"} />
                <Row label="Loading Date" value={formatDate(trip.loading_date)} />
                <Row label="Loaded Quantity" value={trip.loading_quantity != null ? `${trip.loading_quantity.toLocaleString("en-IN")} kg` : "—"} />
                <Row label="Unloading Date" value={formatDate(trip.unloading_date)} />
                <Row label="Delivered Quantity" value={trip.unloading_quantity != null ? `${trip.unloading_quantity.toLocaleString("en-IN")} kg` : "—"} />
                {trip.quantity_lost != null ? (
                  <Row
                    label="Quantity Lost"
                    value={`${trip.quantity_lost.toLocaleString("en-IN")} kg`}
                    valueColor={trip.quantity_lost < 0 ? colors.danger : undefined}
                  />
                ) : null}
                <View style={styles.slipLinksRow}>
                  {trip.weighbridge_slip_1_url ? (
                    <TouchableOpacity style={styles.slipLink} onPress={() => Linking.openURL(trip.weighbridge_slip_1_url!)}>
                      <MaterialIcons name="image" size={16} color={colors.primary} />
                      <Text style={styles.slipLinkText}>Slip 1</Text>
                    </TouchableOpacity>
                  ) : null}
                  {trip.weighbridge_slip_2_url ? (
                    <TouchableOpacity style={styles.slipLink} onPress={() => Linking.openURL(trip.weighbridge_slip_2_url!)}>
                      <MaterialIcons name="image" size={16} color={colors.primary} />
                      <Text style={styles.slipLinkText}>Slip 2</Text>
                    </TouchableOpacity>
                  ) : null}
                  {trip.weighbridge_slip_3_url ? (
                    <TouchableOpacity style={styles.slipLink} onPress={() => Linking.openURL(trip.weighbridge_slip_3_url!)}>
                      <MaterialIcons name="image" size={16} color={colors.primary} />
                      <Text style={styles.slipLinkText}>Slip 3</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
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

function UnitPicker({ value, onChange }: { value: Unit; onChange: (v: Unit) => void }) {
  return (
    <View style={styles.unitPicker}>
      {(["kg", "tonnes"] as const).map((u) => (
        <TouchableOpacity
          key={u}
          style={[styles.unitBtn, value === u && styles.unitBtnActive]}
          onPress={() => onChange(u)}
        >
          <Text style={[styles.unitBtnText, value === u && styles.unitBtnTextActive]}>{u}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SlipUploadBtn({
  file, onPick, label,
}: { file: PickedFile | null; onPick: (f: PickedFile) => void; label: string }) {
  return (
    <TouchableOpacity
      style={[styles.slipUploadBtn, file && styles.slipUploadBtnDone]}
      onPress={async () => {
        const res = await DocumentPicker.getDocumentAsync({
          type: ["image/*", "application/pdf"],
          copyToCacheDirectory: true,
        });
        if (!res.canceled && res.assets?.[0]) {
          const a = res.assets[0];
          onPick({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? null });
        }
      }}
    >
      <MaterialIcons
        name={file ? "check-circle" : "camera-alt"}
        size={16}
        color={file ? colors.success : colors.primary}
      />
      <Text style={[styles.slipUploadBtnText, file && { color: colors.success }]}>
        {file ? file.name : label}
      </Text>
    </TouchableOpacity>
  );
}

// Edit mode: a slip may already have an uploaded URL from a prior save — show
// it as "done" and let the user replace it, plus a link to view the current file.
function SlipField({
  existingUrl, newFile, onPick, label,
}: { existingUrl?: string | null; newFile: PickedFile | null; onPick: (f: PickedFile) => void; label: string }) {
  const displayFile = newFile ?? (existingUrl ? { uri: existingUrl, name: "Uploaded — tap to replace", mimeType: null } : null);
  return (
    <View style={{ marginBottom: 4 }}>
      <SlipUploadBtn file={displayFile} onPick={onPick} label={label} />
      {existingUrl && !newFile ? (
        <TouchableOpacity onPress={() => Linking.openURL(existingUrl)}>
          <Text style={styles.viewSlipLink}>View current slip</Text>
        </TouchableOpacity>
      ) : null}
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
  wbTitle: { ...type.headlineSm, color: colors.onSurface, marginBottom: 4 },
  wbSubtitle: { fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 16 },
  slipHeading: { fontSize: 13, fontWeight: "700", color: colors.primary, marginBottom: 10, marginTop: 4 },
  slipDivider: { height: 1, backgroundColor: colors.surfaceContainer, marginVertical: 16 },
  weightRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 8 },
  unitPicker: { flexDirection: "column", borderWidth: 1, borderColor: colors.surfaceContainer, borderRadius: radii.md, overflow: "hidden", marginBottom: 16 },
  unitBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surfaceContainer },
  unitBtnActive: { backgroundColor: colors.primaryContainer },
  unitBtnText: { fontSize: 12, fontWeight: "600", color: colors.onSurfaceVariant },
  unitBtnTextActive: { color: colors.onPrimaryContainer },
  slipUploadBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: colors.primary, borderStyle: "dashed", borderRadius: radii.md, padding: 12, marginBottom: 4 },
  slipUploadBtnDone: { borderColor: colors.success, borderStyle: "solid", backgroundColor: colors.successBg },
  slipUploadBtnText: { ...type.labelMd, color: colors.primary, flex: 1 },
  viewSlipLink: { fontSize: 12, color: colors.primary, fontWeight: "600", marginTop: 4, marginBottom: 10 },
  slipLinksRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  slipLink: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceContainerLow, borderRadius: radii.full, paddingHorizontal: 10, paddingVertical: 6 },
  slipLinkText: { ...type.labelMd, color: colors.primary },
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
