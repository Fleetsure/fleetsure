import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { LanguageProvider } from "@/lib/LanguageContext";

export const metadata: Metadata = {
  title: "FleetSure — Fleet Management Platform",
  description: "Track vehicles, trips, expenses and profitability.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  manifest: "/manifest.json",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FleetSure",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#1E2D8E" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FleetSure" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
        {/* Apply saved theme before paint — prevents white flash on dark mode */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme');
            if (t === 'dark') document.documentElement.setAttribute('data-theme','dark');
          } catch(e) {}
        `}} />
      </head>
      <body style={{ margin: 0, display: "flex", minHeight: "100vh" }}>
        <LanguageProvider><AppShell>{children}</AppShell></LanguageProvider>
      </body>
    </html>
  );
}
