"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

const PUBLIC_ROUTES = ["/login", "/register"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const isPublic = PUBLIC_ROUTES.includes(pathname);

    if (!token && !isPublic) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [pathname]);

  // Public pages: no sidebar
  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  if (!checked) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-page)",
        color: "var(--text-muted)",
        fontSize: 14,
      }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      <Sidebar />
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        overflow: "auto",
        background: "var(--bg-page)",
        color: "var(--text-main)",
      }}>
        {children}
      </main>
    </>
  );
}
