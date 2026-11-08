import { Link, useLocation } from "react-router-dom";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { label: "Home", href: "/" },
  { label: "Markets", href: "/markets" },
  { label: "Events", href: "/events" },
  { label: "Vendors", href: "/vendors" },
  { label: "Food Trucks", href: "/food-trucks" },
  { label: "Calendar", href: "/calendar" },
  { label: "Book a Truck", href: "/book-a-food-truck" },
  { label: "For Vendors", href: "/for-vendors" },
];

export const SiteHeader = ({ withBanner = false }: { withBanner?: boolean }) => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { user, isAdmin } = useAuth();
  const bannerAware = withBanner || pathname.startsWith("/food-trucks/") || pathname.startsWith("/book/");
  const [ownerStatus, setOwnerStatus] = useState<"owner" | "claimant" | "newcomer">("newcomer");

  useEffect(() => {
    if (!user || isAdmin) return;
    let cancelled = false;
    (async () => {
      const [{ count: bizCount }, { count: claimCount }] = await Promise.all([
        supabase.from("businesses").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase.from("claim_requests").select("id", { count: "exact", head: true }).eq("requester_user_id", user.id),
      ]);
      if (cancelled) return;
      if ((bizCount ?? 0) > 0) setOwnerStatus("owner");
      else if ((claimCount ?? 0) > 0) setOwnerStatus("claimant");
      else setOwnerStatus("newcomer");
    })();
    return () => { cancelled = true; };
  }, [user, isAdmin]);

  const ctaLabel = isAdmin ? "Admin" : ownerStatus === "owner" ? "My Console" : ownerStatus === "claimant" ? "My Listing Claims" : "Get Started";
  const ctaTo = isAdmin ? "/admin" : ownerStatus === "claimant" ? "/owner/claims" : "/owner";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const replaceLegacyBrand = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const current = node.nodeValue ?? "";
        const next = current
          .replace(/TruckHub Green Bay/g, "FoodXMobile")
          .replace(/TruckHub/g, "FoodXMobile")
          .replace(new RegExp("truckhubgb.com", "g"), "foodxmobile.com");
        if (next !== current) node.nodeValue = next;
      }
    };
    replaceLegacyBrand();
    const observer = new MutationObserver(replaceLegacyBrand);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <header className={`fixed inset-x-0 ${bannerAware && !scrolled ? "top-8" : "top-0"} z-50 transition-all duration-300 ${scrolled ? "bg-background/85 backdrop-blur-xl border-b border-border" : "bg-transparent"}`}>
      <div className="container-tight flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden min-w-0 flex-1 items-center gap-4 overflow-x-auto px-3 md:flex" aria-label="Primary">
          {nav.map((n) => <a key={n.href} href={n.href} className="shrink-0 text-sm font-medium text-foreground/75 transition-colors hover:text-foreground">{n.label}</a>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Button asChild size="sm" className="rounded-full bg-primary text-primary-foreground shadow-ember hover:bg-primary/90"><Link to={ctaTo}>{ctaLabel}</Link></Button>
          ) : (
            <><Button asChild variant="ghost" size="sm"><Link to="/owner/login">Owner Login</Link></Button><Button asChild size="sm" className="rounded-full bg-primary text-primary-foreground shadow-ember hover:bg-primary/90"><Link to="/food-trucks">Explore Near Me</Link></Button></>
          )}
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {open && <div className="border-t border-border bg-background md:hidden"><div className="container-tight flex flex-col gap-1 py-4">
        {nav.map((n) => <a key={n.href} href={n.href} className="rounded-lg px-3 py-3 text-base font-medium text-foreground/85 hover:bg-muted">{n.label}</a>)}
        <div className="mt-2 flex gap-2">{user ? <Button asChild className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"><Link to={ctaTo}>{ctaLabel}</Link></Button> : <><Button asChild variant="outline" className="flex-1"><Link to="/owner/login">Owner Login</Link></Button><Button asChild className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"><Link to="/food-trucks">Explore</Link></Button></>}</div>
      </div></div>}
    </header>
  );
};
