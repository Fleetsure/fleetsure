import React, { createContext, useContext, useEffect, useState } from "react";
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
} from "@firebase/auth";
import { auth } from "../lib/firebase";
import { supabase } from "../lib/supabase";

// Mirrors frontend/app/login/page.tsx's invite-only model: a Firebase
// account alone isn't enough, the uid must already have a row in `users`
// (created by an admin invite) — anyone who authenticates but isn't
// provisioned gets signed back out immediately.
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
  firebaseUser: User | null;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (fields: { name?: string; phone?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await loadOrReject(fbUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function loadOrReject(fbUser: User) {
    const { data } = await supabase
      .from("users")
      .select("id,email,name,org_name,phone,google_picture")
      .eq("id", fbUser.uid)
      .single();
    if (!data) {
      await firebaseSignOut(auth);
      setAuthError("Access not granted. Contact support to request access.");
      setUser(null);
      return;
    }
    setUser(data as OwnerProfile);
  }

  async function signIn(email: string, password: string) {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: any) {
      setAuthError(e?.message?.replace("Firebase: ", "") || "Sign in failed. Check your email and password.");
      throw e;
    }
  }

  async function sendPasswordReset(email: string) {
    setAuthError(null);
    await sendPasswordResetEmail(auth, email.trim());
  }

  async function signOut() {
    try {
      await firebaseSignOut(auth);
    } catch { /* ignore */ }
    setUser(null);
    setFirebaseUser(null);
  }

  async function updateProfile(fields: { name?: string; phone?: string }) {
    if (!firebaseUser) throw new Error("Not authenticated");
    const { error } = await supabase.from("users").update(fields).eq("id", firebaseUser.uid);
    if (error) throw error;
    setUser((prev) => (prev ? { ...prev, ...fields } : prev));
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, authError, signIn, sendPasswordReset, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
