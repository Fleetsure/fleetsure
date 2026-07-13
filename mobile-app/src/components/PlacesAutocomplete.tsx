import React, { useState, useRef } from "react";
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors, type, radii, spacing, shadow } from "../theme";

interface Suggestion { display_name: string; lat: string; lon: string; }
interface LatLng { lat: number; lng: number; }

interface Props {
  label: string;
  required?: boolean;
  value: string;
  onChange: (text: string) => void;
  onSelect: (description: string, latLng: LatLng) => void;
}

export default function PlacesAutocomplete({ label, required, value, onChange, onSelect }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(text: string) {
    onChange(text);
    if (timer.current) clearTimeout(timer.current);
    if (text.length < 3) { setSuggestions([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&countrycodes=in&format=json&addressdetails=1&limit=5`;
        const res = await fetch(url, { headers: { "User-Agent": "FleetSure/1.0 dilip.25017@ssb.scaler.com" } });
        const json = await res.json();
        setSuggestions(json ?? []);
      } catch { setSuggestions([]); }
    }, 350);
  }

  function handleSelect(s: Suggestion) {
    setSuggestions([]);
    onChange(s.display_name);
    onSelect(s.display_name, { lat: Number(s.lat), lng: Number(s.lon) });
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label.toUpperCase()}
        {required ? <Text style={styles.asterisk}> *</Text> : null}
      </Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={handleChange}
        placeholder={`Enter ${label.toLowerCase()}`}
        placeholderTextColor={colors.outline}
      />
      {suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={s => `${s.lat},${s.lon}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestion} onPress={() => handleSelect(item)}>
                <Text style={styles.suggestionText} numberOfLines={2}>{item.display_name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14, position: "relative", zIndex: 99 },
  label: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant, letterSpacing: 0.8, marginBottom: 8 },
  asterisk: { color: colors.danger },
  input: {
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.onSurface,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    maxHeight: 220,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    zIndex: 99,
    ...shadow.card,
  },
  suggestion: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surfaceContainer },
  suggestionText: { ...type.bodyMd, color: colors.onSurface },
});
