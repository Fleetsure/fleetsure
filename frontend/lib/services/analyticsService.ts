import { supabase } from "@/lib/supabase";
import { ok, fail, getUid, scopeToFirm } from "./_base";
import type { ServiceResponse } from "@/lib/types";

const cutoff = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const EXPENSE_LABELS: Record<string, string> = {
  fuel: "Fuel (HSD)", toll: "Toll / FASTag", rto: "RTO",
  police_challan: "Police / Naka", maintenance: "Parts & Repairs",
  tyre: "Tyre", oil: "Oil", loading_unloading: "Loading / Unloading",
  driver_payment: "Driver Payment", telephone: "Telephone", other: "Other",
};

// Returns total expense amount keyed by trip_id
async function expensesByTrip(tripIds: string[], uid: string): Promise<Record<string, number>> {
  if (!tripIds.length) return {};
  const perTrip: Record<string, number> = {};
  const add = (tid: string | null, amt: number) => { if (tid) perTrip[tid] = (perTrip[tid] || 0) + amt; };

  const [exps, fuels, tolls, misc] = await Promise.all([
    supabase.from("expenses").select("trip_id,amount").in("trip_id", tripIds),
    scopeToFirm(supabase.from("fuel_logs").select("trip_id,amount").eq("owner_id", uid)).in("trip_id", tripIds),
    scopeToFirm(supabase.from("toll_logs").select("trip_id,amount").eq("owner_id", uid)).in("trip_id", tripIds),
    scopeToFirm(supabase.from("misc_expenses").select("trip_id,amount").eq("owner_id", uid)).in("trip_id", tripIds),
  ]);
  for (const e of [...(exps.data || []), ...(fuels.data || []), ...(tolls.data || []), ...(misc.data || [])])
    add(e.trip_id, e.amount);
  return perTrip;
}

async function sumExpensesForTrips(tripIds: string[]): Promise<Record<string, number>> {
  if (!tripIds.length) return {};
  const uid = getUid();
  const totals: Record<string, number> = {};
  const add = (cat: string, amt: number) => { totals[cat] = (totals[cat] || 0) + amt; };

  // expenses table has no owner_id — scoped by trip_id (trips already filtered by owner)
  // tyre_logs has no trip_id (vehicle-level, not trip-level) — excluded here
  const [exps, fuels, tolls, misc] = await Promise.all([
    supabase.from("expenses").select("expense_type,amount").in("trip_id", tripIds),
    scopeToFirm(supabase.from("fuel_logs").select("amount").eq("owner_id", uid)).in("trip_id", tripIds),
    scopeToFirm(supabase.from("toll_logs").select("amount").eq("owner_id", uid)).in("trip_id", tripIds),
    scopeToFirm(supabase.from("misc_expenses").select("category,amount").eq("owner_id", uid)).in("trip_id", tripIds),
  ]);

  for (const e of exps.data || []) add(e.expense_type, e.amount);
  for (const e of fuels.data || []) add("fuel", e.amount);
  for (const e of tolls.data || []) add("toll", e.amount);
  for (const e of misc.data  || []) add(e.category || "other", e.amount);

  return totals;
}

export const analyticsService = {
  async getOverview(days = 30): Promise<ServiceResponse<any>> {
    try {
      const uid  = getUid();
      const from = cutoff(days);

      const [tripRes, vehicleRes, activeRes] = await Promise.all([
        scopeToFirm(supabase.from("trips").select("id,status,freight_amount,distance_km,vehicle_id")
          .eq("owner_id", uid)).gte("start_date", from),
        scopeToFirm(supabase.from("vehicles").select("id").eq("owner_id", uid)),
        scopeToFirm(supabase.from("trips").select("vehicle_id").eq("owner_id", uid)).eq("status", "in_progress"),
      ]);

      const trips    = tripRes.data || [];
      const vehicles = vehicleRes.data || [];
      const tripIds  = trips.map((t: any) => t.id);

      const totalTrips   = trips.length;
      const totalRevenue = trips.filter((t: any) => t.status === "completed")
        .reduce((s: number, t: any) => s + parseFloat(t.freight_amount || 0), 0);
      const totalKm      = trips.reduce((s: number, t: any) => s + parseFloat(t.distance_km || 0), 0);

      const catTotals    = await sumExpensesForTrips(tripIds);
      const totalExpenses = Object.values(catTotals).reduce((s, v) => s + v, 0);
      const netProfit    = totalRevenue - totalExpenses;
      const marginPct    = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
      const avgCostPerKm = totalKm > 0 ? Math.round(totalExpenses / totalKm) : 0;

      const activeVehicleIds = new Set((activeRes.data || []).map((r: any) => r.vehicle_id));
      const activeVehicles   = activeVehicleIds.size;
      const totalVehicles    = vehicles.length;
      const utilizationPct   = totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0;

      return ok({
        period_days: days, total_trips: totalTrips,
        total_revenue: totalRevenue, total_expenses: totalExpenses,
        net_profit: netProfit, margin_pct: marginPct,
        total_km: totalKm, avg_cost_per_km: avgCostPerKm,
        active_vehicles: activeVehicles, utilization_pct: utilizationPct,
      });
    } catch (e) { return fail(e); }
  },

  async getMonthly(): Promise<ServiceResponse<any>> {
    try {
      const uid  = getUid();
      const from = cutoff(180);
      const { data: trips } = await scopeToFirm(supabase.from("trips")
        .select("id,status,freight_amount,start_date")
        .eq("owner_id", uid)).gte("start_date", from);

      const months: Record<string, { month: string; month_key: string; trips: number; revenue: number; expenses: number; profit: number }> = {};

      for (const t of trips || []) {
        const d   = new Date(t.start_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleString("en-IN", { month: "short", year: "numeric" });
        if (!months[key]) months[key] = { month: label, month_key: key, trips: 0, revenue: 0, expenses: 0, profit: 0 };
        months[key].trips++;
        if (t.status === "completed") months[key].revenue += (t.freight_amount || 0);
      }

      const tripsByMonth: Record<string, string[]> = {};
      for (const t of trips || []) {
        const d   = new Date(t.start_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!tripsByMonth[key]) tripsByMonth[key] = [];
        tripsByMonth[key].push(t.id);
      }

      await Promise.all(Object.entries(tripsByMonth).map(async ([key, ids]) => {
        const cats = await sumExpensesForTrips(ids);
        const total = Object.values(cats).reduce((s, v) => s + v, 0);
        if (months[key]) {
          months[key].expenses = total;
          months[key].profit   = months[key].revenue - total;
        }
      }));

      const result = Object.values(months).sort((a, b) => a.month_key.localeCompare(b.month_key));
      return ok({ months: result });
    } catch (e) { return fail(e); }
  },

  async getVehicles(days = 30): Promise<ServiceResponse<any>> {
    try {
      const uid  = getUid();
      const from = cutoff(days);

      const [tripRes, vehicleRes] = await Promise.all([
        scopeToFirm(supabase.from("trips").select("id,status,freight_amount,distance_km,vehicle_id")
          .eq("owner_id", uid)).gte("start_date", from),
        scopeToFirm(supabase.from("vehicles").select("id,registration_number,make,model").eq("owner_id", uid)),
      ]);

      const vMap: Record<string, any> = {};
      for (const v of vehicleRes.data || []) {
        vMap[v.id] = {
          vehicle_id: v.id, registration_number: v.registration_number, make: v.make, model: v.model,
          total_trips: 0, completed_trips: 0,
          revenue: 0, expenses: 0, profit: 0, margin_pct: 0, total_km: 0, cost_per_km: 0,
        };
      }

      const tripsByVehicle: Record<string, string[]> = {};
      for (const t of tripRes.data || []) {
        if (!vMap[t.vehicle_id]) continue;
        vMap[t.vehicle_id].total_trips++;
        if (t.status === "completed") {
          vMap[t.vehicle_id].completed_trips++;
          vMap[t.vehicle_id].revenue += (t.freight_amount || 0);
        }
        vMap[t.vehicle_id].total_km += (t.distance_km || 0);
        if (!tripsByVehicle[t.vehicle_id]) tripsByVehicle[t.vehicle_id] = [];
        tripsByVehicle[t.vehicle_id].push(t.id);
      }

      await Promise.all(Object.entries(tripsByVehicle).map(async ([vid, ids]) => {
        const cats = await sumExpensesForTrips(ids);
        const total = Object.values(cats).reduce((s, v) => s + v, 0);
        vMap[vid].expenses    = total;
        vMap[vid].profit      = vMap[vid].revenue - total;
        vMap[vid].margin_pct  = vMap[vid].revenue > 0 ? Math.round((vMap[vid].profit / vMap[vid].revenue) * 100) : 0;
        vMap[vid].cost_per_km = vMap[vid].total_km > 0 ? Math.round(total / vMap[vid].total_km) : 0;
      }));

      const vehicles = Object.values(vMap).sort((a, b) => b.profit - a.profit);
      return ok({ vehicles });
    } catch (e) { return fail(e); }
  },

  async getExpenses(days = 30): Promise<ServiceResponse<any>> {
    try {
      const uid  = getUid();
      const from = cutoff(days);
      const { data: trips } = await scopeToFirm(supabase.from("trips")
        .select("id").eq("owner_id", uid)).gte("start_date", from);
      const tripIds = (trips || []).map((t: any) => t.id);

      const catTotals = await sumExpensesForTrips(tripIds);
      const total = Object.values(catTotals).reduce((s, v) => s + v, 0);

      const categories = Object.entries(catTotals)
        .map(([cat, amount]) => ({
          category: cat,
          label: EXPENSE_LABELS[cat] || cat,
          amount: Math.round(amount),
          pct: total > 0 ? Math.round((amount / total) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      return ok({ categories, total });
    } catch (e) { return fail(e); }
  },

  async getVehiclePnL(): Promise<ServiceResponse<any[]>> {
    return analyticsService.getVehicles(365).then(r =>
      r.success ? ok(r.data?.vehicles || []) : fail(r.error)
    );
  },

  async getTripProfitability(days = 30): Promise<ServiceResponse<any>> {
    try {
      const uid  = getUid();
      const from = cutoff(days);
      const [tripRes, vehicleRes] = await Promise.all([
        scopeToFirm(supabase.from("trips")
          .select("id,origin,destination,driver_name,vehicle_id,freight_amount,start_date,status,distance_km")
          .eq("owner_id", uid)).gte("start_date", from).order("start_date", { ascending: false }),
        scopeToFirm(supabase.from("vehicles").select("id,registration_number").eq("owner_id", uid)),
      ]);

      const trips = tripRes.data || [];
      const vMap: Record<string, string> = {};
      for (const v of vehicleRes.data || []) vMap[v.id] = v.registration_number;

      const expMap = await expensesByTrip(trips.map((t: any) => t.id), uid);

      const result = trips.map((t: any) => {
        const freight  = parseFloat(t.freight_amount || 0);
        const expenses = expMap[t.id] || 0;
        const profit   = freight - expenses;
        return {
          id: t.id,
          route: `${t.origin} → ${t.destination}`,
          driver: t.driver_name,
          vehicle: vMap[t.vehicle_id] || "—",
          date: t.start_date,
          status: t.status,
          freight,
          expenses,
          profit,
          margin_pct: freight > 0 ? Math.round((profit / freight) * 100) : 0,
        };
      });

      return ok(result);
    } catch (e) { return fail(e); }
  },

  async getDriverSummary(days = 30): Promise<ServiceResponse<any>> {
    try {
      const uid  = getUid();
      const from = cutoff(days);
      const { data: trips } = await scopeToFirm(supabase.from("trips")
        .select("id,driver_name,freight_amount,status")
        .eq("owner_id", uid)).gte("start_date", from);

      const byDriver: Record<string, any> = {};
      for (const t of trips || []) {
        const name = t.driver_name || "Unknown";
        if (!byDriver[name]) byDriver[name] = { driver: name, trips: 0, completed: 0, revenue: 0, expenses: 0 };
        byDriver[name].trips++;
        if (t.status === "completed") {
          byDriver[name].completed++;
          byDriver[name].revenue += (t.freight_amount || 0);
        }
      }

      const tripIds = (trips || []).map((t: any) => t.id);
      const expMap  = await expensesByTrip(tripIds, uid);

      // Attribute expenses to the driver who ran that trip
      for (const t of trips || []) {
        const name = t.driver_name || "Unknown";
        byDriver[name].expenses = (byDriver[name].expenses || 0) + (expMap[t.id] || 0);
      }

      const result = Object.values(byDriver)
        .map((d: any) => ({ ...d, profit: d.revenue - d.expenses, avg_freight: d.completed > 0 ? Math.round(d.revenue / d.completed) : 0 }))
        .sort((a: any, b: any) => b.revenue - a.revenue);

      return ok(result);
    } catch (e) { return fail(e); }
  },

  async getDailySummary(): Promise<ServiceResponse<any>> {
    try {
      const uid   = getUid();
      const today = new Date().toISOString().slice(0, 10);

      const [activeRes, plannedRes, completedRes, userRes, vehiclesRes] = await Promise.all([
        scopeToFirm(supabase.from("trips")
          .select("id,origin,destination,driver_name,vehicles(registration_number)")
          .eq("owner_id", uid)).eq("status", "in_progress"),
        scopeToFirm(supabase.from("trips")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", uid)).eq("status", "planned"),
        scopeToFirm(supabase.from("trips")
          .select("id,freight_amount")
          .eq("owner_id", uid)).eq("status", "completed").eq("end_date", today),
        supabase.from("users").select("phone").eq("id", uid).single(),
        scopeToFirm(supabase.from("vehicles").select("id,registration_number").eq("owner_id", uid)),
      ]);

      const active_trips = (activeRes.data || []).map((t: any) => ({
        reg_number:  (t.vehicles as any)?.registration_number || "—",
        origin:      t.origin,
        destination: t.destination,
        driver_name: t.driver_name,
      }));

      const completedToday  = completedRes.data || [];
      const completed_today = completedToday.length;
      const revenue_today   = completedToday.reduce((s: number, t: any) => s + parseFloat(t.freight_amount || 0), 0);

      // Compliance: policies expiring within 30 days.
      // No embed here — insurance_policies has no foreign key to vehicles
      // at all, so `vehicles(registration_number)` could never resolve:
      // PostgREST requires a real FK for embeds and returns a 400 when
      // there isn't one. That request isn't wrapped in query()'s try/catch
      // here, so compRes.data just silently came back undefined/empty on
      // every call — compliance_alerts has been silently empty regardless
      // of whether any policies were actually expiring. Same fix as
      // documentService.getAll(): a separate batched lookup instead.
      const in30 = new Date(); in30.setDate(in30.getDate() + 30);
      const compRes = await supabase.from("insurance_policies")
        .select("policy_type,expiry_date,vehicle_id")
        .eq("owner_id", uid)
        .lte("expiry_date", in30.toISOString().slice(0, 10))
        .gte("expiry_date", today);

      const compPolicies = compRes.data || [];
      const compVehicleIds = [...new Set(compPolicies.map((p: any) => p.vehicle_id).filter(Boolean))];
      const compVehiclesRes = compVehicleIds.length
        ? await supabase.from("vehicles").select("id, registration_number").in("id", compVehicleIds)
        : { data: [] as { id: string; registration_number: string }[] };
      const compVehicleMap = new Map((compVehiclesRes.data || []).map((v: any) => [v.id, v.registration_number]));

      const compliance_alerts = compPolicies.map((p: any) => {
        const daysLeft = Math.floor((new Date(p.expiry_date).getTime() - Date.now()) / 86_400_000);
        return {
          severity: daysLeft <= 7 ? "critical" : "warning",
          title: `${compVehicleMap.get(p.vehicle_id) ?? "?"} ${p.policy_type} expires in ${daysLeft}d`,
        };
      });

      // Idle vehicles: no trip in last 14 days
      const recentRes = await scopeToFirm(supabase.from("trips")
        .select("vehicle_id").eq("owner_id", uid)).gte("start_date", cutoff(14));
      const activeIds  = new Set((recentRes.data || []).map((t: any) => t.vehicle_id));
      const idle_vehicles = (vehiclesRes.data || [])
        .filter((v: any) => !activeIds.has(v.id))
        .map((v: any) => ({ registration_number: v.registration_number, idle_days: null }));

      return ok({
        active_trips,
        planned_trips_count: plannedRes.count || 0,
        completed_today,
        revenue_today,
        compliance_alerts,
        idle_vehicles,
        owner_phone: userRes.data?.phone || null,
      });
    } catch (e) { return fail(e); }
  },
};
