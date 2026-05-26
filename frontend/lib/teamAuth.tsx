"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { setSupabaseAuthToken } from "@/lib/supabase";
import { teamService, TeamMember } from "@/lib/services/teamService";

interface TeamAuthCtx {
  member:  TeamMember | null;
  loading: boolean;
}

const Ctx = createContext<TeamAuthCtx | null>(null);

export function TeamAuthProvider({ children, requiredRole }: { children: React.ReactNode; requiredRole: "manager" | "accountant" }) {
  const [member,  setMember]  = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        setSupabaseAuthToken(token);
        const res = await teamService.getMyProfile();
        if (res.success && res.data && res.data.role === requiredRole) {
          // Link firebase_uid on first login
          if (!res.data.firebase_uid) {
            await teamService.linkFirebaseUid(res.data.id, user.uid);
          }
          setMember(res.data);
        } else {
          setMember(null);
        }
      } else {
        setSupabaseAuthToken(null);
        setMember(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [requiredRole]);

  return <Ctx.Provider value={{ member, loading }}>{children}</Ctx.Provider>;
}

export function useTeamAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTeamAuth must be used inside TeamAuthProvider");
  return ctx;
}
