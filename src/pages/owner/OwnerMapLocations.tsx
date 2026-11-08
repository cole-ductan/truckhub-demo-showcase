import { useEffect, useState } from "react";
import { Crosshair, MapPin, Plus, Save, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerBusiness, type Business } from "@/hooks/useOwnerBusiness";
import { Onboarding } from "@/components/owner/Onboarding";

type Stop = {
  id: string; label: string; address: string | null; latitude: number | null; longitude: number | null;
  weekday: string | null; start_time: string | null; end_time: string | null; is_recurring: boolean;
};

type Draft = { label: string; address: string; latitude: string; longitude: string };
const emptyDraft: Draft = { label: "", address: "", latitude: "", longitude: "" };

const validLat = (v: number) => Number.isFinite(v) && v >= -90 && v <= 90;
const validLng = (v: number) => Number.isFinite(v) && v >= -180 && v <= 180;

function coords(lat: string | number | null | undefined, lng: string | number | null | undefined) {
  const latitudeText = String(lat ?? "").trim();
  const longitudeText = String(lng ?? "").trim();
  if (!latitudeText || !longitudeText) return null;
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);
  return validLat(latitude) && validLng(longitude) ? { latitude, longitude } : null;
}

function useBrowserLocation(onReady: (latitude: number, longitude: number) => void, onError: (message: string) => void) {
  if (!navigator.geolocation) return onError("Location access is not supported in this browser.");
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => onReady(Number(coords.latitude.toFixed(6)), Number(coords.longitude.toFixed(6))),
    (error) => onError(error.message || "Could not read your current location."),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
  );
}

export default function OwnerMapLocations() {
  const { business, loading, setBusiness } = useOwnerBusiness();
  const { toast } = useToast();
  const [stops, setStops] = useState<Stop[]>([]);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [current, setCurrent] = useState({ location: "", latitude: "", longitude: "" });

  useEffect(() => {
    if (!business) return;
    const b = business as any;
    setCurrent({ location: b.today_location ?? "", latitude: b.today_latitude?.toString() ?? "", longitude: b.today_longitude?.toString() ?? "" });
    (supabase as any).from("saved_locations").select("id,label,address,latitude,longitude,weekday,start_time,end_time,is_recurring")
      .eq("business_id", business.id).order("sort_order").then(({ data }: any) => setStops((data ?? []) as Stop[]));
  }, [business]);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!business) return <Onboarding />;

  async function saveCurrent() {
    const point = coords(current.latitude, current.longitude);
    if (!point) return toast({ title: "Check the coordinates", description: "Latitude must be -90 to 90 and longitude must be -180 to 180.", variant: "destructive" });
    setSaving(true);
    const { data, error } = await (supabase as any).from("businesses").update({ today_location: current.location.trim() || null, today_latitude: point.latitude, today_longitude: point.longitude }).eq("id", business.id).select().maybeSingle();
    setSaving(false);
    if (error) return toast({ title: "Could not save pin", description: error.message, variant: "destructive" });
    setBusiness(data as Business);
    toast({ title: "Saved map pin updated", description: "The coordinates stored on this listing were saved. Customers see those saved coordinates, not a live GPS check-in." });
  }

  async function addStop() {
    const point = coords(draft.latitude, draft.longitude);
    if (!draft.label.trim()) return;
    if (!point) return toast({ title: "Check the coordinates", description: "Add valid coordinates or use your current location.", variant: "destructive" });
    const { data, error } = await (supabase as any).from("saved_locations").insert({ business_id: business.id, label: draft.label.trim(), address: draft.address.trim() || null, latitude: point.latitude, longitude: point.longitude, sort_order: stops.length }).select().maybeSingle();
    if (error) return toast({ title: "Could not save stop", description: error.message, variant: "destructive" });
    setStops((s) => [...s, data as Stop]); setDraft(emptyDraft);
    toast({ title: "Saved stop added" });
  }

  async function useAsToday(stop: Stop) {
    if (stop.latitude == null || stop.longitude == null) return toast({ title: "Coordinates missing", description: "Add coordinates to this stop before saving it as the public map pin.", variant: "destructive" });
    const location = stop.address || stop.label;
    const { data, error } = await (supabase as any).from("businesses").update({ today_location: location, today_latitude: stop.latitude, today_longitude: stop.longitude }).eq("id", business.id).select().maybeSingle();
    if (error) return toast({ title: "Could not update today", description: error.message, variant: "destructive" });
    setBusiness(data as Business); setCurrent({ location, latitude: String(stop.latitude), longitude: String(stop.longitude) });
    toast({ title: "Saved map pin updated", description: stop.label });
  }

  async function removeStop(id: string) {
    const { error } = await (supabase as any).from("saved_locations").delete().eq("id", id);
    if (error) return toast({ title: "Could not remove stop", description: error.message, variant: "destructive" });
    setStops((s) => s.filter((stop) => stop.id !== id));
  }

  const browserError = (message: string) => toast({ title: "Location unavailable", description: message, variant: "destructive" });

  return <div className="space-y-6">
    <div><h1 className="font-display text-3xl font-bold">Map Locations</h1><p className="mt-1 text-sm text-muted-foreground">Save the coordinates customers see on the public map. Those pins are the coordinates stored here, not a live GPS check-in.</p></div>

    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Truck className="h-5 w-5" /></span><div><h2 className="font-display text-xl font-semibold">Current public pin</h2><p className="text-sm text-muted-foreground">Use this when you park at a new location today.</p></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-3"><Field label="Location label"><Input value={current.location} onChange={(e) => setCurrent((c) => ({ ...c, location: e.target.value }))} placeholder="Titletown District · Lot 7" /></Field><Field label="Latitude"><Input inputMode="decimal" value={current.latitude} onChange={(e) => setCurrent((c) => ({ ...c, latitude: e.target.value }))} placeholder="44.503900" /></Field><Field label="Longitude"><Input inputMode="decimal" value={current.longitude} onChange={(e) => setCurrent((c) => ({ ...c, longitude: e.target.value }))} placeholder="-88.060500" /></Field></div>
      <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => useBrowserLocation((latitude, longitude) => setCurrent((c) => ({ ...c, latitude: String(latitude), longitude: String(longitude) })), browserError)}><Crosshair className="mr-1.5 h-4 w-4" /> Use my current position</Button><Button onClick={saveCurrent} disabled={saving}><Save className="mr-1.5 h-4 w-4" />{saving ? "Saving…" : "Save map pin"}</Button></div>
    </section>

    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-xl font-semibold">Saved stops</h2><p className="text-sm text-muted-foreground">Keep breweries, office parks, markets, and recurring venues ready for one-tap map updates.</p></div><MapPin className="h-5 w-5 text-primary" /></div>
      <div className="mt-5 space-y-2">{stops.map((stop) => <div key={stop.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"><div><p className="font-medium">{stop.label}</p><p className="text-xs text-muted-foreground">{stop.address || "No address"} · {stop.latitude ?? "?"}, {stop.longitude ?? "?"}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => useAsToday(stop)}>Use today</Button><Button size="icon" variant="ghost" onClick={() => removeStop(stop.id)} aria-label={`Remove ${stop.label}`}><Trash2 className="h-4 w-4" /></Button></div></div>)}{stops.length === 0 && <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No saved stops yet.</p>}</div>
    </section>

    <section className="rounded-2xl border border-dashed border-border bg-card p-5">
      <h2 className="font-display text-xl font-semibold">Add a saved stop</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2"><Field label="Stop name"><Input value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} placeholder="Hinterland Brewery" /></Field><Field label="Address"><Input value={draft.address} onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))} placeholder="1001 Lombardi Ave" /></Field><Field label="Latitude"><Input inputMode="decimal" value={draft.latitude} onChange={(e) => setDraft((d) => ({ ...d, latitude: e.target.value }))} /></Field><Field label="Longitude"><Input inputMode="decimal" value={draft.longitude} onChange={(e) => setDraft((d) => ({ ...d, longitude: e.target.value }))} /></Field></div>
      <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => useBrowserLocation((latitude, longitude) => setDraft((d) => ({ ...d, latitude: String(latitude), longitude: String(longitude) })), browserError)}><Crosshair className="mr-1.5 h-4 w-4" /> Use my current position</Button><Button onClick={addStop} disabled={!draft.label.trim()}><Plus className="mr-1.5 h-4 w-4" /> Add saved stop</Button></div>
    </section>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label><div className="mt-1.5">{children}</div></div>; }
