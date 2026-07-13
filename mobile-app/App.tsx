import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import AppNavigator from "./src/navigation";

// Keep the native splash up until auth state has actually resolved, so we
// never flash an unauthenticated Login screen (or vice versa) while
// Firebase/Supabase are still loading the session.
SplashScreen.preventAutoHideAsync();

function AppBody() {
  const { scheme } = useTheme();
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppBody />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
