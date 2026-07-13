import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../../components/ScreenHeader";
import MiscExpensesScreen from "./MiscExpensesScreen";
import { colors, spacing } from "../../theme";

// Fuel, Tolls and Tyres each have their own dedicated screen reachable from
// the More menu — this screen only needs to cover the remaining, non-duplicated
// expense category (misc).
export default function ExpensesScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Other Expenses" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, paddingBottom: 32 }}>
        <MiscExpensesScreen />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
