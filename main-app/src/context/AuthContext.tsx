import React, { createContext, useContext, useEffect, useState } from "react";
import { FirebaseAuthTypes } from "@react-native-firebase/auth";
import rnAuth from "@react-native-firebase/auth";
import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";
import { auth } from "../config/firebase";
import { supabase } from "../config/supabase";

export interface OwnerProfile {
  id: string;
  email: string;
  name: string;
  org_name?: string | null;
  phone?: string | null;
  google_picture?: string | null;
}

interface AuthContextType {
  user: OwnerProfile | null;
  firebaseUser: FirebaseAuthTypes.User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [user, setUser] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await upsertAndLoad(fbUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function upsertAndLoad(fbUser: FirebaseAuthTypes.User) {
    try {
      await supabase.from("users").upsert(
        {
          id: fbUser.uid,
          email: fbUser.email ?? "",
          name: fbUser.displayName ?? fbUser.email ?? "Fleet Owner",
          google_picture: fbUser.photoURL ?? null,
          is_active: true,
          last_login_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      const { data } = await supabase
        .from("users")
        .select("id,email,name,org_name,phone,google_picture")
        .eq("id", fbUser.uid)
        .single();
      if (data) setUser(data as OwnerProfile);
    } catch {
      setUser({
        id: fbUser.uid,
        email: fbUser.email ?? "",
        name: fbUser.displayName ?? "Fleet Owner",
        google_picture: fbUser.photoURL ?? null,
      });
    }
  }

  async function signInWithGoogle() {
    setAuthError(null);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) return;

      const idToken = response.data?.idToken;
      if (!idToken) throw new Error("No ID token received from Google.");

      // GoogleAuthProvider lives on the module (rnAuth), not the instance (auth)
      const credential = rnAuth.GoogleAuthProvider.credential(idToken);
      await auth.signInWithCredential(credential);
    } catch (e: any) {
      const msg =
        e?.code === "SIGN_IN_CANCELLED"
          ? null
          : e?.message ?? "Google sign-in failed. Please try again.";
      if (msg) setAuthError(msg);
    }
  }

  async function signOut() {
    try {
      await auth.signOut();
      await GoogleSignin.signOut();
    } catch { /* ignore */ }
    setUser(null);
    setFirebaseUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, signInWithGoogle, signOut, authError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
