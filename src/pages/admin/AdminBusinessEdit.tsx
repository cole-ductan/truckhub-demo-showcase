import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BusinessImageUpload } from "@/components/business/BusinessImageUpload";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, AlertTriangle, Archive, Trash2 } from "lucide-react";
import { LISTING_STATUSES, LISTING_STATUS_LABEL, type ListingStatus } from "@/lib/listingStatus";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Cat = { id: string; name: string; parent_id: string | null };

export default function AdminBusinessEdit() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [danger, setDanger] = useState({ deleting: false, archiving: false });
  const [form, setForm] = useState<any>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [specialtyIds, setSpecialtyIds] = useState<string[]>([]);
  const [adminMeta, setAdminMeta] = useState<{ outreach_email: string | null; internal_notes: string | null }>({ outreach_email: null, internal_notes: null });

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: biz }, { data: allCats }, { data: subs }, { data: meta }] = await Promise.all([
        supabase.from("businesses").select("*").eq("id", id).maybeSingle(),
        supabase.from("business_categories").select("id,name,parent_id").order("sort_order"),
        supabase.from("business_subcategories").select("category_id").eq("business_id", id),
        (supabase as any).from("business_admin_metadata").select("outreach_email,internal_notes").eq("business_id", id).maybeSingle(),
      ]);
      setForm(biz);
      setCats((allCats ?? []) as Cat[]);
      setSpecialtyIds((subs ?? []).map((s: any) => s.category_id));
      setAdminMeta({ outreach_email: meta?.outreach_email ?? null, internal_notes: meta?.internal_notes ?? null });
      setLoading(false);
    })();
  }, [id]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const setMeta = (k: "outreach_email" | "internal_notes", v: string) => setAdminMeta((m) => ({ ...m, [k]: v }));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const { id: _id, created_at, updated_at, current_latitude, current_longitude, outreach_email: _oe, internal_notes: _in, ...payload } = form;
    if (payload.listing_status === "archived") payload.is_published = false;
    const { error } = await (supabase as any).from("businesses").update(payload).eq("id", id!);
    if (error) { setSaving(false); return toast.error(error.message); }
    const { error: metaErr } = await (supabase as any).from("business_admin_metadata").upsert({ business_id: id!, outreach_email: adminMeta.outreach_email?.toString().trim() || null, internal_notes: adminMeta.internal_notes?.toString().trim() || null }, { onConflict: "business_id" });
    if (metaErr) { setSaving(false); return toast.error(metaErr.message); }
    await supabase.from("business_subcategories").delete().eq("business_id", id!);
    if (specialtyIds.length) await supabase.from("business_subcategories").insert(specialtyIds.map((category_id) => ({ business_id: id!, category_id })));
    toast.success("Saved");
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!form) return <div className="p-8">Not found.</div>;

  const parents = cats.filter((c) => !c.parent_id);
  const children = cats.filter((c) => c.parent_id);
  const archived = form.listing_status === "archived";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><Button asChild variant="ghost" size="sm"><Link to="/admin/businesses"><ArrowLeft className="mr-1 h-4 w-4" />Back</Link></Button><h1 className="font-display text-3xl font-bold">{form.name}</h1><p className="text-sm text-muted-foreground">Admin business editor</p></div>
        <div className="flex gap-2">{form.is_published && !archived && <Button asChild variant="outline"><a href={`/food-trucks/${form.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-4 w-4" />View public</a></Button>}<Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button></div>
      </div>

      {archived && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">This listing is archived. It is forced unpublished and cannot be assigned to an owner until a supported restore workflow is added.</div>}

      <Card><CardHeader><CardTitle>Core identity</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Business name"><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Slug"><Input value={form.slug ?? ""} onChange={(e) => set("slug", e.target.value)} /></Field>
        <Field label="Emoji / icon"><Input value={form.emoji ?? ""} onChange={(e) => set("emoji", e.target.value)} /></Field>
        <Field label="Cuisine"><Input value={form.cuisine ?? ""} onChange={(e) => set("cuisine", e.target.value)} /></Field>
        <Field label="Tagline"><Input value={form.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} /></Field>
        <Field label="Parent category"><Select value={form.category_id ?? "none"} onValueChange={(v) => set("category_id", v === "none" ? null : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">— None —</SelectItem>{parents.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Description" className="md:col-span-2"><Textarea rows={5} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Specialties" className="md:col-span-2"><div className="flex flex-wrap gap-2">{children.map((c) => { const on = specialtyIds.includes(c.id); return <button key={c.id} type="button" onClick={() => setSpecialtyIds((s) => on ? s.filter((x) => x !== c.id) : [...s, c.id])} className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{c.name}</button>; })}</div></Field>
        <Field label="City"><Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label="Region"><Input value={form.region ?? ""} onChange={(e) => set("region", e.target.value)} /></Field>
        <Field label="Service area"><Input value={form.service_area ?? ""} onChange={(e) => set("service_area", e.target.value)} /></Field>
        <Field label="Listing status"><Select value={form.listing_status} onValueChange={(v) => set("listing_status", v as ListingStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LISTING_STATUSES.map((s) => <SelectItem key={s} value={s}>{LISTING_STATUS_LABEL[s]}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Published"><div className="flex items-center gap-2 pt-2"><Switch checked={!!form.is_published} disabled={archived} onCheckedChange={(v) => set("is_published", v)} /><span className="text-sm text-muted-foreground">{archived ? "Archived listings cannot be public" : "Visible on public site"}</span></div></Field>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Contact</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Contact name"><Input value={form.contact_name ?? ""} onChange={(e) => set("contact_name", e.target.value)} /></Field><Field label="Public phone"><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field><Field label="Public email"><Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field><Field label="Internal outreach email"><Input type="email" value={adminMeta.outreach_email ?? ""} onChange={(e) => setMeta("outreach_email", e.target.value)} /></Field><Field label="Website"><Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} /></Field><Field label="Instagram"><Input value={form.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} /></Field><Field label="Facebook"><Input value={form.facebook ?? ""} onChange={(e) => set("facebook", e.target.value)} /></Field><Field label="Online ordering URL"><Input value={form.online_ordering_url ?? ""} onChange={(e) => set("online_ordering_url", e.target.value)} /></Field>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Location</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Current location label"><Input value={form.today_location ?? ""} onChange={(e) => set("today_location", e.target.value)} /></Field><Field label="Current address"><Input value={form.current_address ?? ""} onChange={(e) => set("current_address", e.target.value)} /></Field><Field label="Live map latitude"><Input type="number" step="0.000001" value={form.today_latitude ?? ""} onChange={(e) => set("today_latitude", e.target.value === "" ? null : Number(e.target.value))} /></Field><Field label="Live map longitude"><Input type="number" step="0.000001" value={form.today_longitude ?? ""} onChange={(e) => set("today_longitude", e.target.value === "" ? null : Number(e.target.value))} /></Field><Field label="Current hours"><Input value={form.today_hours ?? ""} onChange={(e) => set("today_hours", e.target.value)} /></Field><Field label="Current status"><Select value={form.status} onValueChange={(v) => set("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="soon">Opening soon</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></Field>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Media</CardTitle></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">
        <Field label="Hero image"><BusinessImageUpload businessId={id!} kind="hero" value={form.hero_image_url ?? ""} onChange={(v) => set("hero_image_url", v)} /></Field>
        <Field label="Logo"><BusinessImageUpload businessId={id!} kind="logo" value={form.logo_url ?? ""} onChange={(v) => set("logo_url", v)} /></Field>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Operational</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><Field label="Catering available"><Switch checked={!!form.catering_available} onCheckedChange={(v) => set("catering_available", v)} /></Field><Field label="Booking inquiry enabled"><Switch checked={!!form.booking_inquiry_enabled} onCheckedChange={(v) => set("booking_inquiry_enabled", v)} /></Field><Field label="Internal admin notes" className="md:col-span-2"><Textarea rows={4} value={adminMeta.internal_notes ?? ""} onChange={(e) => setMeta("internal_notes", e.target.value)} /></Field></CardContent></Card>

      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => nav("/admin/businesses")}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button></div>

      <Card className="border-destructive/40"><CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" /> Danger zone</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"><div><p className="font-medium">Archive listing</p><p className="text-xs text-muted-foreground">Hides the listing and preserves all history.</p></div><Button variant="outline" disabled={danger.archiving || archived} onClick={async () => { if (!confirm("Archive this listing?")) return; setDanger((d) => ({ ...d, archiving: true })); const { data, error } = await (supabase as any).rpc("archive_business_listing", { _business_id: id! }); setDanger((d) => ({ ...d, archiving: false })); if (error) return toast.error(error.message); setForm(data); toast.success("Listing archived"); }}><Archive className="mr-1 h-4 w-4" />{archived ? "Already archived" : "Archive listing"}</Button></div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3"><div><p className="font-medium text-destructive">Delete permanently</p><p className="text-xs text-muted-foreground">Only allowed for listings with no owner, claims, leads, or deposits.</p></div><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" disabled={danger.deleting}><Trash2 className="mr-1 h-4 w-4" />Delete permanently</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Permanently delete "{form.name}"?</AlertDialogTitle><AlertDialogDescription>This cannot be undone. Linked records must be archived instead.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => { setDanger((d) => ({ ...d, deleting: true })); const { error } = await (supabase as any).rpc("delete_unlinked_business", { _business_id: id! }); setDanger((d) => ({ ...d, deleting: false })); if (error) return toast.error(error.message); toast.success("Listing deleted"); nav("/admin/businesses", { replace: true }); }}>Delete forever</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
      </CardContent></Card>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) { return <div className={className}><Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>; }
