import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Lock, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { DIRECT_INQUIRY_RECEIPT } from "@/lib/publicInventoryCopy";

const schema = z.object({ contact_name: z.string().trim().min(1).max(120), contact_email: z.string().trim().email().max(255), contact_phone: z.string().trim().max(40).optional().or(z.literal("")), event_type: z.string().max(60).optional().or(z.literal("")), event_date: z.string().max(60).optional().or(z.literal("")), guest_count: z.string().max(40).optional().or(z.literal("")), message: z.string().trim().max(2000).optional().or(z.literal("")) });
type Biz = { id: string; name: string; emoji: string | null; cuisine: string | null; today_location: string | null; phone: string | null; email: string | null };

export default function Book() {
  const { truckSlug } = useParams<{ truckSlug: string }>();
  const [biz, setBiz] = useState<Biz | null | "missing">(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const bizName = biz && biz !== "missing" ? biz.name : null;
  useSEO({ title: bizName ? `Save a catering inquiry for ${bizName} | FoodXMobile` : "Save a catering inquiry | FoodXMobile", description: bizName ? `Save a catering inquiry for ${bizName}. Saving a request is not a delivery receipt.` : "Save a catering inquiry. Saving a request is not a delivery receipt." });

  useEffect(() => { if (!truckSlug) return; supabase.from("businesses").select("id,name,emoji,cuisine,today_location,phone,email").eq("slug", truckSlug).eq("is_published", true).maybeSingle().then(({ data }) => setBiz(data ? data as Biz : "missing")); }, [truckSlug]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!biz || biz === "missing") return;
    const fd = new FormData(e.currentTarget);
    const payload = { contact_name: String(fd.get("contact_name") ?? ""), contact_email: String(fd.get("contact_email") ?? ""), contact_phone: String(fd.get("contact_phone") ?? ""), event_type: String(fd.get("event_type") ?? ""), event_date: String(fd.get("event_date") ?? ""), guest_count: String(fd.get("guest_count") ?? ""), message: String(fd.get("message") ?? "") };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) { toast({ title: "Please check your form", description: parsed.error.issues[0]?.message ?? "Invalid input", variant: "destructive" }); return; }
    setBusy(true);
    const { data: inserted, error } = await supabase.from("leads").insert({ business_id: biz.id, contact_name: payload.contact_name, contact_email: payload.contact_email, contact_phone: payload.contact_phone || null, event_type: payload.event_type || null, event_date: payload.event_date || null, guest_count: payload.guest_count || null, message: payload.message || null, source: "public_form" }).select("id").maybeSingle();
    setBusy(false);
    if (error) { toast({ title: "Could not save request", description: error.message, variant: "destructive" }); return; }
    if (inserted?.id) supabase.functions.invoke("notify-new-lead", { body: { lead_id: inserted.id } }).catch(() => {});
    setDone(true);
  }

  if (biz === null) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (biz === "missing") return <div className="grid min-h-screen place-items-center"><div className="text-center"><p className="font-display text-2xl">Truck not found</p><Link to="/food-trucks" className="mt-3 inline-block text-primary hover:underline">← Back to all trucks</Link></div></div>;

  return <div className="min-h-screen bg-background"><DemoBanner /><SiteHeader /><div className="bg-primary/10 pt-20"><div className="container-tight py-3 text-xs"><Link to={`/food-trucks/${truckSlug}`} className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" /> Back to {biz.name}</Link></div></div><main className="container-tight py-16 md:py-24"><div className="mx-auto max-w-3xl">{done ? <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-600"><Check className="h-7 w-7" /></div><h1 className="mt-6 font-display text-3xl font-bold">{DIRECT_INQUIRY_RECEIPT.title(biz.name)}</h1><p className="mx-auto mt-3 max-w-md text-muted-foreground">{DIRECT_INQUIRY_RECEIPT.body}</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Button asChild variant="outline" className="rounded-full"><Link to={`/food-trucks/${truckSlug}`}><ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to {biz.name}</Link></Button><Button asChild className="rounded-full"><Link to="/food-trucks">Browse more trucks</Link></Button></div></div> : <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-start"><div><span className="badge-ember"><Sparkles className="h-3 w-3" /> Catering & Private Events</span><h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">Book {biz.emoji} {biz.name}.</h1><p className="mt-3 text-muted-foreground">Tell them about your event. No account needed.</p><form onSubmit={onSubmit} className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card md:p-8"><div className="grid gap-4 sm:grid-cols-2"><Field label="Your name *" name="contact_name" required /><Field label="Email *" name="contact_email" type="email" required /><Field label="Phone" name="contact_phone" /><Field label="Event date" name="event_date" placeholder="e.g. June 14, 2026" /><Select label="Event type" name="event_type" options={["Wedding","Corporate lunch","Birthday / Backyard","Graduation","Festival / Public event","Other"]} /><Field label="# of guests" name="guest_count" placeholder="e.g. 80" /><div className="sm:col-span-2"><label className="text-sm font-medium">Tell us about your event</label><textarea name="message" rows={4} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" /></div></div><Button disabled={busy} className="mt-6 h-11 w-full rounded-full">{busy ? "Saving…" : `Save inquiry for ${biz.name}`}</Button><p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground"><Lock className="h-3 w-3" /> {DIRECT_INQUIRY_RECEIPT.formNote(biz.name)}</p></form></div><aside className="space-y-3 md:sticky md:top-28"><div className="rounded-2xl border border-border bg-card p-5 shadow-soft"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">This request is for</p><p className="mt-2 font-display text-xl font-bold">{biz.emoji} {biz.name}</p>{biz.cuisine && <p className="mt-1 text-sm text-muted-foreground">{biz.cuisine}</p>}</div><ul className="space-y-2 text-sm"><li className="flex items-start gap-2 rounded-xl border border-border bg-card p-3"><MessageSquare className="mt-0.5 h-4 w-4 text-primary" /><span>{DIRECT_INQUIRY_RECEIPT.asideNote}</span></li><li className="flex items-start gap-2 rounded-xl border border-border bg-card p-3"><ShieldCheck className="mt-0.5 h-4 w-4 text-primary" /><span>Your contact info stays private</span></li></ul></aside></div>}</div></main><SiteFooter /></div>;
}

function Field({ label, name, type = "text", required, placeholder }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string }) { return <div><label className="text-sm font-medium">{label}</label><input name={name} type={type} required={required} placeholder={placeholder} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" /></div>; }
function Select({ label, name, options }: { label: string; name: string; options: string[] }) { return <div className="sm:col-span-2"><label className="text-sm font-medium">{label}</label><select name={name} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary">{options.map((o) => <option key={o}>{o}</option>)}</select></div>; }
