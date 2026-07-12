import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import { colors, radii, spacing, type } from "../theme";

const LANGUAGE_STORAGE_KEY = "app_language";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी (Hindi)" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "te", label: "తెలుగు (Telugu)" },
];

export default function LanguageScreen() {
  const [selected, setSelected] = useState("en");

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((v) => { if (v) setSelected(v); });
  }, []);

  function handleSelect(code: string) {
    setSelected(code);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Language & Region" />
      <View style={{ padding: spacing.containerMargin, gap: spacing.stackGap }}>
        <Card style={{ padding: 0 }}>
          {LANGUAGES.map((lang, i) => (
            <React.Fragment key={lang.code}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <TouchableOpacity style={styles.row} onPress={() => handleSelect(lang.code)}>
                <MaterialIcons name="language" size={20} color={colors.primaryContainer} />
                <Text style={styles.rowLabel}>{lang.label}</Text>
                {selected === lang.code ? (
                  <MaterialIcons name="check-circle" size={20} color={colors.primaryContainer} />
                ) : (
                  <MaterialIcons name="radio-button-unchecked" size={20} color={colors.outline} />
                )}
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </Card>
        <Text style={styles.hint}>Your language preference is saved on this device.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: spacing.cardPadding, paddingVertical: 14 },
  divider: { height: 1, backgroundColor: colors.outlineVariant, marginLeft: spacing.cardPadding },
  rowLabel: { ...type.bodyMd, color: colors.onSurface, flex: 1, fontWeight: "500" },
  hint: { ...type.bodyMd, color: colors.onSurfaceVariant, paddingHorizontal: 4 },
});
