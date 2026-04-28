import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Truck } from "lucide-react";

type Cat = { id: string; name: string; emoji: string | null };
type Unowned = { id: string; name: string; slug: string; cuisine: string | null; emoji: string | null };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export function Onboarding() {
  const { user } = useAuth();
  const { refresh } = useOwnerBusiness();
  const { toast } = useToast();
  const [cats, setCats] = useState<Cat[]>([]);
  const [unowned, setUnowned] = useState<Unowned[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("business_categories").select("id,name,emoji").order("sort_order")
      .then(({ data }) => setCats((data ?? []) as Cat[]));
    // For demo convenience: list unclaimed seed trucks (admin-only via RLS unless we expose them).
    // Owners can only read their own; so we hide claim list if it returns empty.
    supabase.from("businesses").select("id,name,slug,cuisine,emoji").is("owner_id", null)
      .then(({ data }) => setUnowned((data ?? []) as Unowned[]));
  }, []);

  async function createBusiness() {
    if (!user) return;
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const finalSlug = slug.trim() || slugify(name);
    setBusy(true);
    const { data, error } = await supabase.from("businesses").insert({
      owner_id: user.id,
      name: name.trim(),
      slug: finalSlug,
      category_id: categoryId || null,
      status: "closed",
      is_published: false,
    }).select().maybeSingle();
    setBusy(false);
    if (error) {
      toast({ title: "Could not create", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Business created", description: `${data?.name} is ready to edit.` });
    await refresh();
  }

  async function claim(id: string) {
    setBusy(true);
    const { error } = await supabase.rpc("claim_business", { _business_id: id });
    setBusy(false);
    if (error) {
      toast({ title: "Could not claim", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Claimed", description: "You can now manage this truck." });
    await refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <span className="badge-ember"><Sparkles className="h-3 w-3" /> Let's get started</span>
        <h1 className="mt-3 font-display text-4xl font-bold leading-tight">Set up your truck on TruckHub.</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Create a brand new business profile, or — for this demo — claim one of the sample trucks to explore everything as an owner.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-xl font-semibold">Create a new truck</h2>
          <p className="mt-1 text-sm text-muted-foreground">You can edit everything later.</p>
          <div className="mt-5 space-y-4">
            <div>
              <Label htmlFor="bn">Business name</Label>
              <Input id="bn" value={name} onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} placeholder="Bay Burger Co." className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="bs">URL slug</Label>
              <Input id="bs" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="bay-burger-co" className="mt-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">truckhub.gb/food-trucks/<span className="font-mono">{slug || "your-slug"}</span></p>
            </div>
            <div>
              <Label htmlFor="cat">Category</Label>
              <select id="cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">— Choose a category —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ""}{c.name}</option>)}
              </select>
            </div>
            <Button onClick={createBusiness} disabled={busy} className="w-full">
              <Truck className="mr-2 h-4 w-4" /> Create business
            </Button>
          </div>
        </div>

        {unowned.length > 0 && (
          <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6">
            <h2 className="font-display text-xl font-semibold">Or claim a demo truck</h2>
            <p className="mt-1 text-sm text-muted-foreground">For exploring the dashboard with real seeded data.</p>
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
                  <Button onClick={() => claim(u.id)} disabled={busy} size="sm" variant="outline">Claim</Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}