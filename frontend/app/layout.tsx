import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import GoogleAuthProvider from "@/components/GoogleAuthProvider";
import { LanguageProvider } from "@/lib/LanguageContext";

export const metadata: Metadata = {
  title: "FleetSure — Fleet Management Platform",
  description: "Track vehicles, trips, expenses and profitability.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
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
        <GoogleAuthProvider><LanguageProvider><AppShell>{children}</AppShell></LanguageProvider></GoogleAuthProvider>
      </body>
    </html>
  );
}
