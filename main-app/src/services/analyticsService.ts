import { supabase } from "../config/supabase";
import { ok, fail, getUid } from "./_base";
import type { ServiceResponse } from "../types";

const cutoff = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

async function sumExpenses(
  tripIds: string[],
  uid: string
): Promise<number> {
  if (!tripIds.length) return 0;
  const [exps, fuels, tolls, misc] = await Promise.all([
    supabase.from("expenses").select("amount").in("trip_id", tripIds),
    supabase.from("fuel_logs").select("amount").eq("owner_id", uid).in("trip_id", tripIds),
    supabase.from("toll_logs").select("amount").eq("owner_id", uid).in("trip_id", tripIds),
    supabase.from("misc_expenses").select("amount").eq("owner_id", uid).in("trip_id", tripIds),
  ]);
  let total = 0;
  for (const rows of [exps.data, fuels.data, tolls.data, misc.data]) {
    for (const r of rows ?? []) total += parseFloat((r as any).amount || 0);
  }
  return total;
}

async function expensesByTrip(
  tripIds: string[],
  uid: string
): Promise<Record<string, number>> {
  if (!tripIds.length) return {};
  const perTrip: Record<string, number> = {};
  const add = (tid: string | null, amt: number) => {
    if (tid) perTrip[tid] = (perTrip[tid] || 0) + amt;
  };
  const [exps, fuels, tolls, misc] = await Promise.all([
    supabase.from("expenses").select("trip_id,amount").in("trip_id", tripIds),
    supabase.from("fuel_logs").select("trip_id,amount").eq("owner_id", uid).in("trip_id", tripIds),
    supabase.from("toll_logs").select("trip_id,amount").eq("owner_id", uid).in("trip_id", tripIds),
    supabase.from("misc_expenses").select("trip_id,amount").eq("owner_id", uid).in("trip_id", tripIds),
  ]);
  for (const e of [
    ...(exps.data ?? []),
    ...(fuels.data ?? []),
    ...(tolls.data ?? []),
    ...(misc.data ?? []),
  ])
    add((e as any).trip_id, parseFloat((e as any).amount));
  return perTrip;
}

export const analyticsService = {
  async getOverview(days = 30): Promise<ServiceResponse<any>> {
    try {
      const uid = getUid();
      const from = cutoff(days);
      const [tripRes, vehicleRes] = await Promise.all([
        supabase
          .from("trips")
          .select("id,status,freight_amount,distance_km,vehicle_id")
          .eq("owner_id", uid)
          .gte("start_date", from),
        supabase.from("vehicles").select("id").eq("owner_id", uid),
      ]);

      const trips = tripRes.data ?? [];
      const tripIds = trips.map((t: any) => t.id);
      const totalRevenue = trips
        .filter((t: any) => t.status === "completed")
        .reduce((s: number, t: any) => s + parseFloat(t.freight_amount || 0), 0);
      const totalExpenses = await sumExpenses(tripIds, uid);
      const netProfit = totalRevenue - totalExpenses;
      const marginPct =
        totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

      return ok({
        period_days: days,
        total_trips: trips.length,
        total_vehicles: vehicleRes.data?.length ?? 0,
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_profit: netProfit,
        margin_pct: marginPct,
      });
    } catch (e) {
      return fail(e);
    }
  },

  async getVehiclePnL(): Promise<ServiceResponse<any[]>> {
    try {
      const uid = getUid();
      const from = cutoff(365);
      const [tripRes, vehicleRes] = await Promise.all([
        supabase
          .from("trips")
          .select("id,status,freight_amount,distance_km,vehicle_id")
          .eq("owner_id", uid)
          .gte("start_date", from),
        supabase
          .from("vehicles")
          .select("id,registration_number,make,model")
          .eq("owner_id", uid),
      ]);

      const vMap: Record<string, any> = {};
      for (const v of vehicleRes.data ?? []) {
        vMap[v.id] = {
          vehicle_id: v.id,
          registration_number: v.registration_number,
          make: v.make,
          model: v.model,
          total_trips: 0,
          revenue: 0,
          expenses: 0,
          profit: 0,
          margin_pct: 0,
        };
      }

      const tripsByVehicle: Record<string, string[]> = {};
      for (const t of tripRes.data ?? []) {
        if (!vMap[t.vehicle_id]) continue;
        vMap[t.vehicle_id].total_trips++;
        if (t.status === "completed")
          vMap[t.vehicle_id].revenue += parseFloat(t.freight_amount || 0);
        if (!tripsByVehicle[t.vehicle_id]) tripsByVehicle[t.vehicle_id] = [];
        tripsByVehicle[t.vehicle_id].push(t.id);
      }

      const expMap = await expensesByTrip(
        Object.values(tripsByVehicle).flat(),
        uid
      );
      for (const [vid, ids] of Object.entries(tripsByVehicle)) {
        const exp = ids.reduce((s, id) => s + (expMap[id] || 0), 0);
        vMap[vid].expenses = exp;
        vMap[vid].profit = vMap[vid].revenue - exp;
        vMap[vid].margin_pct =
          vMap[vid].revenue > 0
            ? Math.round((vMap[vid].profit / vMap[vid].revenue) * 100)
            : 0;
      }

      return ok(
        Object.values(vMap).sort((a: any, b: any) => b.profit - a.profit)
      );
    } catch (e) {
      return fail(e);
    }
  },

  async getDailySummary(): Promise<ServiceResponse<any>> {
    try {
      const uid = getUid();
      const today = new Date().toISOString().slice(0, 10);
      const [activeRes, plannedRes, completedRes] = await Promise.all([
        supabase
          .from("trips")
          .select("id,origin,destination,driver_name,vehicles(registration_number)")
          .eq("owner_id", uid)
          .eq("status", "in_progress"),
        supabase
          .from("trips")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", uid)
          .eq("status", "planned"),
        supabase
          .from("trips")
          .select("id,freight_amount")
          .eq("owner_id", uid)
          .eq("status", "completed")
          .eq("end_date", today),
      ]);

      const active_trips = (activeRes.data ?? []).map((t: any) => ({
        reg_number: (t.vehicles as any)?.registration_number ?? "—",
        origin: t.origin,
        destination: t.destination,
        driver_name: t.driver_name,
      }));

      const completedToday = completedRes.data ?? [];
      const revenue_today = completedToday.reduce(
        (s: number, t: any) => s + parseFloat(t.freight_amount || 0),
        0
      );

      // Compliance alerts: expiring within 30 days
      const in30 = new Date();
      in30.setDate(in30.getDate() + 30);
      const compRes = await supabase
        .from("insurance_policies")
        .select("policy_type,expiry_date,vehicles(registration_number)")
        .eq("owner_id", uid)
        .lte("expiry_date", in30.toISOString().slice(0, 10))
        .gte("expiry_date", today);

      const compliance_alerts = (compRes.data ?? []).map((p: any) => {
        const daysLeft = Math.floor(
          (new Date(p.expiry_date).getTime() - Date.now()) / 86_400_000
        );
        return {
          severity: daysLeft <= 7 ? "critical" : "warning",
          title: `${(p.vehicles as any)?.registration_number ?? "?"} ${p.policy_type} expires in ${daysLeft}d`,
        };
      });

      return ok({
        active_trips,
        planned_trips_count: plannedRes.count ?? 0,
        completed_today: completedToday.length,
        revenue_today,
        compliance_alerts,
      });
    } catch (e) {
      return fail(e);
    }
  },

  async getAuthService(): Promise<ServiceResponse<any>> {
    try {
      const uid = getUid();
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", uid)
        .single();
      if (error) throw error;
      return ok(data);
    } catch (e) {
      return fail(e);
    }
  },

  async updateProfile(updates: {
    name?: string;
    org_name?: string;
    phone?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", getUid())
        .select()
        .single();
      if (error) throw error;
      return ok(data);
    } catch (e) {
      return fail(e);
    }
  },
};
