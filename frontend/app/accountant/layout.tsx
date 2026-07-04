"use client";
import { TeamAuthProvider } from "@/lib/teamAuth";
import TeamShell from "@/components/TeamShell";
import { LayoutDashboard, Route, IndianRupee, FileText, Wallet } from "lucide-react";

const NAV = [
  { label: "Dashboard",        href: "/accountant/dashboard", icon: LayoutDashboard },
  { label: "P&L Report",       href: "/accountant/reports",   icon: FileText },
  { label: "Trips",            href: "/accountant/trips",     icon: Route },
  { label: "Expenses",         href: "/accountant/expenses",  icon: IndianRupee },
  { label: "Driver Payments",  href: "/accountant/payments",  icon: Wallet },
];

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return (
    <TeamAuthProvider requiredRole="accountant">
      <TeamShell role="accountant" navItems={NAV}>{children}</TeamShell>
    </TeamAuthProvider>
  );
}
