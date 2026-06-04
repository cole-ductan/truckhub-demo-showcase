import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";

type Biz = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  cuisine: string | null;
  listing_status: string;
  owner_id: string | null;
};

const schema = z.object({
  requester_name: z.string().trim().min(1, "Name is required").max(120),
  requester_email: z.string().trim().email("Valid email required").max(255),
  requester_phone: z.string().trim().max(40).optional().or(z.literal("")),
  relationship_to_business: z.string().trim().max(200).optional().or(z.literal("")),
  verification_notes: z.string().trim().max(2000).optional().or(z.literal("")),
  verification_url: z.string().trim().url("Must be a valid URL").max(500).optional().or(z.literal("")),
});

export default function ClaimListing() {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [biz, setBiz] = useState<Biz | null | "missing">(null);
  const [existing, setExisting] = useState<{ id: string; status: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    requester_name: "",
    requester_email: "",
    requester_phone: "",
    relationship_to_business: "",
    verification_notes: "",
    verification_url: "",
  });

  useEffect(() => {
    if (!businessSlug) return;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id,slug,name,city,cuisine,listing_status,owner_id")
        .eq("slug", businessSlug)
        .eq("is_published", true)
        .maybeSingle();
      if (!data) { setBiz("missing"); return; }
      setBiz(data as Biz);
    })();
  }, [businessSlug]);

  useEffect(() => {
    if (!user || !biz || biz === "missing") return;
    (async () => {
      const { data } = await supabase
        .from("claim_requests")
        .select("id,status")
        .eq("business_id", biz.id)
        .eq("requester_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setExisting(data as { id: string; status: string });
      if (!form.requester_email && user.email) {
        setForm((f) => ({ ...f, requester_email: user.email ?? "" }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, biz]);

  if (authLoading || biz === null) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  }
  if (biz === "missing") {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container-tight px-4 pt-32 pb-20 text-center">
          <p className="font-display text-2xl">Listing not found</p>
          <Link to="/food-trucks" className="mt-3 inline-block text-primary hover:underline">← Back to all listings</Link>
        </main>
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(`/claim/${businessSlug}`);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  const eligible = biz.owner_id === null && biz.listing_status === "unclaimed";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !biz || biz === "missing") return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please review the form");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("claim_requests").insert({
      business_id: biz.id,
      requester_user_id: user.id,
      requester_name: parsed.data.requester_name,
      requester_email: parsed.data.requester_email,
      requester_phone: parsed.data.requester_phone || null,
      relationship_to_business: parsed.data.relationship_to_business || null,
      verification_notes: parsed.data.verification_notes || null,
      verification_url: parsed.data.verification_url || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubmitted(true);
    toast.success("Claim submitted for admin review");
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

          {eligible && existing && ["pending", "more_info_requested"].includes(existing.status) && (
            <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
              You already have an active claim on this listing
              {existing.status === "more_info_requested" ? " — the admin requested more information." : "."}
              {" "}
              <Link to="/owner/claims" className="font-semibold text-primary hover:underline">View your claims →</Link>
            </div>
          )}

          {eligible && !submitted && (!existing || ["denied", "withdrawn"].includes(existing.status)) && (
            <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="rounded-lg bg-secondary/10 px-3 py-2 text-xs text-foreground/80 flex gap-2 items-start">
                <ShieldCheck className="h-4 w-4 shrink-0 text-secondary mt-0.5" />
                <span>An admin reviews every claim before access is granted. You'll be notified once a decision is made.</span>
              </div>
              <div>
                <Label htmlFor="rn">Your name *</Label>
                <Input id="rn" required value={form.requester_name} onChange={(e) => setForm({ ...form, requester_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="re">Email *</Label>
                <Input id="re" type="email" required value={form.requester_email} onChange={(e) => setForm({ ...form, requester_email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="rp">Phone</Label>
                <Input id="rp" value={form.requester_phone} onChange={(e) => setForm({ ...form, requester_phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="rel">Your relationship to this business</Label>
                <Input id="rel" placeholder="Owner, manager, etc." value={form.relationship_to_business} onChange={(e) => setForm({ ...form, relationship_to_business: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="vn">Verification notes</Label>
                <Textarea id="vn" rows={4} placeholder="Anything that helps us confirm you own this business." value={form.verification_notes} onChange={(e) => setForm({ ...form, verification_notes: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="vu">Verification URL (optional)</Label>
                <Input id="vu" placeholder="https://your-website.com" value={form.verification_url} onChange={(e) => setForm({ ...form, verification_url: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={busy} className="h-11 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90">
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
                <p className="font-semibold">Claim submitted</p>
              </div>
              <p className="mt-2 text-sm text-emerald-900">An admin will review your request. You can track its status anytime.</p>
              <div className="mt-4 flex gap-2">
                <Button asChild className="h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"><Link to="/owner/claims">View my claims</Link></Button>
                <Button asChild variant="outline" className="h-10 rounded-full"><Link to={`/food-trucks/${biz.slug}`}>Back to listing</Link></Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}