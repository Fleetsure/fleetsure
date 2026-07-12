import { supabase } from "../supabase";
import { getUid, getFirmId } from "./_base";

// ponytail: mirrors only the core fields of web's TyreUnit (frontend/lib/tyreCalc.ts) —
// pressure_logs/issue_logs/retread tracking/insights engine are not ported. Extend the
// TyreUnit shape below and the health formula in TyresScreen if that depth is needed.
export interface TyreUnit {
  position: string;
  is_spare: boolean;
  brand: string | null;
  condition: string | null;
  construction: string | null;
  max_lifespan_km: number;
  kms_run: number;
  install_date: string | null;
}

export interface VehicleTyreSetup {
  vehicle_id: string;
  tyre_count: number;
  has_spare: boolean;
  tyres: TyreUnit[];
}

function genPositions(count: number, hasSpare: boolean): string[] {
  const axles = Math.ceil(count / 2);
  const positions: string[] = [];
  for (let i = 1; i <= axles; i++) {
    positions.push(`Axle ${i} Left`, `Axle ${i} Right`);
  }
  const trimmed = positions.slice(0, count);
  if (hasSpare) trimmed.push("Spare");
  return trimmed;
}

export async function getTyreSetup(vehicleId: string): Promise<VehicleTyreSetup | null> {
  const { data } = await supabase
    .from("tyre_setups")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .eq("owner_id", getUid())
    .maybeSingle();
  if (!data) return null;
  return {
    vehicle_id: data.vehicle_id,
    tyre_count: data.tyre_count,
    has_spare: data.has_spare,
    tyres: (data.tyres as unknown as TyreUnit[]) ?? [],
  };
}

export function createDefaultSetup(vehicleId: string, tyreCount: number, hasSpare: boolean, maxLifespanKm: number): VehicleTyreSetup {
  const positions = genPositions(tyreCount, hasSpare);
  return {
    vehicle_id: vehicleId,
    tyre_count: tyreCount,
    has_spare: hasSpare,
    tyres: positions.map((position) => ({
      position,
      is_spare: position === "Spare",
      brand: null,
      condition: null,
      construction: null,
      max_lifespan_km: maxLifespanKm,
      kms_run: 0,
      install_date: null,
    })),
  };
}

export async function saveTyreSetup(setup: VehicleTyreSetup): Promise<void> {
  const { error } = await supabase.from("tyre_setups").upsert(
    {
      vehicle_id: setup.vehicle_id,
      owner_id: getUid(),
      firm_id: getFirmId(),
      tyre_count: setup.tyre_count,
      has_spare: setup.has_spare,
      tyres: setup.tyres as any,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "vehicle_id" }
  );
  if (error) throw error;
}
