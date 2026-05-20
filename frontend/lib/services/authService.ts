import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/firebase";
import { api } from "@/lib/api";
import { ok, fail, getUid } from "./_base";
import type { User, ServiceResponse } from "@/lib/types";

export const authService = {
  async getProfile(): Promise<ServiceResponse<User>> {
    try {
      const uid = getUid();
      const fbUser = auth.currentUser;
      const { data, error } = await supabase.from("users").select("*").eq("id", uid).single();
      if (error) throw error;
      return ok({ ...data, google_picture: fbUser?.photoURL || data.google_picture } as User);
    } catch (e) {
      return fail(e);
    }
  },

  async updateProfile(updates: Partial<User>): Promise<ServiceResponse<User>> {
    try {
      const uid = getUid();
      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", uid)
        .select()
        .single();
      if (error) throw error;
      return ok(data as User);
    } catch (e) {
      return fail(e);
    }
  },

  async getBillingStatus(): Promise<ServiceResponse<any>> {
    try { return ok((await api.get("/billing/status")).data); }
    catch (e) { return fail(e); }
  },

  async subscribePlan(plan: string): Promise<ServiceResponse<any>> {
    try { return ok((await api.post(`/billing/subscribe/${plan}`)).data); }
    catch (e) { return fail(e); }
  },

  async cancelBilling(): Promise<ServiceResponse<any>> {
    try { return ok((await api.post("/billing/cancel")).data); }
    catch (e) { return fail(e); }
  },

  async exportData(format: "xlsx" | "csv" = "xlsx", types?: string, orgName?: string): Promise<ServiceResponse<Blob>> {
    try {
      const res = await api.get("/export/", { params: { format, types, org_name: orgName }, responseType: "blob" });
      return ok(res.data);
    } catch (e) {
      return fail(e);
    }
  },

  async getNotificationSettings(): Promise<ServiceResponse<any>> {
    try { return ok((await api.get("/notifications/settings")).data); }
    catch (e) { return fail(e); }
  },

  async updateNotificationSettings(settings: any): Promise<ServiceResponse<any>> {
    try { return ok((await api.put("/notifications/settings", settings)).data); }
    catch (e) { return fail(e); }
  },

  async sendTestAlert(): Promise<ServiceResponse<any>> {
    try { return ok((await api.post("/notifications/test/compliance")).data); }
    catch (e) { return fail(e); }
  },
};
