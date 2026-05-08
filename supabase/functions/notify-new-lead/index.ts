import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://truckhub-showcase-demo.lovable.app";

function buildHtml(args: {
  ownerName: string; bizName: string; lead: any; leadUrl: string;
}) {
  const { ownerName, bizName, lead, leadUrl } = args;
  const row = (k: string, v: string | null | undefined) =>
    v ? `<tr><td style="padding:6px 12px 6px 0;color:#777;font-size:13px">${k}</td><td style="padding:6px 0;font-size:14px;color:#111">${v}</td></tr>` : "";
  return `
<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#fff;color:#111;padding:24px;max-width:560px;margin:0 auto">
  <h1 style="font-size:20px;margin:0 0 8px">New booking inquiry for ${bizName}</h1>
  <p style="color:#555;font-size:14px;margin:0 0 20px">Hi ${ownerName ?? "there"}, you have a new lead from TruckHub.</p>
  <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;border-bottom:1px solid #eee">
    ${row("Customer", lead.contact_name)}
    ${row("Email", lead.contact_email)}
    ${row("Phone", lead.contact_phone)}
    ${row("Event type", lead.event_type)}
    ${row("Event date", lead.event_date)}
    ${row("Guests", lead.guest_count)}
    ${row("Message", lead.message)}
  </table>
  <a href="${leadUrl}" style="display:inline-block;margin-top:24px;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;font-size:14px">Open in TruckHub</a>
  <p style="margin-top:24px;color:#999;font-size:12px">Reply through your TruckHub inbox so the conversation stays in one place.</p>
</div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { lead_id } = await req.json();
    if (!lead_id) return json({ error: "lead_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: lead } = await admin.from("leads").select("*").eq("id", lead_id).maybeSingle();
    if (!lead) return json({ error: "lead not found" }, 404);

    const { data: biz } = await admin
      .from("businesses")
      .select("id,name,slug,owner_id,email")
      .eq("id", lead.business_id).maybeSingle();
    if (!biz) return json({ error: "business not found" }, 404);

    const { data: prefs } = await admin
      .from("owner_preferences")
      .select("new_lead_notifications_enabled,email_notifications_enabled")
      .eq("business_id", biz.id).maybeSingle();

    const enabled = (prefs?.new_lead_notifications_enabled ?? true) && (prefs?.email_notifications_enabled ?? true);
    if (!enabled) return json({ ok: true, skipped: "preferences_disabled" });

    let recipientEmail: string | null = biz.email ?? null;
    if (!recipientEmail && biz.owner_id) {
      const { data: au } = await admin.auth.admin.getUserById(biz.owner_id);
      recipientEmail = au?.user?.email ?? null;
    }
    if (!recipientEmail) return json({ ok: true, skipped: "no_recipient" });

    const { data: profile } = biz.owner_id
      ? await admin.from("profiles").select("display_name").eq("id", biz.owner_id).maybeSingle()
      : { data: null as any };

    const html = buildHtml({
      ownerName: profile?.display_name ?? "",
      bizName: biz.name,
      lead,
      leadUrl: `${APP_URL}/owner/leads`,
    });
    const subject = `New lead: ${lead.contact_name} → ${biz.name}`;

    // Try Lovable Emails. If not configured (no domain yet), log payload and succeed.
    try {
      const { error } = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "raw-html",
          recipientEmail,
          idempotencyKey: `new-lead-${lead.id}`,
          subject,
          html,
        },
      });
      if (error) throw error;
      return json({ ok: true, sent: true });
    } catch (e) {
      console.log("[notify-new-lead] email transport not configured, payload:", { recipientEmail, subject });
      return json({ ok: true, sent: false, reason: "email_transport_unavailable" });
    }
  } catch (e) {
    console.error("notify-new-lead error", e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}