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
        // Optional filters: { status?: string, limit?: number }
        const status = typeof body.status === "string" ? body.status : null;
        const limit = Math.min(Number(body.limit) || 200, 1000);
        let q = admin
          .from("event_sources")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(limit);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, sources: data ?? [] });
      }

      case "update_source_status": {
        // { source_id: uuid|string, status: string, last_run_at?: ISO, last_error?: string|null, stats?: jsonb }
        const sourceId = body.source_id;
        const status = body.status;
        if (!sourceId || typeof status !== "string") {
          return json({ error: "source_id and status required" }, 400);
        }
        const patch: Record<string, unknown> = {
          status,
          updated_at: new Date().toISOString(),
        };
        if (body.last_run_at) patch.last_run_at = body.last_run_at;
        if ("last_error" in body) patch.last_error = body.last_error ?? null;
        if (body.stats !== undefined) patch.stats = body.stats;
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
        // { source_id?: string, events: Array<{ external_id, title, ... }> }
        const events = Array.isArray(body.events) ? body.events : null;
        if (!events || events.length === 0) {
          return json({ error: "events array required" }, 400);
        }
        if (events.length > 1000) {
          return json({ error: "max 1000 events per request" }, 413);
        }
        const sourceId = body.source_id ?? null;
        const now = new Date().toISOString();
        const rows = events.map((e: Record<string, unknown>) => ({
          ...e,
          source_id: e.source_id ?? sourceId,
          updated_at: now,
        }));
        // Requires a unique index on (source_id, external_id) for proper dedupe.
        const { data, error } = await admin
          .from("events")
          .upsert(rows, { onConflict: "source_id,external_id" })
          .select("id");
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