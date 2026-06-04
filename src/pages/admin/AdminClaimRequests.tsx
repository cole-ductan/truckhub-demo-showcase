import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ExternalLink, ShieldCheck, CheckCircle2, XCircle, MessageCircleQuestion, X } from "lucide-react";

type Status = "pending" | "approved" | "denied" | "more_info_requested" | "withdrawn";

type Row = {
  id: string;
  status: Status;
  requester_user_id: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string | null;
  relationship_to_business: string | null;
  verification_notes: string | null;
  verification_url: string | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  business: {
    id: string; name: string; slug: string;
    listing_status: string; owner_id: string | null;
  } | null;
};

const STATUS_LABEL: Record<Status, string> = {
  pending: "Pending",
  more_info_requested: "More info requested",
  approved: "Approved",
  denied: "Denied",
  withdrawn: "Withdrawn",
};
const STATUS_VARIANT: Record<Status, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  more_info_requested: "outline",
  approved: "default",
  denied: "destructive",
  withdrawn: "outline",
};

const FILTERS: Array<{ key: "all" | Status; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "more_info_requested", label: "More info" },
  { key: "approved", label: "Approved" },
  { key: "denied", label: "Denied" },
  { key: "withdrawn", label: "Withdrawn" },
  { key: "all", label: "All" },
];

export default function AdminClaimRequests() {
  const [params, setParams] = useSearchParams();
  const businessId = params.get("biz");
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"all" | Status>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("claim_requests")
      .select(`
        id,status,requester_user_id,requester_name,requester_email,requester_phone,
        relationship_to_business,verification_notes,verification_url,admin_notes,
        created_at,reviewed_at,
        business:business_id(id,name,slug,listing_status,owner_id)
      `)
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setRows((data ?? []) as unknown as Row[]);
  };
  useEffect(() => { load(); }, []);

  const scopedRows = useMemo(
    () => businessId ? rows.filter((r) => r.business?.id === businessId) : rows,
    [rows, businessId],
  );

  const scopedBusinessName = useMemo(
    () => scopedRows.find((r) => r.business?.id === businessId)?.business?.name ?? null,
    [scopedRows, businessId],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: scopedRows.length };
    scopedRows.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [scopedRows]);

  const visible = useMemo(
    () => filter === "all" ? scopedRows : scopedRows.filter((r) => r.status === filter),
    [scopedRows, filter],
  );

  async function approve(r: Row) {
    setBusyId(r.id);
    const { error } = await supabase.rpc("approve_claim_request", { _claim_request_id: r.id });
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Claim approved");
    load();
  }

  async function deny(r: Row) {
    setBusyId(r.id);
    const { error } = await supabase.rpc("deny_claim_request", {
      _claim_request_id: r.id,
      _admin_notes: notes[r.id] || null,
    });
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Claim denied");
    load();
  }

  async function requestInfo(r: Row) {
    const text = notes[r.id]?.trim();
    if (!text) { toast.error("Add an admin note explaining what you need"); return; }
    setBusyId(r.id);
    const { error } = await supabase.rpc("request_more_info_claim_request", {
      _claim_request_id: r.id,
      _admin_notes: text,
    });
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Requested more information");
    load();
  }

  const clearBusinessFilter = () => {
    const next = new URLSearchParams(params);
    next.delete("biz");
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Claim requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review and approve ownership claims on inventory listings.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-secondary">
          <ShieldCheck className="h-3 w-3" /> {counts.pending ?? 0} pending
        </span>
      </div>

      {businessId && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <span className="text-muted-foreground">Filtered to:</span>
          <span className="font-semibold">{scopedBusinessName ?? "Selected business"}</span>
          <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1 px-2" onClick={clearBusinessFilter}>
            <X className="h-3.5 w-3.5" /> Clear filter
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setFilter(f.key)}
          >
            {f.label} {counts[f.key] != null && <span className="ml-1.5 opacity-70">{counts[f.key]}</span>}
          </Button>
        ))}
      </div>

      {visible.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No claim requests in this view.</CardContent></Card>
      )}

      <div className="space-y-4">
        {visible.map((r) => {
          const conflict = r.business?.owner_id && r.business.owner_id !== r.requester_user_id;
          const archived = r.business?.listing_status === "archived";
          return (
            <Card key={r.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg font-semibold">{r.business?.name ?? "Listing removed"}</p>
                      <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                      {r.business?.owner_id && <Badge variant="outline">Has owner</Badge>}
                      {archived && <Badge variant="destructive">Archived</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(r.created_at).toLocaleString()}
                      {r.reviewed_at ? ` · Reviewed ${new Date(r.reviewed_at).toLocaleString()}` : ""}
                    </p>
                  </div>
                  {r.business?.slug && (
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/food-trucks/${r.business.slug}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1 h-3.5 w-3.5" /> View listing
                      </Link>
                    </Button>
                  )}
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Requester</p>
                    <p className="font-medium">{r.requester_name}</p>
                    <p className="text-muted-foreground">{r.requester_email}</p>
                    {r.requester_phone && <p className="text-muted-foreground">{r.requester_phone}</p>}
                    {r.relationship_to_business && (
                      <p className="mt-1 text-xs text-muted-foreground">Relationship: {r.relationship_to_business}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Verification</p>
                    {r.verification_notes ? <p>{r.verification_notes}</p> : <p className="text-muted-foreground">No notes provided</p>}
                    {r.verification_url && (
                      <a href={r.verification_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        {r.verification_url} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                {r.admin_notes && (
                  <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                    <span className="font-semibold">Admin note:</span> {r.admin_notes}
                  </p>
                )}

                {(r.status === "pending" || r.status === "more_info_requested") && (
                  <div className="space-y-2 rounded-lg border border-border p-3">
                    <Textarea
                      rows={2}
                      placeholder="Admin note (required for deny / request info)"
                      value={notes[r.id] ?? ""}
                      onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={busyId === r.id || !!conflict || archived}
                        onClick={() => approve(r)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" disabled={busyId === r.id} onClick={() => deny(r)}>
                        <XCircle className="mr-1 h-4 w-4" /> Deny
                      </Button>
                      {r.status === "pending" && (
                        <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => requestInfo(r)}>
                          <MessageCircleQuestion className="mr-1 h-4 w-4" /> Request more info
                        </Button>
                      )}
                    </div>
                    {conflict && <p className="text-xs text-destructive">Cannot approve: listing already has a different owner.</p>}
                    {archived && <p className="text-xs text-destructive">Cannot approve: listing is archived.</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
