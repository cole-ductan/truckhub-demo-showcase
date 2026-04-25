import { Logo } from "./Logo";
import { Mail, Phone, MapPin, Instagram, Facebook } from "lucide-react";

export const SiteFooter = () => (
  <footer className="bg-ink text-ink-foreground">
    <div className="container-tight grid gap-12 py-16 md:grid-cols-4">
      <div className="md:col-span-2">
        <Logo variant="light" />
        <p className="mt-5 max-w-sm text-sm leading-relaxed text-cream/70">
          The home for Green Bay's food trucks. We build clean, mobile-first sites for local trucks
          and a hub where customers actually find you.
        </p>
        <div className="mt-6 flex gap-2">
          <a href="#" aria-label="Instagram" className="grid h-10 w-10 place-items-center rounded-full border border-cream/15 transition hover:bg-primary hover:border-primary">
            <Instagram className="h-4 w-4" />
          </a>
          <a href="#" aria-label="Facebook" className="grid h-10 w-10 place-items-center rounded-full border border-cream/15 transition hover:bg-primary hover:border-primary">
            <Facebook className="h-4 w-4" />
          </a>
        </div>
      </div>
      <div>
        <h4 className="font-display text-base font-semibold">Explore</h4>
        <ul className="mt-4 space-y-2.5 text-sm text-cream/70">
          <li><a href="/#trucks" className="hover:text-primary-glow">Today's Trucks</a></li>
          <li><a href="/#events" className="hover:text-primary-glow">Upcoming Events</a></li>
          <li><a href="/#how" className="hover:text-primary-glow">How It Works</a></li>
          <li><a href="/smoke-trail-bbq" className="hover:text-primary-glow">Sample Truck Page</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-display text-base font-semibold">Get in Touch</h4>
        <ul className="mt-4 space-y-2.5 text-sm text-cream/70">
          <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary-glow" /> (920) 555-0144</li>
          <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary-glow" /> hello@truckhubgb.com</li>
          <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary-glow" /> Green Bay, WI</li>
        </ul>
      </div>
    </div>
    <div className="border-t border-cream/10">
      <div className="container-tight flex flex-col items-center justify-between gap-3 py-6 text-xs text-cream/50 md:flex-row">
        <p>© {new Date().getFullYear()} TruckHub Green Bay — Demo site. All trucks, menus, and events shown are illustrative.</p>
        <p className="uppercase tracking-[0.2em]">Sales Demo · Sample Content</p>
      </div>
    </div>
  </footer>
);
