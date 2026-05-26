import { createClient } from "@supabase/supabase-js";
import { auth } from "@/lib/firebase";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function setSupabaseAuthToken(_token: string | null) {
  // No-op: token is now fetched fresh on every request via auth.currentUser.getIdToken()
}

async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers((init.headers as HeadersInit) ?? {});
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession:     false,
    autoRefreshToken:   false,
    detectSessionInUrl: false,
  },
  global: { fetch: authFetch },
});
