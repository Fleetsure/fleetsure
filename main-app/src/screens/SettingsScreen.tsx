import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Info, Server, UserCircle, LogOut } from "lucide-react-native";

import { useAuth } from "../context/AuthContext";
import { analyticsService } from "../services/analyticsService";

const PRIMARY = "#1E2D8E";
const BG = "#F0F4FF";
const CARD = "#ffffff";
const TEXT = "#1A1A2E";
const TEXT_MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const DANGER = "#DC2626";

export default function SettingsScreen() {
  const { user, firebaseUser, signOut } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [orgName, setOrgName] = useState(user?.org_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setName(user?.name ?? "");
      setOrgName(user?.org_name ?? "");
      setPhone(user?.phone ?? "");
    }, [user])
  );

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Required", "Name is required."); return; }
    setSaving(true);
    const res = await analyticsService.updateProfile({
      name: name.trim(),
      org_name: orgName.trim() || undefined,
      phone: phone.trim() || undefined,
    });
    if (res.success) {
      Alert.alert("Saved", "Profile updated successfully.");
    } else {
      Alert.alert("Error", res.error ?? "Could not save profile.");
    }
    setSaving(false);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Settings</Text>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.avatarCircle}
              resizeMode="contain"
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name ?? "Fleet Owner"}</Text>
              <Text style={styles.profileEmail}>{firebaseUser?.email ?? "—"}</Text>
              {user?.org_name && (
                <Text style={styles.profileOrg}>{user.org_name}</Text>
              )}
            </View>
          </View>

          {/* Edit Profile */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Edit Profile</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Your Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor={TEXT_MUTED}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Organisation Name</Text>
              <TextInput
                style={styles.input}
                value={orgName}
                onChangeText={setOrgName}
                placeholder="e.g. Sharma Transports Pvt Ltd"
                placeholderTextColor={TEXT_MUTED}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit mobile"
                placeholderTextColor={TEXT_MUTED}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email (Google Account)</Text>
              <View style={[styles.input, styles.readOnly]}>
                <Text style={styles.readOnlyText}>{firebaseUser?.email ?? "—"}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.infoRow}>
              <Info size={18} color={TEXT_MUTED} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>FleetSure Main App</Text>
                <Text style={styles.infoValue}>Version 1.0.0</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Server size={18} color={TEXT_MUTED} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Backend</Text>
                <Text style={styles.infoValue}>Supabase + Firebase</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <UserCircle size={18} color={TEXT_MUTED} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Account ID</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{user?.id ?? "—"}</Text>
              </View>
            </View>
          </View>

          {/* Sign Out */}
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <LogOut size={18} color={DANGER} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>Made with ❤️ in Bengaluru · FleetSure</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "800", color: TEXT },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: "800", color: TEXT },
  profileEmail: { fontSize: 13, color: TEXT_MUTED, marginTop: 2 },
  profileOrg: { fontSize: 13, color: "#1E2D8E", fontWeight: "600", marginTop: 2 },
  section: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: TEXT, marginBottom: 4 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: TEXT_MUTED },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: TEXT,
  },
  readOnly: { justifyContent: "center" },
  readOnlyText: { fontSize: 14, color: TEXT_MUTED },
  saveBtn: {
    backgroundColor: "#1E2D8E",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 13, color: TEXT_MUTED },
  infoValue: { fontSize: 13, fontWeight: "600", color: TEXT, marginTop: 1 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 14,
  },
  signOutText: { color: DANGER, fontWeight: "700", fontSize: 15 },
  footer: { textAlign: "center", fontSize: 12, color: TEXT_MUTED, marginTop: 8 },
});
