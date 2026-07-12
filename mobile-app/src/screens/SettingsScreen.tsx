import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import Card from "../components/Card";
import ScreenHeader from "../components/ScreenHeader";
import { colors, radii, spacing, type } from "../theme";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

type SettingsItem = { label: string; icon: IconName; screen?: string };

const SECTIONS: { title: string; items: SettingsItem[] }[] = [
  {
    title: "My Account",
    items: [
      { label: "User Profile", icon: "account-circle", screen: "EditProfile" },
      { label: "Login & Password", icon: "lock", screen: "LoginPassword" },
      { label: "Appearance & Theme", icon: "palette", screen: "Appearance" },
    ],
  },
  {
    title: "Fleet Settings",
    items: [
      { label: "General Settings", icon: "settings", screen: "GeneralSettings" },
      { label: "My Firms", icon: "business", screen: "MyFirms" },
      { label: "Billing & Subscriptions", icon: "credit-card", screen: "Billing" },
      { label: "Export Account Data", icon: "file-download" },
    ],
  },
  {
    title: "User Access",
    items: [{ label: "Manage Users", icon: "group" }],
  },
  {
    title: "Recommended for India 🇮🇳",
    items: [
      { label: "Language & Region", icon: "language", screen: "LanguageRegion" },
      { label: "GST & Tax Settings", icon: "receipt" },
      { label: "Integrations", icon: "power" },
      { label: "Alert Thresholds", icon: "warning" },
    ],
  },
];

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();

  function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: signOut },
    ]);
  }

  function handlePress(item: SettingsItem) {
    if (item.screen) return navigation.navigate(item.screen);
    Alert.alert("Coming soon", `${item.label} is not available yet.`);
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Settings" />

      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 40 }}>
        <Card>
          <Text style={styles.label}>NAME</Text>
          <Text style={styles.value}>{user?.name}</Text>
          <View style={styles.divider} />
          <Text style={styles.label}>EMAIL</Text>
          <Text style={styles.value}>{user?.email}</Text>
          {user?.org_name ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.label}>ORGANIZATION</Text>
              <Text style={styles.value}>{user.org_name}</Text>
            </>
          ) : null}
        </Card>

        {SECTIONS.map((section) => (
          <View key={section.title}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            <Card style={styles.menuCard}>
              {section.items.map((item, i) => (
                <React.Fragment key={item.label}>
                  {i > 0 ? <View style={styles.menuDivider} /> : null}
                  <TouchableOpacity style={styles.menuRow} onPress={() => handlePress(item)}>
                    <MaterialIcons name={item.icon} size={20} color={colors.primaryContainer} />
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </Card>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialIcons name="logout" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  label: { fontSize: 10, fontWeight: "700", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  value: { ...type.bodyLg, color: colors.onSurface },
  divider: { height: 1, backgroundColor: colors.outlineVariant, marginVertical: 12 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  menuCard: { padding: 0 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: spacing.cardPadding, paddingVertical: 14 },
  menuDivider: { height: 1, backgroundColor: colors.outlineVariant, marginLeft: spacing.cardPadding },
  menuLabel: { ...type.bodyMd, color: colors.onSurface, flex: 1, fontWeight: "500" },
  logoutBtn: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: colors.error, borderRadius: radii.md, paddingVertical: 14 },
  logoutText: { color: colors.error, fontWeight: "700", fontSize: 15 },
});
