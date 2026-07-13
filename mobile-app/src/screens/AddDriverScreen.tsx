import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { driverService } from "../lib/services/driverService";
import { pickImageFromGallery } from "../lib/pickImage";
import { documentService } from "../lib/services/documentService";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import FormField from "../components/FormField";
import DateField from "../components/DateField";
import ChipPicker from "../components/ChipPicker";
import { colors, radii, spacing, type } from "../theme";

const LICENSE_CLASSES = ["LMV", "HMV", "HGMV", "HPMV", "other"] as const;
const DRIVER_DOC_CATEGORIES = [
  "Driving Licence", "Aadhar Card", "PAN Card",
  "Passport Photo", "Medical Certificate", "Police Verification", "Other",
];

type PendingDoc = {
  file: { uri: string; name: string; mimeType: string | null };
  docName: string; category: string; expiryDate: string;
};

export default function AddDriverScreen() {
  const navigation = useNavigation();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseClass, setLicenseClass] = useState<string | null>(null);
  const [licenseExpiry, setLicenseExpiry] = useState("");

  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [showDocForm, setShowDocForm] = useState(false);
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType: string | null } | null>(null);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState(DRIVER_DOC_CATEGORIES[0]);
  const [expiryDate, setExpiryDate] = useState("");

  async function handleSave() {
    if (!name.trim()) return Alert.alert("Required", "Driver name is mandatory.");
    if (!phone.trim()) return Alert.alert("Required", "Phone number is mandatory.");
    if (!licenseNumber.trim()) return Alert.alert("Required", "License number is mandatory.");
    if (!licenseExpiry) return Alert.alert("Required", "License expiry date is mandatory.");

    setSaving(true);
    const driverRes = await driverService.create({
      name: name.trim(),
      phone: phone.trim(),
      license_number: licenseNumber || null,
      license_class: (licenseClass as any) ?? null,
      license_expiry: licenseExpiry || null,
    });

    if (!driverRes.success || !driverRes.data) {
      setSaving(false);
      Alert.alert("Couldn't save driver", driverRes.error ?? "Please try again.");
      return;
    }

    for (const doc of pendingDocs) {
      await documentService.create(doc.file, {
        name: doc.docName,
        category: doc.category,
        expiry_date: doc.expiryDate || null,
        linked_type: "driver",
        linked_id: driverRes.data.id,
      });
    }

    setSaving(false);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader title="Add Driver" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.containerMargin, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
          <FormField label="License Number" required value={licenseNumber} onChangeText={setLicenseNumber} placeholder="e.g. MH1420110012345" />
          <ChipPicker label="License Class" options={LICENSE_CLASSES} value={licenseClass} onChange={setLicenseClass} />
          <DateField label="License Expiry" required value={licenseExpiry} onChange={setLicenseExpiry} />

          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={styles.sectionHeading}>Documents</Text>
              <TouchableOpacity style={styles.uploadBtn} onPress={() => setShowDocForm((v) => !v)}>
                <MaterialIcons name={showDocForm ? "close" : "upload-file"} size={14} color={colors.onPrimaryContainer} />
                <Text style={styles.uploadBtnText}>{showDocForm ? "Cancel" : "Add Document"}</Text>
              </TouchableOpacity>
            </View>

            {pendingDocs.map((doc, i) => (
              <View key={i} style={styles.pendingDocRow}>
                <MaterialIcons name="insert-drive-file" size={16} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingDocName} numberOfLines={1}>{doc.docName}</Text>
                  <Text style={styles.pendingDocMeta}>{doc.category}{doc.expiryDate ? ` · Exp: ${doc.expiryDate}` : ""}</Text>
                </View>
                <TouchableOpacity onPress={() => setPendingDocs((d) => d.filter((_, j) => j !== i))}>
                  <MaterialIcons name="close" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}

            {showDocForm && (
              <View style={{ gap: 10, marginTop: 8 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.pickBtn, { flex: 1 }]}
                    onPress={async () => {
                      const res = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], copyToCacheDirectory: true });
                      if (!res.canceled && res.assets?.[0]) {
                        const a = res.assets[0];
                        setPickedFile({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? null });
                        if (!docName) setDocName(a.name.replace(/\.[^.]+$/, ""));
                      }
                    }}
                  >
                    <MaterialIcons name="attach-file" size={16} color={colors.primary} />
                    <Text style={styles.pickBtnText} numberOfLines={1}>{pickedFile ? pickedFile.name : "Pick File"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pickBtn, { flex: 1 }]}
                    onPress={async () => {
                      const asset = await pickImageFromGallery();
                      if (asset) { setPickedFile(asset); if (!docName) setDocName(docCategory); }
                    }}
                  >
                    <MaterialIcons name="photo-library" size={16} color={colors.primary} />
                    <Text style={styles.pickBtnText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
                <FormField label="Document Name" required value={docName} onChangeText={setDocName} />
                <ChipPicker label="Category" value={docCategory} options={DRIVER_DOC_CATEGORIES} onChange={setDocCategory} />
                <DateField label="Expiry Date" value={expiryDate} onChange={setExpiryDate} />
                <TouchableOpacity
                  style={styles.addDocBtn}
                  onPress={() => {
                    if (!pickedFile) return Alert.alert("No file", "Pick a file first.");
                    if (!docName.trim()) return Alert.alert("Required", "Enter a document name.");
                    setPendingDocs((d) => [...d, { file: pickedFile, docName: docName.trim(), category: docCategory, expiryDate }]);
                    setPickedFile(null); setDocName(""); setExpiryDate("");
                    setDocCategory(DRIVER_DOC_CATEGORIES[0]); setShowDocForm(false);
                  }}
                >
                  <Text style={styles.addDocBtnText}>Add to List</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>

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
  sectionHeading: { ...type.headlineSm, color: colors.onSurface },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primaryContainer, borderRadius: radii.full, paddingHorizontal: 10, paddingVertical: 6 },
  uploadBtnText: { ...type.labelMd, color: colors.onPrimaryContainer },
  pendingDocRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.surfaceContainer },
  pendingDocName: { ...type.bodyMd, color: colors.onSurface },
  pendingDocMeta: { fontSize: 11, color: colors.onSurfaceVariant, marginTop: 1 },
  pickBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.primary, borderRadius: radii.md, padding: 10 },
  pickBtnText: { ...type.labelMd, color: colors.primary, flex: 1 },
  addDocBtn: { backgroundColor: colors.primaryContainer, borderRadius: radii.md, padding: 12, alignItems: "center" },
  addDocBtnText: { ...type.labelMd, color: colors.onPrimaryContainer, fontWeight: "700" },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
});
