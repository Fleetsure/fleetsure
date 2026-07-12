import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { driverService } from "../lib/services/driverService";
import ScreenHeader from "../components/ScreenHeader";
import FormField from "../components/FormField";
import DateField from "../components/DateField";
import ChipPicker from "../components/ChipPicker";
import { colors, radii, spacing } from "../theme";

const LICENSE_CLASSES = ["LMV", "HMV", "HGMV", "HPMV", "other"] as const;

export default function AddDriverScreen() {
  const navigation = useNavigation();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseClass, setLicenseClass] = useState<string | null>(null);
  const [licenseExpiry, setLicenseExpiry] = useState("");

  async function handleSave() {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("Missing details", "Name and phone number are required.");
      return;
    }
    setSaving(true);
    const res = await driverService.create({
      name: name.trim(),
      phone: phone.trim(),
      license_number: licenseNumber || null,
      license_class: (licenseClass as any) ?? null,
      license_expiry: licenseExpiry || null,
    });
    setSaving(false);
    if (res.success) {
      navigation.goBack();
    } else {
      Alert.alert("Couldn't save driver", res.error ?? "Please try again.");
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Add Driver" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.containerMargin }} keyboardShouldPersistTaps="handled">
          <FormField label="Full Name" required value={name} onChangeText={setName} placeholder="Driver name" />
          <FormField
            label="Phone Number"
            required
            value={phone}
            onChangeText={setPhone}
            placeholder="9876543210"
            keyboardType="phone-pad"
            maxLength={10}
          />
          <FormField label="License Number" value={licenseNumber} onChangeText={setLicenseNumber} placeholder="e.g. MH1420110012345" />
          <ChipPicker label="License Class" options={LICENSE_CLASSES} value={licenseClass} onChange={setLicenseClass} />
          <DateField label="License Expiry" value={licenseExpiry} onChange={setLicenseExpiry} />

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Driver</Text>}
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
