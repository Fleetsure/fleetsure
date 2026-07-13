import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { tripService } from "../lib/services/tripService";
import { vehicleService } from "../lib/services/vehicleService";
import { driverService } from "../lib/services/driverService";
import { haversineKm } from "../lib/distanceKm";
import ScreenHeader from "../components/ScreenHeader";
import FormField from "../components/FormField";
import DateField from "../components/DateField";
import ChipPicker from "../components/ChipPicker";
import PlacesAutocomplete from "../components/PlacesAutocomplete";
import { colors, radii, spacing } from "../theme";
import type { Vehicle, Driver } from "../lib/types";

type LatLng = { lat: number; lng: number };

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

  const [showWeighbridge, setShowWeighbridge] = useState(false);
  const [loadedWeightKg, setLoadedWeightKg] = useState("");
  const [emptyWeightKg, setEmptyWeightKg] = useState("");
  const [weighbridgeLocation, setWeighbridgeLocation] = useState("");
  const [weighbridgeReceipt, setWeighbridgeReceipt] = useState("");
  const netWeightKg = loadedWeightKg && emptyWeightKg ? Number(loadedWeightKg) - Number(emptyWeightKg) : null;

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
    if (!origin.trim() || !destination.trim()) {
      Alert.alert("Missing route", "Enter both origin and destination.");
      return;
    }
    if (!driverName.trim()) {
      Alert.alert("Driver required", "Select or enter a driver name.");
      return;
    }
    if (!docNumber.trim()) {
      Alert.alert("LR Number required", "Please enter the LR / document number.");
      return;
    }
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
      loaded_weight_kg: loadedWeightKg ? Number(loadedWeightKg) : null,
      empty_weight_kg: emptyWeightKg ? Number(emptyWeightKg) : null,
      weighbridge_location: weighbridgeLocation || null,
      weighbridge_receipt: weighbridgeReceipt || null,
    } as any);
    setSaving(false);
    if (res.success) {
      navigation.goBack();
    } else {
      Alert.alert("Couldn't save trip", res.error ?? "Please try again.");
    }
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
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Add Trip" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.containerMargin }} keyboardShouldPersistTaps="handled">
          {vehicles.length === 0 ? (
            <Text style={styles.warnText}>No vehicles yet — add a vehicle first.</Text>
          ) : (
            <ChipPicker label="Vehicle" options={vehicles.map((v) => v.registration_number)} value={vehicleReg} onChange={setVehicleReg} />
          )}

          {drivers.length > 0 ? (
            <ChipPicker label="Driver" options={drivers.map((d) => d.name)} value={driverName || null} onChange={handleSelectDriver} />
          ) : null}
          <FormField label="Driver Name" required value={driverName} onChangeText={setDriverName} placeholder="Driver name" />

          <PlacesAutocomplete label="Origin" value={origin} onChange={setOrigin} onSelect={handleSelectOrigin} />
          <PlacesAutocomplete label="Destination" value={destination} onChange={setDestination} onSelect={handleSelectDestination} />
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

          <TouchableOpacity style={styles.collapsibleHeader} onPress={() => setShowWeighbridge((v) => !v)}>
            <Text style={styles.collapsibleTitle}>Weighbridge Entry</Text>
            <MaterialIcons name={showWeighbridge ? "expand-less" : "expand-more"} size={22} color={colors.onSurfaceVariant} />
          </TouchableOpacity>

          {showWeighbridge ? (
            <View style={styles.collapsibleBody}>
              <FormField label="Loaded Weight (kg)" value={loadedWeightKg} onChangeText={setLoadedWeightKg} placeholder="0" keyboardType="numeric" />
              <FormField label="Empty Weight (kg)" value={emptyWeightKg} onChangeText={setEmptyWeightKg} placeholder="0" keyboardType="numeric" />
              {netWeightKg !== null ? (
                <View style={styles.netWeightRow}>
                  <Text style={styles.netWeightLabel}>Net Load</Text>
                  <Text style={styles.netWeightValue}>{netWeightKg.toLocaleString("en-IN")} kg</Text>
                </View>
              ) : null}
              <FormField label="Weighbridge Location" value={weighbridgeLocation} onChangeText={setWeighbridgeLocation} placeholder="Optional" />
              <FormField label="Receipt / Slip Number" value={weighbridgeReceipt} onChangeText={setWeighbridgeReceipt} placeholder="Optional" />
            </View>
          ) : null}

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Trip</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  warnText: { color: colors.error, marginBottom: 14 },
  collapsibleHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1.5, borderColor: colors.outlineVariant, borderRadius: radii.md,
    paddingHorizontal: 14, paddingVertical: 13, marginBottom: 4,
  },
  collapsibleTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  collapsibleBody: { marginTop: 14 },
  netWeightRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: colors.amberBg, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
  },
  netWeightLabel: { fontSize: 13, fontWeight: "700", color: colors.amber },
  netWeightValue: { fontSize: 16, fontWeight: "800", color: colors.amber },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
});
