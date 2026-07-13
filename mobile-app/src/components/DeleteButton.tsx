import { useState } from "react";
import { TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, radii } from "../theme";
import type { ServiceResponse } from "../lib/types";

export default function DeleteButton({
  label = "item",
  onDelete,
  onDeleted,
  size = 20,
}: {
  label?: string;
  onDelete: () => Promise<ServiceResponse<null>>;
  onDeleted: () => void;
  size?: number;
}) {
  const [deleting, setDeleting] = useState(false);

  function handlePress() {
    Alert.alert(`Delete ${label}?`, "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          const res = await onDelete();
          setDeleting(false);
          if (res.success) onDeleted();
          else Alert.alert("Couldn't delete", res.error ?? "Please try again.");
        },
      },
    ]);
  }

  return (
    <TouchableOpacity style={styles.btn} onPress={handlePress} disabled={deleting}>
      {deleting ? (
        <ActivityIndicator size="small" color={colors.error} />
      ) : (
        <MaterialIcons name="delete-outline" size={size} color={colors.error} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { width: 36, height: 36, borderRadius: radii.md, justifyContent: "center", alignItems: "center" },
});
