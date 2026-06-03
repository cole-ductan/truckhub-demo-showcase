import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ExternalLink, Star, StarOff, Eye, EyeOff, Search } from "lucide-react";
import { toast } from "sonner";
import { LISTING_STATUSES, LISTING_STATUS_LABEL, LISTING_STATUS_VARIANT, type ListingStatus } from "@/lib/listingStatus";

type Biz = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  cuisine: string | null;
  category_id: string | null;
  is_published: boolean;
  is_featured: boolean;
  owner_id: string | null;
  updated_at: string;
  listing_status: ListingStatus;
};

export default function AdminBusinesses() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Biz[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null }>>({});
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});
  const [cats, setCats] = useState<Record<string, string>>({});
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pub, setPub] = useState<string>("all");
  const [feat, setFeat] = useState<string>("all");
  const [lstatus, setLstatus] = useState<string>("all");
  const [open, setOpen] = useState<Biz | null>(null);

  const load = async () => {
    const { data: bs } = await supabase
      .from("businesses")
      .select("id,name,slug,city,cuisine,category_id,is_published,is_featured,owner_id,updated_at,listing_status")
      .order("updated_at", { ascending: false });
    const list = (bs ?? []) as Biz[];
    setRows(list);

    const ownerIds = Array.from(new Set(list.map((b) => b.owner_id).filter(Boolean))) as string[];
    if (ownerIds.length) {
      const { data: ps } = await supabase.from("profiles").select("id,display_name").in("id", ownerIds);
      const map: Record<string, any> = {};
      (ps ?? []).forEach((p) => (map[p.id] = p));
      setProfiles(map);
    }
    const { data: ls } = await supabase.from("leads").select("business_id");
    const lc: Record<string, number> = {};
    (ls ?? []).forEach((l) => { lc[l.business_id] = (lc[l.business_id] ?? 0) + 1; });
    setLeadCounts(lc);

    const { data: cs } = await supabase.from("business_categories").select("id,name");
    const cm: Record<string, string> = {};
    (cs ?? []).forEach((c) => (cm[c.id] = c.name));
    setCats(cm);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (pub === "published" && !r.is_published) return false;
      if (pub === "draft" && r.is_published) return false;
      if (feat === "featured" && !r.is_featured) return false;
      if (feat === "not" && r.is_featured) return false;
      if (lstatus !== "all" && r.listing_status !== lstatus) return false;
      if (!term) return true;
      const owner = r.owner_id ? profiles[r.owner_id]?.display_name ?? "" : "";
      return [r.name, r.city, r.cuisine, owner, r.category_id ? cats[r.category_id] : ""]
        .filter(Boolean).join(" ").toLowerCase().includes(term);
    });
  }, [rows, q, pub, feat, lstatus, profiles, cats]);

  const togglePublish = async (b: Biz) => {
    const { error } = await supabase.from("businesses").update({ is_published: !b.is_published }).eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success(b.is_published ? "Unpublished" : "Published");
    load();
    setOpen((o) => (o && o.id === b.id ? { ...o, is_published: !b.is_published } : o));
  };
  const toggleFeature = async (b: Biz) => {
    const { error } = await supabase.from("businesses").update({ is_featured: !b.is_featured }).eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success(b.is_featured ? "Unfeatured" : "Featured");
    load();
    setOpen((o) => (o && o.id === b.id ? { ...o, is_featured: !b.is_featured } : o));
  };
  const unassignOwner = async (b: Biz) => {
    if (!confirm("Remove owner from this business? They will lose access.")) return;
    const { error } = await supabase.from("businesses").update({ owner_id: null }).eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Owner removed");
    load();
    setOpen(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Businesses</h1>
        <p className="mt-1 text-sm text-muted-foreground">{filtered.length} of {rows.length} businesses</p>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setParams(e.target.value ? { q: e.target.value } : {}); }}
              placeholder="Search by name, city, cuisine, owner…"
              className="pl-9"
            />
          </div>
          <Select value={pub} onValueChange={setPub}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <Select value={feat} onValueChange={setFeat}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All visibility</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="not">Not featured</SelectItem>
            </SelectContent>
          </Select>
          <Select value={lstatus} onValueChange={setLstatus}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All listing status</SelectItem>
              {LISTING_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{LISTING_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Listing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((b) => (
              <TableRow key={b.id} className="cursor-pointer" onClick={() => setOpen(b)}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {b.owner_id ? (profiles[b.owner_id]?.display_name ?? "—") : <span className="italic">Unclaimed</span>}
                </TableCell>
                <TableCell className="text-sm">{b.city ?? "—"}</TableCell>
                <TableCell className="text-sm">{b.category_id ? cats[b.category_id] : (b.cuisine ?? "—")}</TableCell>
                <TableCell>
                  <Badge variant={LISTING_STATUS_VARIANT[b.listing_status]}>{LISTING_STATUS_LABEL[b.listing_status]}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={b.is_published ? "default" : "outline"}>{b.is_published ? "Live" : "Draft"}</Badge>
                    {b.is_featured && <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3" /> Featured</Badge>}
                  </div>
                </TableCell>
                <TableCell>{leadCounts[b.id] ?? 0}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(b.updated_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="inline-flex gap-1">
                    <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs" title="Edit">
                      <Link to={`/admin/businesses/${b.id}/edit`}>Edit</Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePublish(b)} title={b.is_published ? "Unpublish" : "Publish"}>
                      {b.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleFeature(b)} title={b.is_featured ? "Unfeature" : "Feature"}>
                      {b.is_featured ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                    </Button>
                    {b.is_published && (
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="View public">
                        <a href={`/food-trucks/${b.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground">No businesses match.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.name}</SheetTitle>
                <SheetDescription>{open.city ?? "—"} · {open.category_id ? cats[open.category_id] : (open.cuisine ?? "—")}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={LISTING_STATUS_VARIANT[open.listing_status]}>{LISTING_STATUS_LABEL[open.listing_status]}</Badge>
                  <Badge variant={open.is_published ? "default" : "outline"}>{open.is_published ? "Published" : "Draft"}</Badge>
                  {open.is_featured && <Badge variant="secondary">Featured</Badge>}
                  <Badge variant="outline">{leadCounts[open.id] ?? 0} leads</Badge>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Listing status</p>
                  <Select value={open.listing_status} onValueChange={async (v) => {
                    const { error } = await supabase.from("businesses").update({ listing_status: v as ListingStatus }).eq("id", open.id);
                    if (error) return toast.error(error.message);
                    toast.success("Listing status updated");
                    load();
                    setOpen((o) => o && o.id === open.id ? { ...o, listing_status: v as ListingStatus } : o);
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LISTING_STATUSES.map((s) => <SelectItem key={s} value={s}>{LISTING_STATUS_LABEL[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Owner</p>
                  <p>{open.owner_id ? (profiles[open.owner_id]?.display_name ?? open.owner_id) : <span className="italic text-muted-foreground">Unclaimed</span>}</p>
                </div>
                <div className="grid gap-2">
                  <Button asChild variant="default">
                    <Link to={`/admin/businesses/${open.id}/edit`}>Open full editor</Link>
                  </Button>
                  <Button variant="outline" onClick={() => togglePublish(open)}>
                    {open.is_published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button variant="outline" onClick={() => toggleFeature(open)}>
                    {open.is_featured ? "Unfeature" : "Feature"}
                  </Button>
                  {open.is_published && (
                    <Button asChild variant="outline">
                      <a href={`/food-trucks/${open.slug}`} target="_blank" rel="noreferrer">View public profile</a>
                    </Button>
                  )}
                  {open.owner_id && (
                    <Button variant="destructive" onClick={() => unassignOwner(open)}>Remove owner</Button>
                  )}
                </div>
                <Link to={`/admin/leads?biz=${open.id}`} className="block text-xs text-primary underline">
                  View leads for this business →
                </Link>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}