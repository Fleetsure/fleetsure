import { supabase } from "@/lib/supabase";
import { query, ok, fail, getUid, getFirmId, scopeToFirm } from "./_base";
import { documentService } from "./documentService";
import type { Driver, DriverPayment, DriverExpense, DriverSalary, Trip, ServiceResponse } from "@/lib/types";
import type { Database } from "@/lib/database.types";

const DRIVER_DOC_LABELS: Record<string, string> = {
  license: "Driving Licence",
  aadhaar_front: "Aadhaar (Front)",
  aadhaar_back: "Aadhaar (Back)",
  pan: "PAN Card",
  photo: "Profile Photo",
};

type DriverInsert = Database["public"]["Tables"]["drivers"]["Insert"];
type DriverUpdate = Database["public"]["Tables"]["drivers"]["Update"];
type DriverPaymentInsert = Database["public"]["Tables"]["driver_payments"]["Insert"];
type DriverSalaryInsert = Database["public"]["Tables"]["driver_salary"]["Insert"];

export type DriverLedger = {
  payments: DriverPayment[];
  total_paid: number;
  total_deducted: number;
  net_balance: number;
};

export const driverService = {
  async getAll(): Promise<ServiceResponse<Driver[]>> {
    const uid = getUid();
    return query(
      scopeToFirm(supabase.from("drivers").select("*").eq("owner_id", uid)).order("name")
    );
  },

  async create(data: Omit<DriverInsert, "owner_id">): Promise<ServiceResponse<Driver>> {
    return query(
      supabase.from("drivers").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single()
    );
  },

  async update(id: string, data: DriverUpdate): Promise<ServiceResponse<Driver>> {
    return query(
      supabase.from("drivers").update(data).eq("id", id).eq("owner_id", getUid()).select().single()
    );
  },

  async getPayments(driver_id?: string): Promise<ServiceResponse<DriverPayment[]>> {
    const uid = getUid();
    const q = scopeToFirm(supabase.from("driver_payments").select("*").eq("owner_id", uid)).order("date", { ascending: false });
    return query(driver_id ? q.eq("driver_id", driver_id) : q);
  },

  async getPaymentsForTrip(tripId: string): Promise<ServiceResponse<DriverPayment[]>> {
    const uid = getUid();
    return query(
      supabase.from("driver_payments").select("*").eq("trip_id", tripId).eq("owner_id", uid)
    );
  },

  // Pre-existing bug fix: this used to return a bare DriverPayment[], but
  // DriverLedgerModal reads .total_paid/.total_deducted/.net_balance/
  // .payments off the result — which meant opening the ledger threw
  // (undefined.toLocaleString()). Now computes and returns that shape.
  async getLedger(driver_id: string): Promise<ServiceResponse<DriverLedger>> {
    const res = await query<DriverPayment[]>(
      supabase.from("driver_payments").select("*").eq("driver_id", driver_id).eq("owner_id", getUid()).order("date", { ascending: false })
    );
    if (!res.success) return res as unknown as ServiceResponse<DriverLedger>;
    const payments = res.data ?? [];
    const total_paid = payments.filter(p => p.type !== "deduction").reduce((s, p) => s + Number(p.amount), 0);
    const total_deducted = payments.filter(p => p.type === "deduction").reduce((s, p) => s + Number(p.amount), 0);
    return ok({ payments, total_paid, total_deducted, net_balance: total_paid - total_deducted });
  },

  async addPayment(data: Omit<DriverPaymentInsert, "owner_id">): Promise<ServiceResponse<DriverPayment>> {
    return query(
      supabase.from("driver_payments").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single()
    );
  },

  async deletePayment(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("driver_payments").delete().eq("id", id).eq("owner_id", getUid())
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    const uid = getUid();
    // documents.linked_id has no real FK (it's polymorphic across
    // vehicles/drivers/trips), so deleting a driver never cascades to their
    // documents on its own — clean those up explicitly first, best-effort,
    // or they become permanently orphaned: still visible under "All" but
    // unreachable via the driver filter on the Documents page forever,
    // since that filter can only ever match a currently-existing driver.
    await supabase.from("documents").delete().eq("owner_id", uid).eq("linked_type", "driver").eq("linked_id", id);
    return query(
      supabase.from("drivers").delete().eq("id", id).eq("owner_id", uid)
    );
  },

  // ── Profile documents ────────────────────────────────────────────────────
  // Uploads to the shared fleet-documents bucket and returns a public URL,
  // then logs the upload into the Documents Portal (documents table) tagged
  // to this driver. `expiryDate` is only meaningful for the licence upload.
  async uploadDriverDocument(file: File, driverId: string, docType: string, expiryDate?: string | null): Promise<ServiceResponse<string>> {
    const uid = getUid();
    const uploadRes = await documentService.upload(file, uid, `drivers/${driverId}`);
    if (!uploadRes.success || !uploadRes.data) return uploadRes;
    await documentService.logDocument({
      ownerId: uid,
      name: DRIVER_DOC_LABELS[docType] || docType,
      category: "Driver Documents",
      file_url: uploadRes.data,
      linked_type: "driver",
      linked_id: driverId,
      expiry_date: expiryDate ?? null,
    });
    return uploadRes;
  },

  // ── Trip history ─────────────────────────────────────────────────────────
  async getDriverTrips(driverId: string): Promise<ServiceResponse<Trip[]>> {
    const uid = getUid();
    return query(
      supabase.from("trips").select("*").eq("driver_id", driverId).eq("owner_id", uid).order("start_date", { ascending: false })
    );
  },

  // ── Advance & expense claims ─────────────────────────────────────────────
  async getDriverExpenses(driverId: string): Promise<ServiceResponse<DriverExpense[]>> {
    const uid = getUid();
    return query(
      supabase.from("driver_expenses").select("*").eq("driver_id", driverId).eq("owner_id", uid).order("created_at", { ascending: false })
    );
  },

  // Sums a trip's real expense total the same way the Trip Sheet does
  // (fuel_logs + toll_logs + misc_expenses + expenses) — this is the same
  // number as "Total Expenses" on frontend/app/trips/page.tsx, so the
  // Driver Account tracker and the Trip Sheet never disagree.
  async getTripsExpenseTotals(tripIds: string[]): Promise<ServiceResponse<Record<string, number>>> {
    if (tripIds.length === 0) return ok({});
    const uid = getUid();
    const [fuelRes, tollRes, miscRes, expRes] = await Promise.all([
      query<{ trip_id: string | null; amount: number }[]>(supabase.from("fuel_logs").select("trip_id, amount").in("trip_id", tripIds)),
      query<{ trip_id: string | null; amount: number }[]>(supabase.from("toll_logs").select("trip_id, amount").in("trip_id", tripIds)),
      query<{ trip_id: string | null; amount: number }[]>(supabase.from("misc_expenses").select("trip_id, amount").eq("owner_id", uid).in("trip_id", tripIds)),
      query<{ trip_id: string | null; amount: number }[]>(supabase.from("expenses").select("trip_id, amount").in("trip_id", tripIds)),
    ]);
    const totals: Record<string, number> = {};
    const addAll = (res: ServiceResponse<{ trip_id: string | null; amount: number }[]>) => {
      if (!res.success) return;
      (res.data ?? []).forEach(r => { if (!r.trip_id) return; totals[r.trip_id] = (totals[r.trip_id] ?? 0) + Number(r.amount); });
    };
    addAll(fuelRes); addAll(tollRes); addAll(miscRes); addAll(expRes);
    return ok(totals);
  },

  // Approving a claim also records it as a real trip expense (a
  // misc_expenses row) so it counts toward the trip's actual "Total
  // Expenses" — previously an approved claim only lived in driver_expenses,
  // disconnected from the number shown on the Trip Sheet. linked_expense_id
  // makes this idempotent if reviewDriverExpense is ever called twice.
  async reviewDriverExpense(id: string, status: "approved" | "rejected"): Promise<ServiceResponse<DriverExpense>> {
    const uid = getUid();
    if (status === "approved") {
      const claimRes = await query<DriverExpense>(
        supabase.from("driver_expenses").select("*").eq("id", id).eq("owner_id", uid).single()
      );
      const claim = claimRes.data;
      if (claim && !claim.linked_expense_id) {
        const catLabel = claim.category.charAt(0).toUpperCase() + claim.category.slice(1);
        const expRes = await query<{ id: string }>(
          supabase.from("misc_expenses").insert({
            owner_id: uid,
            trip_id: claim.trip_id,
            date: claim.created_at.slice(0, 10),
            amount: claim.amount,
            category: "Driver Expense",
            description: `${catLabel}${claim.note ? ": " + claim.note : ""}`,
          }).select("id").single()
        );
        if (expRes.success && expRes.data) {
          await supabase.from("driver_expenses").update({ linked_expense_id: expRes.data.id }).eq("id", id);
        }
      }
    }
    return query(
      supabase.from("driver_expenses")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", id).eq("owner_id", uid).select().single()
    );
  },

  // Records the leftover-advance-to-salary credit as a driver_payments row
  // (type='settlement') — driver_payments stays the single ledger of
  // driver-money movements; this is not a second, competing record.
  async recordSettlement(driverId: string, tripId: string, amount: number): Promise<ServiceResponse<DriverPayment>> {
    return query(
      supabase.from("driver_payments").insert({
        driver_id: driverId, trip_id: tripId, owner_id: getUid(), firm_id: getFirmId(),
        date: new Date().toISOString().slice(0, 10), type: "settlement", amount,
        notes: "Advance reconciliation — leftover credited to salary",
      }).select().single()
    );
  },

  // ── Monthly salary records ───────────────────────────────────────────────
  async getSalaryRecords(driverId: string): Promise<ServiceResponse<DriverSalary[]>> {
    const uid = getUid();
    return query(
      supabase.from("driver_salary").select("*").eq("driver_id", driverId).eq("owner_id", uid).order("month", { ascending: false })
    );
  },

  // Pre-fill suggestion for "Generate This Month" — sums this driver's trip
  // advances and approved expense claims for trips starting in the given
  // [monthStart, monthEndExclusive) window. Purely a suggestion; the owner
  // reviews/edits before saving via upsertSalaryRecord.
  async computeMonthSuggestion(
    driverId: string, monthStart: string, monthEndExclusive: string
  ): Promise<ServiceResponse<{ advance_given: number; expenses_claimed: number; amount_returned: number }>> {
    const uid = getUid();
    const tripsRes = await query<{ id: string; driver_advance: number | null }[]>(
      supabase.from("trips").select("id, driver_advance").eq("driver_id", driverId).eq("owner_id", uid)
        .gte("start_date", monthStart).lt("start_date", monthEndExclusive)
    );
    if (!tripsRes.success) return tripsRes as unknown as ServiceResponse<{ advance_given: number; expenses_claimed: number; amount_returned: number }>;
    const trips = tripsRes.data ?? [];
    const tripIds = trips.map(t => t.id);
    const advance_given = trips.reduce((s, t) => s + Number(t.driver_advance || 0), 0);

    const totalsRes = await this.getTripsExpenseTotals(tripIds);
    const expenses_claimed = tripIds.reduce((s, id) => s + (totalsRes.data?.[id] ?? 0), 0);
    return ok({ advance_given, expenses_claimed, amount_returned: advance_given - expenses_claimed });
  },

  async upsertSalaryRecord(data: Omit<DriverSalaryInsert, "owner_id">): Promise<ServiceResponse<DriverSalary>> {
    return query(
      supabase.from("driver_salary")
        .upsert({ ...data, owner_id: getUid() }, { onConflict: "driver_id,month" })
        .select().single()
    );
  },

  async markSalaryPaid(id: string): Promise<ServiceResponse<DriverSalary>> {
    return query(
      supabase.from("driver_salary")
        .update({ paid: true, paid_at: new Date().toISOString() })
        .eq("id", id).eq("owner_id", getUid()).select().single()
    );
  },
};
