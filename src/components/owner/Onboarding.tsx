import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Truck, ShieldCheck } from "lucide-react";
import { normalizeSlug, isValidSlug } from "@/lib/listingStatus";

type Cat = { id: string; name: string; emoji: string | null };
type Unowned = { id: string; name: string; slug: string; cuisine: string | null; emoji: string | null };

export function Onboarding() {
  const { user } = useAuth();
  const { refresh } = useOwnerBusiness();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cats, setCats] = useState<Cat[]>([]);
  const [unowned, setUnowned] = useState<Unowned[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [categoryId, setCategoryId] = useState<string>("");
  const [bizPhone, setBizPhone] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("business_categories").select("id,name,emoji").order("sort_order")
      .then(({ data }) => setCats((data ?? []) as Cat[]));
    // Demo convenience only. Real inventory listings must use the reviewed public claim workflow.
    supabase.from("businesses").select("id,name,slug,cuisine,emoji").is("owner_id", null).eq("is_demo", true)
      .then(({ data }) => setUnowned((data ?? []) as Unowned[]));
  }, []);

  // Prefill requester defaults from auth profile
  useEffect(() => {
    if (!user) return;
    setRequesterEmail((e) => e || user.email || "");
    setRequesterName((n) =>
      n || ((user.user_metadata as any)?.display_name as string) || (user.email?.split("@")[0] ?? ""),
    );
  }, [user]);

  async function submitForReview() {
    if (!user) return;
    const cleanName = name.trim();
    const cleanSlug = normalizeSlug(slug || cleanName);
    if (!cleanName) {
      toast({ title: "Business name required", variant: "destructive" });
      return;
    }
    if (!isValidSlug(cleanSlug)) {
      toast({
        title: "Invalid URL slug",
        description: "Use letters, numbers and hyphens only. No slashes or spaces.",
        variant: "destructive",
      });
      return;
    }
    if (!requesterName.trim() || !requesterEmail.trim()) {
      toast({ title: "Your name and email are required for verification", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("submit_new_business_request", {
      _name: cleanName,
      _slug: cleanSlug,
      _category_id: categoryId || null,
      _phone: bizPhone.trim() || null,
      _requester_name: requesterName.trim(),
      _requester_email: requesterEmail.trim(),
      _requester_phone: requesterPhone.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not submit", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Submitted for admin review",
      description: "We'll email you once your listing is approved. Track status under My Claims.",
    });
    await refresh();
    navigate("/owner/claims");
  }

  async function claim(id: string) {
    setBusy(true);
    const { error } = await supabase.rpc("claim_business", { _business_id: id });
    setBusy(false);
    if (error) {
      toast({ title: "Could not claim demo listing", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Demo listing claimed", description: "You can now explore the owner workspace." });
    await refresh();
  }

  const previewSlug = slugTouched ? slug : normalizeSlug(name);

  return (
    <div className="space-y-8">
      <div>
        <span className="badge-ember"><Sparkles className="h-3 w-3" /> Let's get started</span>
        <h1 className="mt-3 font-display text-4xl font-bold leading-tight">Submit your truck for review.</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          New business submissions are reviewed by a FoodXMobile admin before ownership is granted. You'll get access to the Owner Console once your claim is approved.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold">Submit a new truck</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary">
              <ShieldCheck className="h-3 w-3" /> Admin review
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">We'll review your submission and contact you with next steps.</p>
          <div className="mt-5 space-y-4">
            <div>
              <Label htmlFor="bn">Business name</Label>
              <Input id="bn" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bay Burger Co." className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="bs">URL slug</Label>
              <Input
                id="bs"
                value={slug}
                onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }}
                onBlur={() => setSlug((s) => normalizeSlug(s || name))}
                placeholder="bay-burger-co"
                className="mt-1.5 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                foodxmobile.com/food-trucks/<span className="font-mono">{previewSlug || "your-slug"}</span>
              </p>
            </div>
            <div>
              <Label htmlFor="cat">Category</Label>
              <select id="cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">— Choose a category —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ""}{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="bp">Business phone (optional)</Label>
              <Input id="bp" value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} placeholder="(555) 123-4567" className="mt-1.5" />
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your contact info (for verification)</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="rn" className="text-xs">Your name</Label>
                  <Input id="rn" value={requesterName} onChange={(e) => setRequesterName(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="re" className="text-xs">Your email</Label>
                  <Input id="re" type="email" value={requesterEmail} onChange={(e) => setRequesterEmail(e.target.value)} className="mt-1.5" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="rp" className="text-xs">Your phone (optional)</Label>
                  <Input id="rp" value={requesterPhone} onChange={(e) => setRequesterPhone(e.target.value)} className="mt-1.5" />
                </div>
              </div>
            </div>

            <Button onClick={submitForReview} disabled={busy} className="w-full">
              <Truck className="mr-2 h-4 w-4" /> {busy ? "Submitting…" : "Submit for admin review"}
            </Button>
            <p className="text-xs text-muted-foreground">
              You'll stay in a claimant-only view until an admin approves your submission.
            </p>
          </div>
        </div>

        {unowned.length > 0 && (
          <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6">
            <h2 className="font-display text-xl font-semibold">Or claim a demo truck</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sample data only. This bypass is intentionally disabled for real listings.</p>
            <div className="mt-5 space-y-2">
              {unowned.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-lg">{u.emoji ?? "🚚"}</span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{u.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.cuisine ?? u.slug}</p>
                    </div>
                  </div>
                  <Button onClick={() => claim(u.id)} disabled={busy} size="sm" variant="outline">Claim demo</Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
