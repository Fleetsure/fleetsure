import { supabase } from "../supabase";
import { ok, fail, getUid, scopeToFirm } from "./_base";
import type { ServiceResponse } from "../types";

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

// Total expense amount per trip_id (legacy expenses + fuel/toll/misc logs).
async function expensesByTrip(tripIds: string[]): Promise<Record<string, number>> {
  if (!tripIds.length) return {};
  const uid = getUid();
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

// Total expense amount per category, across a set of trips (legacy
// expense_type + fuel/toll + misc category). tyre_logs has no trip_id
// (vehicle-level, not trip-level) so it's excluded here — matches web.
async function expensesByCategory(tripIds: string[]): Promise<Record<string, number>> {
  if (!tripIds.length) return {};
  const uid = getUid();
  const totals: Record<string, number> = {};
  const add = (cat: string, amt: number) => { totals[cat] = (totals[cat] || 0) + amt; };

  const [exps, fuels, tolls, misc] = await Promise.all([
    supabase.from("expenses").select("expense_type,amount").in("trip_id", tripIds),
    scopeToFirm(supabase.from("fuel_logs").select("amount").eq("owner_id", uid)).in("trip_id", tripIds),
    scopeToFirm(supabase.from("toll_logs").select("amount").eq("owner_id", uid)).in("trip_id", tripIds),
    scopeToFirm(supabase.from("misc_expenses").select("category,amount").eq("owner_id", uid)).in("trip_id", tripIds),
  ]);
  for (const e of exps.data || []) add(e.expense_type, e.amount);
  for (const e of fuels.data || []) add("fuel", e.amount);
  for (const e of tolls.data || []) add("toll", e.amount);
  for (const e of misc.data || []) add(e.category || "other", e.amount);
  return totals;
}

export const analyticsService = {
  // Powers the Home dashboard's 4 stat cards + AnalyticsScreen's KPI row.
  async getOverview(days = 30): Promise<ServiceResponse<any>> {
    try {
      const uid  = getUid();
      const from = cutoff(days);

      const [tripRes, vehicleRes, driverRes, activeRes] = await Promise.all([
        scopeToFirm(supabase.from("trips").select("id,status,freight_amount,vehicle_id,distance_km")
          .eq("owner_id", uid)).gte("start_date", from),
        scopeToFirm(supabase.from("vehicles").select("id").eq("owner_id", uid)),
        scopeToFirm(supabase.from("drivers").select("id,status").eq("owner_id", uid)),
        scopeToFirm(supabase.from("trips").select("vehicle_id").eq("owner_id", uid)).eq("status", "in_progress"),
      ]);

      const trips = tripRes.data || [];
      const totalRevenue = trips.filter((t: any) => t.status === "completed")
        .reduce((s: number, t: any) => s + parseFloat(t.freight_amount || 0), 0);
      const totalKm = trips.reduce((s: number, t: any) => s + (t.distance_km || 0), 0);
      const activeVehicleIds = new Set((activeRes.data || []).map((r: any) => r.vehicle_id));

      // Expenses are summed over every trip in the window, not just
      // completed ones — a planned/in-progress trip can already have fuel
      // logged against it, and that spend is real regardless of trip status.
      const expenseTotals = await expensesByTrip(trips.map((t: any) => t.id));
      const totalExpenses = Object.values(expenseTotals).reduce((s, v) => s + v, 0);
      const netProfit = totalRevenue - totalExpenses;
      const totalVehicles = (vehicleRes.data || []).length;

      return ok({
        total_vehicles: totalVehicles,
        active_vehicles: activeVehicleIds.size,
        total_drivers: (driverRes.data || []).length,
        drivers_on_leave: (driverRes.data || []).filter((d: any) => d.status === "inactive").length,
        total_trips: trips.length,
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_profit: netProfit,
        margin_pct: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0,
        total_km: totalKm,
        avg_cost_per_km: totalKm > 0 ? Math.round(totalExpenses / totalKm) : 0,
        utilization_pct: totalVehicles > 0 ? Math.round((activeVehicleIds.size / totalVehicles) * 100) : 0,
      });
    } catch (e) { return fail(e); }
  },

  // Powers the Home dashboard's "Profit & Loss per Truck" cards + AnalyticsScreen's vehicle table.
  async getVehicles(days = 30): Promise<ServiceResponse<any>> {
    try {
      const uid  = getUid();
      const from = cutoff(days);

      const [tripRes, vehicleRes] = await Promise.all([
        scopeToFirm(supabase.from("trips").select("id,status,freight_amount,vehicle_id,distance_km")
          .eq("owner_id", uid)).gte("start_date", from),
        scopeToFirm(supabase.from("vehicles").select("id,registration_number,make,model,status").eq("owner_id", uid)),
      ]);

      const vMap: Record<string, any> = {};
      for (const v of vehicleRes.data || []) {
        vMap[v.id] = {
          vehicle_id: v.id, registration_number: v.registration_number, make: v.make, model: v.model, status: v.status,
          total_trips: 0, completed_trips: 0, revenue: 0, expenses: 0, profit: 0, margin_pct: 0, total_km: 0, cost_per_km: 0,
        };
      }

      const tripsByVehicle: Record<string, string[]> = {};
      for (const t of tripRes.data || []) {
        if (!vMap[t.vehicle_id]) continue;
        vMap[t.vehicle_id].total_trips += 1;
        vMap[t.vehicle_id].total_km += (t.distance_km || 0);
        if (t.status === "completed") {
          vMap[t.vehicle_id].completed_trips += 1;
          vMap[t.vehicle_id].revenue += (t.freight_amount || 0);
        }
        if (!tripsByVehicle[t.vehicle_id]) tripsByVehicle[t.vehicle_id] = [];
        tripsByVehicle[t.vehicle_id].push(t.id);
      }

      await Promise.all(Object.entries(tripsByVehicle).map(async ([vid, ids]) => {
        const perTrip = await expensesByTrip(ids);
        const total = Object.values(perTrip).reduce((s, v) => s + v, 0);
        vMap[vid].expenses    = total;
        vMap[vid].profit      = vMap[vid].revenue - total;
        vMap[vid].margin_pct  = vMap[vid].revenue > 0 ? Math.round((vMap[vid].profit / vMap[vid].revenue) * 100) : 0;
        vMap[vid].cost_per_km = vMap[vid].total_km > 0 ? Math.round(total / vMap[vid].total_km) : 0;
      }));

      const vehicles = Object.values(vMap).sort((a: any, b: any) => b.profit - a.profit);
      return ok({ vehicles });
    } catch (e) { return fail(e); }
  },

  // Powers AnalyticsScreen's "Monthly P&L" — last 6 months.
  async getMonthly(): Promise<ServiceResponse<any[]>> {
    try {
      const uid = getUid();
      const from = cutoff(180);
      const tripRes = await scopeToFirm(supabase.from("trips").select("id,status,freight_amount,start_date")
        .eq("owner_id", uid)).gte("start_date", from);
      const trips = tripRes.data || [];

      const byMonth: Record<string, { revenue: number; tripIds: string[] }> = {};
      for (const t of trips) {
        const key = t.start_date.slice(0, 7);
        if (!byMonth[key]) byMonth[key] = { revenue: 0, tripIds: [] };
        if (t.status === "completed") byMonth[key].revenue += t.freight_amount || 0;
        byMonth[key].tripIds.push(t.id);
      }

      const months = Object.keys(byMonth).sort();
      const result = await Promise.all(months.map(async (key) => {
        const perTrip = await expensesByTrip(byMonth[key].tripIds);
        const expenses = Object.values(perTrip).reduce((s, v) => s + v, 0);
        return { month: key, revenue: byMonth[key].revenue, expenses, net: byMonth[key].revenue - expenses };
      }));
      return ok(result);
    } catch (e) { return fail(e); }
  },

  // Powers AnalyticsScreen's expense-category breakdown.
  async getExpenses(days = 30): Promise<ServiceResponse<{ category: string; label: string; amount: number; pct: number }[]>> {
    try {
      const uid = getUid();
      const from = cutoff(days);
      const tripRes = await scopeToFirm(supabase.from("trips").select("id").eq("owner_id", uid)).gte("start_date", from);
      const tripIds = (tripRes.data || []).map((t: any) => t.id);

      const catTotals = await expensesByCategory(tripIds);
      const total = Object.values(catTotals).reduce((s, v) => s + v, 0);

      const categories = Object.entries(catTotals)
        .map(([cat, amount]) => ({
          category: cat,
          label: EXPENSE_LABELS[cat] || cat,
          amount: Math.round(amount),
          pct: total > 0 ? Math.round((amount / total) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      return ok(categories);
    } catch (e) { return fail(e); }
  },

  // Powers AnalyticsScreen's "Trip P&L" tab.
  async getTripProfitability(days = 30): Promise<ServiceResponse<any[]>> {
    try {
      const uid = getUid();
      const from = cutoff(days);
      const [tripRes, vehicleRes] = await Promise.all([
        scopeToFirm(supabase.from("trips").select("id,origin,destination,driver_name,vehicle_id,freight_amount,status,start_date")
          .eq("owner_id", uid)).gte("start_date", from).order("start_date", { ascending: false }),
        scopeToFirm(supabase.from("vehicles").select("id,registration_number").eq("owner_id", uid)),
      ]);
      const vMap: Record<string, string> = {};
      for (const v of vehicleRes.data || []) vMap[v.id] = v.registration_number;

      const trips = tripRes.data || [];
      const expenseTotals = await expensesByTrip(trips.map((t: any) => t.id));
      const rows = trips.map((t: any) => {
        const expenses = expenseTotals[t.id] || 0;
        const revenue = t.freight_amount || 0;
        const profit = revenue - expenses;
        return {
          trip_id: t.id, origin: t.origin, destination: t.destination, driver_name: t.driver_name,
          registration_number: vMap[t.vehicle_id] ?? "—", status: t.status, start_date: t.start_date,
          revenue, expenses, profit, margin_pct: revenue > 0 ? Math.round((profit / revenue) * 100) : 0,
        };
      });
      return ok(rows);
    } catch (e) { return fail(e); }
  },

  // Powers AnalyticsScreen's "By Driver" tab.
  async getDriverSummary(days = 30): Promise<ServiceResponse<any[]>> {
    try {
      const uid = getUid();
      const from = cutoff(days);
      const tripRes = await scopeToFirm(supabase.from("trips").select("id,driver_id,driver_name,freight_amount,status")
        .eq("owner_id", uid)).gte("start_date", from);
      const trips = tripRes.data || [];

      const byDriver: Record<string, { driver_name: string; trips: number; completed: number; revenue: number; tripIds: string[] }> = {};
      for (const t of trips) {
        const key = t.driver_id ?? t.driver_name;
        if (!byDriver[key]) byDriver[key] = { driver_name: t.driver_name, trips: 0, completed: 0, revenue: 0, tripIds: [] };
        byDriver[key].trips += 1;
        byDriver[key].tripIds.push(t.id);
        if (t.status === "completed") {
          byDriver[key].completed += 1;
          byDriver[key].revenue += t.freight_amount || 0;
        }
      }

      const entries = Object.entries(byDriver);
      const result = await Promise.all(entries.map(async ([driverId, d]) => {
        const perTrip = await expensesByTrip(d.tripIds);
        const expenses = Object.values(perTrip).reduce((s, v) => s + v, 0);
        return {
          driver_id: driverId, driver_name: d.driver_name, total_trips: d.trips, completed_trips: d.completed,
          revenue: d.revenue, expenses, profit: d.revenue - expenses,
          avg_freight: d.completed > 0 ? Math.round(d.revenue / d.completed) : 0,
        };
      }));
      return ok(result.sort((a, b) => b.revenue - a.revenue));
    } catch (e) { return fail(e); }
  },
};
