const LS_KEY = "fs_tyres_v2";

export function getAllSetups(): Record<string, any> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}

export function getTyreSetup(vid: string): any | null {
  return getAllSetups()[vid] ?? null;
}

export function saveTyreSetup(vid: string, setup: any): void {
  const all = getAllSetups();
  all[vid] = setup;
  localStorage.setItem(LS_KEY, JSON.stringify(all));
}

// Called automatically when a trip is marked completed.
// Adds distance_km to kms_run on every non-spare tyre for the vehicle.
export function autoSyncTripToTyres(trip: {
  id: string;
  vehicle_id: string;
  distance_km?: number | null;
}): void {
  if (!trip.distance_km || typeof window === "undefined") return;
  const setup = getTyreSetup(trip.vehicle_id);
  if (!setup) return;
  if ((setup.synced_trip_ids || []).includes(trip.id)) return;
  saveTyreSetup(trip.vehicle_id, {
    ...setup,
    tyres: setup.tyres.map((ty: any) =>
      ty.is_spare ? ty : { ...ty, kms_run: ty.kms_run + (trip.distance_km as number) }
    ),
    synced_trip_ids: [...(setup.synced_trip_ids || []), trip.id],
  });
}
