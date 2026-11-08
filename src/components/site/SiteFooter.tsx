import { Logo } from "./Logo";
import { Mail, MapPin, Instagram, Facebook } from "lucide-react";

const link = "hover:text-primary-glow";
export const SiteFooter = () => <footer className="bg-ink text-ink-foreground">
  <div className="container-tight grid gap-12 py-16 md:grid-cols-4">
    <div className="md:col-span-2"><Logo variant="light" /><p className="mt-5 max-w-sm text-sm leading-relaxed text-cream/70">Discover food trucks, markets, vendors, and local events near you.</p><div className="mt-6 flex gap-2"><a href="#" aria-label="Instagram" className="grid h-10 w-10 place-items-center rounded-full border border-cream/15 transition hover:bg-primary"><Instagram className="h-4 w-4" /></a><a href="#" aria-label="Facebook" className="grid h-10 w-10 place-items-center rounded-full border border-cream/15 transition hover:bg-primary"><Facebook className="h-4 w-4" /></a></div></div>
    <div><h4 className="font-display text-base font-semibold">Explore</h4><ul className="mt-4 space-y-2.5 text-sm text-cream/70"><li><a href="/food-trucks" className={link}>Food Trucks</a></li><li><a href="/markets" className={link}>Markets</a></li><li><a href="/events" className={link}>Local Events</a></li><li><a href="/for-vendors" className={link}>For Vendors</a></li><li><a href="/owner/login" className={link}>Owner Login</a></li></ul></div>
    <div><h4 className="font-display text-base font-semibold">Get in Touch</h4><ul className="mt-4 space-y-2.5 text-sm text-cream/70"><li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary-glow" /> hello@foodxmobile.com</li><li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary-glow" /> Northeast Wisconsin</li></ul></div>
  </div>
  <div className="border-t border-cream/10"><div className="container-tight flex flex-col items-center justify-between gap-3 py-6 text-xs text-cream/50 md:flex-row"><p>© {new Date().getFullYear()} FoodXMobile. Demo listings are labeled. Verified listings are published records that are not marked demo.</p><p className="uppercase tracking-[0.2em]">Local discovery · Mobile first</p></div></div>
</footer>;
