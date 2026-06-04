import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { LISTING_STATUS_LABEL, LISTING_STATUS_VARIANT, normalize, type ListingStatus } from "@/lib/listingStatus";
import { AlertTriangle, Edit, Eye, Archive, FileText, Send } from "lucide-react";

type Row = {
  id: string; name: string; slug: string; city: string | null; cuisine: string | null;
  phone: string | null; email: string | null; website: string | null;
  hero_image_url: string | null; logo_url: string | null;
  current_address: string | null; today_latitude: number | null; today_longitude: number | null;
  is_published: boolean; listing_status: ListingStatus; updated_at: string;
  internal_notes: string | null;
};

function completeness(r: Row) {
  const contact = [r.phone, r.email, r.website].filter(Boolean).length / 3;
  const images = [r.hero_image_url, r.logo_url].filter(Boolean).length / 2;
  const location = [r.current_address, r.today_latitude, r.today_longitude].filter((value) => value !== null && value !== "").length / 3;
  return { contact, images, location };
}

export default function AdminListingReview() {
  const [rows, setRows] = useState<Row[]>([]);
  const load = async () => {
    const { data } = await (supabase as any)
      .from("businesses")
      .select("id,name,slug,city,cuisine,phone,email,website,hero_image_url,logo_url,current_address,today_latitude,today_longitude,is_published,listing_status,updated_at,internal_notes")
      .in("listing_status", ["draft", "unclaimed"])
      .order("updated_at", { ascending: false });
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { load(); }, []);

  const dupeKeys = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      [normalize(r.name), normalize(r.slug), normalize(r.email), normalize(r.phone), normalize(r.website)]
        .filter(Boolean)
        .forEach((k) => map.set(k, (map.get(k) ?? 0) + 1));
    });
    return map;
  }, [rows]);

  const isDupe = (r: Row) =>
    [normalize(r.name), normalize(r.slug), normalize(r.email), normalize(r.phone), normalize(r.website)]
      .filter(Boolean)
      .some((k) => (dupeKeys.get(k) ?? 0) > 1);

  const update = async (id: string, patch: Partial<Row>) => {
    const { error } = await supabase.from("businesses").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    load();
  };

  const markForOutreach = async (r: Row) => {
    const stamp = `[${new Date().toISOString().slice(0, 10)}] marked ready for outreach`;
    const notes = r.internal_notes ? `${r.internal_notes}\n${stamp}` : stamp;
    await update(r.id, { listing_status: "unclaimed", internal_notes: notes });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Review Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">{rows.length} listings need review (draft + unclaimed)</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((r) => {
          const c = completeness(r);
          const dupe = isDupe(r);
          return (
            <Card key={r.id} className="rounded-2xl">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{r.name}</h3>
                    <p className="text-xs text-muted-foreground">{r.city ?? "—"} · {r.cuisine ?? "—"}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Badge variant={LISTING_STATUS_VARIANT[r.listing_status]}>{LISTING_STATUS_LABEL[r.listing_status]}</Badge>
                    <Badge variant={r.is_published ? "default" : "outline"}>{r.is_published ? "Live" : "Draft"}</Badge>
                    {dupe && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Possible dup</Badge>}
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <Bar label="Contact" value={c.contact} />
                  <Bar label="Images" value={c.images} />
                  <Bar label="Location" value={c.location} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline"><Link to={`/admin/businesses/${r.id}/edit`}><Edit className="mr-1 h-3 w-3" />Edit</Link></Button>
                  {!r.is_published && <Button size="sm" onClick={() => update(r.id, { is_published: true })}><Eye className="mr-1 h-3 w-3" />Publish</Button>}
                  {r.listing_status !== "draft" && <Button size="sm" variant="outline" onClick={() => update(r.id, { listing_status: "draft" })}><FileText className="mr-1 h-3 w-3" />Keep Draft</Button>}
                  <Button size="sm" variant="outline" onClick={() => update(r.id, { listing_status: "archived", is_published: false })}><Archive className="mr-1 h-3 w-3" />Archive</Button>
                  <Button size="sm" variant="secondary" onClick={() => markForOutreach(r)}><Send className="mr-1 h-3 w-3" />Mark Ready for Outreach</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {rows.length === 0 && (
          <Card className="md:col-span-2"><CardContent className="p-10 text-center text-sm text-muted-foreground">Nothing waiting for review.</CardContent></Card>
        )}
      </div>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-muted-foreground">{label}</span>
      <Progress value={pct} className="h-1.5 flex-1" />
      <span className="w-8 text-right tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}
