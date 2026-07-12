import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "../context/AuthContext";
import { driverService, isProfileComplete, DriverProfileUpdate } from "../services/driverService";

const PRIMARY = "#1E2D8E";
const DANGER = "#DC2626";

const DOC_FIELDS: { key: keyof DriverProfileUpdate; label: string; mandatory: boolean }[] = [
  { key: "license_image_url", label: "Driving Licence", mandatory: true },
  { key: "aadhaar_front_url", label: "Aadhaar (Front)",  mandatory: true },
  { key: "aadhaar_back_url",  label: "Aadhaar (Back)",   mandatory: true },
  { key: "pan_image_url",     label: "PAN Card",         mandatory: true },
  { key: "profile_photo_url", label: "Profile Photo",    mandatory: false },
];

export default function ProfileScreen() {
  const { driver, setDriver } = useAuth();

  const [emergencyContactName, setEmergencyContactName] = useState(driver?.emergency_contact_name ?? "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(driver?.emergency_contact_phone ?? "");
  const [address, setAddress] = useState(driver?.address ?? "");
  const [permanentAddress, setPermanentAddress] = useState(driver?.permanent_address ?? "");
  const [aadhaarNumber, setAadhaarNumber] = useState(driver?.aadhaar_number ?? "");
  const [panNumber, setPanNumber] = useState(driver?.pan_number ?? "");
  const [docs, setDocs] = useState<Record<string, string | null>>({
    license_image_url: driver?.license_image_url ?? null,
    aadhaar_front_url: driver?.aadhaar_front_url ?? null,
    aadhaar_back_url:  driver?.aadhaar_back_url  ?? null,
    pan_image_url:     driver?.pan_image_url     ?? null,
    profile_photo_url: driver?.profile_photo_url ?? null,
  });
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const draftDriver = { ...driver, ...docs } as any;
  const complete = isProfileComplete(draftDriver);

  async function pickDoc(key: string) {
    if (!driver) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading((u) => ({ ...u, [key]: true }));
    const res = await driverService.uploadProfileDocument(result.assets[0].uri, driver.id, key);
    if (res.success && res.data) {
      setDocs((d) => ({ ...d, [key]: res.data as string }));
    } else {
      Alert.alert("Upload failed", res.error ?? "Could not upload this document. Please try again.");
    }
    setUploading((u) => ({ ...u, [key]: false }));
  }

  async function handleSave() {
    if (!driver) return;
    setError("");

    const missing: string[] = [];
    if (!emergencyContactName.trim())  missing.push("Emergency contact name");
    if (!emergencyContactPhone.trim()) missing.push("Emergency contact number");
    if (!address.trim())               missing.push("Current address");
    if (!permanentAddress.trim())      missing.push("Permanent address");
    if (!aadhaarNumber.trim())         missing.push("Aadhaar number");
    if (!panNumber.trim())             missing.push("PAN number");
    for (const f of DOC_FIELDS) {
      if (f.mandatory && !docs[f.key]) missing.push(f.label);
    }
    if (missing.length > 0) {
      setError(`Please complete: ${missing.join(", ")}.`);
      return;
    }

    setSaving(true);
    try {
      const res = await driverService.updateProfile({
        emergency_contact_name:  emergencyContactName.trim(),
        emergency_contact_phone: emergencyContactPhone.trim(),
        address:                 address.trim(),
        permanent_address:       permanentAddress.trim(),
        aadhaar_number:          aadhaarNumber.trim(),
        pan_number:              panNumber.trim(),
        license_image_url:       docs.license_image_url,
        aadhaar_front_url:       docs.aadhaar_front_url,
        aadhaar_back_url:        docs.aadhaar_back_url,
        pan_image_url:           docs.pan_image_url,
        profile_photo_url:       docs.profile_photo_url,
      });
      if (!res.success || !res.data) {
        setError(res.error ?? "Failed to save profile. Please try again.");
        return;
      }
      setDriver(res.data);
      Alert.alert("Saved", "Your profile has been updated.");
    } finally {
      setSaving(false);
    }
  }

  if (!driver) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Profile</Text>
          <Text style={[styles.headerSub, complete && styles.headerSubComplete]}>
            {complete ? "Profile complete ✓" : "Profile incomplete — required fields missing"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {/* Identity — view only, set by fleet owner */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>DRIVER DETAILS</Text>
          <Text style={styles.readonlyName}>{driver.name}</Text>
          <Text style={styles.readonlySub}>{driver.phone}</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={DANGER} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Emergency contact */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>EMERGENCY CONTACT *</Text>
          <Text style={styles.fieldLabel}>Contact Name</Text>
          <TextInput style={styles.input} value={emergencyContactName} onChangeText={setEmergencyContactName} placeholder="e.g. Sunita Kumar" />
          <Text style={styles.fieldLabel}>Contact Phone</Text>
          <TextInput style={styles.input} value={emergencyContactPhone} onChangeText={setEmergencyContactPhone} placeholder="9876543210" keyboardType="phone-pad" />
        </View>

        {/* Address */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>ADDRESS *</Text>
          <Text style={styles.fieldLabel}>Current Address</Text>
          <TextInput style={[styles.input, styles.textarea]} value={address} onChangeText={setAddress} placeholder="Your current address" multiline numberOfLines={3} />
          <Text style={styles.fieldLabel}>Permanent Address</Text>
          <TextInput style={[styles.input, styles.textarea]} value={permanentAddress} onChangeText={setPermanentAddress} placeholder="Leave same if identical" multiline numberOfLines={3} />
        </View>

        {/* ID numbers */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>ID NUMBERS *</Text>
          <Text style={styles.fieldLabel}>Aadhaar Number</Text>
          <TextInput style={styles.input} value={aadhaarNumber} onChangeText={setAadhaarNumber} placeholder="XXXX XXXX XXXX" keyboardType="number-pad" />
          <Text style={styles.fieldLabel}>PAN Number</Text>
          <TextInput style={styles.input} value={panNumber} onChangeText={setPanNumber} placeholder="ABCDE1234F" autoCapitalize="characters" />
        </View>

        {/* Documents */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>DOCUMENTS {DOC_FIELDS.some(f => f.mandatory) ? "*" : ""}</Text>
          {DOC_FIELDS.map((f) => (
            <View key={f.key} style={styles.docRow}>
              <TouchableOpacity style={styles.photoBtn} onPress={() => pickDoc(f.key)} disabled={!!uploading[f.key]}>
                {uploading[f.key] ? (
                  <ActivityIndicator color={PRIMARY} />
                ) : (
                  <>
                    <Ionicons name={docs[f.key] ? "checkmark-circle" : "camera-outline"} size={16} color={docs[f.key] ? "#059669" : "#64748B"} />
                    <Text style={styles.photoBtnText}>
                      {f.label}{f.mandatory ? " *" : ""} {docs[f.key] ? "— uploaded ✓" : ""}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {docs[f.key] ? <Image source={{ uri: docs[f.key] as string }} style={styles.docPreview} /> : null}
            </View>
          ))}
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Profile</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FF" },
  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "white" },
  headerSub: { fontSize: 12, color: "#FCA5A5", marginTop: 2 },
  headerSubComplete: { color: "#A7F3D0" },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  readonlyName: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  readonlySub: { fontSize: 13, color: "#64748B", marginTop: 2 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#555", marginBottom: 5, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 10,
    fontSize: 13.5,
    backgroundColor: "#F8FAFC",
  },
  textarea: { height: 70, textAlignVertical: "top" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 12.5, color: DANGER, fontWeight: "600", lineHeight: 18 },
  docRow: { marginBottom: 10 },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 10,
  },
  photoBtnText: { fontSize: 13, color: "#64748B", flexShrink: 1 },
  docPreview: { width: "100%", height: 90, borderRadius: 8, marginTop: 8, resizeMode: "cover" },
  saveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnDisabled: { backgroundColor: "#9BA4C4" },
  saveBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
});
