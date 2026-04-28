import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { useOwnerProfile } from "@/hooks/useOwnerProfile";
import { Onboarding } from "@/components/owner/Onboarding";
import { Button } from "@/components/ui/button";
import {
  Activity, ArrowRight, Calendar as CalIcon, CheckCircle2, ClipboardList, Clock,
  DollarSign, Eye, FileText, Inbox, ListOrdered, MapPin, Plus, Send, Sparkles,
  TrendingUp, UserPlus,
} from "lucide-react";

type LeadLite = {
  id: string; contact_name: string; event_type: string | null; event_date: string | null;
  guest_count: string | null; message: string | null; stage: string;
  estimated_value: number | null; created_at: string; updated_at: string;
};
type EventLite = {
  id: string; title: string; event_date: string | null; location: string | null;
  start_time: string | null; end_time: string | null; is_public: boolean;
};

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function ago(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 86400 * 7) return `${Math.floor(d / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
function fmtDate(iso: string | null) {
  if (!iso) return { mon: "—", day: "—", full: "Date TBD" };
  const d = new Date(iso + "T00:00:00");
  return {
    mon: d.toLocaleDateString(undefined, { month: "short" }),
    day: String(d.getDate()),
    full: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
  };
}

const stageColor: Record<string, string> = {
  new: "bg-primary/15 text-primary",
  contacted: "bg-secondary/15 text-secondary",
  quote_sent: "bg-amber-500/15 text-amber-700",
  pending: "bg-yellow-500/15 text-yellow-700",
  booked: "bg-emerald-500/15 text-emerald-700",
  completed: "bg-muted text-muted-foreground",
  lost: "bg-muted text-muted-foreground",
};
const stageLabel: Record<string, string> = {
  new: "New", contacted: "Contacted", quote_sent: "Quote Sent",
  pending: "Pending", booked: "Booked", completed: "Completed", lost: "Lost",
};

export default function OwnerHome() {
  const { business, loading } = useOwnerBusiness();
  const { profile } = useOwnerProfile();
  const [leads, setLeads] = useState<LeadLite[]>([]);
  const [events, setEvents] = useState<EventLite[]>([]);

  useEffect(() => {
    if (!business) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [l, e] = await Promise.all([
        supabase.from("leads").select("id,contact_name,event_type,event_date,guest_count,message,stage,estimated_value,created_at,updated_at")
          .eq("business_id", business.id).order("created_at", { ascending: false }),
        supabase.from("business_events").select("id,title,event_date,location,start_time,end_time,is_public")
          .eq("business_id", business.id).gte("event_date", today).order("event_date").limit(6),
      ]);
      setLeads((l.data ?? []) as LeadLite[]);
      setEvents((e.data ?? []) as EventLite[]);
    })();
  }, [business]);

  const stats = useMemo(() => {
    const now = Date.now();
    const sevenDays = now - 7 * 86400_000;
    const newLeads = leads.filter((x) => x.stage === "new" && new Date(x.created_at).getTime() >= sevenDays).length;
    const followUps = leads.filter((x) => x.stage === "contacted" || x.stage === "pending").length;
    const quotesOut = leads.filter((x) => x.stage === "quote_sent").length;
    const bookedThisMonth = leads.filter((x) => {
      if (x.stage !== "booked") return false;
      const d = new Date(x.updated_at);
      return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
    }).length;
    const revenueBooked = leads
      .filter((x) => x.stage === "booked" || x.stage === "completed")
      .reduce((s, x) => s + (Number(x.estimated_value) || 0), 0);
    return { newLeads, followUps, quotesOut, bookedThisMonth, revenueBooked };
  }, [leads]);

  const hotLeads = leads.filter((l) => ["new", "contacted", "quote_sent", "pending"].includes(l.stage)).slice(0, 3);

  // Synthesized recent activity from leads + events
  const activity = useMemo(() => {
    const items: { id: string; icon: any; text: string; when: string; ts: number }[] = [];
    leads.slice(0, 12).forEach((l) => {
      const created = new Date(l.created_at).getTime();
      if (l.stage === "booked") items.push({ id: `b-${l.id}`, icon: CheckCircle2, text: `Booked: ${l.contact_name}${l.estimated_value ? ` — $${Number(l.estimated_value).toLocaleString()}` : ""}`, when: ago(l.updated_at), ts: new Date(l.updated_at).getTime() });
      else if (l.stage === "quote_sent") items.push({ id: `q-${l.id}`, icon: FileText, text: `Quote sent to ${l.contact_name}${l.estimated_value ? ` — $${Number(l.estimated_value).toLocaleString()}` : ""}`, when: ago(l.updated_at), ts: new Date(l.updated_at).getTime() });
      else if (l.stage === "contacted") items.push({ id: `c-${l.id}`, icon: Send, text: `Replied to ${l.contact_name}`, when: ago(l.updated_at), ts: new Date(l.updated_at).getTime() });
      else items.push({ id: `n-${l.id}`, icon: UserPlus, text: `New lead: ${l.contact_name}${l.event_type ? ` — ${l.event_type}` : ""}`, when: ago(l.created_at), ts: created });
    });
    return items.sort((a, b) => b.ts - a.ts).slice(0, 7);
  }, [leads]);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!business) return <Onboarding />;

  const firstName = (profile?.display_name || "there").split(/\s+/)[0];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="badge-ember"><Sparkles className="h-3 w-3" /> Owner Dashboard</span>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight md:text-[2.6rem]">
            {greet()}, {firstName} 👋
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Here's what's cooking across catering, events, and your truck schedule.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-full"><Link to="/owner/calendar"><Plus className="mr-1.5 h-3.5 w-3.5" /> Add Event</Link></Button>
          <Button asChild className="rounded-full"><Link to="/owner/leads"><Inbox className="mr-1.5 h-3.5 w-3.5" /> View Leads</Link></Button>
        </div>
      </div>

      {/* 5 stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Inbox} label="New leads" value={stats.newLeads} sub="Last 7 days" to="/owner/leads" highlight={stats.newLeads > 0} />
        <StatCard icon={Clock} label="Follow-ups due" value={stats.followUps} sub="Need a reply" to="/owner/leads" />
        <StatCard icon={FileText} label="Quotes out" value={stats.quotesOut} sub="Awaiting reply" to="/owner/leads" />
        <StatCard icon={CheckCircle2} label="Booked events" value={stats.bookedThisMonth} sub="This month" to="/owner/bookings" />
        <StatCard icon={DollarSign} label="Revenue booked" value={`$${stats.revenueBooked.toLocaleString()}`} sub="Estimated" to="/owner/bookings" accent />
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction icon={Inbox} title="View Leads" sub={stats.newLeads ? `${stats.newLeads} new` : "Pipeline"} to="/owner/leads" />
        <QuickAction icon={Plus} title="Add Event" sub="Public or private" to="/owner/calendar" />
        <QuickAction icon={CalIcon} title="Edit Schedule" sub="Weekly stops" to="/owner/calendar" />
        <QuickAction icon={ListOrdered} title="Update Menu" sub="Mark sold-out" to="/owner/menu" />
      </div>

      {/* Two-col: Upcoming + Activity */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Upcoming events */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">On the calendar</p>
              <h3 className="font-display text-lg font-semibold">Upcoming events</h3>
            </div>
            <Link to="/owner/calendar" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {events.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              No upcoming events. <Link to="/owner/calendar" className="font-semibold text-primary hover:underline">Add one →</Link>
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {events.map((e) => {
                const f = fmtDate(e.event_date);
                return (
                  <li key={e.id} className="flex items-center gap-4 py-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted text-center">
                      <div>
                        <div className="text-[10px] font-semibold uppercase leading-none text-muted-foreground">{f.mon}</div>
                        <div className="font-display text-lg font-bold leading-none">{f.day}</div>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display font-semibold">{e.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {e.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</span>}
                        {(e.start_time || e.end_time) && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {e.start_time}{e.end_time ? `–${e.end_time}` : ""}</span>}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${e.is_public ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {e.is_public ? "Public" : "Private"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recent activity */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <h3 className="font-display text-lg font-semibold">Recent activity</h3>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Live</span>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet. New leads and bookings will show here.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted">
                    <a.icon className="h-3.5 w-3.5 text-foreground/70" />
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="leading-snug">{a.text}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{a.when}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Hot leads */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Needs your attention</p>
            <h3 className="font-display text-lg font-semibold">Hot leads</h3>
          </div>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to="/owner/leads">Open pipeline <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>
        {hotLeads.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
            All caught up. New inquiries will appear here as soon as customers reach out.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hotLeads.map((l) => (
              <li key={l.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display font-semibold">{l.contact_name}</p>
                    {l.event_type && <p className="truncate text-xs text-muted-foreground">{l.event_type}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${stageColor[l.stage] ?? "bg-muted"}`}>
                    {stageLabel[l.stage] ?? l.stage}
                  </span>
                </div>
                {l.message && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">"{l.message}"</p>}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {l.event_date && <span className="inline-flex items-center gap-1"><CalIcon className="h-3 w-3" /> {l.event_date}</span>}
                  {l.guest_count && <span className="inline-flex items-center gap-1">👥 {l.guest_count}</span>}
                  {l.estimated_value && <span className="inline-flex items-center gap-1 font-semibold text-foreground/80"><DollarSign className="h-3 w-3" />{Number(l.estimated_value).toLocaleString()}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, to, highlight, accent }: { icon: any; label: string; value: number | string; sub: string; to: string; highlight?: boolean; accent?: boolean }) {
  return (
    <Link to={to} className={`group rounded-2xl border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-card ${highlight ? "border-primary/40 ring-1 ring-primary/15" : accent ? "border-secondary/30" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${accent ? "bg-secondary/15 text-secondary" : highlight ? "bg-primary/15 text-primary" : "bg-muted text-foreground/70"}`}>
          <Icon className="h-4 w-4" />
        </span>
        {highlight && <TrendingUp className="h-3.5 w-3.5 text-primary" />}
      </div>
      <p className="mt-3 font-display text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
    </Link>
  );
}

function QuickAction({ icon: Icon, title, sub, to }: { icon: any; title: string; sub: string; to: string }) {
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-ember text-primary-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-semibold">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{sub}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
