"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { setSupabaseAuthToken } from "@/lib/supabase";
import { driverPortalService, DriverProfile } from "@/lib/services/driverPortalService";

interface DriverAuthCtx {
  driver:      DriverProfile | null;
  loading:     boolean;
  sendOtp:     (phone: string) => Promise<void>;
  verifyOtp:   (otp: string) => Promise<void>;
  logout:      () => Promise<void>;
  resetOtp:    () => void;
  otpSent:     boolean;
  authError:   string | null;
}

const Ctx = createContext<DriverAuthCtx | null>(null);

export function DriverAuthProvider({ children }: { children: React.ReactNode }) {
  const [driver,    setDriver]    = useState<DriverProfile | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [otpSent,   setOtpSent]   = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const confirmRef   = useRef<ConfirmationResult | null>(null);
  const captchaRef   = useRef<RecaptchaVerifier | null>(null);
  const pendingPhone = useRef<string>("");

  // On mount: restore session if Firebase user already exists
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && user.phoneNumber) {
        try {
          const token = await user.getIdToken();
          setSupabaseAuthToken(token);
          const res = await driverPortalService.getProfileByPhone(user.phoneNumber);
          if (res.success && res.data) setDriver(res.data);
        } catch { /* silent */ }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  function initCaptcha() {
    if (captchaRef.current) return;
    captchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });
  }

  async function sendOtp(phone: string) {
    setAuthError(null);
    try {
      if (captchaRef.current) {
        try { captchaRef.current.clear(); } catch { /* ignore */ }
        captchaRef.current = null;
      }
      initCaptcha();
      const e164 = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "").slice(-10)}`;
      pendingPhone.current = e164;
      confirmRef.current = await signInWithPhoneNumber(auth, e164, captchaRef.current!);
      setOtpSent(true);
    } catch (e: any) {
      const msg = e?.code === "auth/too-many-requests"
        ? "Too many attempts from this device. Please wait a few minutes and try again."
        : (e?.message ?? "Failed to send OTP. Check the number and try again.");
      setAuthError(msg);
      try { captchaRef.current?.clear(); } catch { /* ignore */ }
      captchaRef.current = null;
    }
  }

  async function verifyOtp(otp: string) {
    setAuthError(null);
    if (!confirmRef.current) { setAuthError("Session expired. Re-enter your number."); return; }
    try {
      const cred  = await confirmRef.current.confirm(otp);
      const user  = cred.user;
      const token = await user.getIdToken();
      setSupabaseAuthToken(token);

      // Look up driver by phone
      const res = await driverPortalService.getProfileByPhone(pendingPhone.current);
      if (!res.success || !res.data) {
        setAuthError(res.error ?? "No driver account found. Ask your fleet manager to add you.");
        await signOut(auth);
        setSupabaseAuthToken(null);
        return;
      }

      const profile = res.data;

      // Link firebase_uid on first login
      if (!profile.firebase_uid) {
        await driverPortalService.linkFirebaseUid(profile.id, user.uid);
      }

      setDriver(profile);
    } catch (e: any) {
      setAuthError(e?.message ?? "Invalid OTP. Please try again.");
    }
  }

  function resetOtp() {
    setOtpSent(false);
    setAuthError(null);
    confirmRef.current = null;
    try { captchaRef.current?.clear(); } catch { /* ignore */ }
    captchaRef.current = null;
  }

  async function logout() {
    await signOut(auth);
    setSupabaseAuthToken(null);
    setDriver(null);
    setOtpSent(false);
    confirmRef.current = null;
  }

  return (
    <Ctx.Provider value={{ driver, loading, sendOtp, verifyOtp, logout, resetOtp, otpSent, authError }}>
      {children}
      <div id="recaptcha-container" />
    </Ctx.Provider>
  );
}

export function useDriverAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDriverAuth must be used inside DriverAuthProvider");
  return ctx;
}
