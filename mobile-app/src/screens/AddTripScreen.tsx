import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { tripService } from "../lib/services/tripService";
import { vehicleService } from "../lib/services/vehicleService";
import { driverService } from "../lib/services/driverService";
import ScreenHeader from "../components/ScreenHeader";
import FormField from "../components/FormField";
import DateField from "../components/DateField";
import ChipPicker from "../components/ChipPicker";
import { colors, radii, spacing } from "../theme";
import type { Vehicle, Driver } from "../lib/types";

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
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [freightAmount, setFreightAmount] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [material, setMaterial] = useState("");
  const [weightTonnes, setWeightTonnes] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [driverAdvance, setDriverAdvance] = useState("");
  const [notes, setNotes] = useState("");

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
      doc_number: docNumber || null,
      material: material || null,
      weight_tonnes: weightTonnes ? Number(weightTonnes) : null,
      distance_km: distanceKm ? Number(distanceKm) : null,
      driver_advance: driverAdvance ? Number(driverAdvance) : null,
      notes: notes || null,
    });
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

          <FormField label="Origin" required value={origin} onChangeText={setOrigin} placeholder="e.g. Mumbai" />
          <FormField label="Destination" required value={destination} onChangeText={setDestination} placeholder="e.g. Pune" />
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
          <FormField label="LR / Doc Number" value={docNumber} onChangeText={setDocNumber} placeholder="Optional" />
          <FormField label="Material" value={material} onChangeText={setMaterial} placeholder="Optional" />
          <FormField label="Weight (Tonnes)" value={weightTonnes} onChangeText={setWeightTonnes} placeholder="Optional" keyboardType="numeric" />
          <FormField label="Distance (km)" value={distanceKm} onChangeText={setDistanceKm} placeholder="Optional" keyboardType="numeric" />
          <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" />

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
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
});
