import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { Onboarding } from "@/components/owner/Onboarding";
import { QueryStateNotice } from "@/components/qa/QueryStateNotice";
import { describeBookingsSurface } from "@/lib/qa/bookingsView";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, Clock, Download, FileText, MapPin, Users } from "lucide-react";

type Lead = {
  id: string; contact_name: string; event_type: string | null; event_date: string | null;
  guest_count: string | null; estimated_value: number | null; stage: string;
  message: string | null; created_at: string; updated_at: string;
};

const OPS_STAGES = ["booked", "pending", "quote_sent", "completed"] as const;
const STAGE_META: Record<string, { label: string; cls: string }> = {
  booked: { label: "Confirmed", cls: "bg-emerald-500/15 text-emerald-700" },
  pending: { label: "Negotiating", cls: "bg-amber-500/15 text-amber-700" },
  quote_sent: { label: "Quoted", cls: "bg-yellow-500/15 text-yellow-700" },
  completed: { label: "Completed", cls: "bg-muted text-muted-foreground" },
};

function fmtDate(iso: string | null) {
  if (!iso) return { mon: "—", day: "—" };
  const d = new Date(iso + "T00:00:00");
  return { mon: d.toLocaleDateString(undefined, { month: "short" }), day: String(d.getDate()) };
}

export default function OwnerBookings() {
  const { business, loading } = useOwnerBusiness();
  const [rows, setRows] = useState<Lead[]>([]);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "booked" | "pending" | "quote_sent" | "completed">("all");
  const [depositsByLead, setDepositsByLead] = useState<Record<string, { status: string; deposit_amount: number }>>({});
  const [depositsEnabled, setDepositsEnabled] = useState(false);

  useEffect(() => {
    if (!business) return;
    supabase.from("leads")
      .select("id,contact_name,event_type,event_date,guest_count,estimated_value,stage,message,created_at,updated_at")
      .eq("business_id", business.id)
      .in("stage", OPS_STAGES as unknown as ("booked" | "pending" | "quote_sent" | "completed")[])
      .order("event_date", { ascending: true, nullsFirst: false })
      .then(({ data, error }) => {
        if (error) {
          setLeadError(error.message);
          setRows([]);
          return;
        }
        setLeadError(null);
        setRows((data ?? []) as Lead[]);
      });
    supabase.from("owner_preferences").select("stripe_deposits_enabled").eq("business_id", business.id).maybeSingle()
      .then(({ data }) => setDepositsEnabled(!!(data as any)?.stripe_deposits_enabled));
    supabase.from("deposit_requests").select("lead_id,status,deposit_amount,created_at").eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const map: Record<string, { status: string; deposit_amount: number }> = {};
        (data ?? []).forEach((d: any) => { if (d.lead_id && !map[d.lead_id]) map[d.lead_id] = { status: d.status, deposit_amount: Number(d.deposit_amount) }; });
        setDepositsByLead(map);
      });
  }, [business]);

  const stats = useMemo(() => {
    const confirmed = rows.filter((r) => r.stage === "booked").length;
    const bookedRev = rows.filter((r) => r.stage === "booked" || r.stage === "completed")
      .reduce((s, r) => s + (Number(r.estimated_value) || 0), 0);
    const pendingRev = rows.filter((r) => r.stage === "pending" || r.stage === "quote_sent")
      .reduce((s, r) => s + (Number(r.estimated_value) || 0), 0);
    return { confirmed, bookedRev, pendingRev };
  }, [rows]);

  const filtered = tab === "all" ? rows : rows.filter((r) => r.stage === tab);
  const showDepositCol = depositsEnabled || Object.keys(depositsByLead).length > 0;

  function exportCsv() {
    const header = ["Date", "Customer", "Event", "Guests", "Stage", "Value"];
    const lines = [header.join(",")].concat(
      filtered.map((r) => [
        r.event_date ?? "", r.contact_name, r.event_type ?? "", r.guest_count ?? "",
        STAGE_META[r.stage]?.label ?? r.stage, r.estimated_value ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!business) return <Onboarding />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="badge-ember">Operations</span>
          <h1 className="mt-3 font-display text-3xl font-bold">Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Lead-stage bookings for this business. This view does not read the bookings table.</p>
        </div>
        <Button variant="outline" className="rounded-full" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={CheckCircle2} label="Confirmed bookings" value={stats.confirmed} accent />
        <Stat icon={FileText} label="Booked revenue" value={`$${stats.bookedRev.toLocaleString()}`} />
        <Stat icon={Clock} label="Pending in pipeline" value={`$${stats.pendingRev.toLocaleString()}`} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex flex-wrap gap-1">
          {(["all", "booked", "pending", "quote_sent", "completed"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}>
              {t === "all" ? `All events · ${rows.length}` : STAGE_META[t]?.label}
            </button>
          ))}
        </div>
      </div>

      {leadError ? (
        <QueryStateNotice kind="error" title="Lead-stage bookings" message={leadError} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          {rows.length === 0 ? (
            <>
              <p className="font-semibold text-foreground">{describeBookingsSurface({ bookingsTableCount: "not-loaded", leadDerivedCount: 0 }).headline}</p>
              <p className="mt-2">{describeBookingsSurface({ bookingsTableCount: "not-loaded", leadDerivedCount: 0 }).detail} Move a lead to Booked, Pending, or Quote Sent in the <Link to="/owner/leads" className="font-semibold text-primary hover:underline">pipeline</Link>.</p>
            </>
          ) : (
            <p>No lead-stage bookings in this tab.</p>
          )}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((r) => {
            const f = fmtDate(r.event_date);
            const m = STAGE_META[r.stage];
            const dep = depositsByLead[r.id];
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-muted">
                  <div className="text-center">
                    <div className="text-[10px] font-semibold uppercase leading-none text-muted-foreground">{f.mon}</div>
                    <div className="font-display text-xl font-bold leading-none">{f.day}</div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-base font-semibold">{r.event_type ?? "Event"}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${m?.cls}`}>{m?.label}</span>
                    {showDepositCol && dep && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        dep.status === "paid" ? "bg-emerald-500/15 text-emerald-700" :
                        dep.status === "checkout_created" || dep.status === "pending" ? "bg-amber-500/15 text-amber-700" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {dep.status === "paid" ? "Deposit paid" : dep.status === "checkout_created" ? "Deposit pending" : `Deposit ${dep.status}`}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{r.contact_name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {r.guest_count && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {r.guest_count}</span>}
                  </div>
                </div>
                <div className="text-right">
                  {r.estimated_value != null && <p className="font-display text-lg font-bold">${Number(r.estimated_value).toLocaleString()}</p>}
                  <Link to="/owner/leads" className="text-[11px] font-semibold text-primary hover:underline">Open lead →</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${accent ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-foreground/70"}`}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="mt-3 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
