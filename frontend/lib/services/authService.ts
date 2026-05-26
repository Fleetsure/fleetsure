import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/firebase";
import { ok, fail, getUid } from "./_base";
import type { User, ServiceResponse } from "@/lib/types";

export const authService = {
  async getProfile(): Promise<ServiceResponse<User>> {
    try {
      const uid    = getUid();
      const fbUser = auth.currentUser;
      const { data, error } = await supabase.from("users").select("*").eq("id", uid).single();
      if (error) throw error;
      return ok({ ...data, google_picture: fbUser?.photoURL || data.google_picture } as User);
    } catch (e) { return fail(e); }
  },

  async updateProfile(updates: Partial<User>): Promise<ServiceResponse<User>> {
    try {
      const { data, error } = await supabase
        .from("users").update(updates).eq("id", getUid()).select().single();
      if (error) throw error;
      return ok(data as User);
    } catch (e) { return fail(e); }
  },

  async getBillingStatus(): Promise<ServiceResponse<any>> {
    try {
      const { data, error } = await supabase
        .from("subscriptions").select("*").eq("user_id", getUid()).maybeSingle();
      if (error) throw error;
      if (!data) return ok({ plan: "trial", status: "trial", days_left: 60 });
      const trialEnd  = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
      const periodEnd = data.ends_at ? new Date(data.ends_at) : null;
      const refDate = periodEnd || trialEnd;
      const daysLeft = refDate
        ? Math.max(0, Math.ceil((refDate.getTime() - Date.now()) / 86_400_000))
        : 0;
      return ok({ ...data, days_left: daysLeft });
    } catch (e) { return fail(e); }
  },
};
