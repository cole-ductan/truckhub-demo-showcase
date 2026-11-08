import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Archive, CheckCircle2, Edit, ExternalLink, RotateCcw, Search, Trash2 } from "lucide-react";
import { LISTING_STATUS_LABEL, LISTING_STATUS_VARIANT, type ListingStatus } from "@/lib/listingStatus";
import { QueryStateNotice } from "@/components/qa/QueryStateNotice";

const OUTREACH_STATUSES = [
  "not_contacted","researching","ready_to_contact","contacted",
  "follow_up_needed","interested","claim_invited","claimed",
  "not_interested","do_not_contact",
] as const;
type OutreachStatus = typeof OUTREACH_STATUSES[number];
type CrmState = "active" | "completed" | "archived" | "deleted";

const OUTREACH_STATUS_LABEL: Record<OutreachStatus, string> = {
  not_contacted: "Not contacted",
  researching: "Researching",
  ready_to_contact: "Ready to contact",
  contacted: "Contacted",
  follow_up_needed: "Follow-up needed",
  interested: "Interested",
  claim_invited: "Claim invited",
  claimed: "Claimed",
  not_interested: "Not interested",
  do_not_contact: "Do not contact",
};

const CRM_STATE_LABEL: Record<CrmState, string> = {
  active: "Active",
  completed: "Completed",
  archived: "Archived",
  deleted: "Deleted",
};

const PRIORITIES = ["low","normal","high"] as const;
type Priority = typeof PRIORITIES[number];
const ACTIVITY_TYPES = [
  "note","email_sent","email_received","phone_call","text_message",
  "social_dm","follow_up_scheduled","claim_invite_sent","status_changed",
] as const;
type ActivityType = typeof ACTIVITY_TYPES[number];

type Row = {
  business_id: string;
  outreach_status: OutreachStatus;
  crm_state: CrmState;
  priority: Priority;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  preferred_contact_method: string | null;
  contact_attempt_count: number;
  source: string | null;
  updated_at: string;
  business: {
    id: string; name: string; slug: string; city: string | null; region: string | null;
    listing_status: ListingStatus; is_published: boolean; contact_name: string | null;
    phone: string | null; website: string | null;
  };
  outreach_email: string | null;
  internal_notes: string | null;
  activity_count: number;
};

type Activity = { id: string; business_id: string; activity_type: ActivityType; contact_method: string | null; summary: string; occurred_at: string; created_at: string };

function statusVariant(s: OutreachStatus): "default" | "secondary" | "outline" | "destructive" {
  if (s === "do_not_contact" || s === "not_interested") return "destructive";
  if (s === "claimed" || s === "interested") return "default";
  if (s === "ready_to_contact" || s === "claim_invited") return "secondary";
  return "outline";
}

function crmVariant(s: CrmState): "default" | "secondary" | "outline" | "destructive" {
  if (s === "deleted") return "destructive";
  if (s === "completed") return "default";
  if (s === "archived") return "secondary";
  return "outline";
}

export default function AdminOutreach() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fListing, setFListing] = useState<string>("all");
  const [fPriority, setFPriority] = useState<string>("all");
  const [fCity, setFCity] = useState<string>("all");
  const [fDueOnly, setFDueOnly] = useState(false);
  const [view, setView] = useState<CrmState | "all">("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: outreach, error: oErr }, { data: metas }, { data: counts }] = await Promise.all([
      (supabase as any).from("business_outreach")
        .select("business_id,outreach_status,crm_state,priority,next_follow_up_at,last_contacted_at,preferred_contact_method,contact_attempt_count,source,updated_at,business:businesses!inner(id,name,slug,city,region,listing_status,is_published,contact_name,phone,website)")
        .order("updated_at", { ascending: false }),
      (supabase as any).from("business_admin_metadata").select("business_id,outreach_email,internal_notes"),
      (supabase as any).from("business_outreach_activities").select("business_id"),
    ]);
    if (oErr) { toast.error(oErr.message); setLoadError(oErr.message); setRows([]); setLoading(false); return; }
    setLoadError(null);
    const metaMap = new Map<string, { outreach_email: string | null; internal_notes: string | null }>();
    (metas ?? []).forEach((m: any) => metaMap.set(m.business_id, { outreach_email: m.outreach_email, internal_notes: m.internal_notes }));
    const countMap = new Map<string, number>();
    (counts ?? []).forEach((c: any) => countMap.set(c.business_id, (countMap.get(c.business_id) ?? 0) + 1));
    setRows((outreach ?? []).map((r: any) => ({
      ...r,
      crm_state: r.crm_state ?? "active",
      outreach_email: metaMap.get(r.business_id)?.outreach_email ?? null,
      internal_notes: metaMap.get(r.business_id)?.internal_notes ?? null,
      activity_count: countMap.get(r.business_id) ?? 0,
    })) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const activeRows = useMemo(() => rows.filter((r) => r.crm_state === "active"), [rows]);
  const cities = useMemo(() => Array.from(new Set(rows.map((r) => r.business.city).filter(Boolean) as string[])).sort(), [rows]);
  const filtered = useMemo(() => {
    const now = Date.now();
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (view !== "all" && r.crm_state !== view) return false;
      if (fStatus !== "all" && r.outreach_status !== fStatus) return false;
      if (fListing !== "all" && r.business.listing_status !== fListing) return false;
      if (fPriority !== "all" && r.priority !== fPriority) return false;
      if (fCity !== "all" && r.business.city !== fCity) return false;
      if (fDueOnly && !(r.next_follow_up_at && new Date(r.next_follow_up_at).getTime() <= now)) return false;
      if (q) {
        const hay = [r.business.name, r.business.contact_name, r.outreach_email, r.business.phone, r.business.website].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, view, search, fStatus, fListing, fPriority, fCity, fDueOnly]);

  const summary = useMemo(() => {
    const by = (s: OutreachStatus) => activeRows.filter((r) => r.outreach_status === s).length;
    const now = Date.now();
    return {
      total: activeRows.length,
      ready: by("ready_to_contact"), contacted: by("contacted"),
      followUp: activeRows.filter((r) => r.next_follow_up_at && new Date(r.next_follow_up_at).getTime() <= now).length,
      interested: by("interested"), claimed: by("claimed"), dnc: by("do_not_contact"),
    };
  }, [activeRows]);

  const selected = rows.find((r) => r.business_id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Outreach CRM</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vendor acquisition pipeline. Live counts exclude completed, archived, and deleted records.</p>
      </div>
      {loadError ? <QueryStateNotice kind="error" title="Outreach CRM" message={loadError} /> : <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
        <SummaryCard label="Live total" value={summary.total} /><SummaryCard label="Ready" value={summary.ready} />
        <SummaryCard label="Contacted" value={summary.contacted} /><SummaryCard label="Follow-up due" value={summary.followUp} />
        <SummaryCard label="Interested" value={summary.interested} /><SummaryCard label="Claimed" value={summary.claimed} />
        <SummaryCard label="Do not contact" value={summary.dnc} />
      </div>
      <Card className="rounded-2xl"><CardContent className="space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-7">
          <div className="md:col-span-2"><Label className="text-xs">Search</Label><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, contact, email, phone, website" className="pl-8" /></div></div>
          <FilterSelect label="View" value={view} onChange={(v) => setView(v as CrmState | "all")} options={[["active","Active"],["completed","Completed"],["archived","Archived"],["deleted","Deleted"],["all","All records"]]} />
          <FilterSelect label="Outreach" value={fStatus} onChange={setFStatus} options={[["all","All"], ...OUTREACH_STATUSES.map((s) => [s, OUTREACH_STATUS_LABEL[s]] as [string,string])]} />
          <FilterSelect label="Listing" value={fListing} onChange={setFListing} options={[["all","All"], ...Object.entries(LISTING_STATUS_LABEL)]} />
          <FilterSelect label="Priority" value={fPriority} onChange={setFPriority} options={[["all","All"], ...PRIORITIES.map((p) => [p,p] as [string,string])]} />
          <FilterSelect label="City" value={fCity} onChange={setFCity} options={[["all","All"], ...cities.map((c) => [c,c] as [string,string])]} />
        </div>
        <div className="flex items-center gap-2 text-sm"><input id="dueOnly" type="checkbox" checked={fDueOnly} onChange={(e) => setFDueOnly(e.target.checked)} /><Label htmlFor="dueOnly" className="cursor-pointer">Only follow-ups due now</Label><span className="ml-auto text-xs text-muted-foreground">{filtered.length} records</span></div>
      </CardContent></Card>
      <div className="grid gap-3">
        {loading && <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading…</CardContent></Card>}
        {!loading && filtered.length === 0 && <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No matching CRM records.</CardContent></Card>}
        {filtered.map((r) => <Card key={r.business_id} className="rounded-2xl"><CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
          <div className="min-w-0 flex-1 space-y-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold">{r.business.name}</h3><Badge variant={LISTING_STATUS_VARIANT[r.business.listing_status]}>{LISTING_STATUS_LABEL[r.business.listing_status]}</Badge><Badge variant={statusVariant(r.outreach_status)}>{OUTREACH_STATUS_LABEL[r.outreach_status]}</Badge>{r.crm_state !== "active" && <Badge variant={crmVariant(r.crm_state)}>{CRM_STATE_LABEL[r.crm_state]}</Badge>}<Badge variant={r.priority === "high" ? "destructive" : r.priority === "low" ? "outline" : "secondary"}>{r.priority}</Badge></div>
          <p className="text-xs text-muted-foreground">{r.business.contact_name ?? "—"} · {r.outreach_email ?? "no email"} · {r.business.phone ?? "no phone"} · {r.business.city ?? "—"}{r.business.region ? `, ${r.business.region}` : ""}</p><p className="text-xs text-muted-foreground">Last contacted: {r.last_contacted_at ? new Date(r.last_contacted_at).toLocaleDateString() : "—"} · Next follow-up: {r.next_follow_up_at ? new Date(r.next_follow_up_at).toLocaleDateString() : "—"}</p></div>
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setSelectedId(r.business_id)}>Manage</Button><Button size="sm" variant="outline" asChild><Link to={`/admin/businesses/${r.business_id}/edit`}><Edit className="mr-1 h-3 w-3" />Edit</Link></Button>{r.business.is_published && <Button size="sm" variant="ghost" asChild><a href={`/food-trucks/${r.business.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3 w-3" />View</a></Button>}</div>
        </CardContent></Card>)}
      </div>
      </>}
      <OutreachDrawer row={selected} onClose={() => setSelectedId(null)} onSaved={load} />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) { return <Card className="rounded-2xl"><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p><p className="font-display text-2xl font-bold">{value}</p></CardContent></Card>; }
function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v:string) => void; options: [string,string][] }) { return <div><Label className="text-xs">{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options.map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>; }

function OutreachDrawer({ row, onClose, onSaved }: { row: Row | null; onClose: () => void; onSaved: () => void }) {
  const [activities, setActivities] = useState<Activity[]>([]); const [status, setStatus] = useState<OutreachStatus>("not_contacted"); const [priority, setPriority] = useState<Priority>("normal"); const [followUp, setFollowUp] = useState(""); const [outreachEmail, setOutreachEmail] = useState(""); const [internalNotes, setInternalNotes] = useState(""); const [actType, setActType] = useState<ActivityType>("note"); const [actMethod, setActMethod] = useState("none"); const [actSummary, setActSummary] = useState("");
  useEffect(() => { if (!row) return; setStatus(row.outreach_status); setPriority(row.priority); setFollowUp(row.next_follow_up_at ? row.next_follow_up_at.slice(0,10) : ""); setOutreachEmail(row.outreach_email ?? ""); setInternalNotes(row.internal_notes ?? ""); setActType("note"); setActMethod("none"); setActSummary(""); (supabase as any).from("business_outreach_activities").select("*").eq("business_id", row.business_id).order("occurred_at", { ascending: false }).then(({data}:any) => setActivities(data ?? [])); }, [row?.business_id]);
  if (!row) return null;
  const savePipeline = async () => { const { error } = await (supabase as any).rpc("update_business_outreach_pipeline", { _business_id: row.business_id, _outreach_status: status, _priority: priority, _next_follow_up_at: followUp ? new Date(followUp).toISOString() : null }); if (error) return toast.error(error.message); toast.success("Pipeline updated"); onSaved(); };
  const saveMetadata = async () => { const { error } = await (supabase as any).from("business_admin_metadata").upsert({ business_id: row.business_id, outreach_email: outreachEmail || null, internal_notes: internalNotes || null }, { onConflict: "business_id" }); if (error) return toast.error(error.message); toast.success("Saved"); onSaved(); };
  const addActivity = async () => { if (!actSummary.trim()) return toast.error("Summary required"); const { error } = await (supabase as any).rpc("log_business_outreach_activity", { _business_id: row.business_id, _activity_type: actType, _contact_method: actMethod === "none" ? null : actMethod, _summary: actSummary.trim() }); if (error) return toast.error(error.message); setActSummary(""); toast.success("Activity logged"); const { data } = await (supabase as any).from("business_outreach_activities").select("*").eq("business_id", row.business_id).order("occurred_at", { ascending:false }); setActivities(data ?? []); onSaved(); };
  const setCrmState = async (crmState: CrmState) => { const label = CRM_STATE_LABEL[crmState].toLowerCase(); if ((crmState === "archived" || crmState === "deleted") && !confirm(`${CRM_STATE_LABEL[crmState]} this CRM record? The listing will remain intact.`)) return; const { error } = await (supabase as any).rpc("set_business_outreach_crm_state", { _business_id: row.business_id, _crm_state: crmState }); if (error) return toast.error(error.message); toast.success(`CRM record ${label}`); onSaved(); onClose(); };
  return <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}><SheetContent className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader><SheetTitle>{row.business.name}</SheetTitle><SheetDescription>Outreach pipeline · {row.business.city ?? "—"}</SheetDescription></SheetHeader><div className="mt-6 space-y-6">
    <div className="flex flex-wrap gap-2"><Badge variant={crmVariant(row.crm_state)}>{CRM_STATE_LABEL[row.crm_state]}</Badge><Badge variant="outline">{activities.length} activities</Badge></div>
    <section className="space-y-3"><h3 className="font-semibold">Pipeline</h3><div className="grid grid-cols-2 gap-3"><div><Label className="text-xs">Status</Label><Select value={status} onValueChange={(v) => setStatus(v as OutreachStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OUTREACH_STATUSES.map((s) => <SelectItem key={s} value={s}>{OUTREACH_STATUS_LABEL[s]}</SelectItem>)}</SelectContent></Select></div><div><Label className="text-xs">Priority</Label><Select value={priority} onValueChange={(v) => setPriority(v as Priority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div><div className="col-span-2"><Label className="text-xs">Next follow-up</Label><Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} /></div></div><Button size="sm" onClick={savePipeline}>Save pipeline</Button></section>
    <section className="space-y-3"><h3 className="font-semibold">CRM lifecycle</h3><p className="text-xs text-muted-foreground">These actions remove records from the live queue without deleting the business listing.</p><div className="flex flex-wrap gap-2">{row.crm_state !== "active" && <Button size="sm" variant="outline" onClick={() => setCrmState("active")}><RotateCcw className="mr-1 h-3.5 w-3.5" />Restore active</Button>}{row.crm_state !== "completed" && <Button size="sm" variant="outline" onClick={() => setCrmState("completed")}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Complete</Button>}{row.crm_state !== "archived" && <Button size="sm" variant="outline" onClick={() => setCrmState("archived")}><Archive className="mr-1 h-3.5 w-3.5" />Archive</Button>}{row.crm_state !== "deleted" && <Button size="sm" variant="destructive" onClick={() => setCrmState("deleted")}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete from CRM</Button>}</div></section>
    <section className="space-y-3"><h3 className="font-semibold">Private contact (admin only)</h3><Input value={outreachEmail} onChange={(e) => setOutreachEmail(e.target.value)} placeholder="owner@example.com" /><Textarea rows={4} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} /><Button size="sm" onClick={saveMetadata}>Save private contact</Button></section>
    <section className="space-y-3"><h3 className="font-semibold">Log activity</h3><div className="grid grid-cols-2 gap-3"><Select value={actType} onValueChange={(v) => setActType(v as ActivityType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ACTIVITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent></Select><Select value={actMethod} onValueChange={setActMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="phone">Phone</SelectItem><SelectItem value="text">Text</SelectItem><SelectItem value="social">Social</SelectItem><SelectItem value="in_person">In person</SelectItem></SelectContent></Select></div><Textarea rows={3} value={actSummary} onChange={(e) => setActSummary(e.target.value)} placeholder="What happened?" /><Button size="sm" onClick={addActivity}>Add activity</Button></section>
    <section className="space-y-2"><h3 className="font-semibold">History ({activities.length})</h3>{activities.map((a) => <div key={a.id} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{a.activity_type.replace(/_/g," ")}{a.contact_method ? ` · ${a.contact_method}` : ""}</span><span>{new Date(a.occurred_at).toLocaleString()}</span></div><p className="mt-1 whitespace-pre-wrap">{a.summary}</p></div>)}</section>
  </div></SheetContent></Sheet>;
}
