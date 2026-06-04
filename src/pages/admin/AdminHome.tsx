import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, LayoutDashboard, ShieldCheck } from "lucide-react";

export default function AdminHome() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/owner" replace />;

  return (
    <div className="min-h-screen bg-cream-deep">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="container-tight flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden items-center gap-1.5 rounded-full bg-secondary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-secondary md:inline-flex">
              <ShieldCheck className="h-3 w-3" /> Admin Console
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link to="/owner"><LayoutDashboard className="mr-1.5 h-3.5 w-3.5" /> Owner Console</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link to="/"><Home className="mr-1.5 h-3.5 w-3.5" /> Public site</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container-tight py-10">
        <Link to="/owner" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3 w-3" /> Back to Owner Console
        </Link>

        <div className="mt-4">
          <span className="badge-ember">Platform staff only</span>
          <h1 className="mt-3 font-display text-4xl font-bold">Admin Console</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Approve trucks, manage users, and moderate content across FoodXMobile. Full controls ship in Phase 4.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Trucks", desc: "Approve submissions, toggle published & featured, edit any truck." },
            { title: "Users & roles", desc: "Search profiles and grant or revoke admin/owner roles." },
            { title: "Leads", desc: "Cross-truck inbox view for support and quality control." },
            { title: "Categories", desc: "Manage cuisines and discovery tags." },
            { title: "Platform stats", desc: "Total trucks, leads this week, signups this week." },
            { title: "Audit log", desc: "Track admin actions for accountability." },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-dashed border-border bg-card/60 p-5">
              <p className="font-display text-base font-semibold">{c.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
              <span className="mt-3 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Coming next
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
