import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { OwnerBusinessProvider, useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { OwnerProfileProvider } from "@/hooks/useOwnerProfile";
import { OwnerSidebar } from "@/components/owner/OwnerSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Bell, Plus, Sparkles } from "lucide-react";

const crumbs: Record<string, string> = {
  "/owner": "Dashboard",
  "/owner/leads": "Leads",
  "/owner/bookings": "Bookings",
  "/owner/calendar": "Calendar",
  "/owner/menu": "Menu",
  "/owner/profile": "Truck Page",
  "/owner/messages": "Messages",
  "/owner/settings": "Settings",
};

function Topbar() {
  const { pathname } = useLocation();
  const { business } = useOwnerBusiness();
  const label = crumbs[pathname] ?? "Workspace";
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <span className="font-semibold text-foreground/70">{business?.name ?? "Workspace"}</span>
          <span>/</span>
          <span>{label}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary md:inline-flex">
          <Sparkles className="h-3 w-3" /> Owner Console
        </span>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <Button size="sm" className="h-9 rounded-full" asChild>
          <a href="/owner/calendar"><Plus className="mr-1 h-3.5 w-3.5" /> New</a>
        </Button>
      </div>
    </header>
  );
}

export default function OwnerLayout() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <OwnerProfileProvider>
      <OwnerBusinessProvider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-cream-deep">
            <OwnerSidebar />
            <div className="flex min-h-screen flex-1 flex-col">
              <Topbar />
              <main className="flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8">
                <div className="mx-auto w-full max-w-6xl">
                  <Outlet />
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </OwnerBusinessProvider>
    </OwnerProfileProvider>
  );
}
