import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, darkColors } from "../theme";

const THEME_STORAGE_KEY = "theme_preference";

type Scheme = "light" | "dark";

interface ThemeContextType {
  scheme: Scheme;
  setScheme: (s: Scheme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setSchemeState] = useState<Scheme>("light");

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((v) => {
      if (v === "dark" || v === "light") setSchemeState(v);
    });
  }, []);

  function setScheme(s: Scheme) {
    setSchemeState(s);
    AsyncStorage.setItem(THEME_STORAGE_KEY, s);
  }

  return <ThemeContext.Provider value={{ scheme, setScheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

export function useColors() {
  const { scheme } = useTheme();
  return scheme === "dark" ? darkColors : colors;
}
