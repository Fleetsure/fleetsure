import { supabase } from "../supabase";
import { query, getUid } from "./_base";
import type { Party, ServiceResponse } from "../types";
import type { Database } from "../database.types";

type PartyInsert = Database["public"]["Tables"]["parties"]["Insert"];
type PartyUpdate = Database["public"]["Tables"]["parties"]["Update"];
type PartyType = Database["public"]["Enums"]["partytype"];

export const partyService = {
  async getAll(partyType?: PartyType): Promise<ServiceResponse<Party[]>> {
    let q = supabase.from("parties").select("*").eq("owner_id", getUid());
    if (partyType) q = q.eq("party_type", partyType);
    return query(q.order("name", { ascending: true }));
  },

  async create(data: Omit<PartyInsert, "owner_id">): Promise<ServiceResponse<Party>> {
    return query(supabase.from("parties").insert({ ...data, owner_id: getUid() }).select().single());
  },

  async update(id: string, data: PartyUpdate): Promise<ServiceResponse<Party>> {
    return query(supabase.from("parties").update(data).eq("id", id).eq("owner_id", getUid()).select().single());
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query<null>(supabase.from("parties").delete().eq("id", id).eq("owner_id", getUid()));
  },
};
