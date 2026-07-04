"use client";
import { TeamAuthProvider } from "@/lib/teamAuth";
import TeamShell from "@/components/TeamShell";
import { LayoutDashboard, Route, Users, Truck, IndianRupee, AlertTriangle, Wallet } from "lucide-react";

const NAV = [
  { label: "Dashboard", href: "/manager/dashboard", icon: LayoutDashboard },
  { label: "Trips",     href: "/manager/trips",     icon: Route },
  { label: "Drivers",   href: "/manager/drivers",   icon: Users },
  { label: "Vehicles",  href: "/manager/vehicles",  icon: Truck },
  { label: "Expenses",  href: "/manager/expenses",  icon: IndianRupee },
  { label: "Payments",  href: "/manager/payments",  icon: Wallet },
  { label: "Issues",    href: "/manager/issues",    icon: AlertTriangle },
];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <TeamAuthProvider requiredRole="manager">
      <TeamShell role="manager" navItems={NAV}>{children}</TeamShell>
    </TeamAuthProvider>
  );
}
