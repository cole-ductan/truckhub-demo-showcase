import { Link, useLocation } from "react-router-dom";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const nav = [
  { label: "Home", href: "/" },
  { label: "Today's Trucks", href: "/#trucks" },
  { label: "Events", href: "/#events" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Sample Truck", href: "/smoke-trail-bbq" },
];

export const SiteHeader = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/85 backdrop-blur-xl border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="container-tight flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-sm font-medium text-foreground/75 transition-colors hover:text-foreground"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <a href="/#owner-pitch">For Truck Owners</a>
          </Button>
          <Button asChild size="sm" className="bg-primary text-primary-foreground shadow-ember hover:bg-primary/90">
            <a href="/#demo">Book a Demo</a>
          </Button>
        </div>
        <button
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="container-tight flex flex-col gap-1 py-4">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="rounded-lg px-3 py-3 text-base font-medium text-foreground/85 hover:bg-muted"
              >
                {n.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2">
              <Button asChild variant="outline" className="flex-1">
                <a href="/#owner-pitch">For Owners</a>
              </Button>
              <Button asChild className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                <a href="/#demo">Book Demo</a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
