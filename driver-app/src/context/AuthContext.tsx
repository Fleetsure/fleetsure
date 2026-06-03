import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { auth } from "../config/firebase";
import { driverService } from "../services/driverService";

export interface DriverProfile {
  id: string;
  owner_id: string;
  name: string;
  phone: string;
  license_number?: string | null;
  license_expiry?: string | null;
  status?: string;
  firebase_uid?: string | null;
}

interface AuthContextType {
  driver: DriverProfile | null;
  loading: boolean;
  otpSent: boolean;
  authError: string | null;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  resetOtp: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const confirmationRef = useRef<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const pendingPhone = useRef<string>("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && user.phoneNumber) {
        try {
          const res = await driverService.getProfileByPhone(user.phoneNumber);
          if (res.success && res.data) setDriver(res.data);
        } catch {
          // silent
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function sendOtp(phone: string) {
    setAuthError(null);
    try {
      const e164 = phone.startsWith("+")
        ? phone
        : `+91${phone.replace(/\D/g, "").slice(-10)}`;
      pendingPhone.current = e164;
      confirmationRef.current = await auth.signInWithPhoneNumber(e164);
      setOtpSent(true);
    } catch (e: any) {
      setAuthError(e?.message ?? "Failed to send OTP. Check the number and try again.");
    }
  }

  async function verifyOtp(code: string) {
    setAuthError(null);
    if (!confirmationRef.current) {
      setAuthError("Session expired. Please re-enter your number.");
      return;
    }
    try {
      const cred = await confirmationRef.current.confirm(code);
      const user = cred?.user;
      if (!user) throw new Error("Sign-in failed.");

      const res = await driverService.getProfileByPhone(pendingPhone.current);
      if (!res.success || !res.data) {
        setAuthError(
          res.error ?? "No driver account found. Ask your fleet manager to register you first."
        );
        await auth.signOut();
        return;
      }

      const profile = res.data;
      if (!profile.firebase_uid) {
        await driverService.linkFirebaseUid(profile.id, user.uid);
      }
      setDriver(profile);
    } catch (e: any) {
      setAuthError(e?.message ?? "Invalid OTP. Please try again.");
    }
  }

  function resetOtp() {
    setOtpSent(false);
    setAuthError(null);
    confirmationRef.current = null;
  }

  async function logout() {
    await auth.signOut();
    setDriver(null);
    setOtpSent(false);
    confirmationRef.current = null;
  }

  return (
    <AuthContext.Provider
      value={{ driver, loading, otpSent, authError, sendOtp, verifyOtp, resetOtp, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
