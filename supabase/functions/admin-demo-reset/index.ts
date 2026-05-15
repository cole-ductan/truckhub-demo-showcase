import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const DEMO_SLUGS = [
  "smoke-trail-bbq",
  "bay-burger-co",
  "tortilla-norte",
  "stone-oven-pies",
  "north-coast-waffles",
  "fowl-play",
];

const SMOKE_TRAIL = {
  slug: "smoke-trail-bbq",
  name: "Smoke Trail BBQ",
  tagline: "16-hour smoked brisket, fall-off-the-bone ribs.",
  description:
    "Family-run mobile smokehouse from Green Bay. We slow-smoke over Wisconsin oak and cherry — brisket, ribs, burnt ends, hot links — and pair it with from-scratch sides. Book us for weddings, corporate lunches, brewery pop-ups, and tailgates.",
  cuisine: "Low & slow Wisconsin BBQ",
  emoji: "🔥",
  today_location: "Titletown District · Brookwood Dr",
  today_hours: "11:30a – 8:00p",
  status: "open",
  is_published: true,
  is_featured: true,
  city: "Green Bay",
  region: "WI",
  hero_image_url: "asset:truck-bbq.jpg",
};

const DEMO_MENU: Array<{ cat: string; items: Array<{ name: string; price: string; featured?: boolean; desc?: string }> }> = [
  {
    cat: "Smoked by the pound",
    items: [
      { name: "Brisket", price: "$28/lb", featured: true, desc: "16-hour oak-smoked, sliced to order." },
      { name: "Pulled Pork", price: "$22/lb" },
      { name: "Burnt Ends", price: "$26/lb", featured: true },
      { name: "St. Louis Ribs", price: "$18/half" },
    ],
  },
  {
    cat: "Sandwiches",
    items: [
      { name: "The Trail Boss", price: "$14", desc: "Brisket + burnt ends + pickles on a brioche bun." },
      { name: "Pulled Pork Stack", price: "$12" },
      { name: "Hot Link Hoagie", price: "$11" },
    ],
  },
  {
    cat: "Sides",
    items: [
      { name: "Smoked Mac & Cheese", price: "$6" },
      { name: "Bourbon Baked Beans", price: "$5" },
      { name: "Vinegar Slaw", price: "$5" },
      { name: "Cornbread", price: "$4" },
    ],
  },
];

const DEMO_EVENTS = [
  { title: "Titletown Spring Food Truck Rally", event_date: "2026-05-23", weekday: "Sat", location: "Titletown District", tag: "Festival", start_time: "11:30a", end_time: "8:00p" },
  { title: "First Friday on Broadway", event_date: "2026-06-05", weekday: "Fri", location: "On Broadway District", tag: "Block Party", start_time: "5:00p", end_time: "10:00p" },
  { title: "Packers Draft Watch Party", event_date: "2026-06-13", weekday: "Sat", location: "Lambeau Field — Lot 1", tag: "Tailgate", start_time: "11:00a", end_time: "9:00p" },
];

const DEMO_LOCATIONS = [
  { label: "Titletown District", address: "Brookwood Dr, Green Bay, WI", weekday: "Tue", start_time: "11:30a", end_time: "2:00p", is_recurring: true },
  { label: "Hinterland Brewery", address: "1001 Lombardi Ave, Ashwaubenon, WI", weekday: "Fri", start_time: "5:00p", end_time: "9:00p", is_recurring: true },
];

const DEMO_LEAD = {
  contact_name: "Jamie Rivera",
  contact_email: "jamie.rivera@example.com",
  contact_phone: "(920) 555-0142",
  event_type: "Wedding rehearsal dinner",
  event_date: "2026-08-15",
  guest_count: "60",
  message:
    "Hi! We loved your brisket at Bayfest. Looking to book Smoke Trail BBQ for a rehearsal dinner on Aug 15 — about 60 guests. Can you share pricing and a deposit?",
  source: "public_form",
  stage: "new",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json(403, { error: "Admin only" });

    const { action, confirm, business_id } = await req.json().catch(() => ({}));

    if (action === "seed_lead") {
      let bizId: string | null = business_id ?? null;
      let bizName = "the selected business";
      if (bizId) {
        const { data: b } = await admin.from("businesses").select("id, name").eq("id", bizId).maybeSingle();
        if (!b) return json(404, { error: "Business not found" });
        bizName = b.name;
      } else {
        const { data: b } = await admin.from("businesses").select("id, name").eq("slug", "smoke-trail-bbq").maybeSingle();
        if (!b) return json(404, { error: "Smoke Trail BBQ not found" });
        bizId = b.id;
        bizName = b.name;
      }
      const { error } = await admin.from("leads").insert({
        ...DEMO_LEAD,
        business_id: bizId,
        is_demo: true,
      });
      if (error) return json(500, { error: error.message });
      return json(200, { ok: true, message: `Sample lead created for ${bizName}.` });
    }

    if (action !== "reset") return json(400, { error: "Unknown action" });
    if (confirm !== "RESET DEMO") return json(400, { error: "Confirmation text required" });

    const summary: Record<string, number> = {};
    const tag = (t: string, n: number) => (summary[t] = (summary[t] ?? 0) + n);

    // 1) Delete demo-tagged transactional data
    for (const t of ["lead_messages", "deposit_requests", "bookings", "leads", "business_events", "saved_locations", "menu_items", "menu_categories"]) {
      const { error, count } = await admin.from(t).delete({ count: "exact" }).eq("is_demo", true);
      if (error) return json(500, { error: `delete ${t}: ${error.message}` });
      tag(`deleted_${t}`, count ?? 0);
    }

    // 2) Restore Smoke Trail BBQ business fields
    const { data: smoke, error: upErr } = await admin
      .from("businesses")
      .update(SMOKE_TRAIL)
      .eq("slug", "smoke-trail-bbq")
      .select("id")
      .maybeSingle();
    if (upErr) return json(500, { error: `update smoke: ${upErr.message}` });
    if (!smoke) return json(404, { error: "Smoke Trail BBQ business missing — please seed manually" });
    tag("restored_businesses", 1);

    // 3) Re-seed menu for Smoke Trail
    for (let i = 0; i < DEMO_MENU.length; i++) {
      const c = DEMO_MENU[i];
      const { data: cat, error: ce } = await admin
        .from("menu_categories")
        .insert({ business_id: smoke.id, name: c.cat, sort_order: i, is_demo: true })
        .select("id")
        .single();
      if (ce) return json(500, { error: `cat: ${ce.message}` });
      const rows = c.items.map((it, j) => ({
        business_id: smoke.id,
        category_id: cat.id,
        name: it.name,
        price: it.price,
        description: it.desc ?? null,
        is_featured: !!it.featured,
        is_available: true,
        sort_order: j,
        is_demo: true,
      }));
      const { error: ie } = await admin.from("menu_items").insert(rows);
      if (ie) return json(500, { error: `items: ${ie.message}` });
      tag("seeded_menu_items", rows.length);
    }

    // 4) Events
    {
      const rows = DEMO_EVENTS.map((e) => ({ ...e, business_id: smoke.id, kind: "one_off", is_public: true, is_demo: true }));
      const { error } = await admin.from("business_events").insert(rows);
      if (error) return json(500, { error: `events: ${error.message}` });
      tag("seeded_events", rows.length);
    }

    // 5) Saved locations
    {
      const rows = DEMO_LOCATIONS.map((l, i) => ({ ...l, business_id: smoke.id, sort_order: i, is_demo: true }));
      const { error } = await admin.from("saved_locations").insert(rows);
      if (error) return json(500, { error: `locations: ${error.message}` });
      tag("seeded_locations", rows.length);
    }

    // 6) Owner preferences for Smoke Trail
    {
      const { data: existing } = await admin
        .from("owner_preferences")
        .select("id")
        .eq("business_id", smoke.id)
        .maybeSingle();
      const prefs = {
        business_id: smoke.id,
        new_lead_notifications_enabled: true,
        owner_reply_notifications_enabled: true,
        email_notifications_enabled: true,
        sms_notifications_enabled: false,
        stripe_deposits_enabled: false,
        payment_mode: "no_deposits",
        deposit_percentage: 25,
        is_demo: true,
      };
      if (existing) {
        const { error } = await admin.from("owner_preferences").update(prefs).eq("id", existing.id);
        if (error) return json(500, { error: `prefs: ${error.message}` });
      } else {
        const { error } = await admin.from("owner_preferences").insert(prefs);
        if (error) return json(500, { error: `prefs: ${error.message}` });
      }
      tag("restored_owner_preferences", 1);
    }

    // 7) Seed one fresh demo lead
    {
      const { error } = await admin.from("leads").insert({
        ...DEMO_LEAD,
        business_id: smoke.id,
        is_demo: true,
      });
      if (error) return json(500, { error: `lead: ${error.message}` });
      tag("seeded_leads", 1);
    }

    return json(200, {
      ok: true,
      message: "Demo data reset complete.",
      summary,
      demo_slugs: DEMO_SLUGS,
    });
  } catch (e) {
    return json(500, { error: (e as Error).message });
  }
});