import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";

const { height } = Dimensions.get("window");

export default function LoginScreen() {
  const { signInWithGoogle, authError } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      Alert.alert("Sign-in Failed", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* ── Top blue section ── */}
      <SafeAreaView style={styles.hero} edges={["top"]}>
        <View style={styles.heroContent}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>FleetSure</Text>
          <Text style={styles.tagline}>Track every trip. Know every rupee.</Text>
        </View>
      </SafeAreaView>

      {/* ── Bottom white section ── */}
      <SafeAreaView style={styles.card} edges={["bottom"]}>
        <Text style={styles.cardTitle}>Welcome to FleetSure</Text>
        <Text style={styles.cardSub}>
          Sign in with your Google account to continue
        </Text>

        {authError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{authError}</Text>
          </View>
        ) : null}

        {/* Google Sign-in Button */}
        <TouchableOpacity
          style={[styles.googleBtn, loading && styles.googleBtnDisabled]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#1a1a2e" size="small" />
          ) : (
            <GoogleIcon />
          )}
          <Text style={styles.googleBtnText}>
            {loading ? "Signing in…" : "Continue with Google"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.terms}>
          By signing in you agree to our Terms of Service.
        </Text>

        <Text style={styles.footer}>Made with ❤️ in Bengaluru</Text>
      </SafeAreaView>
    </View>
  );
}

// Multicolour Google "G" icon
function GoogleIcon() {
  return (
    <View style={gStyles.container}>
      <View style={[gStyles.segment, gStyles.topLeft, { backgroundColor: "#4285F4" }]} />
      <View style={[gStyles.segment, gStyles.topRight, { backgroundColor: "#EA4335" }]} />
      <View style={[gStyles.segment, gStyles.bottomLeft, { backgroundColor: "#FBBC05" }]} />
      <View style={[gStyles.segment, gStyles.bottomRight, { backgroundColor: "#34A853" }]} />
      <View style={gStyles.center} />
      {/* White cutout arms */}
      <View style={gStyles.hBar} />
    </View>
  );
}

const gStyles = StyleSheet.create({
  container: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#ffffff",
    borderWidth: 0,
  },
  segment: {
    position: "absolute",
    width: 11,
    height: 11,
  },
  topLeft: { top: 0, left: 0 },
  topRight: { top: 0, right: 0 },
  bottomLeft: { bottom: 0, left: 0 },
  bottomRight: { bottom: 0, right: 0 },
  center: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    top: 5,
    left: 5,
  },
  hBar: {
    position: "absolute",
    width: 9,
    height: 4,
    backgroundColor: "#4285F4",
    right: 0,
    top: 9,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1E2D8E",
  },

  // Blue hero section
  hero: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  heroContent: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  brandName: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  tagline: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },

  // White card
  card: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 16,
    minHeight: height * 0.38,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  cardSub: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },

  errorBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#DC2626", fontSize: 13, lineHeight: 18 },

  // Google button — matches web portal style exactly
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#E0E0EE",
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  googleBtnDisabled: { opacity: 0.65 },
  googleBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a2e",
  },

  terms: {
    textAlign: "center",
    color: "#aaaaaa",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },
  footer: {
    textAlign: "center",
    color: "#cccccc",
    fontSize: 13,
  },
});
