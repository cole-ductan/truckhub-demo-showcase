import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

export type Business = Database["public"]["Tables"]["businesses"]["Row"];

const STORAGE_KEY = "fxm:owner:selectedBusinessId";

type Ctx = {
  business: Business | null;
  businesses: Business[];
  loading: boolean;
  refresh: () => Promise<void>;
  selectBusiness: (id: string) => void;
  setBusiness: (b: Business | null) => void;
};

const OwnerBizCtx = createContext<Ctx | undefined>(undefined);

export function OwnerBusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setBusinesses([]);
      setSelectedId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });
    setBusinesses(((data ?? []) as Business[]));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Resolve selection: ?b= → localStorage → first owned business
  useEffect(() => {
    if (loading) return;
    if (businesses.length === 0) { setSelectedId(null); return; }
    const urlId = searchParams.get("b");
    const storedId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const valid = (id: string | null) => !!id && businesses.some((b) => b.id === id);
    const next = (valid(urlId) && urlId) || (valid(storedId) && storedId) || businesses[0].id;
    if (next !== selectedId) setSelectedId(next);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, businesses, searchParams]);

  const selectBusiness = useCallback((id: string) => {
    if (!businesses.some((b) => b.id === id)) return;
    setSelectedId(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
    const next = new URLSearchParams(searchParams);
    next.set("b", id);
    setSearchParams(next, { replace: true });
  }, [businesses, searchParams, setSearchParams]);

  const business = useMemo(
    () => businesses.find((b) => b.id === selectedId) ?? null,
    [businesses, selectedId],
  );

  const setBusiness = useCallback((b: Business | null) => {
    if (b) selectBusiness(b.id);
  }, [selectBusiness]);

  return (
    <OwnerBizCtx.Provider value={{ business, businesses, loading, refresh, selectBusiness, setBusiness }}>
      {children}
    </OwnerBizCtx.Provider>
  );
}

export function useOwnerBusiness() {
  const ctx = useContext(OwnerBizCtx);
  if (!ctx) throw new Error("useOwnerBusiness must be inside OwnerBusinessProvider");
  return ctx;
}