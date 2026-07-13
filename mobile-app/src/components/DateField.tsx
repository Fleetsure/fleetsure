import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { colors, radii } from "../theme";

function toDisplay(v: string): string {
  const [y, m, d] = v.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

function toDate(v: string): Date {
  if (!v) return new Date();
  const [y, m, d] = v.split("-").map(Number);
  if (!y) return new Date();
  return new Date(y, (m || 1) - 1, d || 1);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Tapping the field opens the native calendar (Android: modal dialog;
// iOS: inline month grid). Stores/emits YYYY-MM-DD for DB writes, displays
// DD/MM/YYYY — mirrors FormField's visual style so it drops in as a
// same-size replacement in existing forms.
export default function DateField({
  label,
  required,
  value,
  onChange,
  placeholder = "Select date",
  minimumDate,
  maximumDate,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const [show, setShow] = useState(false);

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    setShow(false);
    if (event.type === "dismissed" || !selected) return;
    onChange(toIso(selected));
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label.toUpperCase()}{required ? " *" : ""}</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShow(true)} activeOpacity={0.7}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value ? toDisplay(value) : placeholder}
        </Text>
        <MaterialIcons name="calendar-today" size={16} color={colors.onSurfaceVariant} />
      </TouchableOpacity>
      {show ? (
        <DateTimePicker
          value={toDate(value)}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "calendar"}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant, letterSpacing: 0.8, marginBottom: 8 },
  input: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  valueText: { fontSize: 15, color: colors.onSurface },
  placeholderText: { fontSize: 15, color: colors.outline },
});
