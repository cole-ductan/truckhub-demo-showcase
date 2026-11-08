import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, UnlockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { applyCartoonStyle } from "@/lib/cartoonMapStyle";
import {
  renderPinElement, categorizeEvent, categorizeBusiness,
  CATEGORY_LABEL, LegendDot, type PinCategory,
} from "@/lib/mapPinIcons";

declare global {
  interface Window { maplibregl?: any; }
}

type TruckPin = {
  id: string; name: string; slug: string; emoji: string | null; cuisine: string | null;
  status: "open" | "soon" | "closed"; today_location: string | null; today_hours: string | null;
  today_latitude: number; today_longitude: number;
  hero_image_url: string | null; logo_url: string | null; is_demo: boolean;
};

type EventPin = {
  id: string; title: string; tag: string | null; location: string | null; start_time: string | null;
  end_time: string | null; event_date: string | null; latitude: number; longitude: number;
  is_demo?: boolean | null;
  businesses?: { name?: string; slug?: string; emoji?: string | null; hero_image_url?: string | null; logo_url?: string | null; is_demo?: boolean | null } | null;
};

type Filter = "all" | "open" | "trucks" | "events";
const GREEN_BAY_CENTER: [number, number] = [-88.0198, 44.5133];
const styleUrl = (key: string) => `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(key)}`;
const clean = (v?: string | null) => (v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));

export function LiveDiscoveryMap({ compact = false }: { compact?: boolean } = {}) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [trucks, setTrucks] = useState<TruckPin[]>([]);
  const [events, setEvents] = useState<EventPin[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const key = (import.meta as any).env?.VITE_MAPTILER_KEY as string | undefined;

  useEffect(() => {
    (async () => {
      const [{ data: businessRows }, { data: eventRows }] = await Promise.all([
        (supabase as any).from("businesses")
          .select("id,name,slug,emoji,cuisine,status,today_location,today_hours,today_latitude,today_longitude,hero_image_url,logo_url,is_demo")
          .eq("is_published", true).not("today_latitude", "is", null).not("today_longitude", "is", null),
        (supabase as any).from("business_events")
          .select("id,title,tag,location,start_time,end_time,event_date,latitude,longitude,is_demo,businesses(name,slug,emoji,hero_image_url,logo_url,is_demo)")
          .eq("is_public", true).not("latitude", "is", null).not("longitude", "is", null),
      ]);
      setTrucks((businessRows ?? []) as TruckPin[]);
      setEvents((eventRows ?? []) as EventPin[]);
      setLoading(false);
    })();
  }, []);

  const filteredTrucks = useMemo(() => filter === "events" ? [] : trucks.filter((t) => filter !== "open" || t.status === "open"), [filter, trucks]);
  const filteredEvents = useMemo(() => filter === "trucks" || filter === "open" ? [] : events, [filter, events]);

  useEffect(() => {
    if (!key || !containerRef.current || !window.maplibregl || mapRef.current) return;
    const map = new window.maplibregl.Map({
      container: containerRef.current,
      style: styleUrl(key),
      center: GREEN_BAY_CENTER,
      zoom: 11.5,
    });
    map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      try { applyCartoonStyle(map); } catch (e) { console.warn("cartoon style failed", e); }
      setMapReady(true);
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; setMapReady(false); };
  }, [key]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !window.maplibregl) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const bounds = new window.maplibregl.LngLatBounds();

    filteredTrucks.forEach((t) => {
      const category = categorizeBusiness({ cuisine: t.cuisine });
      const photo = t.hero_image_url || t.logo_url;
      const photoHtml = photo ? `<img src="${clean(photo)}" alt="${clean(t.name)}" style="display:block;width:100%;height:110px;object-fit:cover;border-radius:10px;margin-bottom:8px"/>` : "";
      const kind = t.is_demo ? "Demo — sample listing" : "Verified listing — saved pin, not a live check-in";
      const popup = new window.maplibregl.Popup({ offset: 22, closeButton: false }).setHTML(`<div style="min-width:220px;max-width:240px">${photoHtml}<strong>${clean(t.emoji)} ${clean(t.name)}</strong><div style="margin-top:5px;font-size:12px">${clean(kind)}</div><div style="margin-top:5px;font-size:12px">${clean(t.cuisine)}</div><div style="margin-top:5px;font-size:12px">${clean(t.today_location)}${t.today_hours ? ` · ${clean(t.today_hours)}` : ""}</div><a href="/food-trucks/${clean(t.slug)}" style="display:inline-block;margin-top:9px;color:#ea580c;font-weight:700;font-size:12px">View listing →</a></div>`);
      const el = renderPinElement(category, { status: t.status });
      const marker = new window.maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([t.today_longitude, t.today_latitude]).setPopup(popup).addTo(map);
      el.addEventListener("mouseenter", () => { if (!popup.isOpen()) marker.togglePopup(); });
      el.addEventListener("mouseleave", () => { setTimeout(() => { if (popup.isOpen() && !el.matches(":hover")) marker.togglePopup(); }, 120); });
      markersRef.current.push(marker); bounds.extend([t.today_longitude, t.today_latitude]);
    });

    filteredEvents.forEach((e) => {
      const category = categorizeEvent(e.tag);
      const eventKind = e.is_demo || e.businesses?.is_demo ? "Demo event" : "Published event — saved details, not a live update";
      const vendor = e.businesses?.name ? `<div style="margin-top:5px;font-size:12px">Hosted by ${clean(e.businesses.name)}</div>` : "";
      const link = e.businesses?.slug ? `<a href="/food-trucks/${clean(e.businesses.slug)}" style="display:inline-block;margin-top:9px;color:#ea580c;font-weight:700;font-size:12px">View listing →</a>` : "";
      const photo = e.businesses?.hero_image_url || e.businesses?.logo_url || null;
      const photoHtml = photo ? `<img src="${clean(photo)}" alt="${clean(e.title)}" style="display:block;width:100%;height:110px;object-fit:cover;border-radius:10px;margin-bottom:8px"/>` : "";
      const popup = new window.maplibregl.Popup({ offset: 22, closeButton: false }).setHTML(`<div style="min-width:220px;max-width:240px">${photoHtml}<strong>${clean(CATEGORY_LABEL[category])} · ${clean(e.title)}</strong><div style="margin-top:5px;font-size:12px">${clean(eventKind)}</div><div style="margin-top:5px;font-size:12px">${clean(e.location)}${e.start_time ? ` · ${clean(e.start_time)}${e.end_time ? `–${clean(e.end_time)}` : ""}` : ""}</div>${vendor}${link}</div>`);
      const el = renderPinElement(category);
      const marker = new window.maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([e.longitude, e.latitude]).setPopup(popup).addTo(map);
      el.addEventListener("mouseenter", () => { if (!popup.isOpen()) marker.togglePopup(); });
      el.addEventListener("mouseleave", () => { setTimeout(() => { if (popup.isOpen() && !el.matches(":hover")) marker.togglePopup(); }, 120); });
      markersRef.current.push(marker); bounds.extend([e.longitude, e.latitude]);
    });

    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 70, maxZoom: 13.5, duration: 600 });
  }, [filteredTrucks, filteredEvents, mapReady]);

  const filters: Array<{ id: Filter; label: string }> = [
    { id: "all", label: "All saved pins" }, { id: "open", label: "Listed open" },
    { id: "trucks", label: "Food trucks" }, { id: "events", label: "Events" },
  ];

  const legendCategories: PinCategory[] = [
    "truck", "market", "event", "concert", "workshop", "pub_crawl", "wine_walk", "featured",
  ];

  if (compact) {
    return (
      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-lift">
        {key ? <div ref={containerRef} className="h-[420px] w-full md:h-[520px]" /> : (
          <div className="grid min-h-[420px] place-items-center bg-gradient-warm p-8 text-center md:min-h-[520px]">
            <div className="max-w-md">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><UnlockKeyhole className="h-7 w-7" /></span>
              <h3 className="mt-5 font-display text-2xl font-bold">Map preview is not connected.</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">A MapTiler browser key turns on the interactive map. Pins would still be saved coordinates, not a live check-in.</p>
            </div>
          </div>
        )}
        {loading && key && <div className="absolute inset-0 grid place-items-center bg-card/70 text-sm text-muted-foreground backdrop-blur-sm">Loading nearby trucks and events…</div>}
      </div>
    );
  }

  return (
    <section className="bg-cream-deep py-20 md:py-24">
      <div className="container-tight">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Directory map</p>
            <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">Saved listing and event pins</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">Pins use coordinates saved on published listings and public events. They are not a live location. Demo listings are labeled in the pin details.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => <button key={f.id} onClick={() => setFilter(f.id)} className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${filter === f.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground/75 hover:border-primary/40"}`}>{f.label}</button>)}
          </div>
        </div>

        <div className="relative mt-8 overflow-hidden rounded-[2rem] border border-border bg-card shadow-lift">
          {key ? <div ref={containerRef} className="h-[460px] w-full md:h-[620px]" /> : (
            <div className="grid min-h-[420px] place-items-center bg-gradient-warm p-8 text-center md:min-h-[560px]">
              <div className="max-w-md">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><UnlockKeyhole className="h-7 w-7" /></span>
                <h3 className="mt-5 font-display text-2xl font-bold">Map preview is not connected.</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">A MapTiler browser key turns on the interactive map. Pins would still be saved coordinates, not a live check-in.</p>
              </div>
            </div>
          )}
          {loading && key && <div className="absolute inset-0 grid place-items-center bg-card/70 text-sm text-muted-foreground backdrop-blur-sm">Loading nearby trucks and events…</div>}
          <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-background/92 px-3 py-2 text-xs shadow-soft backdrop-blur md:right-auto">
            {legendCategories.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5">
                <LegendDot category={c} />
                <span className="font-medium text-foreground/80">{CATEGORY_LABEL[c]}</span>
              </span>
            ))}
            <span className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Northeast Wisconsin
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
