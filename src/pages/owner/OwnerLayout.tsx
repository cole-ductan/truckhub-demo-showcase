import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Calendar, Inbox, LayoutDashboard, ListOrdered, MessageCircle, Settings, ShieldCheck } from "lucide-react";

const links = [
  { to: "/owner", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/owner/profile", label: "Business Profile", icon: Settings },
  { to: "/owner/menu", label: "Menu", icon: ListOrdered },
  { to: "/owner/calendar", label: "Calendar", icon: Calendar },
  { to: "/owner/leads", label: "Leads", icon: Inbox },
  { to: "/owner/messages", label: "Messages", icon: MessageCircle },
];

export default function OwnerLayout() {
  const { user, loading, isAdmin, signOut } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-cream-deep">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="container-tight flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Logo />
            <span className="hidden rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary md:inline">
              Owner Console
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <NavLink to="/admin"><ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Admin</NavLink>
              </Button>
            )}
            <Button onClick={signOut} variant="ghost" size="sm">Sign out</Button>
          </div>
        </div>
      </header>

      <div className="container-tight grid gap-8 py-10 md:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive ? "bg-primary text-primary-foreground" : "text-foreground/75 hover:bg-muted"
                }`
              }
            >
              <l.icon className="h-4 w-4" /> {l.label}
            </NavLink>
          ))}
        </aside>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}