import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "../context/AuthContext";
import { driverService } from "../services/driverService";
import { fmtDate, todayISO } from "../utils/format";

const PRIMARY = "#1E2D8E";
const DANGER = "#DC2626";

const ISSUE_TYPES = [
  { key: "breakdown", label: "Breakdown", emoji: "🚨" },
  { key: "tyre", label: "Tyre", emoji: "🔄" },
  { key: "accident", label: "Accident", emoji: "💥" },
  { key: "mechanical", label: "Mechanical", emoji: "🔧" },
  { key: "electrical", label: "Electrical", emoji: "⚡" },
  { key: "other", label: "Other", emoji: "📋" },
];

const SEVERITIES = [
  { key: "low",      label: "Low",      sub: "Can wait",        color: "#059669", bg: "#DCFCE7" },
  { key: "medium",   label: "Medium",   sub: "Needs attention", color: "#D97706", bg: "#FEF3C7" },
  { key: "high",     label: "High",     sub: "Affects trip",    color: "#DC2626", bg: "#FEE2E2" },
  { key: "critical", label: "Critical", sub: "Stopped on road", color: "#7F1D1D", bg: "#FEE2E2" },
];

export default function IssuesScreen() {
  const { driver } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [ownerContact, setOwnerContact] = useState<{ name: string; phone: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0].key);
  const [severity, setSeverity] = useState("medium");
  const [tripId, setTripId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!driver) return;
    const [issuesRes, tripsRes, ownerRes] = await Promise.all([
      driverService.getMyIssues(driver.id),
      driverService.getActiveTrips(driver.id),
      driverService.getOwnerContact(driver.owner_id),
    ]);
    if (issuesRes.success) setIssues(issuesRes.data ?? []);
    if (tripsRes.success) {
      const trips = tripsRes.data ?? [];
      setActiveTrips(trips);
      if (trips.length > 0 && !tripId) setTripId(trips[0].id);
    }
    if (ownerRes.success) setOwnerContact(ownerRes.data ?? null);
    setLoading(false);
  }, [driver]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function handleReport() {
    if (!driver) return;
    const selectedTrip = activeTrips.find((t) => t.id === tripId);
    if (!selectedTrip) {
      Alert.alert("No Trip", "Please select a trip to report the issue against.");
      return;
    }

    setSaving(true);
    try {
      let imgUrl: string | null = null;
      if (imageUri) {
        const uploadRes = await driverService.uploadExpenseImage(imageUri, driver.id, tripId ?? "issues");
        if (uploadRes.success) imgUrl = uploadRes.data ?? null;
      }

      await driverService.reportIssue({
        owner_id: driver.owner_id,
        driver_id: driver.id,
        vehicle_id: selectedTrip.vehicle_id,
        trip_id: tripId,
        issue_type: issueType,
        description: description || (ISSUE_TYPES.find((t) => t.key === issueType)?.label ?? issueType),
        severity,
        image_url: imgUrl,
        status: "open",
      });

      setShowForm(false);
      setIssueType(ISSUE_TYPES[0].key);
      setSeverity("medium");
      setDescription("");
      setImageUri(null);
      await load();
      Alert.alert("Reported", "Issue reported to your fleet manager.");
    } catch {
      Alert.alert("Error", "Failed to report issue. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const renderIssue = ({ item }: { item: any }) => {
    const typeMeta = ISSUE_TYPES.find((t) => t.key === item.issue_type);
    const sevMeta = SEVERITIES.find((s) => s.key === item.severity);
    return (
      <View style={styles.issueCard}>
        <View style={styles.issueTop}>
          <Text style={styles.issueEmoji}>{typeMeta?.emoji ?? "📋"}</Text>
          <View style={styles.issueInfo}>
            <Text style={styles.issueType}>{typeMeta?.label ?? item.issue_type}</Text>
            <Text style={styles.issueMeta}>
              {item.vehicles?.registration_number ?? "—"} · {fmtDate(item.created_at)}
            </Text>
          </View>
          <View style={styles.issueBadges}>
            {sevMeta && (
              <View style={[styles.sevBadge, { backgroundColor: sevMeta.bg }]}>
                <Text style={[styles.sevBadgeText, { color: sevMeta.color }]}>
                  {sevMeta.label}
                </Text>
              </View>
            )}
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{item.status ?? "open"}</Text>
            </View>
          </View>
        </View>
        {item.description && item.description !== typeMeta?.label ? (
          <Text style={styles.issueDesc}>{item.description}</Text>
        ) : null}
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.issueImage} />
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Issues</Text>
          <Text style={styles.headerSub}>{issues.length} reported</Text>
        </View>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => setShowForm((v) => !v)}
        >
          <Ionicons name="add" size={16} color="white" />
          <Text style={styles.newBtnText}>
            {showForm ? "Cancel" : "New Issue"}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={issues}
        keyExtractor={(item) => item.id ?? Math.random().toString()}
        renderItem={renderIssue}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
        }
        ListHeaderComponent={
          <>
            {/* Owner contact */}
            {ownerContact ? (
              <View style={styles.ownerCard}>
                <View style={styles.ownerInfo}>
                  <Ionicons name="person-circle-outline" size={20} color={PRIMARY} />
                  <View>
                    <Text style={styles.ownerName}>{ownerContact.name}</Text>
                    <Text style={styles.ownerLabel}>Fleet Manager</Text>
                  </View>
                </View>
                {ownerContact.phone ? (
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => Linking.openURL(`tel:${ownerContact.phone}`)}
                  >
                    <Ionicons name="call" size={14} color="white" />
                    <Text style={styles.callBtnText}>Call Now</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {/* Report form */}
            {showForm ? (
              <View style={styles.form}>
                <View style={styles.formHeader}>
                  <Ionicons name="warning" size={16} color="white" />
                  <Text style={styles.formHeaderText}>Report a Problem</Text>
                </View>

                {/* Issue type */}
                <Text style={styles.formSectionLabel}>ISSUE TYPE</Text>
                <View style={styles.issueTypeGrid}>
                  {ISSUE_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.issueTypeBtn, issueType === t.key && styles.issueTypeBtnActive]}
                      onPress={() => setIssueType(t.key)}
                    >
                      <Text style={styles.issueTypeEmoji}>{t.emoji}</Text>
                      <Text style={[styles.issueTypeLabel, issueType === t.key && styles.issueTypeLabelActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Severity */}
                <Text style={styles.formSectionLabel}>SEVERITY</Text>
                <View style={styles.severityRow}>
                  {SEVERITIES.map((s) => (
                    <TouchableOpacity
                      key={s.key}
                      style={[styles.sevBtn, severity === s.key && { backgroundColor: s.bg, borderColor: s.color }]}
                      onPress={() => setSeverity(s.key)}
                    >
                      <Text style={[styles.sevBtnLabel, severity === s.key && { color: s.color }]}>
                        {s.label}
                      </Text>
                      <Text style={[styles.sevBtnSub, severity === s.key && { color: s.color }]}>
                        {s.sub}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Trip selector */}
                {activeTrips.length > 0 ? (
                  <>
                    <Text style={styles.formSectionLabel}>RELATED TRIP</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {activeTrips.map((t) => (
                          <TouchableOpacity
                            key={t.id}
                            style={[styles.tripChip, tripId === t.id && styles.tripChipActive]}
                            onPress={() => setTripId(t.id)}
                          >
                            <Text style={[styles.tripChipText, tripId === t.id && styles.tripChipTextActive]}>
                              {t.origin} → {t.destination} · {t.vehicles?.registration_number ?? "—"}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </>
                ) : null}

                {/* Description */}
                <Text style={styles.formSectionLabel}>DETAILS (optional)</Text>
                <TextInput
                  style={styles.descInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe what happened, your location, what you need…"
                  multiline
                  numberOfLines={3}
                />

                {/* Photo */}
                <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                  <Ionicons name="camera-outline" size={16} color="#64748B" />
                  <Text style={styles.photoBtnText}>
                    {imageUri ? "Photo attached ✓" : "Add Photo (optional)"}
                  </Text>
                </TouchableOpacity>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.imgPreview} />
                ) : null}

                {/* Submit */}
                <View style={styles.formBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reportBtn, saving && styles.reportBtnDisabled]}
                    onPress={handleReport}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.reportBtnText}>Report Issue</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {issues.length > 0 ? (
              <Text style={styles.listTitle}>Past Issues</Text>
            ) : null}
          </>
        }
        ListEmptyComponent={
          !showForm ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={52} color="#A7F3D0" />
              <Text style={styles.emptyTitle}>No issues reported</Text>
              <Text style={styles.emptySub}>All clear!</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FF" },
  header: {
    backgroundColor: PRIMARY,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "white" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)" },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DANGER,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  newBtnText: { color: "white", fontSize: 13, fontWeight: "700" },
  list: { padding: 16, paddingBottom: 40 },
  ownerCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ownerInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  ownerName: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  ownerLabel: { fontSize: 11, color: "#94A3B8" },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  callBtnText: { color: "white", fontSize: 13, fontWeight: "700" },
  form: {
    backgroundColor: "white",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: DANGER,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  formHeaderText: { color: "white", fontSize: 14, fontWeight: "700" },
  formSectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  issueTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  issueTypeBtn: {
    width: "30%",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    gap: 4,
  },
  issueTypeBtnActive: { backgroundColor: "#EEF0FB", borderColor: PRIMARY },
  issueTypeEmoji: { fontSize: 20 },
  issueTypeLabel: { fontSize: 11, fontWeight: "600", color: "#64748B" },
  issueTypeLabelActive: { color: PRIMARY },
  severityRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14, marginBottom: 4 },
  sevBtn: {
    flex: 1,
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  sevBtnLabel: { fontSize: 12, fontWeight: "700", color: "#475569" },
  sevBtnSub: { fontSize: 9, color: "#94A3B8", marginTop: 2 },
  tripChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  tripChipActive: { backgroundColor: "#EEF0FB", borderColor: PRIMARY },
  tripChipText: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  tripChipTextActive: { color: PRIMARY, fontWeight: "700" },
  descInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    marginHorizontal: 14,
    padding: 10,
    fontSize: 13,
    backgroundColor: "#F8FAFC",
    height: 80,
    textAlignVertical: "top",
    marginBottom: 4,
  },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    marginBottom: 6,
  },
  photoBtnText: { fontSize: 13, color: "#64748B" },
  imgPreview: { width: "auto", height: 100, marginHorizontal: 14, borderRadius: 8, marginBottom: 10, resizeMode: "cover" },
  formBtns: { flexDirection: "row", gap: 10, padding: 14 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
  },
  cancelBtnText: { color: "#64748B", fontWeight: "600" },
  reportBtn: {
    flex: 2,
    backgroundColor: DANGER,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
  },
  reportBtnDisabled: { backgroundColor: "#FCA5A5" },
  reportBtnText: { color: "white", fontWeight: "700" },
  listTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 10 },
  issueCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  issueTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  issueEmoji: { fontSize: 22, width: 32 },
  issueInfo: { flex: 1 },
  issueType: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  issueMeta: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  issueBadges: { gap: 4, alignItems: "flex-end" },
  sevBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  sevBadgeText: { fontSize: 10, fontWeight: "700" },
  statusBadge: { backgroundColor: "#F1F5F9", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  statusBadgeText: { fontSize: 10, color: "#64748B", fontWeight: "600" },
  issueDesc: { fontSize: 12, color: "#64748B", marginTop: 8, lineHeight: 18 },
  issueImage: { width: "100%", height: 100, borderRadius: 8, marginTop: 10, resizeMode: "cover" },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#059669" },
  emptySub: { fontSize: 13, color: "#6EE7B7" },
});
