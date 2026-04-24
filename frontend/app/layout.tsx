import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "FleetSure — Fleet Management Platform",
  description: "Track vehicles, trips, expenses and profitability.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Apply saved theme before paint — prevents white flash on dark mode */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme');
            if (t === 'dark') document.documentElement.setAttribute('data-theme','dark');
          } catch(e) {}
        `}} />
      </head>
      <body style={{ margin: 0, display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", overflow: "auto", background: "var(--bg-page)", color: "var(--text-main)" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
