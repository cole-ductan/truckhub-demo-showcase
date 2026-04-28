import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerBusiness, type Business } from "@/hooks/useOwnerBusiness";
import { Onboarding } from "@/components/owner/Onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { resolveImage } from "@/lib/assets";
import { Image as ImageIcon, Plus, Save, Trash2 } from "lucide-react";

type Cat = { id: string; name: string; emoji: string | null };
type Photo = { id: string; url: string; caption: string | null; sort_order: number };

export default function OwnerProfile() {
  const { business, loading, refresh, setBusiness } = useOwnerBusiness();
  const { toast } = useToast();
  const [cats, setCats] = useState<Cat[]>([]);
  const [form, setForm] = useState<Partial<Business>>({});
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newPhotoCaption, setNewPhotoCaption] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("business_categories").select("id,name,emoji").order("sort_order")
      .then(({ data }) => setCats((data ?? []) as Cat[]));
  }, []);

  useEffect(() => {
    if (!business) return;
    setForm(business);
    supabase.from("business_photos").select("*").eq("business_id", business.id).order("sort_order")
      .then(({ data }) => setPhotos((data ?? []) as Photo[]));
  }, [business]);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!business) return <Onboarding />;

  function set<K extends keyof Business>(k: K, v: Business[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!business) return;
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
      today_location: form.today_location ?? null,
      today_hours: form.today_hours ?? null,
      status: form.status ?? business.status,
      is_published: form.is_published ?? business.is_published,
    };
    const { data, error } = await supabase.from("businesses").update(payload).eq("id", business.id).select().maybeSingle();
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setBusiness(data as Business);
    toast({ title: "Saved", description: "Your profile is up to date." });
  }

  async function addPhoto() {
    if (!business || !newPhotoUrl.trim()) return;
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
    if (error) { toast({ title: "Could not remove", description: error.message, variant: "destructive" }); return; }
    setPhotos((p) => p.filter((x) => x.id !== id));
  }

  async function reorderPhoto(id: string, dir: -1 | 1) {
    const idx = photos.findIndex((p) => p.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= photos.length) return;
    const a = photos[idx], b = photos[swapIdx];
    await Promise.all([
      supabase.from("business_photos").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("business_photos").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    const next = [...photos];
    next[idx] = { ...a, sort_order: b.sort_order };
    next[swapIdx] = { ...b, sort_order: a.sort_order };
    next.sort((x, y) => x.sort_order - y.sort_order);
    setPhotos(next);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Business Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">This is what customers see on your TruckHub page.</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Published</p>
            <p className="text-sm font-semibold">{form.is_published ? "Live" : "Hidden"}</p>
          </div>
          <Switch checked={!!form.is_published} onCheckedChange={(v) => set("is_published", v)} />
        </div>
      </div>

      <Section title="Identity">
        <Field label="Business name"><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="URL slug" hint="Cannot be edited. Contact support to change.">
          <Input value={business.slug} disabled className="font-mono text-xs" />
        </Field>
        <Field label="Emoji" hint="One emoji shown next to your name."><Input value={form.emoji ?? ""} onChange={(e) => set("emoji", e.target.value)} maxLength={4} /></Field>
        <Field label="Tagline" full><Input value={form.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} placeholder="One catchy line." /></Field>
        <Field label="Description" full>
          <Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={4} placeholder="Tell customers what you do best." />
        </Field>
      </Section>

      <Section title="Category & service area">
        <Field label="Cuisine">
          <Input value={form.cuisine ?? ""} onChange={(e) => set("cuisine", e.target.value)} placeholder="BBQ, Tacos, Pizza…" />
        </Field>
        <Field label="Category">
          <select value={form.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null as any)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">— None —</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ""}{c.name}</option>)}
          </select>
        </Field>
        <Field label="City"><Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label="Region / State"><Input value={form.region ?? ""} onChange={(e) => set("region", e.target.value)} /></Field>
      </Section>

      <Section title="Today">
        <Field label="Today's location"><Input value={form.today_location ?? ""} onChange={(e) => set("today_location", e.target.value)} placeholder="Titletown · Lot 7" /></Field>
        <Field label="Today's hours"><Input value={form.today_hours ?? ""} onChange={(e) => set("today_hours", e.target.value)} placeholder="11:00 – 8:00" /></Field>
        <Field label="Status">
          <select value={form.status ?? "closed"} onChange={(e) => set("status", e.target.value as any)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="open">Open now</option>
            <option value="soon">Opening soon</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
      </Section>

      <Section title="Contact & social">
        <Field label="Phone"><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Website"><Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} /></Field>
        <Field label="Instagram URL"><Input value={form.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} /></Field>
        <Field label="Facebook URL"><Input value={form.facebook ?? ""} onChange={(e) => set("facebook", e.target.value)} /></Field>
      </Section>

      <Section title="Imagery">
        <Field label="Logo URL" full><Input value={form.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://… or asset:logo.png" /></Field>
        <Field label="Hero image URL" full>
          <Input value={form.hero_image_url ?? ""} onChange={(e) => set("hero_image_url", e.target.value)} placeholder="https://… or asset:hero.jpg" />
        </Field>
      </Section>

      <div className="sticky bottom-4 z-10 flex justify-end gap-2 rounded-2xl border border-border bg-card/95 p-3 shadow-card backdrop-blur">
        <Button variant="outline" onClick={() => business && setForm(business)} disabled={saving}>Cancel</Button>
        <Button onClick={save} disabled={saving}><Save className="mr-1.5 h-4 w-4" /> {saving ? "Saving…" : "Save changes"}</Button>
      </div>

      {/* PHOTOS */}
      <Section title="Photos">
        {photos.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No photos yet. Add a few to make your page pop.</p>}
        <div className="col-span-full grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <div key={p.id} className="group relative overflow-hidden rounded-xl border border-border bg-muted">
              <img src={resolveImage(p.url)} alt={p.caption ?? ""} className="aspect-square w-full object-cover" />
              <div className="absolute inset-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 via-transparent to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                <div className="flex gap-1">
                  <button onClick={() => reorderPhoto(p.id, -1)} disabled={i === 0} className="rounded bg-white/90 px-1.5 py-0.5 text-xs disabled:opacity-40">↑</button>
                  <button onClick={() => reorderPhoto(p.id, 1)} disabled={i === photos.length - 1} className="rounded bg-white/90 px-1.5 py-0.5 text-xs disabled:opacity-40">↓</button>
                </div>
                <button onClick={() => removePhoto(p.id)} className="rounded bg-destructive/90 p-1 text-destructive-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">Primary</span>}
            </div>
          ))}
        </div>
        <div className="col-span-full mt-2 grid gap-3 rounded-xl border border-dashed border-border p-4 sm:grid-cols-[1fr_1fr_auto]">
          <Input placeholder="Photo URL or asset:filename.jpg" value={newPhotoUrl} onChange={(e) => setNewPhotoUrl(e.target.value)} />
          <Input placeholder="Caption (optional)" value={newPhotoCaption} onChange={(e) => setNewPhotoCaption(e.target.value)} />
          <Button onClick={addPhoto} disabled={!newPhotoUrl.trim()}><Plus className="mr-1 h-4 w-4" /> Add photo</Button>
        </div>
        <p className="col-span-full text-xs text-muted-foreground"><ImageIcon className="mr-1 inline h-3 w-3" /> File uploads coming soon — paste any public image URL for now.</p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <h2 className="mb-5 font-display text-lg font-semibold">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, children, hint, full }: { label: string; children: React.ReactNode; hint?: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}