import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar } from "lucide-react-native";

import { TEXT, MUTED, BORDER } from "../theme";

// Stored/sent to Postgres as ISO "YYYY-MM-DD"; shown to the user as "DD/MM/YYYY".
export function isoToDisplay(iso?: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

export function isoToDate(iso?: string | null): Date {
  if (iso) {
    const [y, m, d] = iso.split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  return new Date();
}

export function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DateField({ label, value, onChangeIso }: { label: string; value?: string | null; onChangeIso: (iso: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.fieldGroup}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.pickerBtn} onPress={() => setOpen(true)}>
        <Text style={[s.pickerText, !value && { color: MUTED }]}>{value ? isoToDisplay(value) : "DD/MM/YYYY"}</Text>
        <Calendar size={16} color={MUTED} />
      </TouchableOpacity>
      {open && (
        <DateTimePicker
          value={isoToDate(value)}
          mode="date"
          display="calendar"
          onChange={(event, selectedDate) => {
            setOpen(false);
            if (event.type === "set" && selectedDate) onChangeIso(dateToIso(selectedDate));
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: MUTED, marginBottom: 6 },
  pickerBtn: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pickerText: { fontSize: 14, color: TEXT },
});
