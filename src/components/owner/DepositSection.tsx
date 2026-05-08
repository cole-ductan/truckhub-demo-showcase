import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, Copy, CreditCard, ExternalLink, Link2, AlertCircle } from "lucide-react";

type Prefs = {
  stripe_deposits_enabled: boolean;
  deposit_percentage: number;
  payment_mode: "no_deposits" | "stripe" | "external_link" | "manual_instructions";
  external_payment_url: string | null;
  manual_deposit_instructions: string | null;
};

type Deposit = {
  id: string; business_id: string; lead_id: string | null;
  customer_name: string | null; customer_email: string | null;
  amount_total: number | null; deposit_percentage: number; deposit_amount: number;
  status: "draft" | "checkout_created" | "pending" | "paid" | "failed" | "canceled" | "refunded";
  checkout_url: string | null; due_date: string | null; notes: string | null;
  paid_at: string | null;
};

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground", icon: Clock },
  checkout_created: { label: "Link created", cls: "bg-blue-500/15 text-blue-700", icon: Link2 },
  pending: { label: "Pending", cls: "bg-amber-500/15 text-amber-700", icon: Clock },
  paid: { label: "Deposit paid", cls: "bg-emerald-500/15 text-emerald-700", icon: CheckCircle2 },
  failed: { label: "Failed", cls: "bg-destructive/15 text-destructive", icon: AlertCircle },
  canceled: { label: "Canceled", cls: "bg-muted text-muted-foreground", icon: AlertCircle },
  refunded: { label: "Refunded", cls: "bg-muted text-muted-foreground", icon: AlertCircle },
};

export function DepositSection({
  businessId, leadId, customerName, customerEmail, estimatedValue,
}: {
  businessId: string; leadId: string;
  customerName?: string | null; customerEmail?: string | null; estimatedValue?: number | null;
}) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<{ total: string; pct: string; amount: string; due: string; notes: string }>({
    total: estimatedValue ? String(estimatedValue) : "", pct: "0", amount: "", due: "", notes: "",
  });

  useEffect(() => {
    supabase.from("owner_preferences").select("stripe_deposits_enabled,deposit_percentage,payment_mode,external_payment_url,manual_deposit_instructions")
      .eq("business_id", businessId).maybeSingle().then(({ data }) => {
        if (data) {
          const p = data as any as Prefs;
          setPrefs(p);
          setDraft((d) => ({
            ...d,
            pct: d.pct === "0" ? String(p.deposit_percentage || 0) : d.pct,
          }));
        }
      });
  }, [businessId]);

  useEffect(() => {
    supabase.from("deposit_requests").select("*").eq("lead_id", leadId).order("created_at", { ascending: false })
      .then(({ data }) => setDeposits((data ?? []) as Deposit[]));
  }, [leadId]);

  const enabled = !!prefs?.stripe_deposits_enabled;
  const hasExisting = deposits.length > 0;
  if (!enabled && !hasExisting) return null;

  // Auto-calc deposit amount when total or pct changes
  function recalc(next: typeof draft) {
    const total = Number(next.total) || 0;
    const pct = Number(next.pct) || 0;
    const amount = total > 0 && pct > 0 ? Math.round(total * pct) / 100 : Number(next.amount) || 0;
    return { ...next, amount: amount ? String(amount) : next.amount };
  }

  async function createLink() {
    const amount = Number(draft.amount);
    if (!amount || amount <= 0) { toast({ title: "Set a deposit amount", variant: "destructive" }); return; }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("create-deposit-checkout", {
      body: {
        business_id: businessId, lead_id: leadId,
        customer_name: customerName, customer_email: customerEmail,
        amount_total: Number(draft.total) || null,
        deposit_percentage: Number(draft.pct) || 0,
        deposit_amount: amount,
        due_date: draft.due || null,
        notes: draft.notes || null,
        origin: window.location.origin,
      },
    });
    setCreating(false);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    if ((data as any)?.deposit) {
      setDeposits((p) => [(data as any).deposit, ...p.filter((x) => x.id !== (data as any).deposit.id)]);
      if ((data as any).configured === false) {
        toast({ title: "Saved as draft", description: "Stripe is not configured yet — link will be created once keys are added." });
      } else {
        toast({ title: "Payment link ready" });
      }
    }
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copied" });
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold">
          <CreditCard className="h-4 w-4" /> Deposit
        </h3>
        {prefs?.payment_mode && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {prefs.payment_mode.replace("_", " ")}
          </span>
        )}
      </div>

      {deposits.length > 0 && (
        <ul className="mb-3 space-y-2">
          {deposits.map((d) => {
            const s = STATUS[d.status] ?? STATUS.draft;
            const SIcon = s.icon;
            return (
              <li key={d.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-semibold">${Number(d.deposit_amount).toLocaleString()}
                      {d.amount_total ? <span className="ml-1 text-xs font-normal text-muted-foreground">of ${Number(d.amount_total).toLocaleString()}{d.deposit_percentage ? ` · ${d.deposit_percentage}%` : ""}</span> : null}
                    </p>
                    {d.due_date && <p className="text-[11px] text-muted-foreground">Due {d.due_date}</p>}
                    {d.paid_at && <p className="text-[11px] text-emerald-700">Paid {new Date(d.paid_at).toLocaleDateString()}</p>}
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${s.cls}`}>
                    <SIcon className="h-3 w-3" /> {s.label}
                  </span>
                </div>
                {d.checkout_url && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => copyLink(d.checkout_url!)}>
                      <Copy className="mr-1.5 h-3 w-3" /> Copy payment link
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-full" asChild>
                      <a href={d.checkout_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3 w-3" /> Open</a>
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {enabled && prefs?.payment_mode === "stripe" && (
        <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Create a new deposit link</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px]">Total ($)</Label>
              <Input type="number" value={draft.total} onChange={(e) => setDraft(recalc({ ...draft, total: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[10px]">Deposit %</Label>
              <Input type="number" value={draft.pct} onChange={(e) => setDraft(recalc({ ...draft, pct: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[10px]">Amount ($)</Label>
              <Input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Due date</Label>
              <Input type="date" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px]">Note (optional)</Label>
              <Input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Wedding deposit" />
            </div>
          </div>
          <Button size="sm" className="rounded-full" disabled={creating} onClick={createLink}>
            <CreditCard className="mr-1.5 h-3.5 w-3.5" /> {creating ? "Creating…" : "Create deposit link"}
          </Button>
        </div>
      )}

      {enabled && prefs?.payment_mode === "external_link" && prefs.external_payment_url && (
        <div className="rounded-xl border border-dashed border-border p-3 text-sm">
          <p className="text-xs text-muted-foreground">Share your external payment link:</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{prefs.external_payment_url}</code>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => copyLink(prefs.external_payment_url!)}>
              <Copy className="mr-1.5 h-3 w-3" /> Copy
            </Button>
          </div>
        </div>
      )}

      {enabled && prefs?.payment_mode === "manual_instructions" && prefs.manual_deposit_instructions && (
        <div className="rounded-xl border border-dashed border-border p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Manual deposit instructions</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{prefs.manual_deposit_instructions}</p>
        </div>
      )}
    </section>
  );
}