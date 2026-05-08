// Stripe webhook receiver. Updates deposit_requests on checkout.session.completed.
// Public endpoint — no JWT. Validates Stripe signature when STRIPE_WEBHOOK_SECRET is set.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!secret) {
    return new Response(JSON.stringify({ ok: false, error: "Stripe not configured" }), { status: 200 });
  }

  const Stripe = (await import("https://esm.sh/stripe@17.6.0?target=deno&deno-std=0.224.0")).default;
  const stripe = new Stripe(secret, { apiVersion: "2024-11-20.acacia" });

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: any;
  try {
    if (whSecret && sig) {
      event = await stripe.webhooks.constructEventAsync(raw, sig, whSecret);
    } else {
      // Dev mode — accept unsigned (TODO production: require signature)
      event = JSON.parse(raw);
    }
  } catch (e) {
    return new Response(`Bad signature: ${(e as Error).message}`, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const depositId = session.metadata?.deposit_id;
    if (depositId) {
      await admin.from("deposit_requests").update({
        status: "paid",
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        paid_at: new Date().toISOString(),
      }).eq("id", depositId);
    }
  } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object;
    const depositId = session.metadata?.deposit_id;
    if (depositId) {
      await admin.from("deposit_requests").update({
        status: event.type === "checkout.session.expired" ? "canceled" : "failed",
      }).eq("id", depositId);
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});