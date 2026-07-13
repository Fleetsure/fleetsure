import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRoute, RouteProp } from "@react-navigation/native";
import ScreenHeader from "../components/ScreenHeader";
import { colors, type } from "../theme";
import type { MoreStackParamList } from "../navigation";

export default function ComingSoonScreen() {
  const { params } = useRoute<RouteProp<MoreStackParamList, "ComingSoon">>();

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title={params.title} />
      <View style={styles.body}>
        <MaterialIcons name="construction" size={48} color={colors.outline} />
        <Text style={styles.title}>{params.title}</Text>
        <Text style={styles.subtitle}>This section is coming soon to the FleetSure app.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, paddingHorizontal: 40 },
  title: { ...type.headlineMd, color: colors.onBackground, marginTop: 8 },
  subtitle: { ...type.bodyMd, color: colors.onSurfaceVariant, textAlign: "center" },
});
