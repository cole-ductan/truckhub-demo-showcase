import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Bootstraps a new admin-created draft listing and forwards to the existing
 * AdminBusinessEdit page. Reuses the shared editor so we don't duplicate UI.
 *
 * New rows:
 *   listing_status = 'draft'
 *   is_published   = false
 *   owner_id       = null
 * The existing public.businesses INSERT trigger will create the matching
 * business_outreach row so the listing appears in /admin/listing-review and
 * /admin/outreach automatically.
 */
export default function AdminBusinessNew() {
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const stamp = Date.now().toString(36);
      const { data, error } = await (supabase as any)
        .from("businesses")
        .insert({
          name: "Untitled Listing",
          slug: `untitled-listing-${stamp}`,
          listing_status: "draft",
          is_published: false,
        })
        .select("id")
        .maybeSingle();
      if (error) { setErr(error.message); toast.error(error.message); return; }
      if (!data?.id) { setErr("Failed to create listing"); return; }
      toast.success("Draft listing created");
      nav(`/admin/businesses/${data.id}/edit`, { replace: true });
    })();
  }, [nav]);

  return (
    <div className="p-8 text-sm text-muted-foreground">
      {err ? <p className="text-destructive">Could not create listing: {err}</p> : "Creating draft listing…"}
    </div>
  );
}