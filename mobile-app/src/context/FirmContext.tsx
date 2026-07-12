import React, { createContext, useContext, useEffect, useState } from "react";
import { firmService } from "../lib/services/firmService";
import { loadCachedFirmId, setCachedFirmId } from "../lib/services/_base";
import { useAuth } from "./AuthContext";
import type { Firm } from "../lib/types";

interface FirmContextType {
  firms: Firm[];
  activeFirmId: string | null;
  setActiveFirmId: (id: string) => void;
  loading: boolean;
  firmVersion: number;
  refreshFirms: () => Promise<void>;
}

const FirmContext = createContext<FirmContextType | null>(null);

export function FirmProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [firms, setFirms] = useState<Firm[]>([]);
  const [activeFirmId, setActiveFirmIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [firmVersion, setFirmVersion] = useState(0);

  async function loadFirms(preferredId?: string | null) {
    setLoading(true);
    const cached = preferredId !== undefined ? preferredId : await loadCachedFirmId();
    const res = await firmService.getAll();
    const list = res.success ? res.data ?? [] : [];
    setFirms(list);
    const restored = cached && list.some(f => f.id === cached) ? cached : list[0]?.id ?? null;
    setActiveFirmIdState(restored);
    await setCachedFirmId(restored);
    setLoading(false);
  }

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadFirms();
  }, [user]);

  async function setActiveFirmId(id: string) {
    setActiveFirmIdState(id);
    await setCachedFirmId(id);
    setFirmVersion(v => v + 1);
  }

  // Re-fetches the firms list (e.g. after MyFirmsScreen creates/edits a
  // firm) while keeping whichever firm is currently active selected.
  async function refreshFirms() {
    await loadFirms(activeFirmId);
    setFirmVersion(v => v + 1);
  }

  return (
    <FirmContext.Provider value={{ firms, activeFirmId, setActiveFirmId, loading, firmVersion, refreshFirms }}>
      {children}
    </FirmContext.Provider>
  );
}

export function useFirm() {
  const ctx = useContext(FirmContext);
  if (!ctx) throw new Error("useFirm must be used inside FirmProvider");
  return ctx;
}
