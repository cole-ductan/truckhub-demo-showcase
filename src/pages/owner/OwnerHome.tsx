import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { Onboarding } from "@/components/owner/Onboarding";
import { Button } from "@/components/ui/button";
import {
  Calendar, CheckCircle2, ExternalLink, Eye, EyeOff, Inbox, ListOrdered,
  MapPin, Settings, Sparkles, TrendingUp,
} from "lucide-react";

type Stats = {
  menuItems: number;
  upcomingEvents: number;
  newLeads: number;
  bookedLeads: number;
  recent: Array<{ id: string; contact_name: string; event_type: string | null; created_at: string; stage: string }>;
  events: Array<{ id: string; title: string; event_date: string | null; location: string | null }>;
};

function profileCompletion(b: any): { pct: number; missing: string[] } {
  const checks: Array<[string, boolean]> = [
    ["Description", !!b.description],
    ["Cuisine", !!b.cuisine],
    ["Phone", !!b.phone],
    ["Email", !!b.email],
    ["Hero image", !!b.hero_image_url],
    ["Today's location", !!b.today_location],
    ["Today's hours", !!b.today_hours],
    ["Social link", !!(b.instagram || b.facebook || b.website)],
  ];
  const done = checks.filter(([, v]) => v).length;
  const missing = checks.filter(([, v]) => !v).map(([k]) => k);
  return { pct: Math.round((done / checks.length) * 100), missing };
}

export default function OwnerHome() {
  const { business, loading } = useOwnerBusiness();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!business) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [mi, ev, leadsAll, recent, evList] = await Promise.all([
        supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("business_id", business.id),
        supabase.from("business_events").select("id", { count: "exact", head: true }).eq("business_id", business.id).gte("event_date", today),
        supabase.from("leads").select("stage").eq("business_id", business.id),
        supabase.from("leads").select("id,contact_name,event_type,created_at,stage").eq("business_id", business.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("business_events").select("id,title,event_date,location").eq("business_id", business.id).gte("event_date", today).order("event_date").limit(5),
      ]);
      const stages = (leadsAll.data ?? []).map((l: any) => l.stage);
      setStats({
        menuItems: mi.count ?? 0,
        upcomingEvents: ev.count ?? 0,
        newLeads: stages.filter((s) => s === "new").length,
        bookedLeads: stages.filter((s) => s === "booked").length,
        recent: (recent.data ?? []) as any,
        events: (evList.data ?? []) as any,
      });
    })();
  }, [business]);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!business) return <Onboarding />;

  const { pct, missing } = profileCompletion(business);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="badge-ember"><Sparkles className="h-3 w-3" /> Owner Console</span>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight">{business.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            {business.is_published ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-700">
                <Eye className="h-3.5 w-3.5" /> Published
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-semibold text-muted-foreground">
                <EyeOff className="h-3.5 w-3.5" /> Unpublished
              </span>
            )}
            {business.cuisine && <span className="text-muted-foreground">· {business.cuisine}</span>}
            {business.today_location && <span className="inline-flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" /> {business.today_location}</span>}
          </div>
        </div>
        {business.is_published && (
          <Button asChild variant="outline" className="rounded-full">
            <a href={`/food-trucks/${business.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1.5 h-4 w-4" /> View public profile
            </a>
          </Button>
        )}
      </div>

      {/* Profile completion */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Profile completion</h2>
            <p className="text-sm text-muted-foreground">
              {pct === 100 ? "Your profile is complete." : `Add ${missing.length} more thing${missing.length === 1 ? "" : "s"} to maximize bookings.`}
            </p>
          </div>
          <span className="font-display text-3xl font-bold text-primary">{pct}%</span>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-ember transition-all" style={{ width: `${pct}%` }} />
        </div>
        {missing.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {missing.map((m) => (
              <span key={m} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{m}</span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ListOrdered} label="Menu items" value={stats?.menuItems ?? 0} to="/owner/menu" />
        <StatCard icon={Calendar} label="Upcoming events" value={stats?.upcomingEvents ?? 0} to="/owner/calendar" />
        <StatCard icon={Inbox} label="New inquiries" value={stats?.newLeads ?? 0} to="/owner/leads" highlight={!!stats?.newLeads} />
        <StatCard icon={CheckCircle2} label="Booked" value={stats?.bookedLeads ?? 0} to="/owner/leads" />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline" className="rounded-full"><Link to="/owner/profile"><Settings className="mr-1.5 h-3.5 w-3.5" /> Edit Profile</Link></Button>
        <Button asChild size="sm" variant="outline" className="rounded-full"><Link to="/owner/menu"><ListOrdered className="mr-1.5 h-3.5 w-3.5" /> Manage Menu</Link></Button>
        <Button asChild size="sm" variant="outline" className="rounded-full"><Link to="/owner/calendar"><Calendar className="mr-1.5 h-3.5 w-3.5" /> Manage Calendar</Link></Button>
        <Button asChild size="sm" variant="outline" className="rounded-full"><Link to="/owner/leads"><Inbox className="mr-1.5 h-3.5 w-3.5" /> View Leads</Link></Button>
      </div>

      {/* Recent + Events */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Recent inquiries</h3>
            <Link to="/owner/leads" className="text-xs font-semibold text-primary hover:underline">View all →</Link>
          </div>
          {stats?.recent.length === 0 && <p className="text-sm text-muted-foreground">No inquiries yet. They'll appear here as soon as customers reach out.</p>}
          <ul className="space-y-2.5">
            {stats?.recent.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{l.contact_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.event_type ?? "Inquiry"} · {new Date(l.created_at).toLocaleDateString()}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">{l.stage}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Upcoming events</h3>
            <Link to="/owner/calendar" className="text-xs font-semibold text-primary hover:underline">View all →</Link>
          </div>
          {stats?.events.length === 0 && <p className="text-sm text-muted-foreground">No upcoming events. Add one so customers know where to find you.</p>}
          <ul className="space-y-2.5">
            {stats?.events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{e.title}</p>
                  {e.location && <p className="truncate text-xs text-muted-foreground"><MapPin className="mr-1 inline h-3 w-3" />{e.location}</p>}
                </div>
                <span className="text-xs font-semibold text-primary">{e.event_date}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, to, highlight }: { icon: any; label: string; value: number; to: string; highlight?: boolean }) {
  return (
    <Link to={to} className={`group rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-card ${highlight ? "border-primary/50 ring-1 ring-primary/20" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <Icon className={`h-5 w-5 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
        {highlight && <TrendingUp className="h-4 w-4 text-primary" />}
      </div>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </Link>
  );
}