import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";

type Biz = { id: string; slug: string; name: string; city: string | null; cuisine: string | null; listing_status: string; owner_id: string | null };

const schema = z.object({
  claimant_name: z.string().trim().min(1, "Full name required").max(120),
  relationship_to_business: z.string().trim().min(1, "Role required").max(200),
  claimant_email: z.string().trim().email("Valid email required").max(255),
  claimant_phone: z.string().trim().min(7, "Phone required").max(40),
  preferred_contact_method: z.enum(["email", "phone", "text"]),
  best_contact_time: z.string().trim().max(120).optional().or(z.literal("")),
  claimant_message: z.string().trim().max(2000).optional().or(z.literal("")),
  authorized_confirmed: z.literal(true),
});

export default function ClaimListing() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const [biz, setBiz] = useState<Biz | null | "missing">(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    claimant_name: "", relationship_to_business: "", claimant_email: "", claimant_phone: "",
    preferred_contact_method: "email" as "email" | "phone" | "text",
    best_contact_time: "", claimant_message: "", authorized_confirmed: false,
  });

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase.from("businesses")
        .select("id,slug,name,city,cuisine,listing_status,owner_id")
        .eq("slug", slug).eq("is_published", true).maybeSingle();
      setBiz(data ? (data as Biz) : "missing");
    })();
  }, [slug]);

  if (biz === null) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (biz === "missing") return (
    <div className="min-h-screen bg-background"><SiteHeader />
      <main className="container-tight px-4 pt-32 pb-20 text-center">
        <p className="font-display text-2xl">Listing not found</p>
        <Link to="/food-trucks" className="mt-3 inline-block text-primary hover:underline">← Back to all listings</Link>
      </main>
    </div>
  );

  const eligible = biz.owner_id === null && (biz.listing_status === "unclaimed" || biz.listing_status === "draft");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!biz || biz === "missing") return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Please review the form");
    setBusy(true);
    const { error } = await supabase.from("claim_requests").insert({
      business_id: biz.id,
      requester_user_id: null,
      requester_name: parsed.data.claimant_name,
      requester_email: parsed.data.claimant_email,
      requester_phone: parsed.data.claimant_phone,
      relationship_to_business: parsed.data.relationship_to_business,
      preferred_contact_method: parsed.data.preferred_contact_method,
      best_contact_time: parsed.data.best_contact_time || null,
      claimant_message: parsed.data.claimant_message || null,
      authorized_confirmed: true,
      status: "submitted" as any,
    } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container-tight px-4 pt-32 pb-20 md:pt-36">
        <Link to={`/food-trucks/${biz.slug}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to listing
        </Link>
        <div className="mt-4 max-w-2xl">
          <h1 className="font-display text-3xl font-bold md:text-4xl">Claim this listing</h1>
          <p className="mt-2 text-muted-foreground">
            You're requesting ownership of <span className="font-semibold text-foreground">{biz.name}</span>
            {biz.city ? ` · ${biz.city}` : ""}.
          </p>

          {!eligible && (
            <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              This listing isn't available to claim right now. It may already be claimed or archived.
            </div>
          )}

          {eligible && !submitted && (
            <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-start gap-2 rounded-lg bg-secondary/10 px-3 py-2 text-xs text-foreground/80">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                <span>Our team will review every claim and contact you to verify ownership before granting access.</span>
              </div>
              <div><Label htmlFor="name">Full name *</Label><Input id="name" required value={form.claimant_name} onChange={(e) => setForm({ ...form, claimant_name: e.target.value })} /></div>
              <div><Label htmlFor="rel">Your role at the business *</Label><Input id="rel" required placeholder="Owner, manager, etc." value={form.relationship_to_business} onChange={(e) => setForm({ ...form, relationship_to_business: e.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label htmlFor="email">Email *</Label><Input id="email" type="email" required value={form.claimant_email} onChange={(e) => setForm({ ...form, claimant_email: e.target.value })} /></div>
                <div><Label htmlFor="phone">Phone *</Label><Input id="phone" required value={form.claimant_phone} onChange={(e) => setForm({ ...form, claimant_phone: e.target.value })} /></div>
              </div>
              <div>
                <Label>Preferred contact method *</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["email", "phone", "text"] as const).map((m) => (
                    <button type="button" key={m}
                      onClick={() => setForm({ ...form, preferred_contact_method: m })}
                      className={`rounded-full px-4 py-1.5 text-sm capitalize ${form.preferred_contact_method === m ? "bg-primary text-primary-foreground" : "border border-border bg-background"}`}
                    >{m}</button>
                  ))}
                </div>
              </div>
              <div><Label htmlFor="bct">Best time to contact</Label><Input id="bct" placeholder="Weekdays 9am–5pm CT" value={form.best_contact_time} onChange={(e) => setForm({ ...form, best_contact_time: e.target.value })} /></div>
              <div><Label htmlFor="msg">Message or verification details</Label><Textarea id="msg" rows={4} placeholder="Anything that helps us confirm you're authorized." value={form.claimant_message} onChange={(e) => setForm({ ...form, claimant_message: e.target.value })} /></div>
              <label className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <input type="checkbox" className="mt-0.5" checked={form.authorized_confirmed} onChange={(e) => setForm({ ...form, authorized_confirmed: e.target.checked })} />
                <span>I confirm that I am authorized to request access to this listing.</span>
              </label>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={busy || !form.authorized_confirmed} className="h-11 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90">
                  {busy ? "Submitting…" : "Submit claim"}
                </Button>
                <Button type="button" variant="outline" onClick={() => nav(`/food-trucks/${biz.slug}`)} className="h-11 rounded-full">Cancel</Button>
              </div>
            </form>
          )}

          {submitted && (
            <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-6">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-semibold">Claim request received</p>
              </div>
              <p className="mt-2 text-sm text-emerald-900">
                Thank you. Our team will review your request and contact you to verify ownership. Once approved, you will receive your FoodXMobile login details by email.
              </p>
              <div className="mt-4">
                <Button asChild variant="outline" className="h-10 rounded-full">
                  <Link to={`/food-trucks/${biz.slug}`}>Return to listing</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
