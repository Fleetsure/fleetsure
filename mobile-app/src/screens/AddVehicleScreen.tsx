import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { vehicleService } from "../lib/services/vehicleService";
import { pickImageFromGallery } from "../lib/pickImage";
import { documentService } from "../lib/services/documentService";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import FormField from "../components/FormField";
import DateField from "../components/DateField";
import ChipPicker from "../components/ChipPicker";
import { colors, radii, spacing, type } from "../theme";

const VEHICLE_TYPES = ["truck", "mini_truck", "trailer", "tanker", "container", "other"] as const;
const FUEL_TYPES = ["Diesel", "Petrol", "CNG", "Electric", "LNG", "Other"];
const VEHICLE_DOC_CATEGORIES = [
  "Registration Certificate (RC)", "Insurance Policy", "Fitness Certificate",
  "Pollution Under Control (PUC)", "Road Permit", "Load Challan", "Other",
];

type PendingDoc = {
  file: { uri: string; name: string; mimeType: string | null };
  docName: string; category: string; expiryDate: string;
};

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

  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [showDocForm, setShowDocForm] = useState(false);
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType: string | null } | null>(null);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState(VEHICLE_DOC_CATEGORIES[0]);
  const [expiryDate, setExpiryDate] = useState("");

  async function handleSave() {
    if (!registrationNumber.trim() || !make.trim() || !model.trim()) {
      Alert.alert("Missing details", "Registration number, make and model are required.");
      return;
    }
    if (!insuranceExpiry) return Alert.alert("Required", "Insurance expiry date is mandatory.");
    if (!fitnessExpiry) return Alert.alert("Required", "Fitness certificate expiry is mandatory.");
    if (!pucExpiry) return Alert.alert("Required", "PUC expiry date is mandatory.");
    if (!permitExpiry) return Alert.alert("Required", "Road permit expiry is mandatory.");

    setSaving(true);
    const vehicleRes = await vehicleService.create({
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

    if (!vehicleRes.success || !vehicleRes.data) {
      setSaving(false);
      Alert.alert("Couldn't save vehicle", vehicleRes.error ?? "Please try again.");
      return;
    }

    for (const doc of pendingDocs) {
      await documentService.create(doc.file, {
        name: doc.docName,
        category: doc.category,
        expiry_date: doc.expiryDate || null,
        linked_type: "vehicle",
        linked_id: vehicleRes.data.id,
      });
    }

    setSaving(false);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader title="Add Vehicle" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.containerMargin, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

          <DateField label="Insurance Expiry" required value={insuranceExpiry} onChange={setInsuranceExpiry} />
          <DateField label="Fitness Expiry" required value={fitnessExpiry} onChange={setFitnessExpiry} />
          <DateField label="PUC Expiry" required value={pucExpiry} onChange={setPucExpiry} />
          <DateField label="Permit Expiry" required value={permitExpiry} onChange={setPermitExpiry} />

          <FormField label="Chassis Number" value={chassisNumber} onChangeText={setChassisNumber} placeholder="Optional" />
          <FormField label="Engine Number" value={engineNumber} onChangeText={setEngineNumber} placeholder="Optional" />
          <FormField label="Vehicle Class" value={vehicleClass} onChangeText={setVehicleClass} placeholder="Optional" />
          <FormField label="Owner Name" value={ownerName} onChangeText={setOwnerName} placeholder="Optional" />
          <FormField label="RTO Code" value={rtoCode} onChangeText={setRtoCode} placeholder="Optional" />
          <FormField label="Color" value={color} onChangeText={setColor} placeholder="Optional" />
          <FormField label="Avg. Mileage (km/l)" value={avgMileage} onChangeText={setAvgMileage} placeholder="Optional" keyboardType="numeric" />

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
                <ChipPicker label="Category" value={docCategory} options={VEHICLE_DOC_CATEGORIES} onChange={setDocCategory} />
                <DateField label="Expiry Date" value={expiryDate} onChange={setExpiryDate} />
                <TouchableOpacity
                  style={styles.addDocBtn}
                  onPress={() => {
                    if (!pickedFile) return Alert.alert("No file", "Pick a file first.");
                    if (!docName.trim()) return Alert.alert("Required", "Enter a document name.");
                    setPendingDocs((d) => [...d, { file: pickedFile, docName: docName.trim(), category: docCategory, expiryDate }]);
                    setPickedFile(null); setDocName(""); setExpiryDate("");
                    setDocCategory(VEHICLE_DOC_CATEGORIES[0]); setShowDocForm(false);
                  }}
                >
                  <Text style={styles.addDocBtnText}>Add to List</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>

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
