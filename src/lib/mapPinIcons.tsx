import { renderToStaticMarkup } from "react-dom/server";
import type { LucideIcon } from "lucide-react";
import {
  Truck, Music, Calendar, Tent, Store, Sparkles,
  Wrench, Beer, Wine, MapPin,
} from "lucide-react";

export type PinCategory =
  | "truck"
  | "market"
  | "event"
  | "vendor"
  | "featured"
  | "concert"
  | "workshop"
  | "pub_crawl"
  | "wine_walk";

const ICONS: Record<PinCategory, LucideIcon> = {
  truck: Truck,
  market: Tent,
  event: Calendar,
  vendor: Store,
  featured: Sparkles,
  concert: Music,
  workshop: Wrench,
  pub_crawl: Beer,
  wine_walk: Wine,
};

const PALETTE: Record<PinCategory, { bg: string; ring: string; icon: string }> = {
  truck:      { bg: "#ea580c", ring: "#1f160e", icon: "#ffffff" },
  market:     { bg: "#2f5d3a", ring: "#1f160e", icon: "#faf6ee" },
  event:      { bg: "#1f160e", ring: "#f4b740", icon: "#f4b740" },
  vendor:     { bg: "#7c3aed", ring: "#1f160e", icon: "#ffffff" },
  featured:   { bg: "#f4b740", ring: "#1f160e", icon: "#1f160e" },
  concert:    { bg: "#db2777", ring: "#1f160e", icon: "#ffffff" },
  workshop:   { bg: "#0ea5e9", ring: "#1f160e", icon: "#ffffff" },
  pub_crawl:  { bg: "#a16207", ring: "#1f160e", icon: "#faf6ee" },
  wine_walk:  { bg: "#7f1d1d", ring: "#1f160e", icon: "#faf6ee" },
};

export const CATEGORY_LABEL: Record<PinCategory, string> = {
  truck: "Food trucks",
  market: "Markets",
  event: "Events",
  vendor: "Vendors",
  featured: "Featured",
  concert: "Concerts",
  workshop: "Workshops",
  pub_crawl: "Pub crawls",
  wine_walk: "Wine walks",
};

// Map a free-text tag / cuisine to a category.
export function categorizeEvent(tag?: string | null): PinCategory {
  const t = (tag ?? "").toLowerCase();
  if (/(concert|music|band|dj|live)/.test(t)) return "concert";
  if (/(workshop|class|demo|learn)/.test(t)) return "workshop";
  if (/(pub|brew|beer|crawl)/.test(t)) return "pub_crawl";
  if (/(wine|winery|walk)/.test(t)) return "wine_walk";
  if (/(market|farmer|bazaar)/.test(t)) return "market";
  if (/(vendor|maker|pop)/.test(t)) return "vendor";
  if (/(festival|fair|event|celebration|holiday|festive)/.test(t)) return "event";
  return "event";
}

export function categorizeBusiness(opts: { isFeatured?: boolean; cuisine?: string | null }): PinCategory {
  if (opts.isFeatured) return "featured";
  const c = (opts.cuisine ?? "").toLowerCase();
  if (/(market|farmer)/.test(c)) return "market";
  if (/(vendor|maker|cart)/.test(c)) return "vendor";
  return "truck";
}

// Cartoon-sticker pin: chunky outline, drop-shadow, pointer tail, icon centered.
// Status applies a thin colored ring (open/soon/closed) for trucks.
export function renderPinElement(
  category: PinCategory,
  opts: { status?: "open" | "soon" | "closed"; size?: number } = {}
): HTMLElement {
  const size = opts.size ?? 48;
  const palette = PALETTE[category];
  const IconCmp = ICONS[category];

  const statusRing =
    opts.status === "open" ? "#22c55e" :
    opts.status === "soon" ? "#f59e0b" :
    opts.status === "closed" ? "#9ca3af" :
    null;

  const iconSvg = renderToStaticMarkup(
    <IconCmp size={Math.round(size * 0.46)} color={palette.icon} strokeWidth={2.5} />
  );

  const wrapper = document.createElement("div");
  // NOTE: MapLibre controls `transform` on the marker root to position it.
  // Never set transform here — apply scale to an inner element instead.
  wrapper.style.cssText = `width:${size}px;height:${size + 10}px;cursor:pointer;`;

  const inner = document.createElement("div");
  inner.style.cssText = `width:100%;height:100%;transform-origin:50% 100%;transition:transform .18s ease;`;
  wrapper.appendChild(inner);
  wrapper.onmouseenter = () => { inner.style.transform = "scale(1.12)"; };
  wrapper.onmouseleave = () => { inner.style.transform = "scale(1)"; };

  // Outer SVG: teardrop body + inner circle for icon
  inner.innerHTML = `
    <svg width="${size}" height="${size + 10}" viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;filter:drop-shadow(0 6px 8px rgba(31,22,14,.35));">
      <path d="M24 2 C12 2 4 10.5 4 22 C4 34 14 42 24 56 C34 42 44 34 44 22 C44 10.5 36 2 24 2 Z"
            fill="${palette.bg}" stroke="${palette.ring}" stroke-width="3" stroke-linejoin="round" />
      <circle cx="24" cy="22" r="13" fill="${palette.bg}" stroke="${statusRing ?? palette.ring}" stroke-width="${statusRing ? 2.5 : 1.5}" />
      <g transform="translate(${24 - Math.round(size * 0.46) / 2}, ${22 - Math.round(size * 0.46) / 2})">
        ${iconSvg}
      </g>
    </svg>
  `;
  return wrapper;
}

// Legend swatch used in the filter chip strip
export function LegendDot({ category }: { category: PinCategory }) {
  const palette = PALETTE[category];
  const Icon = ICONS[category] ?? MapPin;
  return (
    <span
      className="inline-grid h-5 w-5 place-items-center rounded-full ring-1"
      style={{ background: palette.bg, color: palette.icon, boxShadow: `0 0 0 2px ${palette.ring}` }}
    >
      <Icon size={11} strokeWidth={2.5} />
    </span>
  );
}