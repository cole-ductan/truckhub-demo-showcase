import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/listingStatus";

export default function AdminBusinessNew() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanSlug = slugify(slug.trim() || cleanName);
    if (!cleanName) return toast.error("Business name is required");
    if (!cleanSlug) return toast.error("Enter a valid business name or slug");

    setSaving(true);
    const { data, error } = await (supabase as any)
      .from("businesses")
      .insert({
        name: cleanName,
        slug: cleanSlug,
        listing_status: "draft",
        is_published: false,
        owner_id: null,
      })
      .select("id")
      .maybeSingle();
    setSaving(false);

    if (error) return toast.error(error.message);
    if (!data?.id) return toast.error("Failed to create listing");
    toast.success("Draft listing created");
    nav(`/admin/businesses/${data.id}/edit`, { replace: true });
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Create Listing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Start a draft inventory listing, then continue in the full editor.</p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Listing basics</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={create}>
            <div>
              <Label htmlFor="new-business-name">Business name</Label>
              <Input
                id="new-business-name"
                className="mt-1.5"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) setSlug(slugify(e.target.value));
                }}
                placeholder="FoodXMobile Test Kitchen"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="new-business-slug">URL slug</Label>
              <Input
                id="new-business-slug"
                className="mt-1.5"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="foodxmobile-test-kitchen"
              />
              <p className="mt-1 text-xs text-muted-foreground">foodxmobile.com/food-trucks/{slug || "your-listing"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create draft listing"}</Button>
              <Button asChild type="button" variant="outline"><Link to="/admin/businesses">Cancel</Link></Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
