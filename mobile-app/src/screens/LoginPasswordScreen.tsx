import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import { colors, radii, spacing, type } from "../theme";

export default function LoginPasswordScreen() {
  const { user, sendPasswordReset } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleChangePassword() {
    if (!user?.email) return;
    setSending(true);
    try {
      await sendPasswordReset(user.email);
      setSent(true);
      Alert.alert("Email sent", `A password reset link was sent to ${user.email}.`);
    } catch (e: any) {
      Alert.alert("Couldn't send reset email", e?.message?.replace("Firebase: ", "") ?? "Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Login & Password" />
      <View style={{ padding: spacing.containerMargin, gap: spacing.stackGap }}>
        <Card>
          <Text style={styles.label}>ACCOUNT EMAIL</Text>
          <View style={styles.emailRow}>
            <MaterialIcons name="email" size={18} color={colors.onSurfaceVariant} />
            <Text style={styles.value}>{user?.email}</Text>
          </View>
        </Card>

        <TouchableOpacity style={[styles.changeBtn, sending && { opacity: 0.6 }]} onPress={handleChangePassword} disabled={sending}>
          {sending ? <ActivityIndicator color="white" /> : <Text style={styles.changeBtnText}>Change Password</Text>}
        </TouchableOpacity>

        <Text style={styles.hint}>
          {sent
            ? "We've sent a reset link to your email. Follow it to set a new password."
            : "We'll email you a secure link to set a new password — FleetSure never stores your password directly."}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  label: { fontSize: 10, fontWeight: "700", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  emailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  value: { ...type.bodyLg, color: colors.onSurface },
  changeBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 14, alignItems: "center" },
  changeBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  hint: { ...type.bodyMd, color: colors.onSurfaceVariant, paddingHorizontal: 4 },
});
