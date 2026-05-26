const KEY = "fs_vehicle_mileage";

export function getMileageMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

export function saveMileage(vehicleId: string, kmpl: number | null) {
  const map = getMileageMap();
  if (kmpl == null) { delete map[vehicleId]; } else { map[vehicleId] = kmpl; }
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function mergeMileage<T extends { id: string; avg_mileage_kmpl?: number | null }>(vehicles: T[]): T[] {
  const map = getMileageMap();
  return vehicles.map(v => ({ ...v, avg_mileage_kmpl: map[v.id] ?? v.avg_mileage_kmpl ?? null }));
}
