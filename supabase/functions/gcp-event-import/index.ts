// gcp-event-import — server-to-server ingest endpoint for the GCP Cloud Run job.
// Authenticated with a shared secret (GCP_EVENT_INGEST_TOKEN). No Supabase JWT.
// GCP never receives SUPABASE_SERVICE_ROLE_KEY — the key stays in Edge Function env.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ingest-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Constant-time string comparison to avoid timing attacks on the shared secret.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function extractToken(req: Request): string | null {
  const headerToken = req.headers.get("x-ingest-token");
  if (headerToken) return headerToken.trim();
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

const VALID_CRAWL_STATUSES = new Set([
  "never_run","queued","running","success","no_events","failed","paused",
]);
const VALID_REVIEW_STATUSES = new Set([
  "pending_review","needs_edit","approved","published","rejected",
]);
const VALID_DUPLICATE_STATUSES = new Set([
  "new","possible_duplicate","exact_duplicate","ignored",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const expected = Deno.env.get("GCP_EVENT_INGEST_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!expected || !supabaseUrl || !serviceKey) {
    return json({ error: "server_misconfigured" }, 503);
  }

  const provided = extractToken(req);
  if (!provided || !safeEqual(provided, expected)) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const action = String(body.action ?? "").trim();
  if (!action) return json({ error: "missing_action" }, 400);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    switch (action) {
      case "list_sources": {
        const maxSources = Math.min(Math.max(Number(body.max_sources) || 100, 1), 1000);
        const { data, error } = await admin
          .from("event_sources")
          .select("*")
          .eq("active", true)
          .order("last_crawled_at", { ascending: true, nullsFirst: true })
          .limit(maxSources);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, sources: data ?? [] });
      }

      case "update_source_status": {
        const sourceId = body.source_id;
        const crawlStatus = body.crawl_status;
        if (!sourceId || typeof crawlStatus !== "string") {
          return json({ error: "source_id and crawl_status required" }, 400);
        }
        if (!VALID_CRAWL_STATUSES.has(crawlStatus)) {
          return json({ error: `invalid crawl_status: ${crawlStatus}` }, 400);
        }
        const now = new Date().toISOString();
        const patch: Record<string, unknown> = {
          crawl_status: crawlStatus,
          last_crawled_at: now,
          updated_at: now,
        };
        if ("last_error" in body) patch.last_error = body.last_error ?? null;
        if (crawlStatus === "success" || crawlStatus === "no_events") {
          patch.last_success_at = now;
        }
        const { data, error } = await admin
          .from("event_sources")
          .update(patch)
          .eq("id", sourceId)
          .select()
          .maybeSingle();
        if (error) return json({ error: error.message }, 500);
        if (!data) return json({ error: "source_not_found" }, 404);
        return json({ ok: true, source: data });
      }

      case "upsert_events": {
        const events = Array.isArray(body.events) ? body.events : null;
        if (!events || events.length === 0) {
          return json({ error: "events array required" }, 400);
        }
        if (events.length > 1000) {
          return json({ error: "max 1000 events per request" }, 413);
        }
        const now = new Date().toISOString();
        const rows: Record<string, unknown>[] = [];
        for (let i = 0; i < events.length; i++) {
          const e = events[i] as Record<string, unknown>;
          if (!e || typeof e !== "object") {
            return json({ error: `events[${i}] not an object` }, 400);
          }
          if (typeof e.title !== "string" || !e.title.trim()) {
            return json({ error: `events[${i}].title required` }, 400);
          }
          if (typeof e.event_fingerprint !== "string" || !e.event_fingerprint.trim()) {
            return json({ error: `events[${i}].event_fingerprint required` }, 400);
          }
          if (typeof e.source_name !== "string" || typeof e.source_url !== "string") {
            return json({ error: `events[${i}].source_name and source_url required` }, 400);
          }
          const reviewStatus = (e.review_status as string) ?? "pending_review";
          if (!VALID_REVIEW_STATUSES.has(reviewStatus)) {
            return json({ error: `events[${i}].review_status invalid` }, 400);
          }
          const duplicateStatus = (e.duplicate_status as string) ?? "new";
          if (!VALID_DUPLICATE_STATUSES.has(duplicateStatus)) {
            return json({ error: `events[${i}].duplicate_status invalid` }, 400);
          }
          rows.push({
            source_id: e.source_id ?? null,
            source_name: e.source_name,
            source_url: e.source_url,
            source_event_url: e.source_event_url ?? null,
            external_id: e.external_id ?? null,
            title: e.title,
            start_date: e.start_date ?? null,
            start_time: e.start_time ?? null,
            end_date: e.end_date ?? null,
            end_time: e.end_time ?? null,
            start_at: e.start_at ?? null,
            end_at: e.end_at ?? null,
            venue: e.venue ?? null,
            address: e.address ?? null,
            city: e.city ?? "Green Bay",
            region: e.region ?? "Brown County",
            description: e.description ?? null,
            image_url: e.image_url ?? null,
            ticket_url: e.ticket_url ?? null,
            organizer: e.organizer ?? null,
            category: e.category ?? null,
            confidence_score: typeof e.confidence_score === "number" ? e.confidence_score : 0,
            duplicate_status: duplicateStatus,
            review_status: reviewStatus,
            event_fingerprint: e.event_fingerprint,
            raw_payload: e.raw_payload ?? {},
            updated_at: now,
          });
        }
        // Dedup against (source_id, event_fingerprint). Rows already reviewed
        // (approved/published/rejected/needs_edit) won't be overwritten — we
        // only refresh queued items still in pending_review.
        const { data, error } = await admin
          .from("event_import_queue")
          .upsert(rows, { onConflict: "source_id,event_fingerprint", ignoreDuplicates: false })
          .select("id, review_status");
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, upserted: data?.length ?? 0 });
      }

      default:
        return json({ error: `unknown_action:${action}` }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});