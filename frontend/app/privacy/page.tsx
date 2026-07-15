import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — FleetSure",
};

const SECTIONS = [
  {
    title: "What Data We Collect",
    body:
      "We collect your name, email address, and phone number, along with the fleet data you enter — vehicle, trip, and driver records — and any documents you upload (e.g. registration certificates, insurance policies, licenses).",
  },
  {
    title: "How We Use It",
    body:
      "We use your data solely to provide FleetSure's fleet management services: tracking vehicles, trips, drivers, expenses, and documents on your behalf. We do not sell or share your data for advertising purposes.",
  },
  {
    title: "Third Parties",
    body:
      "We use Firebase for authentication and Supabase for database and file storage. These providers process data on our behalf to run the service and do not use it for their own purposes.",
  },
  {
    title: "Data Retention",
    body:
      "We retain your data for as long as your account is active. If you request account deletion, all associated data is permanently deleted within 7 business days.",
  },
  {
    title: "Contact",
    body: (
      <>
        For any privacy questions or requests, contact us at{" "}
        <a href="mailto:support@fleetsure.co.in" style={{ color: "var(--primary)", fontWeight: 600 }}>
          support@fleetsure.co.in
        </a>
        .
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-page)", color: "var(--text-main)" }}>
      <header style={{ padding: "20px 24px" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src="/logo.png" alt="FleetSure" style={{ height: 32, width: "auto", objectFit: "contain" }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)" }}>FleetSure</span>
        </Link>
      </header>

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            boxShadow: "var(--shadow-card)",
            padding: "36px 32px",
          }}
        >
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)", margin: "0 0 8px" }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 28px" }}>
            FleetSure · fleetsure.co.in
          </p>

          {SECTIONS.map((s) => (
            <section key={s.title} style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)", margin: "0 0 8px" }}>
                {s.title}
              </h2>
              <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--text-sub)", margin: 0 }}>
                {s.body}
              </p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
