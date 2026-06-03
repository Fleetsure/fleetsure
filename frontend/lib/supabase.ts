import { createClient } from "@supabase/supabase-js";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function setSupabaseAuthToken(_token: string | null) {
  // No-op: token is fetched fresh on every request via auth.currentUser.getIdToken()
}

// Resolves once Firebase has finished reading auth state from storage.
// Until this resolves, auth.currentUser is unreliable (may be null even when signed in).
const authReady: Promise<void> =
  typeof window === "undefined"
    ? Promise.resolve()
    : new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, () => { unsub(); resolve(); });
      });

async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  await authReady;
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
