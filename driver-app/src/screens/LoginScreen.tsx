import React, { useEffect, useRef, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

const PRIMARY = "#1E2D8E";
const PRIMARY_LIGHT = "#EEF0FB";
const COOLDOWN_SECONDS = 60;

export default function LoginScreen() {
  const { sendOtp, verifyOtp, resetOtp, otpSent, authError } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startCooldown() {
    setCooldown(COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) { clearInterval(timerRef.current!); timerRef.current = null; return 0; }
        return s - 1;
      });
    }, 1000);
  }

  async function handleSendOtp() {
    if (phone.replace(/\D/g, "").length < 10 || cooldown > 0) return;
    setSending(true);
    await sendOtp(phone);
    setSending(false);
    startCooldown();
  }

  async function handleResendOtp() {
    if (cooldown > 0) return;
    setSending(true);
    await sendOtp(phone);
    setSending(false);
    startCooldown();
  }

  async function handleVerify() {
    if (otp.length < 6) return;
    setVerifying(true);
    await verifyOtp(otp);
    setVerifying(false);
  }

  function handleChangeNumber() {
    setOtp("");
    setPhone("");
    resetOtp();
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoBox}>
              <MaterialCommunityIcons name="truck-outline" size={36} color="white" />
            </View>
            <Text style={styles.logoTitle}>FleetSure</Text>
            <Text style={styles.logoSub}>Driver Portal</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {!otpSent ? (
              <>
                <Text style={styles.cardTitle}>Sign In</Text>
                <Text style={styles.cardSub}>
                  Enter the mobile number registered with your fleet manager.
                </Text>

                <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.prefix}>
                    <Ionicons name="call-outline" size={14} color="#64748B" />
                    <Text style={styles.prefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    value={phone}
                    onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))}
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholder="9XXXXXXXXX"
                    placeholderTextColor="#CBD5E1"
                  />
                </View>

                {authError ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{authError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    (sending || phone.length < 10 || cooldown > 0) && styles.primaryBtnDisabled,
                  ]}
                  onPress={handleSendOtp}
                  disabled={sending || phone.length < 10 || cooldown > 0}
                >
                  {sending ? (
                    <ActivityIndicator color="white" />
                  ) : cooldown > 0 ? (
                    <Text style={styles.primaryBtnText}>Resend in {cooldown}s</Text>
                  ) : (
                    <Text style={styles.primaryBtnText}>Send OTP →</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Enter OTP</Text>
                <Text style={styles.cardSub}>
                  We sent a 6-digit code to +91 {phone}
                </Text>

                <TextInput
                  style={styles.otpInput}
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="• • • • • •"
                  placeholderTextColor="#CBD5E1"
                  autoFocus
                  textAlign="center"
                />

                {authError ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{authError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    (verifying || otp.length < 6) && styles.primaryBtnDisabled,
                  ]}
                  onPress={handleVerify}
                  disabled={verifying || otp.length < 6}
                >
                  {verifying ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Verify & Sign In →</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryBtn, cooldown > 0 && styles.primaryBtnDisabled]}
                  onPress={handleResendOtp}
                  disabled={sending || cooldown > 0}
                >
                  <Text style={[styles.secondaryBtnText, cooldown > 0 && { color: "#94A3B8" }]}>
                    {sending ? "Sending…" : cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handleChangeNumber}
                >
                  <Text style={styles.secondaryBtnText}>← Change Number</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#0369A1" />
              <Text style={styles.securityText}>
                Your number is verified securely via OTP. No password needed.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PRIMARY },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoSection: { alignItems: "center", marginBottom: 32 },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoTitle: { fontSize: 26, fontWeight: "900", color: "white", letterSpacing: -0.5 },
  logoSub: { fontSize: 14, color: "rgba(255,255,255,0.7)", fontWeight: "500", marginTop: 4 },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 380,
    shadowColor: "#1E2D8E",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  cardTitle: { fontSize: 20, fontWeight: "800", color: PRIMARY, marginBottom: 6, letterSpacing: -0.4 },
  cardSub: { fontSize: 14, color: "#64748B", marginBottom: 24, lineHeight: 20 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  phoneRow: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: `${PRIMARY}33`,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: PRIMARY_LIGHT,
  },
  prefix: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRightWidth: 1,
    borderRightColor: `${PRIMARY}33`,
    gap: 4,
  },
  prefixText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontWeight: "600",
    color: PRIMARY,
    letterSpacing: 1,
  },
  otpInput: {
    borderWidth: 1.5,
    borderColor: `${PRIMARY}44`,
    borderRadius: 10,
    backgroundColor: PRIMARY_LIGHT,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: "700",
    color: PRIMARY,
    letterSpacing: 12,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { fontSize: 13, color: "#991B1B" },
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryBtnDisabled: { backgroundColor: "#C7D2FE" },
  primaryBtnText: { color: "white", fontSize: 15, fontWeight: "700", letterSpacing: -0.2 },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: `${PRIMARY}44`,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  secondaryBtnText: { color: PRIMARY, fontSize: 14, fontWeight: "600" },
  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F0F9FF",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    marginTop: 8,
  },
  securityText: { fontSize: 12, color: "#0369A1", fontWeight: "500", flex: 1, lineHeight: 17 },
});
