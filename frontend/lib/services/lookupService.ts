import { api } from "@/lib/api";
import { ok, fail } from "./_base";
import type { ServiceResponse } from "@/lib/types";

export const lookupService = {
  async vahanLookup(params: Record<string, string>): Promise<ServiceResponse<any>> {
    try { return ok((await api.get("/vahan/lookup", { params })).data); }
    catch (e) { return fail(e); }
  },

  async vahanStatus(): Promise<ServiceResponse<any>> {
    try { return ok((await api.get("/vahan/status")).data); }
    catch (e) { return fail(e); }
  },

  async dlLookup(dl_no: string, dob: string): Promise<ServiceResponse<any>> {
    try { return ok((await api.get("/dl/lookup", { params: { dl_no, dob } })).data); }
    catch (e) { return fail(e); }
  },

  async suggestVehicles(origin: string): Promise<ServiceResponse<any>> {
    try { return ok((await api.get("/suggestions/vehicles", { params: { origin } })).data); }
    catch (e) { return fail(e); }
  },

  async driverFatigueCheck(driver_id: string): Promise<ServiceResponse<any>> {
    try { return ok((await api.get("/suggestions/driver-fatigue", { params: { driver_id } })).data); }
    catch (e) { return fail(e); }
  },

  async getTripPdf(tripId: string, expenseTypes = "all", showProfit = true): Promise<ServiceResponse<Blob>> {
    try {
      const res = await api.get(`/trips/${tripId}/pdf`, {
        params: { expense_types: expenseTypes, show_profit: showProfit },
        responseType: "blob",
      });
      return ok(res.data);
    } catch (e) {
      return fail(e);
    }
  },
};
