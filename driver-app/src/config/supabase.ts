import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "./firebase";

const SUPABASE_URL = "https://hjtamxpydneuykkcwpfn.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqdGFteHB5ZG5ldXlra2N3cGZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNTg1NDksImV4cCI6MjA5NDgzNDU0OX0.iCOE8H4sTkqkyRW1UdKDVwwL7tj_PNjKjeA5ab6-SrI";

// Wait for @react-native-firebase/auth to restore the persisted session before
// any Supabase request fires — otherwise auth.currentUser is null and no
// Bearer token is attached, causing RLS-protected RPCs to return empty data.
const authReady: Promise<void> = new Promise((resolve) => {
  const unsub = auth.onAuthStateChanged(() => { unsub(); resolve(); });
});

async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  await authReady;
  const headers = new Headers((init.headers as HeadersInit) ?? {});
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  } catch {
    // not logged in yet
  }
  return fetch(input as RequestInfo, { ...init, headers });
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: { fetch: authFetch },
});
