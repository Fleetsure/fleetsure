import Link from "next/link";

export const metadata = {
  title: "Delete Your Account — FleetSure",
};

export default function DeleteAccountPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-page)", color: "var(--text-main)" }}>
      <header style={{ padding: "20px 24px" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src="/logo.png" alt="FleetSure" style={{ height: 32, width: "auto", objectFit: "contain" }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)" }}>FleetSure</span>
        </Link>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            boxShadow: "var(--shadow-card)",
            padding: "36px 32px",
          }}
        >
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)", margin: "0 0 16px" }}>
            Delete Your Account
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-sub)", margin: 0 }}>
            To request account deletion, email us at{" "}
            <a href="mailto:support@fleetsure.co.in" style={{ color: "var(--primary)", fontWeight: 600 }}>
              support@fleetsure.co.in
            </a>{" "}
            with subject &ldquo;Delete My Account&rdquo;. We will delete your account and all
            associated data (vehicles, trips, drivers, documents) within 7 business days.
          </p>
        </div>
      </main>
    </div>
  );
}
