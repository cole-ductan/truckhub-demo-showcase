import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import { LISTING_STATUSES, normalize, slugify } from "@/lib/listingStatus";

const REQUIRED = [
  "business_name","slug","cuisine","city","region","public_phone","public_email",
  "website_url","instagram_url","facebook_url","short_description","today_location",
  "today_latitude","today_longitude","listing_status","is_published","internal_notes",
] as const;
const OPTIONAL = [
  "contact_name","outreach_email","service_area","online_ordering_url","today_hours",
  "catering_available","booking_inquiry_enabled","hero_image_url",
] as const;
const ALL_HEADERS = [...REQUIRED, ...OPTIONAL];
const URL_FIELDS = ["website_url", "instagram_url", "facebook_url", "online_ordering_url", "hero_image_url"] as const;

type Action = "insert" | "overwrite" | "skip";
type ParsedRow = {
  raw: Record<string, string>;
  errors: string[];
  warnings: string[];
  dupeOfId: string | null;
  dupeWithinFile: boolean;
  action: Action;
};

function toBool(v: string | undefined) {
  if (!v) return undefined;
  const s = v.trim().toLowerCase();
  if (["true","1","yes","y"].includes(s)) return true;
  if (["false","0","no","n"].includes(s)) return false;
  return undefined;
}
function toNum(v: string | undefined) {
  if (!v || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}
function isUrl(v: string | undefined) {
  if (!v?.trim()) return true;
  try {
    const url = new URL(v.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
function rowKeys(r: Record<string, string>) {
  return [normalize(r.business_name), normalize(r.slug), normalize(r.public_email), normalize(r.public_phone), normalize(r.website_url)].filter(Boolean);
}

function rowToPayload(r: Record<string, string>) {
  const cat = (r.listing_status || "").trim() as any;
  return {
    name: r.business_name?.trim(),
    slug: (r.slug?.trim() || slugify(r.business_name || "")) || undefined,
    cuisine: r.cuisine?.trim() || null,
    city: r.city?.trim() || null,
    region: r.region?.trim() || null,
    phone: r.public_phone?.trim() || null,
    email: r.public_email?.trim() || null,
    website: r.website_url?.trim() || null,
    instagram: r.instagram_url?.trim() || null,
    facebook: r.facebook_url?.trim() || null,
    description: r.short_description?.trim() || null,
    today_location: r.today_location?.trim() || null,
    today_latitude: toNum(r.today_latitude),
    today_longitude: toNum(r.today_longitude),
    listing_status: LISTING_STATUSES.includes(cat) ? cat : "unclaimed",
    is_published: toBool(r.is_published) ?? false,
    contact_name: r.contact_name?.trim() || null,
    service_area: r.service_area?.trim() || null,
    online_ordering_url: r.online_ordering_url?.trim() || null,
    today_hours: r.today_hours?.trim() || null,
    catering_available: toBool(r.catering_available) ?? false,
    booking_inquiry_enabled: toBool(r.booking_inquiry_enabled) ?? true,
    hero_image_url: r.hero_image_url?.trim() || null,
  };
}

function rowToAdminMeta(r: Record<string, string>) {
  const outreach = r.outreach_email?.trim() || null;
  const notes = r.internal_notes?.trim() || null;
  if (!outreach && !notes) return null;
  return { outreach_email: outreach, internal_notes: notes };
}

async function upsertAdminMeta(businessId: string, r: Record<string, string>) {
  const meta = rowToAdminMeta(r);
  if (!meta) return null;
  const { error } = await (supabase as any)
    .from("business_admin_metadata")
    .upsert({ business_id: businessId, ...meta }, { onConflict: "business_id" });
  return error?.message ?? null;
}

export default function AdminImportBusinesses() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<{ inserted: number; updated: number; skipped: number; failed: number; errors: string[] } | null>(null);

  const downloadTemplate = () => {
    const csv = Papa.unparse([Object.fromEntries(ALL_HEADERS.map((h) => [h, ""]))]);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "foodxmobile-listings-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExample = () => {
    const example = {
      business_name: "Smoke Trail BBQ",
      slug: "smoke-trail-bbq",
      cuisine: "BBQ · Brisket",
      city: "Green Bay",
      region: "WI",
      public_phone: "920-555-0142",
      public_email: "hello@smoketrailbbq.com",
      website_url: "https://smoketrailbbq.com",
      instagram_url: "https://instagram.com/smoketrailbbq",
      facebook_url: "",
      short_description: "Slow-smoked brisket, ribs, and burnt ends out of a custom rig.",
      today_location: "Titletown District",
      today_latitude: "44.5012",
      today_longitude: "-88.0623",
      listing_status: "unclaimed",
      is_published: "false",
      internal_notes: "Met owner at farmers market 2025-05",
      contact_name: "Jordan Pike",
      outreach_email: "jordan@smoketrailbbq.com",
      service_area: "Greater Green Bay",
      online_ordering_url: "",
      today_hours: "11am – 8pm",
      catering_available: "true",
      booking_inquiry_enabled: "true",
      hero_image_url: "",
    };
    const csv = Papa.unparse([example]);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "foodxmobile-listings-example.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    setSummary(null);
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    if (parsed.errors.length) {
      toast.error(`CSV parse error: ${parsed.errors[0].message}`);
      setRows([]);
      return;
    }
    const missingHeaders = REQUIRED.filter((header) => !parsed.meta.fields?.includes(header));
    if (missingHeaders.length) {
      toast.error(`Missing required CSV headers: ${missingHeaders.join(", ")}`);
      setRows([]);
      return;
    }
    const rawRows = parsed.data ?? [];

    const { data: existing } = await supabase
      .from("businesses")
      .select("id,name,slug,email,phone,website");
    const findDupe = (r: Record<string, string>) => {
      const keys = rowKeys(r);
      for (const e of existing ?? []) {
        const existingKeys = [normalize(e.name), normalize(e.slug), normalize(e.email), normalize(e.phone), normalize(e.website)];
        if (keys.some((k) => existingKeys.includes(k))) return e.id;
      }
      return null;
    };

    const seen = new Set<string>();
    const out: ParsedRow[] = rawRows.map((raw) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      if (!raw.business_name?.trim()) errors.push("missing business_name");
      const slug = raw.slug?.trim() || slugify(raw.business_name || "");
      if (!slug) errors.push("missing slug");
      if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.push("slug must use lowercase letters, numbers, and hyphens only");
      const lat = toNum(raw.today_latitude);
      const lng = toNum(raw.today_longitude);
      if (Number.isNaN(lat) || (lat != null && (lat < -90 || lat > 90))) errors.push("today_latitude must be between -90 and 90");
      if (Number.isNaN(lng) || (lng != null && (lng < -180 || lng > 180))) errors.push("today_longitude must be between -180 and 180");
      URL_FIELDS.forEach((field) => { if (!isUrl(raw[field])) errors.push(`${field} must be a valid http(s) URL`); });
      if (raw.listing_status && !LISTING_STATUSES.includes(raw.listing_status.trim() as any)) warnings.push(`unknown listing_status "${raw.listing_status}" → unclaimed`);
      if (raw.is_published && toBool(raw.is_published) === undefined) errors.push("is_published must be true/false, yes/no, or 1/0");
      if (raw.catering_available && toBool(raw.catering_available) === undefined) errors.push("catering_available must be true/false, yes/no, or 1/0");
      if (raw.booking_inquiry_enabled && toBool(raw.booking_inquiry_enabled) === undefined) errors.push("booking_inquiry_enabled must be true/false, yes/no, or 1/0");

      const keys = rowKeys({ ...raw, slug });
      const dupeWithinFile = keys.some((key) => seen.has(key));
      keys.forEach((key) => seen.add(key));
      if (dupeWithinFile) warnings.push("possible duplicate within uploaded CSV");
      const dupeOfId = findDupe({ ...raw, slug });
      return { raw: { ...raw, slug }, errors, warnings, dupeOfId, dupeWithinFile, action: dupeOfId || dupeWithinFile ? "skip" : "insert" };
    });
    setRows(out);
  };

  const setAction = (i: number, action: Action) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, action } : r)));

  const valid = useMemo(() => rows.filter((r) => r.errors.length === 0 && r.action !== "skip"), [rows]);

  const submit = async () => {
    setSubmitting(true);
    let inserted = 0, updated = 0, skipped = 0, failed = 0;
    const errs: string[] = [];
    for (const r of rows) {
      if (r.errors.length || r.action === "skip") { skipped++; continue; }
      const payload = rowToPayload(r.raw);
      if (r.action === "overwrite" && r.dupeOfId) {
        const { error } = await (supabase as any).from("businesses").update(payload).eq("id", r.dupeOfId);
        if (error) { failed++; errs.push(`${payload.name}: ${error.message}`); continue; }
        const metaErr = await upsertAdminMeta(r.dupeOfId, r.raw);
        if (metaErr) { failed++; errs.push(`${payload.name} (admin metadata): ${metaErr}`); } else updated++;
      } else {
        const { data: ins, error } = await (supabase as any).from("businesses").insert(payload).select("id").maybeSingle();
        if (error) { failed++; errs.push(`${payload.name}: ${error.message}`); continue; }
        const newId = ins?.id;
        if (newId) {
          const metaErr = await upsertAdminMeta(newId, r.raw);
          if (metaErr) { failed++; errs.push(`${payload.name} (admin metadata): ${metaErr}`); continue; }
        }
        inserted++;
      }
    }
    setSubmitting(false);
    setSummary({ inserted, updated, skipped, failed, errors: errs });
    if (failed) toast.error(`Import finished with ${failed} failed row${failed === 1 ? "" : "s"}`);
    else toast.success(`Import complete: ${inserted} inserted, ${updated} updated`);
    setRows([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Import Listings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Bulk upload businesses via CSV. Imported rows default to <Badge variant="secondary">unclaimed</Badge> and stay unpublished until reviewed.</p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">1. Get the template</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadTemplate} variant="outline"><Download className="mr-2 h-4 w-4" />Download blank CSV template</Button>
            <Button onClick={downloadExample} variant="outline"><FileText className="mr-2 h-4 w-4" />Download example CSV</Button>
          </div>
          <details className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <summary className="cursor-pointer font-semibold text-sm">CSV formatting guide</summary>
            <div className="mt-3 space-y-3">
              <div>
                <p className="font-semibold text-foreground">Required headers (column must exist, value may be blank when noted)</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">{REQUIRED.join(", ")}</p>
                <p className="mt-1 text-muted-foreground"><span className="font-semibold">Must have a value:</span> business_name, slug, listing_status, is_published. All other required columns may be left blank.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Optional headers</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">{OPTIONAL.join(", ")}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">URLs</p>
                <p className="text-muted-foreground">Leave blank or use a full <code>https://</code> URL. Plain domain names (e.g. <code>example.com</code>) are rejected. Applies to website_url, instagram_url, facebook_url, online_ordering_url, hero_image_url.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">listing_status</p>
                <p className="text-muted-foreground">Accepted: <code>draft</code>, <code>unclaimed</code>, <code>claimed_free</code>, <code>premium</code>, <code>archived</code>. Unknown values fall back to <code>unclaimed</code>.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Booleans</p>
                <p className="text-muted-foreground">Accepted: <code>true/false</code>, <code>yes/no</code>, or <code>1/0</code>. Applies to is_published, catering_available, booking_inquiry_enabled.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Coordinates</p>
                <p className="text-muted-foreground">today_latitude must be between <code>-90</code> and <code>90</code>. today_longitude must be between <code>-180</code> and <code>180</code>. Leave both blank if unknown.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Recommended defaults for new inventory</p>
                <p className="text-muted-foreground">Set <code>listing_status = unclaimed</code> and <code>is_published = false</code> so the listing flows into the Review Queue and Outreach CRM before going live.</p>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">2. Upload your CSV</CardTitle></CardHeader>
        <CardContent>
          <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <Button onClick={() => fileRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Choose CSV</Button>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>3. Preview ({rows.length} rows · {valid.length} ready)</span>
              <Button onClick={submit} disabled={submitting || valid.length === 0}>{submitting ? "Importing…" : `Import ${valid.length}`}</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i} className={r.errors.length ? "bg-destructive/5" : r.dupeOfId || r.dupeWithinFile ? "bg-amber-500/5" : ""}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.raw.business_name || <span className="italic text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-sm">{r.raw.city || "—"}</TableCell>
                    <TableCell className="text-sm">{r.raw.listing_status || "unclaimed"}</TableCell>
                    <TableCell className="text-xs">
                      {r.errors.map((e, k) => <div key={`e${k}`} className="flex items-center gap-1 text-destructive"><AlertTriangle className="h-3 w-3" />{e}</div>)}
                      {r.warnings.map((w, k) => <div key={`w${k}`} className="text-amber-600">{w}</div>)}
                      {r.dupeOfId && <div className="text-amber-600">Possible duplicate of existing listing</div>}
                      {!r.errors.length && !r.warnings.length && !r.dupeOfId && <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" />OK</span>}
                    </TableCell>
                    <TableCell>
                      <Select value={r.action} onValueChange={(v) => setAction(i, v as Action)}>
                        <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="insert" disabled={!!r.dupeOfId}>Insert</SelectItem>
                          <SelectItem value="overwrite" disabled={!r.dupeOfId}>Overwrite</SelectItem>
                          <SelectItem value="skip">Skip</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base">Import summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Inserted: {summary.inserted}</Badge>
              <Badge variant="secondary">Updated: {summary.updated}</Badge>
              <Badge variant="outline">Skipped: {summary.skipped}</Badge>
              {summary.failed > 0 && <Badge variant="destructive">Failed: {summary.failed}</Badge>}
            </div>
            {summary.errors.length > 0 && (
              <ul className="mt-3 list-disc pl-5 text-xs text-destructive">
                {summary.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
