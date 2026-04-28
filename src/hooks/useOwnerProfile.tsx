import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type OwnerProfile = {
  id: string;
  display_name: string | null;
  owner_title: string | null;
  avatar_url: string | null;
};

type Ctx = {
  profile: OwnerProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  update: (patch: Partial<OwnerProfile>) => Promise<void>;
};

const C = createContext<Ctx | undefined>(undefined);

export function OwnerProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,owner_title,avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    setProfile((data ?? null) as OwnerProfile | null);
    setLoading(false);
  }, [user]);

  const update = useCallback(async (patch: Partial<OwnerProfile>) => {
    if (!user) return;
    const { data } = await supabase.from("profiles").update(patch).eq("id", user.id).select("id,display_name,owner_title,avatar_url").maybeSingle();
    if (data) setProfile(data as OwnerProfile);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return <C.Provider value={{ profile, loading, refresh, update }}>{children}</C.Provider>;
}

export function useOwnerProfile() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useOwnerProfile must be inside OwnerProfileProvider");
  return ctx;
}
