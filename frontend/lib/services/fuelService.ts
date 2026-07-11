import { supabase } from "@/lib/supabase";
import { query, ok, fail, getUid } from "./_base";
import { documentService } from "./documentService";
import type { FuelLog, ServiceResponse } from "@/lib/types";
import type { Database } from "@/lib/database.types";

type FuelLogInsert = Database["public"]["Tables"]["fuel_logs"]["Insert"];

export const fuelService = {
  async getAll(vehicle_id?: string): Promise<ServiceResponse<FuelLog[]>> {
    const uid = getUid();
    const q = supabase.from("fuel_logs").select("*").eq("owner_id", uid).order("date", { ascending: false });
    return query(vehicle_id ? q.eq("vehicle_id", vehicle_id) : q);
  },

  async uploadReceipt(file: File): Promise<ServiceResponse<string>> {
    return documentService.upload(file, getUid(), "fuel-receipts");
  },

  async add(data: Omit<FuelLogInsert, "owner_id">): Promise<ServiceResponse<FuelLog>> {
    const res = await query<FuelLog>(
      supabase.from("fuel_logs").insert({ ...data, owner_id: getUid() }).select().single()
    );
    if (res.success && data.receipt_url) {
      await documentService.logDocument({
        name: `Fuel Receipt — ${data.date}`, category: "Expense Receipts",
        file_url: data.receipt_url, linked_type: data.trip_id ? "trip" : "other", linked_id: data.trip_id ?? null,
      });
    }
    return res;
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("fuel_logs").delete().eq("id", id).eq("owner_id", getUid())
    );
  },

  // Per-vehicle analytics: total litres, avg km/L, anomaly detection
  async getAnalytics(): Promise<ServiceResponse<any[]>> {
    const uid = getUid();
    const { data, error } = await supabase
      .from("fuel_logs")
      .select("id, vehicle_id, date, odometer_km, litres, amount, vehicles(registration_number, make, model)")
      .eq("owner_id", uid)
      .order("date", { ascending: true });

    if (error) return fail(error);

    const byVehicle = new Map<string, any[]>();
    for (const log of (data as any[]) || []) {
      if (!byVehicle.has(log.vehicle_id)) byVehicle.set(log.vehicle_id, []);
      byVehicle.get(log.vehicle_id)!.push(log);
    }

    const analytics: any[] = [];
    for (const [vehicleId, logs] of byVehicle) {
      const vehicle     = logs[0].vehicles;
      const totalLitres = logs.reduce((s: number, l: any) => s + Number(l.litres), 0);
      const totalSpend  = logs.reduce((s: number, l: any) => s + Number(l.amount), 0);

      // Compute km/L from consecutive odometer fill-ups
      const withOdo = logs
        .filter((l: any) => l.odometer_km != null)
        .sort((a: any, b: any) => Number(a.odometer_km) - Number(b.odometer_km));

      const kmplList: number[] = [];
      for (let i = 1; i < withOdo.length; i++) {
        const km = Number(withOdo[i].odometer_km) - Number(withOdo[i - 1].odometer_km);
        const L  = Number(withOdo[i].litres);
        if (km > 0 && L > 0) kmplList.push(km / L);
      }

      const avgKmpl  = kmplList.length ? (kmplList.reduce((s, k) => s + k, 0) / kmplList.length).toFixed(1) : null;
      const lastKmpl = kmplList.length ? kmplList[kmplList.length - 1].toFixed(1) : null;

      let anomaly = false, anomalyPct = 0;
      if (kmplList.length >= 2 && avgKmpl && lastKmpl) {
        const drop = (Number(avgKmpl) - Number(lastKmpl)) / Number(avgKmpl) * 100;
        if (drop > 15) { anomaly = true; anomalyPct = Math.round(drop); }
      }

      analytics.push({
        vehicle_id: vehicleId,
        registration_number: vehicle?.registration_number ?? vehicleId,
        total_litres: totalLitres,
        total_spend: totalSpend,
        fill_count: logs.length,
        avg_kmpl: avgKmpl,
        last_kmpl: lastKmpl,
        anomaly,
        anomaly_pct: anomalyPct,
      });
    }

    return ok(analytics);
  },
};
