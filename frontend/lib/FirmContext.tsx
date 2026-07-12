"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { firmService } from "./services/firmService";
import { authService } from "./services/authService";
import type { Firm } from "./types";

const STORAGE_KEY = "fleetsure_active_firm";

interface FirmContextType {
  firms: Firm[];
  activeFirmId: string | null;
  setActiveFirmId: (id: string) => void;
  loading: boolean;
  firmVersion: number;
  refresh: () => Promise<void>;
}

const FirmContext = createContext<FirmContextType>({
  firms: [],
  activeFirmId: null,
  setActiveFirmId: () => {},
  loading: true,
  firmVersion: 0,
  refresh: async () => {},
});

export function FirmProvider({ children }: { children: ReactNode }) {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [activeFirmId, setActiveFirmIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [firmVersion, setFirmVersion] = useState(0);

  const load = async () => {
    try {
      const res = await firmService.getAll();
      let list = res.data || [];

      if (res.success && list.length === 0) {
        // Retry once after a short delay — edge function cold start can cause
        // the first authenticated request to fail silently (RLS returns 0 rows
        // instead of an error when auth header is missing).
        await new Promise(r => setTimeout(r, 1500));
        const retry = await firmService.getAll();
        list = retry.data || [];
      }

      if (list.length === 0) {
        // Genuinely no firms — bootstrap one default firm.
        const profile = await authService.getProfile();
        const name = (profile.data?.name?.trim() || "My") + " Transports";
        const created = await firmService.create({ name, gstin: null, address: null, pan: null });
        if (created.success && created.data) list = [created.data];
      }

      setFirms(list);
      const saved = localStorage.getItem(STORAGE_KEY);
      const activeId = (saved && list.some(f => f.id === saved)) ? saved : (list[0]?.id ?? null);
      setActiveFirmIdState(activeId);
      if (activeId) localStorage.setItem(STORAGE_KEY, activeId);
    } catch (e) {
      console.error("[FirmContext] failed to load firms:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) load();
      else { setFirms([]); setActiveFirmIdState(null); setLoading(false); }
    });
    return unsub;
  }, []);

  const setActiveFirmId = (id: string) => {
    // No window.location.reload() — that was causing the switcher to vanish
    // because the full page reload destroyed React state before sessionStorage
    // could seed it back. Instead: update state + localStorage, then bump
    // firmVersion. AppShell uses firmVersion as a key on the content area,
    // which forces all child pages to remount and re-fetch with the new firm.
    setActiveFirmIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
    setFirmVersion(v => v + 1);
  };

  return (
    <FirmContext.Provider value={{ firms, activeFirmId, setActiveFirmId, loading, firmVersion, refresh: load }}>
      {children}
    </FirmContext.Provider>
  );
}

export function useFirm() {
  return useContext(FirmContext);
}
