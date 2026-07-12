import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { colors, radii } from "../theme";

export default function LoginScreen() {
  const { signIn, sendPasswordReset, authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [localError, setLocalError] = useState("");

  async function handleSignIn() {
    setLocalError("");
    setResetSent(false);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch {
      // authError is already set by AuthContext
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setLocalError('Enter your email above first, then tap "Forgot password?" again.');
      return;
    }
    setLocalError("");
    try {
      await sendPasswordReset(email);
      setResetSent(true);
    } catch (e: any) {
      setLocalError(e?.message?.replace("Firebase: ", "") || "Failed to send reset link.");
    }
  }

  const error = localError || authError;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.hero} edges={["top"]}>
        <View style={styles.heroContent}>
          <Image source={require("../../assets/icon.png")} style={styles.logo} resizeMode="cover" />
          <Text style={styles.brandName}>FleetSure</Text>
          <Text style={styles.tagline}>Track every trip. Know every rupee.</Text>
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.card} edges={["bottom"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSub}>Sign in to continue</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            {resetSent ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>Reset link sent to your email.</Text>
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.outline}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.outline}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.primaryBtn, (loading || !email || !password) && styles.primaryBtnDisabled]}
              onPress={handleSignIn}
              disabled={loading || !email || !password}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>Sign In</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <Text style={styles.terms}>By signing in you agree to our Terms of Service.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  hero: { flex: 1, justifyContent: "flex-end" },
  heroContent: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 40, gap: 12 },
  logo: { width: 64, height: 64, borderRadius: radii.lg },
  brandName: { color: "#ffffff", fontSize: 32, fontWeight: "900", letterSpacing: -0.5 },
  tagline: { color: "rgba(255,255,255,0.75)", fontSize: 16, textAlign: "center", lineHeight: 24 },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 16,
    maxHeight: "62%",
  },
  cardTitle: { fontSize: 24, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.4, marginBottom: 6 },
  cardSub: { color: colors.onSurfaceVariant, fontSize: 14, lineHeight: 20, marginBottom: 20 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: 14,
  },
  errorBox: { backgroundColor: colors.errorContainer, borderRadius: radii.md, padding: 12, marginBottom: 14 },
  errorText: { color: colors.onErrorContainer, fontSize: 13, lineHeight: 18 },
  successBox: { backgroundColor: colors.successBg, borderRadius: radii.md, padding: 12, marginBottom: 14 },
  successText: { color: colors.success, fontSize: 13, lineHeight: 18 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 14, alignItems: "center", marginTop: 6 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  forgotBtn: { alignItems: "center", marginTop: 14 },
  forgotText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  terms: { textAlign: "center", color: colors.outline, fontSize: 12, lineHeight: 18, marginTop: 20 },
});
