import { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useFirm } from "../context/FirmContext";
import { useColors } from "../context/ThemeContext";
import { spacing, type } from "../theme";

type Item = {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  action: "settings" | "logout" | string;
  screen?: string;
  params?: any;
};

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "Expenses Tracking",
    items: [
      { icon: "local-gas-station", label: "Fuel", action: "Fuel", screen: "Fuel" },
      { icon: "toll", label: "Tolls", action: "Tolls", screen: "Tolls" },
      { icon: "build-circle", label: "Tyres", action: "Tyres", screen: "Tyres" },
      { icon: "payments", label: "Other Expenses", action: "Other Expenses", screen: "Expenses" },
    ],
  },
  {
    title: "Compliance",
    items: [
      { icon: "engineering", label: "Fleet Health", action: "Fleet Health", screen: "FleetHealth" },
      { icon: "shield", label: "Insurance & Renewals", action: "Insurance & Renewals", screen: "Insurance" },
    ],
  },
  {
    title: "Finance & Analytics",
    items: [
      { icon: "account-balance", label: "Accounts", action: "Accounts", screen: "Accounts" },
      { icon: "analytics", label: "Analytics", action: "Analytics", screen: "Analytics" },
      { icon: "bar-chart", label: "Reports", action: "Reports", screen: "Reports" },
    ],
  },
  {
    title: "Other",
    items: [
      { icon: "folder", label: "Documents", action: "Documents", screen: "Documents" },
      { icon: "groups", label: "Parties", action: "Parties", screen: "Parties" },
      { icon: "file-download", label: "Import Data", action: "Import Data" },
      { icon: "storefront", label: "Marketplace", action: "Marketplace" },
      { icon: "settings", label: "Settings", action: "settings" },
      { icon: "logout", label: "Log Out", action: "logout" },
    ],
  },
];

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  const { firms, activeFirmId } = useFirm();
  const navigation = useNavigation<any>();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const activeFirmName = firms.find(f => f.id === activeFirmId)?.name;

  function handlePress(item: Item) {
    if (item.action === "settings") return navigation.navigate("Settings");
    if (item.action === "logout") {
      Alert.alert("Log Out", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: signOut },
      ]);
      return;
    }
    if (item.screen) return navigation.navigate(item.screen, item.params);
    navigation.navigate("ComingSoon", { title: item.action });
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={36} color="white" />
        </View>
        <Text style={styles.name}>{user?.name ?? "Fleet Owner"}</Text>
        {activeFirmName ? <Text style={styles.firm}>{activeFirmName}</Text> : null}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <TouchableOpacity key={item.label} style={styles.row} onPress={() => handlePress(item)}>
                <View style={styles.rowLeft}>
                  <MaterialIcons name={item.icon} size={22} color={item.action === "logout" ? colors.error : colors.secondary} />
                  <Text style={[styles.rowLabel, item.action === "logout" && { color: colors.error }]}>{item.label}</Text>
                </View>
                {item.action !== "logout" && <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surfaceContainerLowest },
    hero: { backgroundColor: colors.primaryContainer, alignItems: "center", paddingTop: 24, paddingBottom: 24 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "white", marginBottom: 12 },
    name: { ...type.headlineMd, color: "white" },
    firm: { ...type.bodyMd, color: colors.inversePrimary, marginTop: 2 },
    section: { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
    sectionTitle: { ...type.labelMd, color: colors.onSurfaceVariant, textTransform: "uppercase", paddingHorizontal: spacing.cardPadding, paddingTop: 20, paddingBottom: 8 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.cardPadding, paddingVertical: 12, minHeight: spacing.touchTargetMin },
    rowLeft: { flexDirection: "row", alignItems: "center", gap: 16 },
    rowLabel: { ...type.bodyLg, color: colors.onSurface },
  });
}
