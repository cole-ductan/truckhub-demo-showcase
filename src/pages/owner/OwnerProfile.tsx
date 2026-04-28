import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerBusiness, type Business } from "@/hooks/useOwnerBusiness";
import { Onboarding } from "@/components/owner/Onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { resolveImage } from "@/lib/assets";
import {
  ExternalLink, Pencil, MapPin, Clock, Phone, Mail, Globe, Instagram, Facebook,
  ShoppingBag, Eye, EyeOff, Image as ImageIcon, Plus, Save, Trash2, CheckCircle2,
} from "lucide-react";

type Cat = { id: string; name: string; emoji: string | null };
type Photo = { id: string; url: string; caption: string | null; sort_order: number };
type SavedLocation = {
  id: string; business_id: string; label: string; address: string | null;
  notes: string | null; weekday: string | null; start_time: string | null;
  end_time: string | null; is_recurring: boolean; sort_order: number;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function OwnerProfile() {
  const { business, loading, setBusiness } = useOwnerBusiness();
  const { toast } = useToast();
  const [cats, setCats] = useState<Cat[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [savedLocs, setSavedLocs] = useState<SavedLocation[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    supabase.from("business_categories").select("id,name,emoji").order("sort_order")
      .then(({ data }) => setCats((data ?? []) as Cat[]));
  }, []);

  useEffect(() => {
    if (!business) return;
    supabase.from("business_photos").select("*").eq("business_id", business.id).order("sort_order")
      .then(({ data }) => setPhotos((data ?? []) as Photo[]));
    supabase.from("saved_locations")
      .select("*").eq("business_id", business.id).order("sort_order")
      .then(({ data }: any) => setSavedLocs((data ?? []) as SavedLocation[]));
  }, [business]);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!business) return <Onboarding />;

  const b = business as any;
  const heroImg = resolveImage(b.hero_image_url);
  const statusLabel = b.status === "open" ? "Open now" : b.status === "soon" ? "Opening soon" : "Closed";
  const statusTone =
    b.status === "open" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
    : b.status === "soon" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
    : "bg-muted text-muted-foreground border-border";

  async function applyTodayLocation(loc: SavedLocation) {
    const { data, error } = await supabase.from("businesses")
      .update({ today_location: loc.address || loc.label })
      .eq("id", b.id).select().maybeSingle();
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    setBusiness(data as Business);
    toast({ title: "Today's location set", description: loc.label });
  }

  async function togglePublished() {
    const { data, error } = await supabase.from("businesses")
      .update({ is_published: !b.is_published }).eq("id", b.id).select().maybeSingle();
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    setBusiness(data as Business);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Truck Page</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Preview of your public profile. Click <span className="font-medium text-foreground">Edit page</span> to change anything.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/food-trucks/${b.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1.5 h-4 w-4" /> View public page
            </Link>
          </Button>
          <Button size="sm" onClick={() => setEditorOpen(true)}>
            <Pencil className="mr-1.5 h-4 w-4" /> Edit page
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* LEFT: Public preview */}
        <div className="space-y-5">
          {/* Hero card */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="relative h-48 w-full bg-muted sm:h-64">
              {heroImg ? (
                <img src={heroImg} alt={b.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-10 w-10" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5">
                <div className="flex items-center gap-2 text-white">
                  {b.emoji && <span className="text-2xl">{b.emoji}</span>}
                  <h2 className="font-display text-2xl font-bold">{b.name}</h2>
                </div>
                {b.tagline && <p className="mt-1 text-sm text-white/85">{b.tagline}</p>}
              </div>
              <span className={`absolute right-3 top-3 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone}`}>
                {statusLabel}
              </span>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                {b.cuisine && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{b.cuisine}</span>}
                {b.today_location && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> {b.today_location}
                  </span>
                )}
                {b.today_hours && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" /> {b.today_hours}
                  </span>
                )}
              </div>
              {b.description && <p className="text-sm leading-relaxed text-foreground/90">{b.description}</p>}

              <div className="flex flex-wrap gap-2 pt-1">
                {b.ordering_enabled && b.online_ordering_url && (
                  <Button asChild size="sm">
                    <a href={b.online_ordering_url} target="_blank" rel="noreferrer">
                      <ShoppingBag className="mr-1.5 h-4 w-4" /> {b.order_button_label || "Order Online"}
                    </a>
                  </Button>
                )}
                {b.phone && (
                  <Button asChild variant="outline" size="sm"><a href={`tel:${b.phone}`}><Phone className="mr-1.5 h-4 w-4" /> {b.phone}</a></Button>
                )}
                {b.website && (
                  <Button asChild variant="outline" size="sm"><a href={b.website} target="_blank" rel="noreferrer"><Globe className="mr-1.5 h-4 w-4" /> Website</a></Button>
                )}
                {b.instagram && (
                  <Button asChild variant="outline" size="sm"><a href={b.instagram} target="_blank" rel="noreferrer"><Instagram className="mr-1.5 h-4 w-4" /> Instagram</a></Button>
                )}
                {b.facebook && (
                  <Button asChild variant="outline" size="sm"><a href={b.facebook} target="_blank" rel="noreferrer"><Facebook className="mr-1.5 h-4 w-4" /> Facebook</a></Button>
                )}
              </div>
            </div>
          </div>

          {/* Photos preview */}
          <PreviewCard title="Photos" cta={photos.length === 0 ? undefined : `${photos.length} total`}>
            {photos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No photos yet. Open the editor to add some.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {photos.slice(0, 10).map((p) => (
                  <div key={p.id} className="aspect-square overflow-hidden rounded-lg bg-muted">
                    <img src={resolveImage(p.url)} alt={p.caption ?? ""} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </PreviewCard>

          {/* Today / Recurring */}
          <PreviewCard title="Today & recurring stops">
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Today</p>
                <p className="mt-1 font-medium">{b.today_location || "—"}</p>
                <p className="text-muted-foreground">{b.today_hours || "Hours not set"}</p>
              </div>
              {savedLocs.filter((s) => s.is_recurring).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weekly schedule</p>
                  <ul className="mt-2 space-y-1.5">
                    {savedLocs.filter((s) => s.is_recurring).map((s) => (
                      <li key={s.id} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                        <span><span className="font-medium">{s.weekday || "—"}</span> · {s.label}</span>
                        <span className="text-xs text-muted-foreground">{s.start_time}{s.end_time ? `–${s.end_time}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </PreviewCard>
        </div>

        {/* RIGHT: cards */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Visibility</p>
                <p className="mt-1 font-display text-lg font-semibold">
                  {b.is_published ? "Published" : "Hidden"}
                </p>
              </div>
              <Switch checked={!!b.is_published} onCheckedChange={togglePublished} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {b.is_published
                ? "Your truck page is live and discoverable."
                : "Only you can see this page right now."}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Connected</p>
            <ul className="mt-3 space-y-2 text-sm">
              <ConnectedRow ok={!!b.online_ordering_url && !!b.ordering_enabled} label="Online ordering" />
              <ConnectedRow ok={!!b.phone} label="Phone" />
              <ConnectedRow ok={!!b.email} label="Email" />
              <ConnectedRow ok={!!b.instagram} label="Instagram" />
              <ConnectedRow ok={!!b.facebook} label="Facebook" />
              <ConnectedRow ok={!!b.hero_image_url} label="Hero image" />
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Saved locations</p>
            <p className="mt-1 text-2xl font-display font-semibold">{savedLocs.length}</p>
            <p className="text-xs text-muted-foreground">For one-tap "today" updates.</p>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setEditorOpen(true)}>
              Manage in editor
            </Button>
          </div>

          {savedLocs.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Quick set today</p>
              <ul className="mt-3 space-y-2">
                {savedLocs.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <button onClick={() => applyTodayLocation(s)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:border-primary hover:bg-primary/5">
                      <p className="font-medium">{s.label}</p>
                      {s.address && <p className="text-xs text-muted-foreground">{s.address}</p>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <EditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        business={b}
        cats={cats}
        photos={photos}
        setPhotos={setPhotos}
        savedLocs={savedLocs}
        setSavedLocs={setSavedLocs}
        onSaved={(next) => setBusiness(next)}
      />
    </div>
  );
}

function PreviewCard({ title, cta, children }: { title: string; cta?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {cta && <span className="text-xs text-muted-foreground">{cta}</span>}
      </div>
      {children}
    </section>
  );
}

function ConnectedRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-foreground/90">{label}</span>
      {ok ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" /> Connected
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">Not set</span>
      )}
    </li>
  );
}

/* -------------------- Editor Sheet -------------------- */

function EditorSheet({
  open, onOpenChange, business, cats, photos, setPhotos, savedLocs, setSavedLocs, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  business: any;
  cats: Cat[];
  photos: Photo[];
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
  savedLocs: SavedLocation[];
  setSavedLocs: React.Dispatch<React.SetStateAction<SavedLocation[]>>;
  onSaved: (b: Business) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<any>(business);
  const [saving, setSaving] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newPhotoCaption, setNewPhotoCaption] = useState("");

  useEffect(() => { if (open) setForm(business); }, [open, business]);

  function set<K extends string>(k: K, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }

  async function save() {
    setSaving(true);
    const payload: any = {
      name: form.name ?? business.name,
      tagline: form.tagline ?? null,
      description: form.description ?? null,
      cuisine: form.cuisine ?? null,
      category_id: form.category_id ?? null,
      city: form.city ?? null,
      region: form.region ?? null,
      phone: form.phone ?? null,
      email: form.email ?? null,
      website: form.website ?? null,
      facebook: form.facebook ?? null,
      instagram: form.instagram ?? null,
      logo_url: form.logo_url ?? null,
      hero_image_url: form.hero_image_url ?? null,
      emoji: form.emoji ?? null,
      today_location: form.today_location ?? null,
      today_hours: form.today_hours ?? null,
      status: form.status ?? business.status,
      is_published: form.is_published ?? business.is_published,
      online_ordering_url: form.online_ordering_url ?? null,
      order_button_label: form.order_button_label ?? null,
      ordering_enabled: !!form.ordering_enabled,
    };
    const { data, error } = await supabase.from("businesses").update(payload).eq("id", business.id).select().maybeSingle();
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    onSaved(data as Business);
    toast({ title: "Saved", description: "Your truck page is up to date." });
  }

  async function addPhoto() {
    if (!newPhotoUrl.trim()) return;
    const next = (photos[photos.length - 1]?.sort_order ?? -1) + 1;
    const { data, error } = await supabase.from("business_photos").insert({
      business_id: business.id, url: newPhotoUrl.trim(), caption: newPhotoCaption.trim() || null, sort_order: next,
    }).select().maybeSingle();
    if (error) { toast({ title: "Could not add photo", description: error.message, variant: "destructive" }); return; }
    setPhotos((p) => [...p, data as Photo]);
    setNewPhotoUrl(""); setNewPhotoCaption("");
  }
  async function removePhoto(id: string) {
    const { error } = await supabase.from("business_photos").delete().eq("id", id);
    if (error) return toast({ title: "Could not remove", description: error.message, variant: "destructive" });
    setPhotos((p) => p.filter((x) => x.id !== id));
  }

  /* saved locations CRUD */
  const [newLoc, setNewLoc] = useState<{ label: string; address: string; weekday: string; start_time: string; end_time: string; is_recurring: boolean }>({
    label: "", address: "", weekday: "", start_time: "", end_time: "", is_recurring: false,
  });
  async function addSavedLoc() {
    if (!newLoc.label.trim()) return;
    const next = (savedLocs[savedLocs.length - 1]?.sort_order ?? -1) + 1;
    const payload = {
      business_id: business.id,
      label: newLoc.label.trim(),
      address: newLoc.address.trim() || null,
      weekday: newLoc.is_recurring ? (newLoc.weekday || null) : null,
      start_time: newLoc.start_time || null,
      end_time: newLoc.end_time || null,
      is_recurring: newLoc.is_recurring,
      sort_order: next,
    };
    const { data, error } = await supabase.from("saved_locations").insert(payload).select().maybeSingle();
    if (error) return toast({ title: "Could not save location", description: error.message, variant: "destructive" });
    setSavedLocs((s) => [...s, data as SavedLocation]);
    setNewLoc({ label: "", address: "", weekday: "", start_time: "", end_time: "", is_recurring: false });
  }
  async function removeSavedLoc(id: string) {
    const { error } = await supabase.from("saved_locations").delete().eq("id", id);
    if (error) return toast({ title: "Could not remove", description: error.message, variant: "destructive" });
    setSavedLocs((s) => s.filter((x) => x.id !== id));
  }
  async function applySavedAsToday(s: SavedLocation) {
    set("today_location", s.address || s.label);
    toast({ title: "Applied", description: `Today set to ${s.label}. Don't forget to save.` });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">Edit Truck Page</SheetTitle>
          <SheetDescription>Changes save when you press Save below.</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="basics" className="mt-5">
          <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="ordering">Ordering</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="publish">Publish</TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-4 pt-4">
            <FieldRow>
              <Field label="Business name"><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label="Emoji" hint="One emoji shown next to your name."><Input value={form.emoji ?? ""} onChange={(e) => set("emoji", e.target.value)} maxLength={4} /></Field>
            </FieldRow>
            <Field label="URL slug" hint="Cannot be edited. Contact support to change.">
              <Input value={business.slug} disabled className="font-mono text-xs" />
            </Field>
            <Field label="Tagline"><Input value={form.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} placeholder="One catchy line." /></Field>
            <Field label="Description"><Textarea rows={4} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Tell customers what you do best." /></Field>
            <FieldRow>
              <Field label="Cuisine"><Input value={form.cuisine ?? ""} onChange={(e) => set("cuisine", e.target.value)} placeholder="BBQ, Tacos, Pizza…" /></Field>
              <Field label="Category">
                <select value={form.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">— None —</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ""}{c.name}</option>)}
                </select>
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label="City"><Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>
              <Field label="Region / State"><Input value={form.region ?? ""} onChange={(e) => set("region", e.target.value)} /></Field>
            </FieldRow>
          </TabsContent>

          <TabsContent value="media" className="space-y-4 pt-4">
            <Field label="Logo URL"><Input value={form.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://… or asset:logo.png" /></Field>
            <Field label="Hero image URL"><Input value={form.hero_image_url ?? ""} onChange={(e) => set("hero_image_url", e.target.value)} placeholder="https://… or asset:hero.jpg" /></Field>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Photo gallery</Label>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos.map((p) => (
                  <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
                    <img src={resolveImage(p.url)} alt={p.caption ?? ""} className="h-full w-full object-cover" />
                    <button onClick={() => removePhoto(p.id)} className="absolute right-1 top-1 rounded bg-destructive/90 p-1 text-destructive-foreground opacity-0 transition group-hover:opacity-100">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-2 rounded-lg border border-dashed border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
                <Input placeholder="Photo URL" value={newPhotoUrl} onChange={(e) => setNewPhotoUrl(e.target.value)} />
                <Input placeholder="Caption (optional)" value={newPhotoCaption} onChange={(e) => setNewPhotoCaption(e.target.value)} />
                <Button onClick={addPhoto} disabled={!newPhotoUrl.trim()}><Plus className="mr-1 h-4 w-4" /> Add</Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground"><ImageIcon className="mr-1 inline h-3 w-3" /> File uploads coming soon.</p>
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4 pt-4">
            <FieldRow>
              <Field label="Phone"><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
              <Field label="Email"><Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
            </FieldRow>
            <Field label="Website"><Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} /></Field>
            <FieldRow>
              <Field label="Instagram URL"><Input value={form.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} /></Field>
              <Field label="Facebook URL"><Input value={form.facebook ?? ""} onChange={(e) => set("facebook", e.target.value)} /></Field>
            </FieldRow>
          </TabsContent>

          <TabsContent value="ordering" className="space-y-4 pt-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
              <div>
                <p className="font-medium">Online ordering enabled</p>
                <p className="text-xs text-muted-foreground">Show an order button on your public page.</p>
              </div>
              <Switch checked={!!form.ordering_enabled} onCheckedChange={(v) => set("ordering_enabled", v)} />
            </div>
            <Field label="Online ordering URL"><Input value={form.online_ordering_url ?? ""} onChange={(e) => set("online_ordering_url", e.target.value)} placeholder="https://…" /></Field>
            <Field label="Order button label" hint="Defaults to “Order Online”."><Input value={form.order_button_label ?? ""} onChange={(e) => set("order_button_label", e.target.value)} placeholder="Order Online" /></Field>
          </TabsContent>

          <TabsContent value="today" className="space-y-4 pt-4">
            <Field label="Today's location"><Input value={form.today_location ?? ""} onChange={(e) => set("today_location", e.target.value)} placeholder="Titletown · Lot 7" /></Field>
            <FieldRow>
              <Field label="Today's hours"><Input value={form.today_hours ?? ""} onChange={(e) => set("today_hours", e.target.value)} placeholder="11:00 – 8:00" /></Field>
              <Field label="Status">
                <select value={form.status ?? "closed"} onChange={(e) => set("status", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="open">Open now</option>
                  <option value="soon">Opening soon</option>
                  <option value="closed">Closed</option>
                </select>
              </Field>
            </FieldRow>
            {savedLocs.length > 0 && (
              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Apply a saved location</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {savedLocs.map((s) => (
                    <button key={s.id} onClick={() => applySavedAsToday(s)} className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:border-primary hover:bg-primary/5">
                      <p className="font-medium">{s.label}</p>
                      {s.address && <p className="text-xs text-muted-foreground">{s.address}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="locations" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Save your common stops here. Use them to update today's location in one tap, or mark them recurring to show a weekly schedule on your public page.
            </p>
            <ul className="space-y-2">
              {savedLocs.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background p-3">
                  <div className="min-w-0">
                    <p className="font-medium">{s.label} {s.is_recurring && <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">Weekly</span>}</p>
                    {s.address && <p className="truncate text-xs text-muted-foreground">{s.address}</p>}
                    {s.is_recurring && (
                      <p className="text-xs text-muted-foreground">{s.weekday || "—"} · {s.start_time || "?"}{s.end_time ? `–${s.end_time}` : ""}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeSavedLoc(s.id)}><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
              {savedLocs.length === 0 && <li className="text-sm text-muted-foreground">No saved locations yet.</li>}
            </ul>

            <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add saved location</p>
              <FieldRow>
                <Field label="Label"><Input value={newLoc.label} onChange={(e) => setNewLoc((n) => ({ ...n, label: e.target.value }))} placeholder="Titletown · Lot 7" /></Field>
                <Field label="Address (optional)"><Input value={newLoc.address} onChange={(e) => setNewLoc((n) => ({ ...n, address: e.target.value }))} /></Field>
              </FieldRow>
              <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                <Label className="text-sm">Recurring weekly stop</Label>
                <Switch checked={newLoc.is_recurring} onCheckedChange={(v) => setNewLoc((n) => ({ ...n, is_recurring: v }))} />
              </div>
              {newLoc.is_recurring && (
                <FieldRow>
                  <Field label="Weekday">
                    <select value={newLoc.weekday} onChange={(e) => setNewLoc((n) => ({ ...n, weekday: e.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">— Pick —</option>
                      {WEEKDAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </Field>
                  <Field label="Start"><Input value={newLoc.start_time} onChange={(e) => setNewLoc((n) => ({ ...n, start_time: e.target.value }))} placeholder="11:00" /></Field>
                  <Field label="End"><Input value={newLoc.end_time} onChange={(e) => setNewLoc((n) => ({ ...n, end_time: e.target.value }))} placeholder="20:00" /></Field>
                </FieldRow>
              )}
              <Button onClick={addSavedLoc} disabled={!newLoc.label.trim()}><Plus className="mr-1 h-4 w-4" /> Add saved location</Button>
            </div>
          </TabsContent>

          <TabsContent value="publish" className="space-y-4 pt-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
              <div>
                <p className="font-medium inline-flex items-center gap-2">{form.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} Published</p>
                <p className="text-xs text-muted-foreground">When published, customers can find your truck page.</p>
              </div>
              <Switch checked={!!form.is_published} onCheckedChange={(v) => set("is_published", v)} />
            </div>
            <p className="text-xs text-muted-foreground">Public URL: <span className="font-mono">/food-trucks/{business.slug}</span></p>
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 -mx-6 mt-6 flex justify-end gap-2 border-t border-border bg-card/95 px-6 py-3 backdrop-blur">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Close</Button>
          <Button onClick={save} disabled={saving}><Save className="mr-1.5 h-4 w-4" />{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 flex-1">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}
