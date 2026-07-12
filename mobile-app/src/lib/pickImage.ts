import * as ImagePicker from "expo-image-picker";

export interface PickedAsset {
  uri: string;
  name: string;
  mimeType: string | null;
}

// Shared camera-roll picker for the 3 screens that need "pick a photo"
// (vehicle/driver document upload, firm logo) — normalizes the picked
// asset to the same {uri, name, mimeType} shape expo-document-picker uses
// so both feed the same upload() calls.
export async function pickImageFromGallery(): Promise<PickedAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
  if (res.canceled || !res.assets?.[0]) return null;
  return { uri: res.assets[0].uri, name: `photo_${Date.now()}.jpg`, mimeType: "image/jpeg" };
}
