import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_ORIGIN = Deno.env.get("APP_ORIGIN") ?? "https://foodxmobile.com";
const SUPPORT_EMAIL = Deno.env.get("SUPPORT_EMAIL") ?? "support@foodxmobile.com";

function ok(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function genTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const symbols = "!@#$%^&*";
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out + Math.floor(Math.random() * 10) + symbols[Math.floor(Math.random() * symbols.length)];
}

async function sendOnboardingEmail(to: string, ownerName: string, tempPassword: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!resendKey || !lovableKey) return { sent: false, reason: "email_provider_not_configured" };
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f7f5f0;padding:24px"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e8e3d8"><h1 style="margin:0 0 8px;font-size:22px">Your FoodXMobile Owner Account Is Ready</h1><p>Hi ${ownerName},</p><p>Your FoodXMobile listing access has been refreshed. Use the temporary password below to sign in:</p><div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;margin:16px 0"><p style="margin:0 0 4px"><strong>Username:</strong> ${to}</p><p style="margin:0"><strong>Temporary Password:</strong> <code>${tempPassword}</code></p></div><p style="text-align:center;margin:20px 0"><a href="${APP_ORIGIN}/auth" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:600">Log in</a></p><p style="font-size:13px;color:#71717a">You'll be required to set a new password before accessing the dashboard.</p><p style="font-size:13px;color:#71717a">Questions? Contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p></div></body></html>`;
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${lovableKey}`, "X-Connection-Api-Key": resendKey },
      body: JSON.stringify({ from: "FoodXMobile <onboarding@resend.dev>", to: [to], subject: "Your FoodXMobile Owner Account Is Ready", html }),
    });
    return res.ok ? { sent: true } : { sent: false, reason: `resend_${res.status}` };
  } catch (e) { return { sent: false, reason: (e as Error).message }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return ok({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const actorId = claims?.claims?.sub;
    if (!actorId) return ok({ error: "Unauthorized" }, 401);
    const { data: isAdm } = await admin.rpc("is_admin", { _user_id: actorId });
    if (!isAdm) return ok({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action: string = body.action;
    const targetUserId: string | undefined = body.target_user_id;

    async function audit(action_type: string, details: Record<string, unknown> = {}) {
      await admin.from("admin_account_audit").insert({ target_user_id: targetUserId ?? null, performed_by: actorId, action_type, details });
    }

    switch (action) {
      case "resend_onboarding": {
        if (!targetUserId) return ok({ error: "target_user_id required" }, 400);
        const { data: u } = await admin.auth.admin.getUserById(targetUserId);
        if (!u?.user?.email) return ok({ error: "User not found" }, 404);
        const temp = genTempPassword();
        const { error } = await admin.auth.admin.updateUserById(targetUserId, { password: temp });
        if (error) return ok({ error: error.message }, 500);
        await admin.from("profiles").update({ must_change_password: true, account_status: "invited" }).eq("id", targetUserId);
        const { data: p } = await admin.from("profiles").select("display_name").eq("id", targetUserId).maybeSingle();
        const emailRes = await sendOnboardingEmail(u.user.email, p?.display_name ?? "there", temp);
        await audit("onboarding_resent", { email_sent: emailRes.sent, reason: emailRes.reason });
        return ok({ ok: true, temp_password: temp, email_sent: emailRes.sent, email_reason: emailRes.reason });
      }
      case "send_password_reset": {
        if (!targetUserId) return ok({ error: "target_user_id required" }, 400);
        const { data: u } = await admin.auth.admin.getUserById(targetUserId);
        if (!u?.user?.email) return ok({ error: "User not found" }, 404);
        const { error } = await admin.auth.resetPasswordForEmail(u.user.email, { redirectTo: `${APP_ORIGIN}/auth` });
        if (error) return ok({ error: error.message }, 500);
        await audit("password_reset_requested");
        return ok({ ok: true });
      }
      case "update_email": {
        const newEmail = String(body.new_email ?? "").trim().toLowerCase();
        if (!targetUserId || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) return ok({ error: "invalid input" }, 400);
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (list?.users?.some((u) => u.id !== targetUserId && (u.email ?? "").toLowerCase() === newEmail)) {
          return ok({ error: "email_in_use" }, 409);
        }
        const { error } = await admin.auth.admin.updateUserById(targetUserId, { email: newEmail, email_confirm: true });
        if (error) return ok({ error: error.message }, 500);
        await audit("email_changed", { new_email: newEmail });
        return ok({ ok: true });
      }
      case "suspend": {
        if (!targetUserId) return ok({ error: "target_user_id required" }, 400);
        await admin.from("profiles").update({ account_status: "suspended" }).eq("id", targetUserId);
        await audit("account_suspended");
        return ok({ ok: true });
      }
      case "reactivate": {
        if (!targetUserId) return ok({ error: "target_user_id required" }, 400);
        await admin.from("profiles").update({ account_status: "active" }).eq("id", targetUserId);
        await audit("account_reactivated");
        return ok({ ok: true });
      }
      case "assign_business": {
        const businessId = body.business_id;
        if (!targetUserId || !businessId) return ok({ error: "missing fields" }, 400);
        const { data: biz } = await admin.from("businesses").select("owner_id").eq("id", businessId).maybeSingle();
        if (!biz) return ok({ error: "Business not found" }, 404);
        if (biz.owner_id && biz.owner_id !== targetUserId && body.force_replace !== true) {
          return ok({ error: "listing_has_owner", current_owner_id: biz.owner_id }, 409);
        }
        const { error } = await admin.from("businesses").update({
          owner_id: targetUserId,
          listing_status: body.listing_tier ?? "claimed_free",
        }).eq("id", businessId);
        if (error) return ok({ error: error.message }, 500);
        await admin.from("user_roles").upsert({ user_id: targetUserId, role: "owner" }, { onConflict: "user_id,role" });
        await audit("business_assigned", { business_id: businessId });
        return ok({ ok: true });
      }
      case "remove_business_access": {
        const businessId = body.business_id;
        if (!targetUserId || !businessId) return ok({ error: "missing fields" }, 400);
        const { error } = await admin.from("businesses").update({
          owner_id: null,
          listing_status: "unclaimed",
        }).eq("id", businessId).eq("owner_id", targetUserId);
        if (error) return ok({ error: error.message }, 500);
        await audit("business_access_removed", { business_id: businessId });
        return ok({ ok: true });
      }
      default:
        return ok({ error: "unknown action" }, 400);
    }
  } catch (e) {
    return ok({ error: (e as Error).message }, 500);
  }
});