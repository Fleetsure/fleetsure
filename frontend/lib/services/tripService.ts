import { supabase } from "@/lib/supabase";
import { query, getUid } from "./_base";
import type { Trip, Expense, ServiceResponse } from "@/lib/types";

export const tripService = {
  async getAll(limit = 200): Promise<ServiceResponse<Trip[]>> {
    const uid = getUid();
    return query(
      supabase.from("trips").select("*").eq("owner_id", uid).order("start_date", { ascending: false }).limit(limit)
    );
  },

  async getById(id: string): Promise<ServiceResponse<Trip>> {
    return query(
      supabase.from("trips").select("*, expenses(*)").eq("id", id).eq("owner_id", getUid()).single()
    );
  },

  async create(data: Omit<Trip, "id" | "owner_id" | "status"> & { status?: string }): Promise<ServiceResponse<Trip>> {
    return query(
      supabase.from("trips").insert({ ...data, owner_id: getUid() }).select().single()
    );
  },

  async update(id: string, data: Partial<Trip>): Promise<ServiceResponse<Trip>> {
    return query(
      supabase.from("trips").update(data).eq("id", id).eq("owner_id", getUid()).select().single()
    );
  },

  async getExpenses(tripId: string): Promise<ServiceResponse<Expense[]>> {
    return query(
      supabase.from("expenses").select("*").eq("trip_id", tripId).order("date", { ascending: false })
    );
  },

  async addExpense(tripId: string, data: Omit<Expense, "id" | "trip_id">): Promise<ServiceResponse<Expense>> {
    return query(
      supabase.from("expenses").insert({ ...data, trip_id: tripId }).select().single()
    );
  },
};
