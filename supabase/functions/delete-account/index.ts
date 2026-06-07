import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(supabaseUrl, serviceKey);

    const jwt = authHeader.replace("Bearer ", "");
    const { data: claims } = await userClient.auth.getClaims(jwt);
    const actorId = claims?.claims?.sub;
    if (!actorId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const targetUserId = typeof body?.target_user_id === "string" && body.target_user_id ? body.target_user_id : actorId;
    const isSelf = targetUserId === actorId;

    const { data: actorAdmin, error: actorRoleError } = await admin.rpc("is_admin", { _user_id: actorId });
    if (actorRoleError) return json({ error: actorRoleError.message }, 500);
    if (!isSelf && !actorAdmin) return json({ error: "Admin only" }, 403);

    const { data: targetAdmin, error: targetRoleError } = await admin.rpc("is_admin", { _user_id: targetUserId });
    if (targetRoleError) return json({ error: targetRoleError.message }, 500);
    if (targetAdmin) return json({ error: "Admin accounts cannot be deleted from this screen." }, 409);

    const { count: ownedCount, error: ownedError } = await admin
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", targetUserId);
    if (ownedError) return json({ error: ownedError.message }, 500);
    if ((ownedCount ?? 0) > 0) {
      return json({ error: "This user still owns one or more listings. Remove or reassign ownership first." }, 409);
    }

    // Preserve historical claim rows but remove claimant personal data before
    // deleting the Auth user. The FK migration changes requester_user_id to SET NULL.
    const { error: anonymizeError } = await admin
      .from("claim_requests")
      .update({
        requester_name: "Deleted user",
        requester_email: "deleted-user@redacted.invalid",
        requester_phone: null,
      })
      .eq("requester_user_id", targetUserId);
    if (anonymizeError) return json({ error: anonymizeError.message }, 500);

    const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId);
    if (deleteError) return json({ error: deleteError.message }, 500);

    return json({ ok: true, deleted_user_id: targetUserId, self_deleted: isSelf });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
