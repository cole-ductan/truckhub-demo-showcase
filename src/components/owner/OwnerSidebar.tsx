import { NavLink, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { useOwnerProfile } from "@/hooks/useOwnerProfile";
import { Calendar, ChevronsUpDown, ExternalLink, Home, Inbox, KeyRound, LayoutDashboard, ListOrdered, LogOut, MapPin, MessageCircle, Settings, ShieldCheck, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type LinkDef = { to: string; label: string; icon: typeof Inbox; end?: boolean; ownerOnly?: boolean };

const allLinks: LinkDef[] = [
  { to: "/owner", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/owner/leads", label: "Leads", icon: Inbox, ownerOnly: true },
  { to: "/owner/bookings", label: "Bookings", icon: Store, ownerOnly: true },
  { to: "/owner/calendar", label: "Calendar", icon: Calendar, ownerOnly: true },
  { to: "/owner/map", label: "Map Locations", icon: MapPin, ownerOnly: true },
  { to: "/owner/menu", label: "Menu", icon: ListOrdered, ownerOnly: true },
  { to: "/owner/profile", label: "Truck Page", icon: Truck, ownerOnly: true },
  { to: "/owner/messages", label: "Messages", icon: MessageCircle, ownerOnly: true },
  { to: "/owner/claims", label: "My Claims", icon: KeyRound },
  { to: "/owner/settings", label: "Settings", icon: Settings },
];

const initials = (name?: string | null) =>
  !name ? "U" : name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "U";

export function OwnerSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const { business, businesses, selectBusiness } = useOwnerBusiness();
  const { profile } = useOwnerProfile();
  const active = (path: string, end?: boolean) => (end ? pathname === path : pathname === path || pathname.startsWith(path + "/"));
  const display = profile?.display_name || user?.email?.split("@")[0] || "Owner";
  const title = profile?.owner_title || "Owner";
  const isClaimantOnly = businesses.length === 0;
  const links = allLinks.filter((l) => !l.ownerOnly || !isClaimantOnly);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-ember text-lg shadow-soft">
            {business?.emoji ?? "🚚"}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              {businesses.length > 1 ? (
                <Select value={business?.id ?? ""} onValueChange={(v) => selectBusiness(v)}>
                  <SelectTrigger className="h-7 border-none bg-transparent px-0 text-left text-sm font-semibold focus:ring-0">
                    <SelectValue placeholder="Select business" />
                    <ChevronsUpDown className="ml-1 h-3 w-3 opacity-60" />
                  </SelectTrigger>
                  <SelectContent>
                    {businesses.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        <span className="mr-1.5">{b.emoji ?? "🚚"}</span>{b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="truncate font-display text-sm font-semibold leading-tight">
                  {business?.name ?? (isClaimantOnly ? "No business yet" : "Your truck")}
                </p>
              )}
              <p className="truncate text-[10.5px] uppercase tracking-wider text-sidebar-foreground/55">
                {isClaimantOnly ? "Claimant" : businesses.length > 1 ? `${businesses.length} businesses` : "via FoodXMobile"}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10.5px] uppercase tracking-wider text-sidebar-foreground/50">Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((l) => (
                <SidebarMenuItem key={l.to}>
                  <SidebarMenuButton asChild isActive={active(l.to, l.end)} tooltip={l.label}>
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
          {!collapsed && <SidebarGroupLabel className="text-[10.5px] uppercase tracking-wider text-sidebar-foreground/50">Public</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {business?.slug && business?.is_published && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="View Public Profile">
                    <a href={`/food-trucks/${business.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" /><span>View Public Profile</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Back to Public Site">
                  <NavLink to="/"><Home className="h-4 w-4" /><span>Back to Public Site</span></NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Admin">
                    <NavLink to="/admin"><ShieldCheck className="h-4 w-4" /><span>Admin Console</span></NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">{initials(display)}</div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">{display}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/60">{title}</p>
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
