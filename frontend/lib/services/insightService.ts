import { supabase } from "@/lib/supabase";
import { query, getUid } from "./_base";
import type { Insight, ServiceResponse } from "@/lib/types";

export const insightService = {
  async getAll(include_dismissed = false): Promise<ServiceResponse<Insight[]>> {
    const uid = getUid();
    const q = supabase
      .from("operational_insights")
      .select("*")
      .eq("owner_id", uid)
      .order("created_at", { ascending: false });
    return query(include_dismissed ? q : q.eq("is_dismissed", false));
  },

  async markRead(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("operational_insights").update({ is_read: true }).eq("id", id).eq("owner_id", getUid())
    );
  },

  async markAllRead(): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("operational_insights").update({ is_read: true }).eq("owner_id", getUid()).eq("is_dismissed", false)
    );
  },

  async dismiss(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("operational_insights").update({ is_dismissed: true }).eq("id", id).eq("owner_id", getUid())
    );
  },
};
