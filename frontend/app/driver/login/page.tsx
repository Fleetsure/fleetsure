"use client";
import { useEffect, useRef, useState } from "react";
import { Truck, Phone, Shield } from "lucide-react";
import { useDriverAuth } from "@/lib/driverAuth";

const PRIMARY = "#1E2D8E";
const LIGHT   = "#EEF0FB";
const COOLDOWN_SECONDS = 60;

export default function DriverLoginPage() {
  const { sendOtp, verifyOtp, resetOtp, otpSent, authError, loading } = useDriverAuth();
  const [phone,    setPhone]    = useState("");
  const [otp,      setOtp]      = useState("");
  const [sending,  setSending]  = useState(false);
  const [verifying,setVerifying]= useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startCooldown() {
    setCooldown(COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCooldown(s => {
        if (s <= 1) { clearInterval(timerRef.current!); timerRef.current = null; return 0; }
        return s - 1;
      });
    }, 1000);
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || phone.replace(/\D/g,"").length < 10 || cooldown > 0) return;
    setSending(true);
    await sendOtp(phone);
    setSending(false);
    startCooldown();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 6) return;
    setVerifying(true);
    await verifyOtp(otp);
    setVerifying(false);
  }

  return (
    <div style={{ minHeight: "100dvh", background: `linear-gradient(160deg, ${PRIMARY} 0%, #3749C0 55%, #EEF0FB 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: "1.5px solid rgba(255,255,255,0.3)" }}>
          <Truck size={36} color="white" strokeWidth={1.8} />
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "white", letterSpacing: "-0.5px" }}>FleetSure</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontWeight: 500, marginTop: 4 }}>Driver Portal</div>
      </div>

      {/* Card */}
      <div style={{ background: "white", borderRadius: 20, padding: "32px 28px", width: "100%", maxWidth: 380, boxShadow: "0 24px 64px rgba(30,45,142,0.3)" }}>
        {!otpSent ? (
          <form onSubmit={handleSendOtp}>
            <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: PRIMARY, letterSpacing: "-0.4px" }}>Sign In</h2>
            <p style={{ margin: "0 0 28px", fontSize: 14, color: "#64748B" }}>Enter the mobile number registered with your fleet manager.</p>

            <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: 8 }}>
              Mobile Number
            </label>
            <div style={{ display: "flex", alignItems: "center", border: `2px solid ${PRIMARY}20`, borderRadius: 10, overflow: "hidden", marginBottom: 20, background: LIGHT }}>
              <div style={{ padding: "12px 14px", borderRight: `1px solid ${PRIMARY}20`, color: "#64748B", fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                <Phone size={16} style={{ verticalAlign: "middle" }} /> +91
              </div>
              <input
                type="tel" inputMode="numeric" maxLength={10}
                placeholder="9XXXXXXXXX"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                style={{ flex: 1, border: "none", background: "transparent", padding: "13px 14px", fontSize: 16, outline: "none", letterSpacing: "1px", fontWeight: 600, color: PRIMARY }}
              />
            </div>

            {authError && (
              <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#991B1B", marginBottom: 16 }}>
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={sending || phone.length < 10 || cooldown > 0}
              style={{ width: "100%", padding: "14px", background: sending || phone.length < 10 || cooldown > 0 ? "#C7D2FE" : PRIMARY, color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: sending || phone.length < 10 || cooldown > 0 ? "not-allowed" : "pointer", letterSpacing: "-0.2px" }}
            >
              {sending ? "Sending OTP…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Send OTP →"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: PRIMARY }}>Enter OTP</h2>
            <p style={{ margin: "0 0 28px", fontSize: 14, color: "#64748B" }}>
              We sent a 6-digit code to +91 {phone}
            </p>

            <div style={{ display: "flex", gap: 8, marginBottom: 20, justifyContent: "center" }}>
              <input
                type="tel" inputMode="numeric" maxLength={6}
                placeholder="• • • • • •"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}
                style={{ width: "100%", border: `2px solid ${PRIMARY}30`, borderRadius: 10, background: LIGHT, padding: "16px", fontSize: 24, fontWeight: 700, textAlign: "center", letterSpacing: "8px", outline: "none", color: PRIMARY }}
                autoFocus
              />
            </div>

            {authError && (
              <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#991B1B", marginBottom: 16 }}>
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={verifying || otp.length < 6}
              style={{ width: "100%", padding: "14px", background: verifying || otp.length < 6 ? "#C7D2FE" : PRIMARY, color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: verifying || otp.length < 6 ? "not-allowed" : "pointer" }}
            >
              {verifying ? "Verifying…" : "Verify & Sign In →"}
            </button>

            <button
              type="button"
              onClick={() => { setOtp(""); setPhone(""); resetOtp(); }}
              style={{ width: "100%", marginTop: 12, padding: "12px", background: "transparent", border: `1.5px solid ${PRIMARY}30`, borderRadius: 10, fontSize: 14, fontWeight: 600, color: PRIMARY, cursor: "pointer" }}
            >
              ← Change Number
            </button>
          </form>
        )}

        <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#F0F9FF", borderRadius: 8, border: "1px solid #BAE6FD" }}>
          <Shield size={14} color="#0369A1" />
          <span style={{ fontSize: 12, color: "#0369A1", fontWeight: 500 }}>Your number is verified securely via OTP. No password needed.</span>
        </div>
      </div>
    </div>
  );
}
