import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, useColors } from "../context/ThemeContext";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import { spacing, type } from "../theme";

const OPTIONS: { key: "light" | "dark"; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: "light", label: "Light", icon: "light-mode" },
  { key: "dark", label: "Dark", icon: "dark-mode" },
];

export default function AppearanceScreen() {
  const { scheme, setScheme } = useTheme();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Appearance & Theme" />
      <View style={{ padding: spacing.containerMargin, gap: spacing.stackGap }}>
        <Card style={{ padding: 0 }}>
          {OPTIONS.map((opt, i) => (
            <React.Fragment key={opt.key}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <TouchableOpacity style={styles.row} onPress={() => setScheme(opt.key)}>
                <MaterialIcons name={opt.icon} size={20} color={colors.primaryContainer} />
                <Text style={styles.rowLabel}>{opt.label}</Text>
                {scheme === opt.key ? (
                  <MaterialIcons name="check-circle" size={20} color={colors.primaryContainer} />
                ) : (
                  <MaterialIcons name="radio-button-unchecked" size={20} color={colors.outline} />
                )}
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </Card>
        <Text style={styles.hint}>
          Your preference is saved on this device and applied to the app's navigation chrome and status bar.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: spacing.cardPadding, paddingVertical: 14 },
    divider: { height: 1, backgroundColor: colors.outlineVariant, marginLeft: spacing.cardPadding },
    rowLabel: { ...type.bodyMd, color: colors.onSurface, flex: 1, fontWeight: "500" },
    hint: { ...type.bodyMd, color: colors.onSurfaceVariant, paddingHorizontal: 4 },
  });
}
