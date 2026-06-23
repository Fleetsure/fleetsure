import { ServiceResponse } from "@/lib/types";
import { auth } from "@/lib/firebase";

export function getUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  return uid;
}

export function ok<T>(data: T): ServiceResponse<T> {
  return { success: true, data };
}

export function fail(error: unknown): ServiceResponse<never> {
  if (error && typeof error === "object" && "message" in error) {
    return { success: false, error: (error as { message: string }).message };
  }
  return { success: false, error: String(error) };
}

// Wraps a supabase query: throws on error, returns data
export async function query<T>(
  promise: PromiseLike<{ data: T | null; error: unknown }>
): Promise<ServiceResponse<T>> {
  try {
    const { data, error } = await promise;
    if (error) throw error;
    return ok(data as T);
  } catch (e) {
    return fail(e);
  }
}
