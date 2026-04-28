import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

export type Business = Database["public"]["Tables"]["businesses"]["Row"];

type Ctx = {
  business: Business | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setBusiness: (b: Business | null) => void;
};

const OwnerBizCtx = createContext<Ctx | undefined>(undefined);

export function OwnerBusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setBusiness(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    setBusiness((data ?? null) as Business | null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <OwnerBizCtx.Provider value={{ business, loading, refresh, setBusiness }}>
      {children}
    </OwnerBizCtx.Provider>
  );
}

export function useOwnerBusiness() {
  const ctx = useContext(OwnerBizCtx);
  if (!ctx) throw new Error("useOwnerBusiness must be inside OwnerBusinessProvider");
  return ctx;
}