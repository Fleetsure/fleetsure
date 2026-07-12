import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { vehicleService } from "../lib/services/vehicleService";
import ScreenHeader from "../components/ScreenHeader";
import FormField from "../components/FormField";
import DateField from "../components/DateField";
import ChipPicker from "../components/ChipPicker";
import { colors, radii, spacing } from "../theme";

const VEHICLE_TYPES = ["truck", "mini_truck", "trailer", "tanker", "container", "other"] as const;
const FUEL_TYPES = ["Diesel", "Petrol", "CNG", "Electric", "LNG", "Other"];

export default function AddVehicleScreen() {
  const navigation = useNavigation();
  const [saving, setSaving] = useState(false);

  const [registrationNumber, setRegistrationNumber] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vehicleType, setVehicleType] = useState<string | null>("truck");
  const [fuelType, setFuelType] = useState<string | null>(null);
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [fitnessExpiry, setFitnessExpiry] = useState("");
  const [pucExpiry, setPucExpiry] = useState("");
  const [permitExpiry, setPermitExpiry] = useState("");
  const [chassisNumber, setChassisNumber] = useState("");
  const [engineNumber, setEngineNumber] = useState("");
  const [vehicleClass, setVehicleClass] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [rtoCode, setRtoCode] = useState("");
  const [color, setColor] = useState("");
  const [avgMileage, setAvgMileage] = useState("");

  async function handleSave() {
    if (!registrationNumber.trim() || !make.trim() || !model.trim()) {
      Alert.alert("Missing details", "Registration number, make and model are required.");
      return;
    }
    setSaving(true);
    const res = await vehicleService.create({
      registration_number: registrationNumber.trim().toUpperCase().replace(/\s+/g, ""),
      make: make.trim(),
      model: model.trim(),
      year: year ? Number(year) : null,
      vehicle_type: (vehicleType ?? "truck") as any,
      fuel_type: fuelType,
      insurance_expiry: insuranceExpiry || null,
      fitness_expiry: fitnessExpiry || null,
      puc_expiry: pucExpiry || null,
      permit_expiry: permitExpiry || null,
      chassis_number: chassisNumber || null,
      engine_number: engineNumber || null,
      vehicle_class: vehicleClass || null,
      owner_name: ownerName || null,
      rto_code: rtoCode || null,
      color: color || null,
      avg_mileage_kmpl: avgMileage ? Number(avgMileage) : null,
      status: "active",
    } as any);
    setSaving(false);
    if (res.success) {
      navigation.goBack();
    } else {
      Alert.alert("Couldn't save vehicle", res.error ?? "Please try again.");
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Add Vehicle" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.containerMargin }} keyboardShouldPersistTaps="handled">
          <FormField
            label="Registration Number"
            required
            value={registrationNumber}
            onChangeText={setRegistrationNumber}
            placeholder="MH12AB1234"
            autoCapitalize="characters"
          />
          <FormField label="Make" required value={make} onChangeText={setMake} placeholder="e.g. Tata" />
          <FormField label="Model" required value={model} onChangeText={setModel} placeholder="e.g. 407" />
          <FormField label="Year" value={year} onChangeText={setYear} placeholder="2022" keyboardType="numeric" />

          <ChipPicker label="Vehicle Type" options={VEHICLE_TYPES} value={vehicleType} onChange={setVehicleType} />
          <ChipPicker label="Fuel Type" options={FUEL_TYPES} value={fuelType} onChange={setFuelType} />

          <DateField label="Insurance Expiry" value={insuranceExpiry} onChange={setInsuranceExpiry} />
          <DateField label="Fitness Expiry" value={fitnessExpiry} onChange={setFitnessExpiry} />
          <DateField label="PUC Expiry" value={pucExpiry} onChange={setPucExpiry} />
          <DateField label="Permit Expiry" value={permitExpiry} onChange={setPermitExpiry} />

          <FormField label="Chassis Number" value={chassisNumber} onChangeText={setChassisNumber} placeholder="Optional" />
          <FormField label="Engine Number" value={engineNumber} onChangeText={setEngineNumber} placeholder="Optional" />
          <FormField label="Vehicle Class" value={vehicleClass} onChangeText={setVehicleClass} placeholder="Optional" />
          <FormField label="Owner Name" value={ownerName} onChangeText={setOwnerName} placeholder="Optional" />
          <FormField label="RTO Code" value={rtoCode} onChangeText={setRtoCode} placeholder="Optional" />
          <FormField label="Color" value={color} onChangeText={setColor} placeholder="Optional" />
          <FormField label="Avg. Mileage (km/l)" value={avgMileage} onChangeText={setAvgMileage} placeholder="Optional" keyboardType="numeric" />

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Vehicle</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
});
