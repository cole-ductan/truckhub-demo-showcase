import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import {
  Home, LayoutDashboard, LogOut, ShieldCheck, Store, Tag, Users, Inbox,
  ExternalLink, Wrench, Upload, ClipboardCheck, KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/businesses", label: "Businesses", icon: Store },
  { to: "/admin/import-businesses", label: "Import Listings", icon: Upload },
  { to: "/admin/listing-review", label: "Review Queue", icon: ClipboardCheck },
  { to: "/admin/claim-requests", label: "Claim Requests", icon: KeyRound },
  { to: "/admin/leads", label: "Leads", icon: Inbox },
  { to: "/admin/users", label: "Users & Roles", icon: Users },
  { to: "/admin/categories", label: "Categories", icon: Tag },
  { to: "/admin/demo-tools", label: "Demo Tools", icon: Wrench },
];

function initials(name?: string | null) {
  if (!name) return "A";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "A";
}

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string, end?: boolean) =>
    end ? pathname === path : pathname === path || pathname.startsWith(path + "/");

  const displayName = user?.email?.split("@")[0] || "Admin";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary/15 text-secondary shadow-soft">
            <ShieldCheck className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold leading-tight">Admin Console</p>
              <p className="truncate text-[10.5px] uppercase tracking-wider text-sidebar-foreground/55">
                FoodXMobile platform
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10.5px] uppercase tracking-wider text-sidebar-foreground/50">
              Manage
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((l) => (
                <SidebarMenuItem key={l.to}>
                  <SidebarMenuButton asChild isActive={isActive(l.to, l.end)} tooltip={l.label}>
                    <NavLink to={l.to} end={l.end}>
                      <l.icon className="h-4 w-4" />
                      <span>{l.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10.5px] uppercase tracking-wider text-sidebar-foreground/50">
              Switch
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Owner Console">
                  <NavLink to="/owner">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Owner Console</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Public site">
                  <a href="/" target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    <span>Public site</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Home">
                  <NavLink to="/">
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
            {initials(displayName)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">{displayName}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/60">Platform admin</p>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={signOut} title="Sign out">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
