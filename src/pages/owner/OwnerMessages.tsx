import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { Onboarding } from "@/components/owner/Onboarding";
import { LeadSheet, type Lead } from "./OwnerLeads";
import { MessageSquare } from "lucide-react";

type Thread = {
  lead: Lead;
  lastBody: string | null;
  lastAt: string;
  count: number;
  lastSenderRole: string | null;
};

export default function OwnerMessages() {
  const { business, loading } = useOwnerBusiness();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [open, setOpen] = useState<Lead | null>(null);

  async function reload() {
    if (!business) return;
    const { data: leads } = await supabase.from("leads").select("*").eq("business_id", business.id).order("created_at", { ascending: false });
    const ids = (leads ?? []).map((l) => l.id);
    if (ids.length === 0) { setThreads([]); return; }
    const { data: msgs } = await supabase.from("lead_messages").select("*").in("lead_id", ids).order("created_at");
    const byLead = new Map<string, any[]>();
    (msgs ?? []).forEach((m) => {
      const arr = byLead.get(m.lead_id) ?? [];
      arr.push(m); byLead.set(m.lead_id, arr);
    });
    const list: Thread[] = (leads as Lead[]).map((l) => {
      const ms = byLead.get(l.id) ?? [];
      const last = ms[ms.length - 1];
      return {
        lead: l,
        lastBody: last?.body ?? l.message,
        lastAt: last?.created_at ?? l.created_at,
        count: ms.length,
        lastSenderRole: last?.sender_role ?? "customer",
      };
    });
    list.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    setThreads(list);
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [business]);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!business) return <Onboarding />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">Threaded conversations with each customer who reached out.</p>
      </div>

      {threads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
          <MessageSquare className="mx-auto h-8 w-8 opacity-50" />
          <p className="mt-3">No messages yet. Inquiries and replies will appear here.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card">
          {threads.map((t) => {
            const isUnread = t.lastSenderRole !== "owner" && t.lead.stage === "new";
            return (
              <li key={t.lead.id} onClick={() => setOpen(t.lead)} className="flex cursor-pointer items-start gap-3 border-b border-border p-4 last:border-0 hover:bg-muted/40">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary">
                  {t.lead.contact_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate ${isUnread ? "font-bold" : "font-semibold"}`}>{t.lead.contact_name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{new Date(t.lastAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {t.lastSenderRole === "owner" ? "You: " : ""}{t.lastBody ?? "No message"}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {isUnread && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">New</span>}
                    <span className="text-[11px] text-muted-foreground">{t.count} message{t.count === 1 ? "" : "s"}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <LeadSheet
        lead={open}
        onClose={() => { setOpen(null); reload(); }}
        onChange={(updated) => setOpen(updated)}
        onDelete={() => { setOpen(null); reload(); }}
      />
    </div>
  );
}