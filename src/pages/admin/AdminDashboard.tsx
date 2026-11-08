import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QueryStateNotice } from "@/components/qa/QueryStateNotice";
import { classifyQuery, countFromQuery, type ClassifiedQuery } from "@/lib/qa/queryResult";
import { Store, Inbox, Users, Tag, ArrowRight, Star } from "lucide-react";

type Stats = {
  totalBusinesses: number;
  published: number;
  unpublished: number;
  featured: number;
  totalLeads: number;
  newLeads: number;
  bookedLeads: number;
  totalUsers: number;
};

type RecentBusiness = {
  id: string;
  name: string;
  city: string | null;
  is_published: boolean;
  is_featured: boolean;
  slug: string;
};

type RecentLead = {
  id: string;
  contact_name: string;
  event_type: string | null;
  stage: string;
  businesses?: { name?: string | null; slug?: string | null } | null;
};

type RecentState<T> = ClassifiedQuery<T> | { kind: "loading" };

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [countError, setCountError] = useState<string | null>(null);
  const [recentBiz, setRecentBiz] = useState<RecentState<RecentBusiness>>({ kind: "loading" });
  const [recentLeads, setRecentLeads] = useState<RecentState<RecentLead>>({ kind: "loading" });

  useEffect(() => {
    (async () => {
      const [biz, leads, users, recentB, recentL] = await Promise.all([
        supabase.from("businesses").select("id,is_published,is_featured"),
        supabase.from("leads").select("id,stage"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("businesses").select("id,name,city,is_published,is_featured,updated_at,slug").order("updated_at", { ascending: false }).limit(5),
        supabase.from("leads").select("id,contact_name,event_type,stage,created_at,business_id,businesses(name,slug)").order("created_at", { ascending: false }).limit(5),
      ]);
      const businessCount = countFromQuery(biz);
      const leadCount = countFromQuery(leads);
      const userCount = countFromQuery(users);
      const countFailures = [businessCount, leadCount, userCount].flatMap((result) =>
        result.status === "error" ? [result.message] : [],
      );
      if (countFailures.length || businessCount.status !== "ok" || leadCount.status !== "ok") {
        setCountError(countFailures.join("; ") || "Dashboard counts failed to load");
        setStats(null);
      } else {
        const b = biz.data ?? [];
        const l = leads.data ?? [];
        setCountError(null);
        setStats({
          totalBusinesses: b.length,
          published: b.filter((x) => x.is_published).length,
          unpublished: b.filter((x) => !x.is_published).length,
          featured: b.filter((x) => x.is_featured).length,
          totalLeads: l.length,
          newLeads: l.filter((x) => x.stage === "new").length,
          bookedLeads: l.filter((x) => x.stage === "booked").length,
          totalUsers: userCount.status === "ok" ? userCount.count : 0,
        });
      }
      setRecentBiz(classifyQuery<RecentBusiness>(recentB));
      setRecentLeads(classifyQuery<RecentLead>(recentL));
    })();
  }, []);

  const cards = [
    { label: "Total businesses", value: stats?.totalBusinesses, hint: stats ? `${stats.published} published` : countError ? "Counts unavailable" : "Loading…" },
    { label: "Unpublished", value: stats?.unpublished, hint: "Not published" },
    { label: "Featured", value: stats?.featured, hint: "Highlighted on home" },
    { label: "Total leads", value: stats?.totalLeads, hint: stats ? `${stats.newLeads} new` : countError ? "Counts unavailable" : "Loading…" },
    { label: "Booked leads", value: stats?.bookedLeads, hint: "Lead stage, not the bookings table" },
    { label: "Total signups", value: stats?.totalUsers, hint: "Profiles" },
  ];

  return (
    <div data-tour="admin-root" className="space-y-8">
      <div>
        <span className="badge-ember">Platform overview</span>
        <h1 className="mt-3 font-display text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live snapshot across every truck on FoodXMobile.</p>
      </div>

      {countError && <QueryStateNotice kind="error" title="Dashboard counts" message={countError} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="rounded-2xl">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <p className="mt-2 font-display text-3xl font-bold">{c.value ?? "—"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {[
          { to: "/admin/businesses", label: "Businesses", icon: Store },
          { to: "/admin/leads", label: "Leads", icon: Inbox },
          { to: "/admin/users", label: "Users", icon: Users },
          { to: "/admin/categories", label: "Categories", icon: Tag },
        ].map((q) => (
          <Button key={q.to} asChild variant="outline" className="h-auto justify-between rounded-2xl px-4 py-4">
            <Link to={q.to}>
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <q.icon className="h-4 w-4" /> Manage {q.label.toLowerCase()}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent businesses</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/admin/businesses">View all</Link></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentBiz.kind === "error" && <QueryStateNotice kind="error" title="Recent businesses" message={recentBiz.message} />}
            {recentBiz.kind === "empty" && <p className="text-sm text-muted-foreground">No businesses yet.</p>}
            {recentBiz.kind === "rows" && recentBiz.rows.map((b) => (
              <Link key={b.id} to={`/admin/businesses?q=${encodeURIComponent(b.name)}`} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-accent">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{b.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{b.city ?? "—"}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {b.is_featured && <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3" /> Featured</Badge>}
                  <Badge variant={b.is_published ? "default" : "outline"}>{b.is_published ? "Live" : "Draft"}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent leads</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/admin/leads">View all</Link></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentLeads.kind === "error" && <QueryStateNotice kind="error" title="Recent leads" message={recentLeads.message} />}
            {recentLeads.kind === "empty" && <p className="text-sm text-muted-foreground">No leads yet.</p>}
            {recentLeads.kind === "rows" && recentLeads.rows.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{l.contact_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {l.businesses?.name ?? "—"} · {l.event_type ?? "—"}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">{l.stage}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}