import { supabase } from "@/lib/supabase";
import { query, ok, fail, getUid } from "./_base";
import type { ServiceResponse, TeamMember } from "@/lib/types";
import type { Database } from "@/lib/database.types";

export type { TeamMember };

type TripInsert = Database["public"]["Tables"]["trips"]["Insert"];
type TripUpdate = Database["public"]["Tables"]["trips"]["Update"];
type TripStatus = Database["public"]["Enums"]["tripstatus"];
type VehicleIssueInsert = Database["public"]["Tables"]["vehicle_issues"]["Insert"];
type VehicleIssueUpdate = Database["public"]["Tables"]["vehicle_issues"]["Update"];
type DriverInsert = Database["public"]["Tables"]["drivers"]["Insert"];
type DriverUpdate = Database["public"]["Tables"]["drivers"]["Update"];
type VehicleInsert = Database["public"]["Tables"]["vehicles"]["Insert"];
type VehicleUpdate = Database["public"]["Tables"]["vehicles"]["Update"];
type FuelLogInsert = Database["public"]["Tables"]["fuel_logs"]["Insert"];
type TollLogInsert = Database["public"]["Tables"]["toll_logs"]["Insert"];
type MiscExpenseInsert = Database["public"]["Tables"]["misc_expenses"]["Insert"];
type DriverPaymentInsert = Database["public"]["Tables"]["driver_payments"]["Insert"];

// ── Owner operations (called from Settings page) ──────────────────────────────

export const teamService = {
  async getMembers(): Promise<ServiceResponse<TeamMember[]>> {
    return query(
      supabase.from("team_members").select("*").eq("owner_id", getUid()).eq("is_active", true).order("created_at")
    );
  },

  async addMember(data: Pick<TeamMember, "email" | "name" | "role" | "job_title" | "phone">): Promise<ServiceResponse<TeamMember>> {
    return query(
      supabase.from("team_members").insert({ ...data, owner_id: getUid() }).select().single()
    );
  },

  async removeMember(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("team_members").delete().eq("id", id).eq("owner_id", getUid())
    );
  },

  // ── Team member self-lookup (called on login) ───────────────────────────────

  async getMyProfile(): Promise<ServiceResponse<TeamMember>> {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    if (error) return fail(error);
    if (!data)  return fail({ message: "No team member account found for this email." });
    return ok(data as TeamMember);
  },

  async linkFirebaseUid(memberId: string, uid: string): Promise<ServiceResponse<null>> {
    const { error } = await supabase
      .from("team_members")
      .update({ firebase_uid: uid })
      .eq("id", memberId)
      .is("firebase_uid", null);
    return error ? fail(error) : ok(null);
  },

  // ── Data queries (shared by manager + accountant) ───────────────────────────

  async getTrips(filters: { status?: TripStatus; from?: string; to?: string } = {}): Promise<ServiceResponse<any[]>> {
    let q = supabase
      .from("trips")
      .select("*, vehicles(registration_number, make, model), drivers(name, phone)")
      .order("start_date", { ascending: false })
      .limit(500);
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.from)   q = q.gte("start_date", filters.from);
    if (filters.to)     q = q.lte("start_date", filters.to);
    return query(q);
  },

  async addTrip(data: TripInsert): Promise<ServiceResponse<any>> {
    return query(supabase.from("trips").insert(data).select().single());
  },

  async updateTrip(id: string, data: TripUpdate): Promise<ServiceResponse<null>> {
    return query(supabase.from("trips").update(data).eq("id", id));
  },

  async updateTripStatus(id: string, status: TripStatus): Promise<ServiceResponse<null>> {
    return query(supabase.from("trips").update({ status }).eq("id", id));
  },

  async getVehicles(): Promise<ServiceResponse<any[]>> {
    return query(supabase.from("vehicles").select("*").order("registration_number"));
  },

  async getDrivers(): Promise<ServiceResponse<any[]>> {
    return query(supabase.from("drivers").select("*").order("name"));
  },

  async getExpenses(filters: { from?: string; to?: string; trip_id?: string } = {}): Promise<ServiceResponse<any[]>> {
    const [expRes, fuelRes, tollRes, miscRes] = await Promise.all([
      supabase.from("expenses").select("*, trips(origin,destination,vehicles(registration_number))").order("date", { ascending: false }).limit(300),
      supabase.from("fuel_logs").select("*, vehicles(registration_number), trips(origin,destination)").order("date", { ascending: false }).limit(300),
      supabase.from("toll_logs").select("*, vehicles(registration_number), trips(origin,destination)").order("date", { ascending: false }).limit(300),
      supabase.from("misc_expenses").select("*, vehicles(registration_number), trips(origin,destination)").order("date", { ascending: false }).limit(300),
    ]);
    const all = [
      ...(expRes.data  ?? []).map((e: any) => ({ ...e, _cat: e.expense_type, _table: "expense"  })),
      ...(fuelRes.data ?? []).map((e: any) => ({ ...e, _cat: "Fuel",         _table: "fuel"     })),
      ...(tollRes.data ?? []).map((e: any) => ({ ...e, _cat: "Toll",         _table: "toll"     })),
      ...(miscRes.data ?? []).map((e: any) => ({ ...e, _cat: e.category,     _table: "misc"     })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    return ok(all);
  },

  async getVehicleIssues(): Promise<ServiceResponse<any[]>> {
    return query(
      supabase.from("vehicle_issues")
        .select("*, vehicles(registration_number), drivers(name, phone)")
        .order("created_at", { ascending: false })
    );
  },

  async updateIssueStatus(id: string, status: string): Promise<ServiceResponse<null>> {
    return query(supabase.from("vehicle_issues").update({ status }).eq("id", id));
  },

  async addIssue(data: Omit<VehicleIssueInsert, "status">): Promise<ServiceResponse<any>> {
    return query(supabase.from("vehicle_issues").insert({ ...data, status: "open" }).select().single());
  },

  async updateIssue(id: string, data: VehicleIssueUpdate): Promise<ServiceResponse<null>> {
    return query(supabase.from("vehicle_issues").update(data).eq("id", id));
  },

  async addDriver(data: DriverInsert): Promise<ServiceResponse<any>> {
    return query(supabase.from("drivers").insert(data).select().single());
  },

  async updateDriver(id: string, data: DriverUpdate): Promise<ServiceResponse<null>> {
    return query(supabase.from("drivers").update(data).eq("id", id));
  },

  async addVehicle(data: VehicleInsert): Promise<ServiceResponse<any>> {
    return query(supabase.from("vehicles").insert(data).select().single());
  },

  async updateVehicle(id: string, data: VehicleUpdate): Promise<ServiceResponse<null>> {
    return query(supabase.from("vehicles").update(data).eq("id", id));
  },

  async addFuelLog(data: FuelLogInsert): Promise<ServiceResponse<any>> {
    return query(supabase.from("fuel_logs").insert(data).select().single());
  },

  async addTollLog(data: TollLogInsert): Promise<ServiceResponse<any>> {
    return query(supabase.from("toll_logs").insert(data).select().single());
  },

  async addMiscExpense(data: MiscExpenseInsert): Promise<ServiceResponse<any>> {
    return query(supabase.from("misc_expenses").insert(data).select().single());
  },

  async getDriverPayments(filters: { driver_id?: string } = {}): Promise<ServiceResponse<any[]>> {
    let q = supabase
      .from("driver_payments")
      .select("*, drivers(name, phone)")
      .order("date", { ascending: false })
      .limit(300);
    if (filters.driver_id) q = q.eq("driver_id", filters.driver_id);
    return query(q);
  },

  async addDriverPayment(data: DriverPaymentInsert): Promise<ServiceResponse<any>> {
    return query(supabase.from("driver_payments").insert(data).select().single());
  },

  // ── Analytics (for accountant dashboard) ───────────────────────────────────

  async getFinancialSummary(days = 30): Promise<ServiceResponse<{
    totalRevenue: number; totalExpenses: number; netProfit: number; tripCount: number;
    monthlyData: { month: string; revenue: number; expenses: number }[];
    expenseBreakdown: { category: string; amount: number; pct: number }[];
  }>> {
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    const [tripRes, expRes, fuelRes, tollRes, miscRes] = await Promise.all([
      supabase.from("trips").select("id, freight_amount, start_date, status").gte("start_date", since),
      supabase.from("expenses").select("amount, expense_type, date").gte("date", since),
      supabase.from("fuel_logs").select("amount, date").gte("date", since),
      supabase.from("toll_logs").select("amount, date").gte("date", since),
      supabase.from("misc_expenses").select("amount, category, date").gte("date", since),
    ]);

    const trips     = tripRes.data  ?? [];
    const expenses  = expRes.data   ?? [];
    const fuels     = fuelRes.data  ?? [];
    const tolls     = tollRes.data  ?? [];
    const miscs     = miscRes.data  ?? [];

    const totalRevenue  = trips.reduce((s: number, t: any) => s + Number(t.freight_amount), 0);
    const allExp        = [...expenses.map((e: any) => ({ amount: Number(e.amount), cat: e.expense_type })),
                           ...fuels.map((e: any)    => ({ amount: Number(e.amount), cat: "Fuel"          })),
                           ...tolls.map((e: any)    => ({ amount: Number(e.amount), cat: "Toll"          })),
                           ...miscs.map((e: any)    => ({ amount: Number(e.amount), cat: e.category      }))];
    const totalExpenses = allExp.reduce((s, e) => s + e.amount, 0);

    // Expense breakdown by category
    const catMap = new Map<string, number>();
    allExp.forEach(e => catMap.set(e.cat, (catMap.get(e.cat) ?? 0) + e.amount));
    const expenseBreakdown = Array.from(catMap.entries())
      .map(([category, amount]) => ({ category, amount, pct: totalExpenses > 0 ? Math.round(amount / totalExpenses * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);

    // Monthly revenue vs expense (last 6 months)
    const monthMap = new Map<string, { revenue: number; expenses: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      monthMap.set(d.toISOString().slice(0, 7), { revenue: 0, expenses: 0 });
    }
    trips.forEach((t: any) => {
      const m = (t.start_date as string).slice(0, 7);
      if (monthMap.has(m)) monthMap.get(m)!.revenue += Number(t.freight_amount);
    });
    [...expenses, ...fuels, ...tolls, ...miscs].forEach((e: any) => {
      const m = (e.date as string).slice(0, 7);
      if (monthMap.has(m)) monthMap.get(m)!.expenses += Number(e.amount);
    });
    const monthlyData = Array.from(monthMap.entries()).map(([month, v]) => ({ month, ...v }));

    return ok({ totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses, tripCount: trips.length, monthlyData, expenseBreakdown });
  },
};
