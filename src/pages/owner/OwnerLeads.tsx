import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { Onboarding } from "@/components/owner/Onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Calendar, DollarSign, Mail, MessageSquare, Phone, Search, Trash2, Users } from "lucide-react";

export type Lead = {
  id: string;
  business_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  event_type: string | null;
  event_date: string | null;
  guest_count: string | null;
  message: string | null;
  stage: "new" | "contacted" | "quote_sent" | "pending" | "booked" | "completed" | "lost";
  estimated_value: number | null;
  internal_notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

const STAGES: { v: Lead["stage"]; label: string; color: string }[] = [
  { v: "new", label: "New", color: "bg-blue-500/10 text-blue-700" },
  { v: "contacted", label: "Contacted", color: "bg-cyan-500/10 text-cyan-700" },
  { v: "quote_sent", label: "Quote Sent", color: "bg-amber-500/10 text-amber-700" },
  { v: "pending", label: "Pending", color: "bg-yellow-500/10 text-yellow-700" },
  { v: "booked", label: "Booked", color: "bg-emerald-500/10 text-emerald-700" },
  { v: "completed", label: "Completed", color: "bg-secondary/10 text-secondary" },
  { v: "lost", label: "Lost", color: "bg-muted text-muted-foreground" },
];
const stageMeta = (s: string) => STAGES.find((x) => x.v === s) ?? STAGES[0];

type SortKey = "newest" | "event_date" | "value";

export default function OwnerLeads() {
  const { business, loading } = useOwnerBusiness();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stage, setStage] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [open, setOpen] = useState<Lead | null>(null);

  async function reload() {
    if (!business) return;
    const { data } = await supabase.from("leads").select("*").eq("business_id", business.id).order("created_at", { ascending: false });
    setLeads((data ?? []) as Lead[]);
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [business]);

  const filtered = useMemo(() => {
    let out = leads;
    if (stage !== "all") out = out.filter((l) => l.stage === stage);
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter((l) =>
        [l.contact_name, l.contact_email, l.contact_phone, l.event_type, l.event_date, l.message]
          .some((v) => (v ?? "").toString().toLowerCase().includes(s))
      );
    }
    if (sort === "newest") out = [...out].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sort === "event_date") out = [...out].sort((a, b) => (a.event_date ?? "9999").localeCompare(b.event_date ?? "9999"));
    if (sort === "value") out = [...out].sort((a, b) => (b.estimated_value ?? 0) - (a.estimated_value ?? 0));
    return out;
  }, [leads, stage, q, sort]);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!business) return <Onboarding />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold">Leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">Catering inquiries from your TruckHub page.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, email, phone, event…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={stage} onChange={(e) => setStage(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">All stages</option>
          {STAGES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="newest">Sort: Newest</option>
          <option value="event_date">Sort: Event date</option>
          <option value="value">Sort: Estimated value</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
          {leads.length === 0 ? "No inquiries yet. They'll show up here as soon as customers reach out." : "No leads match your filters."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-right">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((l) => {
                const s = stageMeta(l.stage);
                return (
                  <tr key={l.id} onClick={() => setOpen(l)} className="cursor-pointer hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{l.contact_name}</p>
                      <p className="text-xs text-muted-foreground">{l.contact_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{l.event_type ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{l.event_date ?? "Date TBD"}{l.guest_count ? ` · ${l.guest_count} guests` : ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.color}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{l.estimated_value != null ? `$${Number(l.estimated_value).toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <LeadSheet lead={open} onClose={() => setOpen(null)} onChange={(updated) => {
        setLeads((p) => p.map((x) => x.id === updated.id ? updated : x));
        setOpen(updated);
      }} onDelete={(id) => { setLeads((p) => p.filter((x) => x.id !== id)); setOpen(null); }} />
    </div>
  );
}

type Msg = { id: string; lead_id: string; sender_role: string; sender_user_id: string | null; body: string; created_at: string };

export function LeadSheet({ lead, onClose, onChange, onDelete }: { lead: Lead | null; onClose: () => void; onChange: (l: Lead) => void; onDelete: (id: string) => void; }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  const [draft, setDraft] = useState<Lead | null>(null);

  useEffect(() => {
    setDraft(lead);
    if (!lead) { setMessages([]); return; }
    supabase.from("lead_messages").select("*").eq("lead_id", lead.id).order("created_at")
      .then(({ data }) => setMessages((data ?? []) as Msg[]));
  }, [lead]);

  if (!lead || !draft) return <Sheet open={false} onOpenChange={() => onClose()}><SheetContent /></Sheet>;

  async function saveLead() {
    if (!draft) return;
    const payload = {
      stage: draft.stage,
      estimated_value: draft.estimated_value,
      internal_notes: draft.internal_notes,
    };
    const { data, error } = await supabase.from("leads").update(payload).eq("id", draft.id).select().maybeSingle();
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    onChange(data as Lead);
    toast({ title: "Lead updated" });
  }

  async function sendReply() {
    if (!reply.trim() || !lead || !user) return;
    const { data, error } = await supabase.from("lead_messages").insert({
      lead_id: lead.id, sender_role: "owner", sender_user_id: user.id, body: reply.trim(),
    }).select().maybeSingle();
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setMessages((p) => [...p, data as Msg]);
    setReply("");
    if (lead.stage === "new") {
      const { data: upd } = await supabase.from("leads").update({ stage: "contacted" }).eq("id", lead.id).select().maybeSingle();
      if (upd) onChange(upd as Lead);
    }
  }

  async function remove() {
    if (!confirm("Delete this lead and all its messages?")) return;
    await supabase.from("lead_messages").delete().eq("lead_id", lead.id);
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    onDelete(lead.id);
    toast({ title: "Deleted" });
  }

  const s = stageMeta(draft.stage);

  return (
    <Sheet open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{lead.contact_name}</SheetTitle>
          <span className={`mt-1 inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.color}`}>{s.label}</span>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info icon={Mail} label="Email" value={lead.contact_email} href={`mailto:${lead.contact_email}`} />
            {lead.contact_phone && <Info icon={Phone} label="Phone" value={lead.contact_phone} href={`tel:${lead.contact_phone}`} />}
            {lead.event_type && <Info icon={Calendar} label="Event" value={lead.event_type} />}
            {lead.event_date && <Info icon={Calendar} label="Date" value={lead.event_date} />}
            {lead.guest_count && <Info icon={Users} label="Guests" value={lead.guest_count} />}
            <Info icon={Calendar} label="Received" value={new Date(lead.created_at).toLocaleString()} />
          </div>

          {lead.message && (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Original message</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{lead.message}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stage</Label>
              <select className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value as any })}>
                {STAGES.map((x) => <option key={x.v} value={x.v}>{x.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Estimated value</Label>
              <div className="relative mt-1.5">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="number" className="pl-9" value={draft.estimated_value ?? ""}
                  onChange={(e) => setDraft({ ...draft, estimated_value: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Internal notes</Label>
            <Textarea className="mt-1.5" rows={3} value={draft.internal_notes ?? ""} onChange={(e) => setDraft({ ...draft, internal_notes: e.target.value })} placeholder="Only you can see this." />
          </div>

          <div className="flex justify-between gap-2">
            <Button variant="ghost" className="text-destructive" onClick={remove}><Trash2 className="mr-1.5 h-4 w-4" /> Delete</Button>
            <Button onClick={saveLead}>Save changes</Button>
          </div>

          <div className="border-t border-border pt-5">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><MessageSquare className="h-4 w-4" /> Messages</h3>
            <div className="mt-3 space-y-2">
              {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet. Start the conversation below.</p>}
              {messages.map((m) => (
                <div key={m.id} className={`max-w-[85%] rounded-2xl p-3 text-sm ${m.sender_role === "owner" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className={`mt-1 text-[10px] ${m.sender_role === "owner" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {m.sender_role} · {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Textarea rows={2} placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
              <Button onClick={sendReply} disabled={!reply.trim()}>Send</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Replies are saved to TruckHub. Email/SMS delivery coming soon.</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Info({ icon: Icon, label, value, href }: { icon: any; label: string; value: string; href?: string }) {
  const inner = (
    <div className="rounded-xl border border-border p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><Icon className="h-3 w-3" /> {label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
  return href ? <a href={href} className="block hover:bg-muted/40">{inner}</a> : inner;
}