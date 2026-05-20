import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { ok, fail, getUid } from "./_base";
import type { ServiceResponse } from "@/lib/types";

export const analyticsService = {
  async getOverview(days = 30): Promise<ServiceResponse<any>> {
    try { return ok((await api.get("/analytics/overview", { params: { days } })).data); }
    catch (e) { return fail(e); }
  },

  async getMonthly(): Promise<ServiceResponse<any>> {
    try { return ok((await api.get("/analytics/monthly")).data); }
    catch (e) { return fail(e); }
  },

  async getVehicles(days = 30): Promise<ServiceResponse<any>> {
    try { return ok((await api.get("/analytics/vehicles", { params: { days } })).data); }
    catch (e) { return fail(e); }
  },

  async getExpenses(days = 30): Promise<ServiceResponse<any>> {
    try { return ok((await api.get("/analytics/expenses", { params: { days } })).data); }
    catch (e) { return fail(e); }
  },

  async getDailySummary(): Promise<ServiceResponse<any>> {
    try { return ok((await api.get("/analytics/daily-summary")).data); }
    catch (e) { return fail(e); }
  },

  async getVehiclePnL(): Promise<ServiceResponse<any[]>> {
    const { data, error } = await supabase
      .from("trips")
      .select("vehicle_id, vehicles(registration_number), freight_amount, status, expenses(amount)")
      .eq("owner_id", getUid());
    if (error) return fail(error.message);
    // Aggregate per vehicle
    const map: Record<string, any> = {};
    for (const t of (data || [])) {
      const vid = t.vehicle_id;
      if (!vid) continue;
      if (!map[vid]) {
        map[vid] = {
          vehicle_id: vid,
          reg_number: (t.vehicles as any)?.registration_number || vid,
          total_revenue: 0,
          total_expenses: 0,
          profit: 0,
        };
      }
      if (t.status === "completed") {
        map[vid].total_revenue += parseFloat(t.freight_amount || 0);
      }
      for (const exp of (t.expenses as any[] || [])) {
        map[vid].total_expenses += parseFloat(exp.amount || 0);
      }
    }
    const result = Object.values(map).map(v => ({
      ...v,
      profit: v.total_revenue - v.total_expenses,
    })).sort((a, b) => a.profit - b.profit);
    return ok(result);
  },
};
