import { supabase } from "@/lib/supabase";
import { query, getUid } from "./_base";
import type { Party, ServiceResponse } from "@/lib/types";
import type { Database } from "@/lib/database.types";

type PartyType = Database["public"]["Enums"]["partytype"];
type PartyInsert = Database["public"]["Tables"]["parties"]["Insert"];
type PartyUpdate = Database["public"]["Tables"]["parties"]["Update"];

export const partyService = {
  async getAll(party_type?: PartyType): Promise<ServiceResponse<Party[]>> {
    const uid = getUid();
    const q = supabase.from("parties").select("*").eq("owner_id", uid).order("name");
    return query(party_type ? q.eq("party_type", party_type) : q);
  },

  async create(data: Omit<PartyInsert, "owner_id">): Promise<ServiceResponse<Party>> {
    return query(
      supabase.from("parties").insert({ ...data, owner_id: getUid() }).select().single()
    );
  },

  async update(id: string, data: PartyUpdate): Promise<ServiceResponse<Party>> {
    return query(
      supabase.from("parties").update(data).eq("id", id).eq("owner_id", getUid()).select().single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("parties").delete().eq("id", id).eq("owner_id", getUid())
    );
  },
};
