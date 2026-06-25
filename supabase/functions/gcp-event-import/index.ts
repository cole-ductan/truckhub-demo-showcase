import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ingest-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INGEST_TOKEN = Deno.env.get("GCP_EVENT_INGEST_TOKEN")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type SourceStatus = "queued" | "running" | "success" | "no_events" | "failed" | "paused";

type CandidateEvent = {
  source_id: string;
  source_name: string;
  source_url: string;
  source_event_url?: string | null;
  external_id?: string | null;
  title: string;
  start_at?: string | null;
  end_at?: string | null;
  start_date?: string | null;
  start_time?: string | null;
  end_date?: string | null;
  end_time?: string | null;
  venue?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  description?: string | null;
  image_url?: string | null;
  ticket_url?: string | null;
  organizer?: string | null;
  category?: string | null;
  confidence_score?: number;
  duplicate_status?: "new";
  review_status?: "pending_review";
  event_fingerprint: string;
  raw_payload?: unknown;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    if (!INGEST_TOKEN) return json({ error: "ingest token not configured" }, 500);
    if (!isAuthorized(req)) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "invalid json body" }, 400);

    switch (body.action) {
      case "list_sources":
        return await listSources(body.max_sources);
      case "update_source_status":
        return await updateSourceStatus(body.source_id, body.crawl_status, body.last_error ?? null);
      case "upsert_events":
        return await upsertEvents(body.events);
      default:
        return json({ error: "unknown action" }, 400);
    }
  } catch (error) {
    console.error("gcp-event-import error", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

function isAuthorized(req: Request) {
  const headerToken = req.headers.get("x-ingest-token")?.trim();
  const auth = req.headers.get("authorization")?.trim();
  const bearerToken = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
  return Boolean(INGEST_TOKEN && (headerToken === INGEST_TOKEN || bearerToken === INGEST_TOKEN));
}

async function listSources(maxSources: unknown) {
  const limit = Math.min(Math.max(Number(maxSources) || 25, 1), 100);

  const { data, error } = await admin
    .from("event_sources")
    .select("id, source_name, source_url, source_type, city, region, category")
    .eq("active", true)
    .in("source_type", ["webpage", "json_ld"])
    .limit(limit);

  if (error) throw error;
  return json({ ok: true, sources: data ?? [] });
}

async function updateSourceStatus(sourceId: unknown, crawlStatus: unknown, lastError: unknown) {
  if (!sourceId || typeof sourceId !== "string") return json({ error: "source_id required" }, 400);
  if (!isValidStatus(crawlStatus)) return json({ error: "invalid crawl_status" }, 400);

  const patch: Record<string, unknown> = {
    crawl_status: crawlStatus,
    last_crawled_at: new Date().toISOString(),
    last_error: typeof lastError === "string" && lastError.length ? lastError.slice(0, 1000) : null,
  };

  if (crawlStatus === "success" || crawlStatus === "no_events") {
    patch.last_success_at = new Date().toISOString();
  }

  const { error } = await admin
    .from("event_sources")
    .update(patch)
    .eq("id", sourceId);

  if (error) throw error;
  return json({ ok: true });
}

async function upsertEvents(events: unknown) {
  if (!Array.isArray(events)) return json({ error: "events array required" }, 400);
  if (events.length > 250) return json({ error: "too many events; max 250 per request" }, 400);

  const normalized = events.map(normalizeCandidate).filter(Boolean) as CandidateEvent[];
  if (!normalized.length) return json({ ok: true, inserted: 0, skipped: events.length });

  const { error } = await admin
    .from("event_import_queue")
    .upsert(normalized, { onConflict: "source_id,event_fingerprint", ignoreDuplicates: true });

  if (error) throw error;
  return json({ ok: true, processed: normalized.length, skipped: events.length - normalized.length });
}

function normalizeCandidate(event: unknown): CandidateEvent | null {
  if (!event || typeof event !== "object") return null;
  const record = event as Record<string, unknown>;

  const sourceId = text(record.source_id);
  const sourceName = text(record.source_name);
  const sourceUrl = text(record.source_url);
  const title = text(record.title);
  const eventFingerprint = text(record.event_fingerprint);

  if (!sourceId || !sourceName || !sourceUrl || !title || !eventFingerprint) return null;

  const confidence = Number(record.confidence_score ?? 0);

  return {
    source_id: sourceId,
    source_name: sourceName,
    source_url: sourceUrl,
    source_event_url: text(record.source_event_url),
    external_id: text(record.external_id),
    title,
    start_at: text(record.start_at),
    end_at: text(record.end_at),
    start_date: text(record.start_date),
    start_time: text(record.start_time),
    end_date: text(record.end_date),
    end_time: text(record.end_time),
    venue: text(record.venue),
    address: text(record.address),
    city: text(record.city) ?? "Green Bay",
    region: text(record.region) ?? "Brown County",
    description: text(record.description),
    image_url: text(record.image_url),
    ticket_url: text(record.ticket_url),
    organizer: text(record.organizer),
    category: text(record.category),
    confidence_score: Number.isFinite(confidence) ? Math.max(0, Math.min(100, confidence)) : 0,
    duplicate_status: "new",
    review_status: "pending_review",
    event_fingerprint: eventFingerprint,
    raw_payload: record.raw_payload ?? {},
  };
}

function isValidStatus(value: unknown): value is SourceStatus {
  return typeof value === "string" && ["queued", "running", "success", "no_events", "failed", "paused"].includes(value);
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length ? cleaned : null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
