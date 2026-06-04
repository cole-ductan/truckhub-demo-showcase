// Create a Stripe Checkout session for a deposit request.
// Owner-authenticated. Falls back to a placeholder (no checkout URL) if
// STRIPE_SECRET_KEY is not configured yet.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const jwt = authHeader.replace("Bearer ", "");
    const { data: claims } = await userClient.auth.getClaims(jwt);
    const userId = claims?.claims?.sub;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { deposit_id, lead_id, business_id, amount_total, deposit_percentage, deposit_amount, customer_name, customer_email, due_date, notes, origin } = body ?? {};

    if (!business_id || !deposit_amount || Number(deposit_amount) <= 0) {
      return json({ error: "business_id and positive deposit_amount required" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Published businesses are publicly readable, so a successful client-side
    // SELECT is not proof of ownership. Verify owner_id explicitly with the
    // service-role client before performing any privileged writes.
    const { data: biz, error: bizError } = await admin
      .from("businesses")
      .select("id,name,owner_id")
      .eq("id", business_id)
      .maybeSingle();
    if (bizError) return json({ error: bizError.message }, 500);
    if (!biz || biz.owner_id !== userId) {
      return json({ error: "Business not found or not yours" }, 403);
    }

    const { data: prefs, error: prefsError } = await admin
      .from("owner_preferences")
      .select("stripe_deposits_enabled,payment_mode")
      .eq("business_id", business_id)
      .maybeSingle();
    if (prefsError) return json({ error: prefsError.message }, 500);
    if (!prefs?.stripe_deposits_enabled || prefs.payment_mode !== "stripe") {
      return json({ error: "Stripe deposits are not enabled for this business" }, 403);
    }

    // Upsert deposit row (insert if no id)
    let depositRow: any;
    if (deposit_id) {
      const { data, error } = await admin
        .from("deposit_requests")
        .update({
          amount_total: amount_total ?? null,
          deposit_percentage: deposit_percentage ?? 0,
          deposit_amount,
          customer_name: customer_name ?? null,
          customer_email: customer_email ?? null,
          due_date: due_date ?? null,
          notes: notes ?? null,
          status: "draft",
        })
        .eq("id", deposit_id)
        .eq("business_id", business_id)
        .select()
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "Deposit request not found" }, 404);
      depositRow = data;
    } else {
      const { data, error } = await admin
        .from("deposit_requests")
        .insert({
          business_id, lead_id: lead_id ?? null,
          amount_total: amount_total ?? null,
          deposit_percentage: deposit_percentage ?? 0,
          deposit_amount,
          customer_name: customer_name ?? null,
          customer_email: customer_email ?? null,
          due_date: due_date ?? null,
          notes: notes ?? null,
          status: "draft",
        })
        .select()
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      depositRow = data;
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      // Placeholder mode — surface clearly. No checkout URL created.
      return json({
        ok: true,
        configured: false,
        deposit: depositRow,
        message: "Stripe is not configured. Add STRIPE_SECRET_KEY in backend secrets to enable checkout.",
      });
    }

    // Lazy-import Stripe to keep cold start cheap when not configured
    const Stripe = (await import("https://esm.sh/stripe@17.6.0?target=deno&deno-std=0.224.0")).default;
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });

    const successBase = origin || new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: customer_email || undefined,
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: Math.round(Number(deposit_amount) * 100),
          product_data: { name: `Event deposit — ${biz.name}`, description: notes ? String(notes).slice(0, 200) : undefined },
        },
        quantity: 1,
      }],
      metadata: {
        deposit_id: depositRow.id,
        business_id,
        lead_id: lead_id ?? "",
      },
      success_url: `${successBase}/payment/success?deposit=${depositRow.id}`,
      cancel_url: `${successBase}/payment/cancel?deposit=${depositRow.id}`,
    });

    await admin.from("deposit_requests").update({
      status: "checkout_created",
      stripe_checkout_session_id: session.id,
      checkout_url: session.url,
    }).eq("id", depositRow.id);

    return json({
      ok: true, configured: true,
      deposit: { ...depositRow, status: "checkout_created", stripe_checkout_session_id: session.id, checkout_url: session.url },
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
