import React, { useState, useRef } from "react";
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors, type, radii, spacing, shadow } from "../theme";

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

interface Suggestion { place_id: string; description: string; }
interface LatLng { lat: number; lng: number; }

interface Props {
  label: string;
  value: string;
  onChange: (text: string) => void;
  onSelect: (description: string, latLng: LatLng) => void;
}

export default function PlacesAutocomplete({ label, value, onChange, onSelect }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(text: string) {
    onChange(text);
    if (timer.current) clearTimeout(timer.current);
    if (text.length < 3) { setSuggestions([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&components=country:in&key=${GOOGLE_KEY}`;
        const res = await fetch(url);
        const json = await res.json();
        setSuggestions(json.predictions ?? []);
      } catch { setSuggestions([]); }
    }, 350);
  }

  async function handleSelect(s: Suggestion) {
    setSuggestions([]);
    onChange(s.description);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${s.place_id}&fields=geometry&key=${GOOGLE_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      const loc = json.result?.geometry?.location;
      if (loc) onSelect(s.description, loc);
    } catch { onSelect(s.description, { lat: 0, lng: 0 }); }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
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
            keyExtractor={s => s.place_id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestion} onPress={() => handleSelect(item)}>
                <Text style={styles.suggestionText} numberOfLines={2}>{item.description}</Text>
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
