import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Font from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation";

GoogleSignin.configure({
  webClientId:
    "874399364699-uokc8ai3davqm8a19udr85gpketvj3qn.apps.googleusercontent.com",
});

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Load fonts but never block the app — proceed after 3s max
    const timeout = setTimeout(() => setReady(true), 3000);
    Font.loadAsync({
      // 'ionicons' (lowercase) is the font family name @expo/vector-icons registers internally.
      // Load from a local project asset so Metro always bundles it — node_modules refs can fail in EAS.
      ionicons: require("./assets/fonts/Ionicons.ttf"),
    }).finally(() => {
      clearTimeout(timeout);
      setReady(true);
    });
    return () => clearTimeout(timeout);
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1E2D8E", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color="#ffffff" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
