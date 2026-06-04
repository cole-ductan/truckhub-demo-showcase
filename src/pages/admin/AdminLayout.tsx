import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ShieldCheck } from "lucide-react";

const crumbs: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/businesses": "Businesses",
  "/admin/import-businesses": "Import Listings",
  "/admin/listing-review": "Review Queue",
  "/admin/claim-requests": "Claim Requests",
  "/admin/outreach": "Outreach CRM",
  "/admin/leads": "Leads",
  "/admin/users": "Users & Roles",
  "/admin/categories": "Categories",
  "/admin/demo-tools": "Demo Tools",
};

function Topbar() {
  const { pathname } = useLocation();
  const label =
    crumbs[pathname] ??
    (pathname.startsWith("/admin/businesses/") ? "Business detail" : "Admin");
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <span className="font-semibold text-foreground/70">Admin</span>
          <span>/</span>
          <span>{label}</span>
        </div>
      </div>
      <span className="hidden items-center gap-1.5 rounded-full bg-secondary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-secondary md:inline-flex">
        <ShieldCheck className="h-3 w-3" /> Platform staff
      </span>
    </header>
  );
}

export default function AdminLayout() {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/owner" replace />;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-cream-deep">
        <AdminSidebar />
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
  );
}
