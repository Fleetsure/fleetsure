import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { tripService } from "../lib/services/tripService";
import { vehicleService } from "../lib/services/vehicleService";
import { driverService } from "../lib/services/driverService";
import { documentService } from "../lib/services/documentService";
import { haversineKm } from "../lib/distanceKm";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import FormField from "../components/FormField";
import DateField from "../components/DateField";
import ChipPicker from "../components/ChipPicker";
import PlacesAutocomplete from "../components/PlacesAutocomplete";
import { colors, radii, spacing, type } from "../theme";
import type { Vehicle, Driver } from "../lib/types";

type LatLng = { lat: number; lng: number };
type PickedFile = { uri: string; name: string; mimeType: string | null };
type Unit = "kg" | "tonnes";

function toKg(value: string, unit: Unit): number {
  const n = Number(value);
  return unit === "tonnes" ? n * 1000 : n;
}

export default function AddTripScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [vehicleReg, setVehicleReg] = useState<string | null>(null);
  const [driverName, setDriverName] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [originLatLng, setOriginLatLng] = useState<LatLng | null>(null);
  const [destinationLatLng, setDestinationLatLng] = useState<LatLng | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [freightAmount, setFreightAmount] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [material, setMaterial] = useState("");
  const [weightTonnes, setWeightTonnes] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [driverAdvance, setDriverAdvance] = useState("");
  const [notes, setNotes] = useState("");

  // Slip 1 — Empty Truck
  const [emptyWeight, setEmptyWeight] = useState("");
  const [emptyWeightUnit, setEmptyWeightUnit] = useState<Unit>("kg");
  const [slip1File, setSlip1File] = useState<PickedFile | null>(null);

  // Slip 2 — After Loading
  const [loadingDate, setLoadingDate] = useState("");
  const [loadedQty, setLoadedQty] = useState("");
  const [loadedQtyUnit, setLoadedQtyUnit] = useState<Unit>("kg");
  const [slip2File, setSlip2File] = useState<PickedFile | null>(null);

  // Slip 3 — After Delivery
  const [unloadingDate, setUnloadingDate] = useState("");
  const [deliveredQty, setDeliveredQty] = useState("");
  const [deliveredQtyUnit, setDeliveredQtyUnit] = useState<Unit>("kg");
  const [slip3File, setSlip3File] = useState<PickedFile | null>(null);

  useEffect(() => {
    (async () => {
      const [vehRes, drvRes] = await Promise.all([vehicleService.getAll(), driverService.getAll()]);
      if (vehRes.success) setVehicles(vehRes.data ?? []);
      if (drvRes.success) setDrivers(drvRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  function handleSelectDriver(name: string) {
    setDriverName(name);
  }

  function handleSelectOrigin(description: string, latLng: LatLng) {
    setOrigin(description);
    setOriginLatLng(latLng);
    if (latLng.lat !== 0 && destinationLatLng && destinationLatLng.lat !== 0) {
      setDistanceKm(String(haversineKm(latLng.lat, latLng.lng, destinationLatLng.lat, destinationLatLng.lng)));
    }
  }

  function handleSelectDestination(description: string, latLng: LatLng) {
    setDestination(description);
    setDestinationLatLng(latLng);
    if (latLng.lat !== 0 && originLatLng && originLatLng.lat !== 0) {
      setDistanceKm(String(haversineKm(originLatLng.lat, originLatLng.lng, latLng.lat, latLng.lng)));
    }
  }

  async function handleSave() {
    const vehicle = vehicles.find((v) => v.registration_number === vehicleReg);
    if (!vehicle) {
      Alert.alert("Vehicle required", "Select a vehicle for this trip.");
      return;
    }
    if (!origin.trim()) return Alert.alert("Required", "Origin is mandatory.");
    if (!destination.trim()) return Alert.alert("Required", "Destination is mandatory.");
    if (!driverName.trim()) {
      Alert.alert("Driver required", "Select or enter a driver name.");
      return;
    }
    if (!docNumber.trim()) {
      Alert.alert("LR Number required", "Please enter the LR / document number.");
      return;
    }
    if (!emptyWeight) return Alert.alert("Required", "Slip 1 empty truck weight is required.");
    if (!slip1File) return Alert.alert("Required", "Slip 1 image upload is mandatory.");
    if (!loadingDate) return Alert.alert("Required", "Slip 2 loading date is required.");
    if (!loadedQty) return Alert.alert("Required", "Slip 2 loaded quantity is required.");
    if (!slip2File) return Alert.alert("Required", "Slip 2 image upload is mandatory.");
    if (!unloadingDate) return Alert.alert("Required", "Slip 3 unloading date is required.");
    if (!deliveredQty) return Alert.alert("Required", "Slip 3 delivered quantity is required.");
    if (!slip3File) return Alert.alert("Required", "Slip 3 image upload is mandatory.");

    const driver = drivers.find((d) => d.name === driverName.trim());
    setSaving(true);
    const res = await tripService.create({
      vehicle_id: vehicle.id,
      driver_id: driver?.id ?? null,
      driver_name: driverName.trim(),
      driver_phone: driver?.phone ?? null,
      origin: origin.trim(),
      destination: destination.trim(),
      start_date: startDate,
      end_date: endDate || null,
      freight_amount: freightAmount ? Number(freightAmount) : 0,
      doc_number: docNumber.trim(),
      material: material || null,
      weight_tonnes: weightTonnes ? Number(weightTonnes) : null,
      distance_km: distanceKm ? Number(distanceKm) : null,
      driver_advance: driverAdvance ? Number(driverAdvance) : null,
      notes: notes || null,
      empty_truck_weight: toKg(emptyWeight, emptyWeightUnit),
      loading_date: loadingDate,
      loading_quantity: toKg(loadedQty, loadedQtyUnit),
      unloading_date: unloadingDate,
      unloading_quantity: toKg(deliveredQty, deliveredQtyUnit),
    } as any);

    if (!res.success || !res.data) {
      setSaving(false);
      Alert.alert("Couldn't save trip", res.error ?? "Please try again.");
      return;
    }

    const newTripId = res.data.id;
    const slips = [
      { file: slip1File, column: "weighbridge_slip_1_url", name: "Weighbridge Slip 1 - Empty Truck" },
      { file: slip2File, column: "weighbridge_slip_2_url", name: "Weighbridge Slip 2 - After Loading" },
      { file: slip3File, column: "weighbridge_slip_3_url", name: "Weighbridge Slip 3 - After Delivery" },
    ];
    const slipUrls: Record<string, string> = {};
    for (const slip of slips) {
      if (slip.file) {
        const docRes = await documentService.create(slip.file, {
          name: slip.name,
          category: "Weighbridge Slip",
          linked_type: "trip",
          linked_id: newTripId,
        });
        if (docRes.success && docRes.data?.file_url) slipUrls[slip.column] = docRes.data.file_url;
      }
    }
    if (Object.keys(slipUrls).length) {
      await tripService.update(newTripId, slipUrls as any);
    }

    setSaving(false);
    navigation.goBack();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader title="Add Trip" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader title="Add Trip" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.containerMargin, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {vehicles.length === 0 ? (
            <Text style={styles.warnText}>No vehicles yet — add a vehicle first.</Text>
          ) : (
            <ChipPicker label="Vehicle" options={vehicles.map((v) => v.registration_number)} value={vehicleReg} onChange={setVehicleReg} />
          )}

          {drivers.length > 0 ? (
            <ChipPicker label="Driver" options={drivers.map((d) => d.name)} value={driverName || null} onChange={handleSelectDriver} />
          ) : null}
          <FormField label="Driver Name" required value={driverName} onChangeText={setDriverName} placeholder="Driver name" />

          <View style={{ zIndex: 200 }}>
            <PlacesAutocomplete label="Origin" required value={origin} onChange={setOrigin} onSelect={handleSelectOrigin} />
          </View>
          <View style={{ zIndex: 100 }}>
            <PlacesAutocomplete label="Destination" required value={destination} onChange={setDestination} onSelect={handleSelectDestination} />
          </View>
          <DateField label="Start Date" required value={startDate} onChange={setStartDate} />
          <DateField label="End Date" value={endDate} onChange={setEndDate} placeholder="Optional" />
          <FormField
            label="Freight Amount (₹)"
            value={freightAmount}
            onChangeText={setFreightAmount}
            placeholder="0"
            keyboardType="numeric"
          />
          <FormField label="Driver Advance (₹)" value={driverAdvance} onChangeText={setDriverAdvance} placeholder="Optional" keyboardType="numeric" />
          <FormField label="LR Number" required value={docNumber} onChangeText={setDocNumber} placeholder="LR / document number" />
          <FormField label="Material" value={material} onChangeText={setMaterial} placeholder="Optional" />
          <FormField label="Weight (Tonnes)" value={weightTonnes} onChangeText={setWeightTonnes} placeholder="Optional" keyboardType="numeric" />
          <FormField label="Distance (km)" value={distanceKm} onChangeText={setDistanceKm} placeholder="Auto-calculated from route" keyboardType="numeric" />
          <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" />

          <Card>
            <Text style={styles.wbTitle}>Weighbridge & Quantity</Text>
            <Text style={styles.wbSubtitle}>Record the three weighbridge slips for this trip.</Text>

            <Text style={styles.slipHeading}>Slip 1 — Empty Truck</Text>
            <View style={styles.weightRow}>
              <FormField
                label="Empty Truck Weight *"
                value={emptyWeight}
                onChangeText={setEmptyWeight}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
              <UnitPicker value={emptyWeightUnit} onChange={setEmptyWeightUnit} />
            </View>
            <SlipUploadBtn file={slip1File} onPick={setSlip1File} label="Upload slip *" />

            <View style={styles.slipDivider} />

            <Text style={styles.slipHeading}>Slip 2 — After Loading</Text>
            <DateField label="Loading Date *" value={loadingDate} onChange={setLoadingDate} />
            <View style={styles.weightRow}>
              <FormField
                label="Loaded Quantity *"
                value={loadedQty}
                onChangeText={setLoadedQty}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
              <UnitPicker value={loadedQtyUnit} onChange={setLoadedQtyUnit} />
            </View>
            <SlipUploadBtn file={slip2File} onPick={setSlip2File} label="Upload slip *" />

            <View style={styles.slipDivider} />

            <Text style={styles.slipHeading}>Slip 3 — After Delivery</Text>
            <DateField label="Unloading Date *" value={unloadingDate} onChange={setUnloadingDate} />
            <View style={styles.weightRow}>
              <FormField
                label="Delivered Quantity *"
                value={deliveredQty}
                onChangeText={setDeliveredQty}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
              <UnitPicker value={deliveredQtyUnit} onChange={setDeliveredQtyUnit} />
            </View>
            <SlipUploadBtn file={slip3File} onPick={setSlip3File} label="Upload slip *" />
          </Card>

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Trip</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  warnText: { color: colors.error, marginBottom: 14 },
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
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
});
