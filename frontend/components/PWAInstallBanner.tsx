"use client";
import { useEffect, useState } from "react";

export default function PWAInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(iOS);

    const isInStandaloneMode = (window.navigator as any).standalone;
    if (iOS && !isInStandaloneMode) setShowBanner(true);

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  if (!showBanner) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      backgroundColor: "#001276", color: "white",
      padding: "12px 16px", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      fontSize: 14,
    }}>
      <span>
        {isIOS
          ? "Tap Share → Add to Home Screen to install FleetSure"
          : "Install FleetSure for quick access"}
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        {!isIOS && deferredPrompt && (
          <button
            onClick={async () => {
              deferredPrompt.prompt();
              setShowBanner(false);
            }}
            style={{
              backgroundColor: "white", color: "#001276",
              border: "none", borderRadius: 6,
              padding: "6px 12px", fontWeight: 700, cursor: "pointer"
            }}
          >
            Install
          </button>
        )}
        <button
          onClick={() => setShowBanner(false)}
          style={{
            backgroundColor: "transparent", color: "white",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: 6, padding: "6px 12px", cursor: "pointer"
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
