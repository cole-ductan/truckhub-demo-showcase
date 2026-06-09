import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORT_EMAIL = Deno.env.get("SUPPORT_EMAIL") ?? "support@foodxmobile.com";
const APP_ORIGIN = Deno.env.get("APP_ORIGIN") ?? "https://foodxmobile.com";

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function sendOnboardingEmail(args: { to: string; ownerName: string; tempPassword: string; loginUrl: string }) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!resendKey || !lovableKey) return { sent: false, reason: "email_provider_not_configured" };
  const html = `
<!doctype html><html><body style="margin:0;background:#f7f5f0;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a1a1a">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
  <div style="background:#ffffff;border-radius:16px;padding:32px 28px;border:1px solid #e8e3d8">
    <h1 style="margin:0 0 8px;font-size:24px;color:#1a1a1a">Your FoodXMobile Owner Account Is Ready</h1>
    <p style="margin:0 0 20px;color:#55575d;font-size:15px">Hi ${args.ownerName},</p>
    <p style="margin:0 0 16px;font-size:15px">Your FoodXMobile listing claim has been approved. Your owner dashboard is ready.</p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;margin:20px 0">
      <p style="margin:0 0 8px;font-size:13px;color:#7c2d12"><strong>Username:</strong> ${args.to}</p>
      <p style="margin:0;font-size:13px;color:#7c2d12"><strong>Temporary Password:</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px;font-size:14px">${args.tempPassword}</code></p>
    </div>
    <p style="text-align:center;margin:24px 0">
      <a href="${args.loginUrl}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:600">Log in to your dashboard</a>
    </p>
    <h3 style="font-size:16px;margin:24px 0 8px">What's Next?</h3>
    <ul style="padding-left:20px;font-size:14px;color:#3f3f46;line-height:1.6">
      <li>Log in to your FoodXMobile owner dashboard</li>
      <li>Create a new password when prompted</li>
      <li>Review your food truck listing details</li>
      <li>Update your menu, photos, location, and booking information</li>
    </ul>
    <p style="margin:24px 0 0;font-size:13px;color:#71717a">Your temporary password is for your first login only. You will be required to replace it before accessing the dashboard.</p>
    <p style="margin:16px 0 0;font-size:13px;color:#71717a">Questions? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:#ea580c">${SUPPORT_EMAIL}</a>.</p>
  </div>
  <p style="text-align:center;color:#a1a1aa;font-size:12px;margin-top:20px">FoodXMobile — Discover Food Trucks, Markets, and Local Events</p>
</div>
</body></html>`;
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: `FoodXMobile <onboarding@resend.dev>`,
        to: [args.to],
        subject: "Your FoodXMobile Owner Account Is Ready",
        html,
      }),
    });
    if (!res.ok) return { sent: false, reason: `resend_${res.status}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: (e as Error).message };
  }
}

function genTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const symbols = "!@#$%^&*";
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  // ensure a digit + symbol
  return out + Math.floor(Math.random() * 10) + symbols[Math.floor(Math.random() * symbols.length)];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return ok({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });

    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const actorId = claims?.claims?.sub;
    if (!actorId) return ok({ error: "Unauthorized" }, 401);

    const { data: actorAdmin } = await admin.rpc("is_admin", { _user_id: actorId });
    if (!actorAdmin) return ok({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const claimId: string | undefined = body.claim_id;
    const ownerName: string = String(body.owner_name ?? "").trim();
    const ownerEmail: string = String(body.owner_email ?? "").trim().toLowerCase();
    const businessId: string = String(body.business_id ?? "");
    const listingTier: string = body.listing_tier ?? "claimed_free";
    const sendEmail: boolean = body.send_email !== false;
    const forceReplaceOwner: boolean = body.force_replace_owner === true;
    const linkExistingConfirmed: boolean = body.link_existing_confirmed === true;

    if (!claimId || !ownerName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerEmail) || !businessId) {
      return ok({ error: "Missing or invalid fields" }, 400);
    }

    const { data: claim, error: claimErr } = await admin.from("claim_requests").select("*").eq("id", claimId).maybeSingle();
    if (claimErr) return ok({ error: claimErr.message }, 500);
    if (!claim) return ok({ error: "Claim not found" }, 404);
    if (claim.business_id !== businessId) return ok({ error: "Business does not match claim" }, 400);
    if (!["pending", "submitted", "contacted", "awaiting_verification", "more_info_requested"].includes(claim.status)) {
      return ok({ error: `Claim is ${claim.status} and cannot be approved` }, 409);
    }

    const { data: biz } = await admin.from("businesses").select("id,owner_id,listing_status,slug,name").eq("id", businessId).maybeSingle();
    if (!biz) return ok({ error: "Business not found" }, 404);
    if (biz.owner_id && !forceReplaceOwner) {
      return ok({ error: "listing_has_owner", current_owner_id: biz.owner_id }, 409);
    }

    // Look up existing auth user by email
    let userId: string | null = null;
    let createdNew = false;
    let tempPassword: string | null = null;

    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => (u.email ?? "").toLowerCase() === ownerEmail);

    if (existing) {
      if (!linkExistingConfirmed) {
        return ok({ error: "email_already_exists", existing_user_id: existing.id }, 409);
      }
      userId = existing.id;
    } else {
      tempPassword = genTempPassword();
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: ownerEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { display_name: ownerName },
      });
      if (createErr || !created.user) return ok({ error: createErr?.message ?? "create_user_failed" }, 500);
      userId = created.user.id;
      createdNew = true;
    }

    // Upsert profile
    await admin.from("profiles").upsert({
      id: userId,
      display_name: ownerName,
      must_change_password: createdNew,
      account_status: createdNew ? "invited" : "active",
    }, { onConflict: "id" });

    // Ensure owner role
    await admin.from("user_roles").upsert({ user_id: userId, role: "owner" }, { onConflict: "user_id,role" });

    // Assign business
    const { error: assignErr } = await admin.from("businesses").update({
      owner_id: userId,
      listing_status: listingTier as any,
      updated_at: new Date().toISOString(),
    }).eq("id", businessId);
    if (assignErr) return ok({ error: assignErr.message }, 500);

    // Approve claim
    await admin.from("claim_requests").update({
      status: "approved",
      approved_owner_user_id: userId,
      reviewed_by: actorId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", claimId);

    // Activity + audit
    await admin.from("claim_activities").insert({
      claim_id: claimId, action_type: "approved", performed_by: actorId,
      note: createdNew ? "Owner account created" : "Linked to existing user account",
    });
    await admin.from("admin_account_audit").insert({
      target_user_id: userId, performed_by: actorId,
      action_type: createdNew ? "account_created" : "business_assigned",
      details: { business_id: businessId, claim_id: claimId, email_sent: false },
    });

    let emailResult: { sent: boolean; reason?: string } = { sent: false, reason: "skipped" };
    if (sendEmail && createdNew && tempPassword) {
      emailResult = await sendOnboardingEmail({
        to: ownerEmail, ownerName, tempPassword,
        loginUrl: `${APP_ORIGIN}/auth`,
      });
      if (emailResult.sent) {
        await admin.from("admin_account_audit").insert({
          target_user_id: userId, performed_by: actorId,
          action_type: "onboarding_email_sent", details: { business_id: businessId },
        });
      }
    }

    return ok({
      ok: true,
      user_id: userId,
      created_new: createdNew,
      temp_password: tempPassword, // shown once to admin, never stored
      email_sent: emailResult.sent,
      email_reason: emailResult.reason,
    });
  } catch (e) {
    return ok({ error: (e as Error).message }, 500);
  }
});