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
import { ExternalLink, Star, StarOff, Eye, EyeOff, Plus, Search, ArrowUp, ArrowDown, ArrowUpDown, UserPlus, UserMinus } from "lucide-react";
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

type ClaimSummary = { pending: number; moreInfo: number; approved: number };
const emptyClaimSummary: ClaimSummary = { pending: 0, moreInfo: 0, approved: 0 };

type SortKey =
  | "name" | "owner" | "claims" | "city" | "category"
  | "listing_status" | "is_published" | "leads" | "updated_at";
type SortDir = "asc" | "desc";

export default function AdminBusinesses() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Biz[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null }>>({});
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});
  const [claimSummaries, setClaimSummaries] = useState<Record<string, ClaimSummary>>({});
  const [cats, setCats] = useState<Record<string, string>>({});
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pub, setPub] = useState<string>("all");
  const [feat, setFeat] = useState<string>("all");
  const [lstatus, setLstatus] = useState<string>("all");
  const [open, setOpen] = useState<Biz | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "updated_at", dir: "desc" });
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignQuery, setAssignQuery] = useState("");
  const [assignResults, setAssignResults] = useState<{ id: string; display_name: string | null }[]>([]);
  const [assignBusy, setAssignBusy] = useState(false);

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

    const { data: claims } = await supabase
      .from("claim_requests")
      .select("business_id,status");
    const cm2: Record<string, ClaimSummary> = {};
    (claims ?? []).forEach((c: any) => {
      const cur = cm2[c.business_id] ?? { ...emptyClaimSummary };
      if (c.status === "pending") cur.pending += 1;
      else if (c.status === "more_info_requested") cur.moreInfo += 1;
      else if (c.status === "approved") cur.approved += 1;
      cm2[c.business_id] = cur;
    });
    setClaimSummaries(cm2);

    const { data: cs } = await supabase.from("business_categories").select("id,name");
    const cm: Record<string, string> = {};
    (cs ?? []).forEach((c) => (cm[c.id] = c.name));
    setCats(cm);
  };

  useEffect(() => { load(); }, []);

  // Searchable user picker for "Assign owner"
  useEffect(() => {
    if (!assignOpen) return;
    const t = setTimeout(async () => {
      const term = assignQuery.trim();
      const q = supabase.from("profiles").select("id,display_name").limit(20);
      const { data } = term ? await q.ilike("display_name", `%${term}%`) : await q.order("display_name");
      setAssignResults((data ?? []) as any);
    }, 200);
    return () => clearTimeout(t);
  }, [assignQuery, assignOpen]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (pub === "published" && !r.is_published) return false;
      if (pub === "unpublished" && r.is_published) return false;
      if (feat === "featured" && !r.is_featured) return false;
      if (feat === "not" && r.is_featured) return false;
      if (lstatus !== "all" && r.listing_status !== lstatus) return false;
      if (!term) return true;
      const owner = r.owner_id ? profiles[r.owner_id]?.display_name ?? "" : "";
      return [r.name, r.city, r.cuisine, owner, r.category_id ? cats[r.category_id] : ""]
        .filter(Boolean).join(" ").toLowerCase().includes(term);
    });
  }, [rows, q, pub, feat, lstatus, profiles, cats]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = sort.dir === "asc" ? 1 : -1;
    const getter = (r: Biz): string | number => {
      switch (sort.key) {
        case "name": return (r.name ?? "").toLowerCase();
        case "owner": return (r.owner_id ? profiles[r.owner_id]?.display_name ?? "zzz" : "zzz").toLowerCase();
        case "claims": {
          const s = claimSummaries[r.id] ?? emptyClaimSummary;
          return s.pending * 100 + s.moreInfo * 10 + s.approved;
        }
        case "city": return (r.city ?? "").toLowerCase();
        case "category": return (r.category_id ? cats[r.category_id] : r.cuisine ?? "").toLowerCase();
        case "listing_status": return r.listing_status;
        case "is_published": return r.is_published ? 1 : 0;
        case "leads": return leadCounts[r.id] ?? 0;
        case "updated_at": return r.updated_at;
      }
    };
    list.sort((a, b) => {
      const av = getter(a); const bv = getter(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return list;
  }, [filtered, sort, profiles, claimSummaries, cats, leadCounts]);

  const toggleSort = (key: SortKey) => {
    setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  };

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
    const { error } = await supabase.rpc("remove_business_owner", { _business_id: b.id });
    if (error) return toast.error(error.message);
    toast.success("Owner removed");
    await load();
    setOpen((o) => (o && o.id === b.id ? { ...o, owner_id: null, listing_status: "unclaimed" as ListingStatus } : o));
  };
  const assignOwner = async (userId: string) => {
    if (!open) return;
    setAssignBusy(true);
    const { data, error } = await supabase.rpc("assign_business_owner", { _business_id: open.id, _user_id: userId });
    setAssignBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Owner assigned");
    setAssignOpen(false);
    setAssignQuery("");
    await load();
    if (data) setOpen((o) => (o ? { ...o, owner_id: (data as any).owner_id, listing_status: (data as any).listing_status } : o));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Businesses</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} of {rows.length} businesses</p>
        </div>
        <Button asChild className="rounded-full">
          <Link to="/admin/businesses/new"><Plus className="mr-1.5 h-4 w-4" /> Create Listing</Link>
        </Button>
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
              <SelectItem value="all">All visibility</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="unpublished">Unpublished</SelectItem>
            </SelectContent>
          </Select>
          <Select value={feat} onValueChange={setFeat}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All featured</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="not">Not featured</SelectItem>
            </SelectContent>
          </Select>
          <Select value={lstatus} onValueChange={setLstatus}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lifecycle</SelectItem>
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
              <SortableTh label="Business" k="name" sort={sort} onClick={toggleSort} />
              <SortableTh label="Owner" k="owner" sort={sort} onClick={toggleSort} />
              <SortableTh label="Claims" k="claims" sort={sort} onClick={toggleSort} />
              <SortableTh label="City" k="city" sort={sort} onClick={toggleSort} />
              <SortableTh label="Category" k="category" sort={sort} onClick={toggleSort} />
              <SortableTh label="Lifecycle" k="listing_status" sort={sort} onClick={toggleSort} />
              <SortableTh label="Public visibility" k="is_published" sort={sort} onClick={toggleSort} />
              <SortableTh label="Leads" k="leads" sort={sort} onClick={toggleSort} />
              <SortableTh label="Updated" k="updated_at" sort={sort} onClick={toggleSort} />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((b) => (
              <TableRow key={b.id} className="cursor-pointer" onClick={() => setOpen(b)}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {b.owner_id ? (profiles[b.owner_id]?.display_name ?? "—") : <span className="italic">Unclaimed</span>}
                </TableCell>
                <TableCell className="text-xs" onClick={(e) => e.stopPropagation()}>
                  <ClaimsBadges summary={claimSummaries[b.id] ?? emptyClaimSummary} businessId={b.id} />
                </TableCell>
                <TableCell className="text-sm">{b.city ?? "—"}</TableCell>
                <TableCell className="text-sm">{b.category_id ? cats[b.category_id] : (b.cuisine ?? "—")}</TableCell>
                <TableCell>
                  <Badge variant={LISTING_STATUS_VARIANT[b.listing_status]}>{LISTING_STATUS_LABEL[b.listing_status]}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={b.is_published ? "default" : "outline"}>{b.is_published ? "Published" : "Unpublished"}</Badge>
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
            {sorted.length === 0 && (
              <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground">No businesses match.</TableCell></TableRow>
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
                  <Badge variant={open.is_published ? "default" : "outline"}>{open.is_published ? "Published" : "Unpublished"}</Badge>
                  {open.is_featured && <Badge variant="secondary">Featured</Badge>}
                  <Badge variant="outline">{leadCounts[open.id] ?? 0} leads</Badge>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Lifecycle</p>
                  <Select value={open.listing_status} onValueChange={async (v) => {
                    const { error } = await supabase.from("businesses").update({ listing_status: v as ListingStatus }).eq("id", open.id);
                    if (error) return toast.error(error.message);
                    toast.success("Lifecycle updated");
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
                  {!assignOpen && (
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => { setAssignOpen(true); setAssignQuery(""); }}>
                      <UserPlus className="mr-1 h-4 w-4" /> {open.owner_id ? "Reassign owner" : "Assign owner"}
                    </Button>
                  )}
                  {assignOpen && (
                    <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
                      <Input
                        autoFocus
                        placeholder="Search users by display name…"
                        value={assignQuery}
                        onChange={(e) => setAssignQuery(e.target.value)}
                      />
                      <div className="max-h-48 space-y-1 overflow-y-auto">
                        {assignResults.length === 0 && <p className="text-xs text-muted-foreground">No matches.</p>}
                        {assignResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            disabled={assignBusy}
                            onClick={() => assignOwner(p.id)}
                            className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-left text-xs hover:border-primary hover:bg-primary/5"
                          >
                            <span className="truncate">{p.display_name ?? <span className="italic text-muted-foreground">No name</span>}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">{p.id.slice(0, 8)}</span>
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setAssignOpen(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
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
                    <Button variant="destructive" onClick={() => unassignOwner(open)}>
                      <UserMinus className="mr-1 h-4 w-4" /> Remove owner
                    </Button>
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

function SortableTh({ label, k, sort, onClick }: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onClick: (k: SortKey) => void;
}) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1 ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </TableHead>
  );
}

function ClaimsBadges({ summary, businessId }: { summary: ClaimSummary; businessId: string }) {
  const total = summary.pending + summary.moreInfo;
  if (summary.approved > 0 && total === 0) {
    return (
      <Link to={`/admin/claim-requests?biz=${businessId}&status=approved`} className="inline-block">
        <Badge variant="default">Approved</Badge>
      </Link>
    );
  }
  if (total === 0) return <span className="text-muted-foreground">—</span>;
  if (summary.moreInfo > 0) {
    return (
      <Link to={`/admin/claim-requests?biz=${businessId}&status=more_info_requested`} className="inline-flex gap-1">
        <Badge variant="outline">Needs response</Badge>
        {summary.pending > 0 && <Badge variant="secondary">{summary.pending} Pending</Badge>}
      </Link>
    );
  }
  return (
    <Link to={`/admin/claim-requests?biz=${businessId}&status=pending`} className="inline-block">
      <Badge variant="secondary">{summary.pending} Pending</Badge>
    </Link>
  );
}