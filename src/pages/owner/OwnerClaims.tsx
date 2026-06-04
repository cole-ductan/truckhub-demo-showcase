import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type ClaimRow = {
  id: string;
  status: "pending" | "approved" | "denied" | "more_info_requested" | "withdrawn";
  admin_notes: string | null;
  verification_notes: string | null;
  verification_url: string | null;
  created_at: string;
  reviewed_at: string | null;
  business: { id: string; name: string; slug: string } | null;
};

const STATUS_LABEL: Record<ClaimRow["status"], string> = {
  pending: "Pending review",
  more_info_requested: "More information requested",
  approved: "Approved",
  denied: "Denied",
  withdrawn: "Withdrawn",
};

const STATUS_VARIANT: Record<ClaimRow["status"], "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  more_info_requested: "outline",
  approved: "default",
  denied: "destructive",
  withdrawn: "outline",
};

export default function OwnerClaims() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ClaimRow[]>([]);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("claim_requests")
      .select("id,status,admin_notes,verification_notes,verification_url,created_at,reviewed_at,business:business_id(id,name,slug)")
      .eq("requester_user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setRows((data ?? []) as unknown as ClaimRow[]);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  async function withdraw(id: string) {
    const { error } = await supabase.rpc("withdraw_claim_request", { _claim_request_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Claim withdrawn");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">My claim requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track ownership claims you've submitted on FoodXMobile listings.</p>
      </div>

      {rows.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          You haven't submitted any claim requests yet. Find your listing on the public site and use "Claim this listing".
        </CardContent></Card>
      )}

      <div className="space-y-3">
        {rows.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg font-semibold">{c.business?.name ?? "Listing removed"}</p>
                  <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Submitted {new Date(c.created_at).toLocaleDateString()}{c.reviewed_at ? ` · Reviewed ${new Date(c.reviewed_at).toLocaleDateString()}` : ""}</p>
                {c.admin_notes && (
                  <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"><span className="font-semibold">Admin note:</span> {c.admin_notes}</p>
                )}
                {c.status === "approved" && (
                  <p className="text-sm text-emerald-700">Your claim was approved. Head to your owner workspace to manage this listing.</p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {c.business?.slug && (
                  <Button asChild variant="outline" size="sm"><Link to={`/food-trucks/${c.business.slug}`}>View listing</Link></Button>
                )}
                {c.status === "approved" && (
                  <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90"><Link to="/owner">Open dashboard</Link></Button>
                )}
                {(c.status === "pending" || c.status === "more_info_requested") && (
                  <Button variant="destructive" size="sm" onClick={() => withdraw(c.id)}>Withdraw</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}