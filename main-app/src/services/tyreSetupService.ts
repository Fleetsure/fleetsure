import { supabase } from "../config/supabase";
import { getUid } from "./_base";
import type { VehicleTyreSetup, TyreUnit } from "../utils/tyreCalc";

export async function getTyreSetup(vehicleId: string): Promise<VehicleTyreSetup | null> {
  const { data } = await supabase
    .from("tyre_setups")
    .select("tyre_count, has_spare, tyres, synced_trip_ids")
    .eq("vehicle_id", vehicleId)
    .maybeSingle();
  if (!data) return null;
  return {
    tyre_count: data.tyre_count,
    has_spare: data.has_spare,
    tyres: data.tyres as unknown as TyreUnit[],
    synced_trip_ids: data.synced_trip_ids as unknown as string[],
  };
}

export async function saveTyreSetup(vehicleId: string, setup: VehicleTyreSetup): Promise<void> {
  await supabase.from("tyre_setups").upsert(
    {
      owner_id: getUid(),
      vehicle_id: vehicleId,
      tyre_count: setup.tyre_count,
      has_spare: setup.has_spare,
      tyres: setup.tyres as any,
      synced_trip_ids: setup.synced_trip_ids as any,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "vehicle_id" }
  );
}

// Called when a trip is marked completed. Adds distance_km to kms_run on
// every non-spare tyre for the vehicle.
export async function autoSyncTripToTyres(trip: {
  id: string;
  vehicle_id: string;
  distance_km?: number | null;
}): Promise<void> {
  if (!trip.distance_km) return;
  const setup = await getTyreSetup(trip.vehicle_id);
  if (!setup) return;
  if ((setup.synced_trip_ids || []).includes(trip.id)) return;
  await saveTyreSetup(trip.vehicle_id, {
    ...setup,
    tyres: setup.tyres.map(ty =>
      ty.is_spare ? ty : { ...ty, kms_run: ty.kms_run + (trip.distance_km as number) }
    ),
    synced_trip_ids: [...(setup.synced_trip_ids || []), trip.id],
  });
}
