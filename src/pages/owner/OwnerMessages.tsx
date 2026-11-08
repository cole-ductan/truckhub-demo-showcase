import { useEffect, useRef, useState } from "react";
import { useOwnerLeadBoard } from "@/hooks/useOwnerLeadBoard";
import { Onboarding } from "@/components/owner/Onboarding";
import { LeadSheet } from "./OwnerLeads";
import { projectionToOwnerLeadView, type OwnerLeadView } from "@/lib/crm/viewModel";
import type { ThreadMessage } from "@/lib/crm/types";
import { MessageSquare } from "lucide-react";

type Thread = {
  lead: OwnerLeadView;
  lastBody: string | null;
  lastAt: string;
  count: number;
  lastSenderRole: string | null;
};

export default function OwnerMessages() {
  const board = useOwnerLeadBoard();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [open, setOpen] = useState<OwnerLeadView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [threadsLoading, setThreadsLoading] = useState(true);

  const businessId = board.business?.id ?? null;
  const workspaceKey = `${businessId ?? ""}:${board.actor.kind === "owner" ? board.actor.userId : ""}`;
  const marketplaceReady = board.directory.marketplaceStatus === "available";
  const workspaceRef = useRef(workspaceKey);
  const openIdRef = useRef<string | null>(open?.id ?? null);
  workspaceRef.current = workspaceKey;
  openIdRef.current = open?.id ?? null;
  useEffect(() => {
    setOpen(null);
    setThreads([]);
    setError(null);
    setThreadsLoading(true);
  }, [workspaceKey]);
  useEffect(() => {
    if (board.loading || !businessId || board.actor.kind !== "owner") {
      if (!board.loading) setThreadsLoading(false);
      return;
    }
    let cancelled = false;
    setThreadsLoading(true);
    setThreads([]);
    board.directory.listOwnerThreads(board.actor, businessId)
      .then((rows) => {
        if (cancelled) return;
        const list = rows
          .filter((row) => row.projection.kind === "direct" || (row.projection.kind === "marketplace" && row.projection.assignmentStatus === "accepted"))
          .map((row) => toThread(row.projection, row.messages));
        list.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
        setThreads(list);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setThreads([]);
        setError(caught instanceof Error ? caught.message : "Could not load messages.");
      })
      .finally(() => { if (!cancelled) setThreadsLoading(false); });
    return () => { cancelled = true; };
  }, [board.loading, businessId, board.actor, board.directory, board.version]);

  if (board.loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!board.business) return <Onboarding />;

  return (
    <div data-tour="messages-list" className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {marketplaceReady
            ? "Conversations for this business. You cannot read another vendor's thread."
            : "Conversations for direct inquiries to this business. Marketplace threads are not available in this database yet."}
        </p>
      </div>

      {error && <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

      {threadsLoading && !error ? (
        <p className="text-sm text-muted-foreground">Loading messages…</p>
      ) : threads.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
          <MessageSquare className="mx-auto h-8 w-8 opacity-50" />
          <p className="mt-3">No messages yet. Inquiries and replies will appear here.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card">
          {threads.map((t) => {
            const isUnread = t.lastSenderRole !== "owner" && t.lead.stage === "new";
            return (
              <li key={t.lead.id} onClick={() => setOpen(t.lead)} data-testid="owner-thread" className="flex cursor-pointer items-start gap-3 border-b border-border p-4 last:border-0 hover:bg-muted/40">
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

      <LeadSheet key={`${workspaceKey}:${open?.id ?? "closed"}`}
        lead={open}
        onClose={() => { setOpen(null); board.reload(); }}
        onChange={(updated) => {
          if (workspaceRef.current !== workspaceKey) return;
          setOpen((current) => current?.id === updated.id && current.business_id === updated.business_id ? updated : current);
        }}
        onDelete={() => {
          if (workspaceRef.current !== workspaceKey) return;
          setOpen((current) => current == null ? current : null);
          board.reload();
        }}
      />
    </div>
  );
}

function toThread(projection: Parameters<typeof projectionToOwnerLeadView>[0], messages: ThreadMessage[]): Thread {
  const lead = projectionToOwnerLeadView(projection);
  const last = messages[messages.length - 1];
  return {
    lead,
    lastBody: last?.body ?? (lead.customer_visible ? lead.message : null),
    lastAt: last?.createdAt ?? lead.created_at,
    count: messages.length,
    lastSenderRole: last?.senderRole ?? "customer",
  };
}
