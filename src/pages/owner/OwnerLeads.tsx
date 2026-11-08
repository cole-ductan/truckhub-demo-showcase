import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { useLeadDirectory, useOwnerLeadBoard } from "@/hooks/useOwnerLeadBoard";
import type { Actor, VendorLeadStage } from "@/lib/crm/types";
import { projectionToOwnerLeadView, type OwnerLeadView } from "@/lib/crm/viewModel";
import { Onboarding } from "@/components/owner/Onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Calendar, DollarSign, LayoutGrid, List, Mail, MapPin, MessageSquare, Phone, Search, Trash2, Users } from "lucide-react";
import { DepositSection } from "@/components/owner/DepositSection";

const STAGES: { v: VendorLeadStage; label: string; color: string }[] = [
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
type ViewMode = "table" | "kanban";

export default function OwnerLeads() {
  const { toast } = useToast();
  const board = useOwnerLeadBoard();
  const [leads, setLeads] = useState<OwnerLeadView[]>([]);
  const [stage, setStage] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [open, setOpen] = useState<OwnerLeadView | null>(null);
  const [view, setView] = useState<ViewMode>("kanban");

  useEffect(() => { setLeads(board.views); }, [board.views]);

  const filtered = useMemo(() => {
    let out = leads;
    if (stage !== "all") out = out.filter((l) => l.stage === stage);
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter((l) =>
        [l.contact_name, l.contact_email, l.contact_phone, l.event_type, l.event_date, l.public_location, l.guest_count, l.message]
          .some((value) => (value ?? "").toString().toLowerCase().includes(s))
      );
    }
    if (sort === "newest") out = [...out].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sort === "event_date") out = [...out].sort((a, b) => (a.event_date ?? "9999").localeCompare(b.event_date ?? "9999"));
    if (sort === "value") out = [...out].sort((a, b) => (b.estimated_value ?? 0) - (a.estimated_value ?? 0));
    return out;
  }, [leads, stage, q, sort]);

  if (board.loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!board.business) return <Onboarding />;

  async function moveStage(leadId: string, newStage: VendorLeadStage) {
    const current = leads.find((lead) => lead.id === leadId);
    if (!current?.can_edit_crm || !board.business || board.actor.kind !== "owner") {
      toast({ title: "This inquiry can't be moved yet", description: "Accept a marketplace request before changing its stage." });
      return;
    }
    const prev = leads;
    setLeads((p) => p.map((l) => l.id === leadId ? { ...l, stage: newStage } : l));
    try {
      const updated = projectionToOwnerLeadView(
        await board.directory.updateOwnerCrm(board.actor, board.business.id, leadId, { stage: newStage }),
      );
      setLeads((p) => p.map((l) => l.id === leadId ? updated : l));
      setOpen((currentOpen) => currentOpen?.id === leadId ? updated : currentOpen);
    } catch (error) {
      setLeads(prev);
      toast({ title: "Failed to move", description: error instanceof Error ? error.message : "Failed to move", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">Direct inquiries and marketplace requests for this business. Another vendor's notes stay on their own lead.</p>
        </div>
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          <button
            onClick={() => setView("kanban")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${view === "kanban" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Pipeline
          </button>
          <button
            onClick={() => setView("table")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${view === "table" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
        </div>
      </div>

      {board.error && <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{board.error}</div>}

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

      {filtered.length === 0 && view === "table" && !board.error ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
          {leads.length === 0 ? "No inquiries yet. They'll show up here as soon as customers reach out." : "No leads match your filters."}
        </div>
      ) : view === "kanban" ? (
        <div data-tour="leads-pipeline"><KanbanBoard leads={filtered} onOpen={setOpen} onMove={moveStage} /></div>
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
                  <tr key={l.id} onClick={() => setOpen(l)} className="cursor-pointer hover:bg-muted/40" data-testid="owner-lead-row" data-lead-id={l.id} data-customer-visible={l.customer_visible ? "true" : "false"} data-stage={l.stage}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{l.contact_name}</p>
                      <p className="text-xs text-muted-foreground">{l.customer_visible ? l.contact_email : l.assignment_status ?? "Direct"}</p>
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

type Msg = { id: string; body: string; sender_role: string; created_at: string };

export function LeadSheet({ lead, onClose, onChange, onDelete }: { lead: OwnerLeadView | null; onClose: () => void; onChange: (l: OwnerLeadView) => void; onDelete: (id: string) => void; }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { businesses } = useOwnerBusiness();
  const directory = useLeadDirectory();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  const [draft, setDraft] = useState<OwnerLeadView | null>(null);
  const businessKey = businesses.map((business) => business.id).join("|");

  useEffect(() => {
    setDraft(lead);
    if (!lead?.thread_open || !userId) { setMessages([]); return; }
    const threadActor: Actor = { kind: "owner", userId, businessIds: businessKey ? businessKey.split("|") : [] };
    let cancelled = false;
    directory.listThread(threadActor, lead.business_id, lead.id)
      .then((rows) => {
        if (!cancelled) setMessages(rows.map((row) => ({ id: row.id, body: row.body, sender_role: row.senderRole, created_at: row.createdAt })));
      })
      .catch(() => { if (!cancelled) setMessages([]); });
    return () => { cancelled = true; };
  }, [lead, directory, userId, businessKey]);

  if (!lead || !draft) return <Sheet open={false} onOpenChange={() => onClose()}><SheetContent /></Sheet>;

  function actor(): Actor | null {
    if (!userId) return null;
    return { kind: "owner", userId, businessIds: businessKey ? businessKey.split("|") : [] };
  }

  async function saveLead() {
    if (!draft?.can_edit_crm) return;
    const who = actor();
    if (!who) return;
    const patch = draft.kind === "marketplace"
      ? { stage: draft.stage, notes: draft.internal_notes, quote: draft.quote }
      : { stage: draft.stage, notes: draft.internal_notes, estimatedValue: draft.estimated_value };
    try {
      const updated = projectionToOwnerLeadView(await directory.updateOwnerCrm(who, draft.business_id, draft.id, patch));
      onChange(updated);
      toast({ title: "Lead updated" });
    } catch (error) {
      toast({ title: "Save failed", description: error instanceof Error ? error.message : "Save failed", variant: "destructive" });
    }
  }

  async function runAssignment(command: "accept" | "decline") {
    const who = actor();
    if (!who || !draft) return;
    try {
      const updated = projectionToOwnerLeadView(
        command === "accept"
          ? await directory.acceptAssignment(who, draft.business_id, draft.id)
          : await directory.declineAssignment(who, draft.business_id, draft.id),
      );
      onChange(updated);
      toast({ title: command === "accept" ? "Inquiry accepted" : "Inquiry declined" });
    } catch (error) {
      toast({ title: "Could not update the assignment", description: error instanceof Error ? error.message : "Could not update the assignment", variant: "destructive" });
    }
  }

  async function sendReply() {
    if (!reply.trim() || !lead?.thread_open || !user) return;
    const who = actor();
    if (!who) return;
    try {
      const message = await directory.appendOwnerMessage(who, lead.business_id, lead.id, reply.trim());
      setMessages((p) => [...p, { id: message.id, body: message.body, sender_role: message.senderRole, created_at: message.createdAt }]);
      setReply("");
      if (lead.kind === "direct") {
        supabase.functions.invoke("notify-owner-reply", { body: { message_id: message.id } }).catch(() => {});
      }
      if (lead.stage === "new") {
        const updated = projectionToOwnerLeadView(await directory.updateOwnerCrm(who, lead.business_id, lead.id, { stage: "contacted" }));
        onChange(updated);
      }
    } catch (error) {
      toast({ title: "Failed", description: error instanceof Error ? error.message : "Failed", variant: "destructive" });
    }
  }

  async function remove() {
    if (!lead?.can_delete) return;
    if (!confirm("Delete this lead and all its messages?")) return;
    const who = actor();
    if (!who) return;
    try {
      await directory.deleteDirectLead(who, lead.business_id, lead.id);
      onDelete(lead.id);
      toast({ title: "Deleted" });
    } catch (error) {
      toast({ title: "Failed", description: error instanceof Error ? error.message : "Failed", variant: "destructive" });
    }
  }

  const s = stageMeta(draft.stage);

  return (
    <Sheet open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{lead.contact_name}</SheetTitle>
          <div className="mt-1 flex flex-wrap gap-2">
            <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.color}`}>{s.label}</span>
            {lead.kind === "marketplace" && lead.assignment_status && (
              <span className="inline-flex w-fit rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase text-muted-foreground">{lead.assignment_status.replace("_", " ")}</span>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {!lead.customer_visible && (
            <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              {lead.can_accept ? "Accept this request to see the customer's contact details." : "Contact details are hidden for this assignment."}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {lead.customer_visible && <Info icon={Mail} label="Email" value={lead.contact_email} href={`mailto:${lead.contact_email}`} />}
            {lead.customer_visible && lead.contact_phone && <Info icon={Phone} label="Phone" value={lead.contact_phone} href={`tel:${lead.contact_phone}`} />}
            {lead.event_type && <Info icon={Calendar} label="Event" value={lead.event_type} />}
            {lead.event_date && <Info icon={Calendar} label="Date" value={[lead.event_date, lead.event_start_time, lead.event_end_time].filter(Boolean).join(" · ")} />}
            {lead.guest_count && <Info icon={Users} label="Guests" value={lead.guest_count} />}
            {lead.public_location && <Info icon={MapPin} label="Location" value={lead.public_location} />}
            {lead.customer_visible && lead.street_address && <Info icon={MapPin} label="Address" value={lead.street_address} />}
            <Info icon={Calendar} label="Received" value={new Date(lead.created_at).toLocaleString()} />
          </div>

          {lead.customer_visible && lead.message && (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Original message</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{lead.message}</p>
            </div>
          )}

          {(lead.can_accept || lead.can_decline) && (
            <div className="flex gap-2">
              {lead.can_accept && <Button onClick={() => runAssignment("accept")}>Accept inquiry</Button>}
              {lead.can_decline && <Button variant="outline" onClick={() => runAssignment("decline")}>Decline</Button>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stage</Label>
              <select className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" disabled={!draft.can_edit_crm}
                value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value as VendorLeadStage })}>
                {STAGES.map((x) => <option key={x.v} value={x.v}>{x.label}</option>)}
              </select>
            </div>
            {draft.kind === "direct" ? (
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Estimated value</Label>
                <div className="relative mt-1.5">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="number" className="pl-9" value={draft.estimated_value ?? ""}
                    onChange={(e) => setDraft({ ...draft, estimated_value: e.target.value === "" ? null : Number(e.target.value) })} />
                </div>
              </div>
            ) : (
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Customer budget</Label>
                <p className="mt-2 text-sm font-medium">{draft.estimated_value != null ? `$${Number(draft.estimated_value).toLocaleString()}` : draft.budget_range ?? "—"}</p>
              </div>
            )}
          </div>

          {draft.kind === "marketplace" && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Your quote</Label>
              {draft.can_edit_crm ? (
                <Textarea className="mt-1.5" rows={2} value={draft.quote ?? ""} onChange={(e) => setDraft({ ...draft, quote: e.target.value })} placeholder="Only your business can see this quote." />
              ) : (
                <p className="mt-1.5 text-sm">{draft.quote ?? "No quote yet."}</p>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{draft.kind === "marketplace" ? "Your notes" : "Internal notes"}</Label>
            {draft.can_edit_crm ? (
              <Textarea className="mt-1.5" rows={3} value={draft.internal_notes ?? ""} onChange={(e) => setDraft({ ...draft, internal_notes: e.target.value })} placeholder="Only your business can see this." />
            ) : (
              <p className="mt-1.5 whitespace-pre-wrap text-sm">{draft.internal_notes ?? "No notes."}</p>
            )}
          </div>

          {lead.kind === "direct" && (
            <DepositSection
              businessId={lead.business_id}
              leadId={lead.id}
              customerName={lead.contact_name}
              customerEmail={lead.contact_email}
              estimatedValue={draft.estimated_value}
            />
          )}

          <div className="flex justify-between gap-2">
            {lead.can_delete ? (
              <Button variant="ghost" className="text-destructive" onClick={remove}><Trash2 className="mr-1.5 h-4 w-4" /> Delete</Button>
            ) : <span />}
            {draft.can_edit_crm && <Button onClick={saveLead}>Save changes</Button>}
          </div>

          {lead.thread_open && (
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
              <p className="mt-2 text-xs text-muted-foreground">Replies are saved to FoodXMobile. Email/SMS delivery coming soon.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function KanbanBoard({ leads, onOpen, onMove }: { leads: OwnerLeadView[]; onOpen: (l: OwnerLeadView) => void; onMove: (id: string, stage: VendorLeadStage) => void }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const cols = STAGES.filter((s) => s.v !== "completed" && s.v !== "lost");
  const extras = STAGES.filter((s) => s.v === "completed" || s.v === "lost");
  const allCols = [...cols, ...extras];

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {allCols.map((col) => {
        const items = leads.filter((l) => l.stage === col.v);
        const value = items.reduce((s, l) => s + (Number(l.estimated_value) || 0), 0);
        return (
          <div
            key={col.v}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragId) { onMove(dragId, col.v); setDragId(null); } }}
            className="flex w-72 shrink-0 flex-col rounded-2xl border border-border bg-muted/30 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${col.color}`}>{col.label}</span>
                <span className="text-xs font-semibold text-muted-foreground">{items.length}</span>
              </div>
              {value > 0 && <span className="text-[11px] font-semibold text-muted-foreground">${value.toLocaleString()}</span>}
            </div>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">Drop leads here</p>
              ) : (
                items.map((l) => (
                  <div
                    key={l.id}
                    draggable={l.can_edit_crm}
                    onDragStart={() => setDragId(l.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => onOpen(l)}
                    data-testid="owner-lead-card"
                    data-lead-id={l.id}
                    data-customer-visible={l.customer_visible ? "true" : "false"}
                    data-stage={l.stage}
                    data-assignment={l.assignment_status ?? "direct"}
                    className="cursor-pointer rounded-xl border border-border bg-card p-3 shadow-sm transition hover:shadow-md"
                  >
                    <p className="truncate font-display text-sm font-semibold">{l.contact_name}</p>
                    {l.event_type && <p className="mt-0.5 truncate text-xs text-muted-foreground">{l.event_type}</p>}
                    {l.public_location && <p className="truncate text-xs text-muted-foreground">{l.public_location}</p>}
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{l.event_date ?? "Date TBD"}</span>
                      {l.estimated_value != null && <span className="font-semibold text-foreground">${Number(l.estimated_value).toLocaleString()}</span>}
                    </div>
                    {l.assignment_status && <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{l.assignment_status.replace("_", " ")}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Info({ icon: Icon, label, value, href }: { icon: typeof Mail; label: string; value: string; href?: string }) {
  const inner = (
    <div className="rounded-xl border border-border p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><Icon className="h-3 w-3" /> {label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
  return href ? <a href={href} className="block hover:bg-muted/40">{inner}</a> : inner;
}
