import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://truckhub-showcase-demo.lovable.app";

function buildHtml(args: { customerName: string; bizName: string; bizSlug: string; body: string; }) {
  const { customerName, bizName, bizSlug, body } = args;
  const safe = body.replace(/</g, "&lt;").replace(/\n/g, "<br/>");
  return `
<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#fff;color:#111;padding:24px;max-width:560px;margin:0 auto">
  <h1 style="font-size:20px;margin:0 0 8px">New reply from ${bizName}</h1>
  <p style="color:#555;font-size:14px;margin:0 0 16px">Hi ${customerName ?? "there"}, you have a new message about your inquiry.</p>
  <div style="border-left:3px solid #111;padding:12px 16px;background:#f7f7f7;border-radius:6px;font-size:14px;line-height:1.5;color:#222">${safe}</div>
  <a href="${APP_URL}/food-trucks/${bizSlug}" style="display:inline-block;margin-top:24px;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;font-size:14px">View ${bizName}</a>
  <p style="margin-top:24px;color:#999;font-size:12px">This conversation is managed through TruckHub. Just reply to ${bizName} from the link above to keep everything in one place.</p>
</div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { message_id } = await req.json();
    if (!message_id) return json({ error: "message_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: msg } = await admin.from("lead_messages").select("*").eq("id", message_id).maybeSingle();
    if (!msg || msg.sender_role !== "owner") return json({ ok: true, skipped: "not_owner_message" });

    const { data: lead } = await admin.from("leads").select("*").eq("id", msg.lead_id).maybeSingle();
    if (!lead?.contact_email) return json({ ok: true, skipped: "no_recipient" });

    const { data: biz } = await admin.from("businesses").select("id,name,slug").eq("id", lead.business_id).maybeSingle();
    if (!biz) return json({ error: "business not found" }, 404);

    const { data: prefs } = await admin
      .from("owner_preferences")
      .select("owner_reply_notifications_enabled,email_notifications_enabled")
      .eq("business_id", biz.id).maybeSingle();
    const enabled = (prefs?.owner_reply_notifications_enabled ?? true) && (prefs?.email_notifications_enabled ?? true);
    if (!enabled) return json({ ok: true, skipped: "preferences_disabled" });

    const html = buildHtml({
      customerName: lead.contact_name,
      bizName: biz.name,
      bizSlug: biz.slug,
      body: msg.body,
    });
    const subject = `${biz.name} replied to your inquiry`;

    try {
      const { error } = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "raw-html",
          recipientEmail: lead.contact_email,
          idempotencyKey: `reply-${msg.id}`,
          subject,
          html,
        },
      });
      if (error) throw error;
      return json({ ok: true, sent: true });
    } catch (e) {
      console.log("[notify-owner-reply] email transport not configured, payload:", { recipientEmail: lead.contact_email, subject });
      return json({ ok: true, sent: false, reason: "email_transport_unavailable" });
    }
  } catch (e) {
    console.error("notify-owner-reply error", e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}