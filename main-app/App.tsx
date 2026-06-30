import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation";

GoogleSignin.configure({
  webClientId:
    "874399364699-uokc8ai3davqm8a19udr85gpketvj3qn.apps.googleusercontent.com",
});

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
