import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { LeadDirectoryContext } from "@/lib/crm/leadDirectoryContextValue";
import type { Actor } from "@/lib/crm/types";
import { projectionToOwnerLeadView, type OwnerLeadView } from "@/lib/crm/viewModel";

export function useLeadDirectory() {
  return useContext(LeadDirectoryContext);
}

export function useCrmActor(): Actor {
  const { user } = useAuth();
  const { businesses } = useOwnerBusiness();
  const userId = user?.id ?? null;
  const businessKey = businesses.map((business) => business.id).join("|");
  return useMemo(() => {
    if (!userId) return { kind: "anonymous" };
    return {
      kind: "owner",
      userId,
      businessIds: businessKey ? businessKey.split("|") : [],
    };
  }, [userId, businessKey]);
}

export function useOwnerLeadBoard() {
  const directory = useLeadDirectory();
  const owner = useOwnerBusiness();
  const actor = useCrmActor();
  const businessId = owner.business?.id ?? null;
  const [views, setViews] = useState<OwnerLeadView[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const reload = useCallback(async () => {
    setVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    if (owner.loading) return;
    if (!businessId || actor.kind !== "owner") {
      setViews([]);
      setFetching(false);
      return;
    }
    let cancelled = false;
    setFetching(true);
    directory.listOwnerProjections(actor, businessId)
      .then((projections) => {
        if (cancelled) return;
        setViews(projections.map(projectionToOwnerLeadView));
        setError(null);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setViews([]);
        setError(caught instanceof Error ? caught.message : "Could not load leads.");
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [owner.loading, businessId, actor, directory, version]);

  return {
    business: owner.business,
    loading: owner.loading || fetching,
    views,
    error,
    reload,
    actor,
    directory,
    version,
  };
}
