import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowUpRight, Search, Send } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { supabaseLeadDirectory } from "@/lib/crm/liveLeadDirectory";
import { useSEO } from "@/hooks/useSEO";
import { resolveImage } from "@/lib/assets";
import { AVAILABILITY_LABEL, AVAILABILITY_TONE, getAvailabilityState } from "@/lib/availability";

const EVENT_TYPES = ["Private party","Corporate event","Wedding","School event","Community event","Festival","Brewery or bar event","Fundraiser","Other"];
const SERVICE_STYLES = [
  { value: "individual", label: "Guests purchase individually" },
  { value: "host_pays", label: "Host pays a minimum or catering package" },
  { value: "either", label: "Either option" },
  { value: "unsure", label: "Not sure" },
];
const REQUEST_TYPES = [
  { value: "single", label: "Hire one food truck" },
  { value: "multiple", label: "Invite multiple food trucks" },
  { value: "unsure", label: "Not sure yet" },
];
const FREQUENCIES = [
  { value: "one_time", label: "One-time event" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "seasonal", label: "Seasonal" },
  { value: "multiple", label: "Multiple dates" },
  { value: "unsure", label: "Not sure" },
];
const BUDGETS = ["Under $500","$500–$1,500","$1,500–$3,000","$3,000–$6,000","$6,000+","Not sure"];

const inquirySchema = z.object({
  contact_name: z.string().trim().min(1, "Name required").max(120),
  contact_email: z.string().trim().email("Valid email required").max(255),
  contact_phone: z.string().trim().min(7, "Phone required").max(40),
  event_date: z.string().trim().min(1, "Event date required"),
  event_start_time: z.string().optional(),
  event_end_time: z.string().optional(),
  event_location: z.string().trim().min(2, "Event location required").max(200),
  event_zip: z.string().trim().max(20).optional(),
  guest_count: z.string().trim().min(1, "Guest count required").max(40),
  event_type: z.string().optional(),
  cuisine_preference: z.string().optional(),
  budget_range: z.string().optional(),
  message: z.string().trim().max(2000).optional(),
  request_type: z.string().optional(),
  event_frequency: z.string().optional(),
  service_style: z.string().optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required" }) }),
  hp: z.string().max(0).optional(),
});

type Biz = {
  id: string; slug: string; name: string; cuisine: string | null;
  emoji: string | null; hero_image_url: string | null; logo_url: string | null;
  service_area: string | null; category_id: string | null;
};
type Cat = { id: string; name: string };
type Schedule = { business_id: string; event_date: string | null };

const SUBMIT_LOCK_KEY = "fxm.last_event_inquiry";

export default function BookFoodTruck() {
  useSEO({
    title: "Book a Food Truck for Your Event | FoodXMobile",
    description: "Search local food trucks or send one request to matching vendors. Get options for weddings, parties, festivals, corporate events, and more.",
  });
  const navigate = useNavigate();
  const [tab, setTab] = useState("browse");

  // browse state
  const [businesses, setBusinesses] = useState<Biz[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [categories, setCategories] = useState<Cat[]>([]);
  const [bDate, setBDate] = useState("");
  const [bType, setBType] = useState<string>("");
  const [bLocation, setBLocation] = useState("");
  const [bGuests, setBGuests] = useState("");
  const [bCategory, setBCategory] = useState<string>("all");
  const [bBudget, setBBudget] = useState<string>("");
  const [bService, setBService] = useState<string>("");

  useEffect(() => {
    supabase.from("businesses")
      .select("id,slug,name,cuisine,emoji,hero_image_url,logo_url,service_area,category_id")
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("name")
      .then(({ data }) => setBusinesses((data ?? []) as Biz[]));
    supabase.from("business_categories").select("id,name").eq("is_active", true).order("sort_order")
      .then(({ data }) => setCategories((data ?? []) as Cat[]));
    supabase.from("business_events").select("business_id,event_date").eq("is_public", true)
      .then(({ data }) => setSchedules((data ?? []) as Schedule[]));
  }, []);

  const scheduleByBiz = useMemo(() => {
    const m = new Map<string, Schedule[]>();
    schedules.forEach((s) => { const a = m.get(s.business_id) ?? []; a.push(s); m.set(s.business_id, a); });
    return m;
  }, [schedules]);

  const browseResults = useMemo(() => businesses.filter((b) => {
    if (bCategory !== "all" && b.category_id !== bCategory) return false;
    if (bLocation && !(b.service_area ?? "").toLowerCase().includes(bLocation.toLowerCase())) return false;
    return true;
  }), [businesses, bCategory, bLocation]);

  // form state
  const [form, setForm] = useState({
    contact_name: "", contact_email: "", contact_phone: "",
    event_date: "", event_start_time: "", event_end_time: "",
    event_location: "", event_zip: "", guest_count: "",
    event_type: "", cuisine_preference: "", budget_range: "",
    message: "", request_type: "single", event_frequency: "one_time",
    service_style: "either", consent: false, hp: "",
    category_id: "" as string,
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const last = Number(localStorage.getItem(SUBMIT_LOCK_KEY) ?? 0);
    if (Date.now() - last < 60_000) {
      toast.error("Please wait a moment before sending another request.");
      return;
    }
    const parsed = inquirySchema.safeParse(form);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      toast.error(first?.message ?? "Please check the form");
      return;
    }
    if (form.hp) return; // honeypot
    setSubmitting(true);
    try {
      await supabaseLeadDirectory.submitMarketplace({ kind: "anonymous" }, {
        contactName: form.contact_name,
        contactEmail: form.contact_email,
        contactPhone: form.contact_phone,
        eventDate: form.event_date,
        eventStartTime: form.event_start_time,
        eventEndTime: form.event_end_time,
        streetAddress: form.event_location,
        postalCode: form.event_zip,
        guestCount: form.guest_count,
        eventType: form.event_type,
        cuisinePreference: form.cuisine_preference,
        budgetRange: form.budget_range,
        message: form.message,
        requestType: form.request_type,
        eventFrequency: form.event_frequency,
        serviceStyle: form.service_style,
        categoryId: form.category_id || null,
      });
    } catch (error) {
      setSubmitting(false);
      toast.error(error instanceof Error ? error.message : "Could not send");
      return;
    }
    setSubmitting(false);
    localStorage.setItem(SUBMIT_LOCK_KEY, String(Date.now()));
    navigate("/book-a-food-truck/request-received");
  };

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <SiteHeader withBanner />
      <main className="pt-28 pb-20 md:pt-36">
        <div className="container-tight">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Book a truck</p>
          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">Book a Food Truck for Your Event</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Search local vendors and reach out directly, or send one request and let matching food trucks contact you.
          </p>

          <Tabs value={tab} onValueChange={setTab} className="mt-8">
            <TabsList>
              <TabsTrigger value="browse"><Search className="mr-1.5 h-4 w-4" /> Browse trucks</TabsTrigger>
              <TabsTrigger value="request"><Send className="mr-1.5 h-4 w-4" /> Send one request</TabsTrigger>
            </TabsList>

            {/* BROWSE */}
            <TabsContent value="browse" className="mt-6 space-y-6">
              <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-3 lg:grid-cols-4">
                <div><Label className="text-xs">Event date</Label><Input type="date" value={bDate} onChange={(e) => setBDate(e.target.value)} /></div>
                <div>
                  <Label className="text-xs">Event type</Label>
                  <Select value={bType || "any"} onValueChange={(v) => setBType(v === "any" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Location or ZIP</Label><Input value={bLocation} onChange={(e) => setBLocation(e.target.value)} placeholder="Green Bay" /></div>
                <div><Label className="text-xs">Guest count</Label><Input value={bGuests} onChange={(e) => setBGuests(e.target.value)} inputMode="numeric" placeholder="100" /></div>
                <div>
                  <Label className="text-xs">Cuisine / category</Label>
                  <Select value={bCategory} onValueChange={setBCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Budget</Label>
                  <Select value={bBudget || "any"} onValueChange={(v) => setBBudget(v === "any" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {BUDGETS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Service style</Label>
                  <Select value={bService || "any"} onValueChange={(v) => setBService(v === "any" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {SERVICE_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={() => setTab("request")} variant="secondary" className="w-full rounded-full">
                    Send One Request to Matching Trucks
                  </Button>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {browseResults.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
                    No vendors match those filters yet. Try widening your search or send one request.
                  </div>
                )}
                {browseResults.map((b) => {
                  const state = getAvailabilityState(bDate || null, scheduleByBiz.get(b.id) ?? null);
                  return (
                    <div key={b.id} className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-card">
                      <Link to={`/food-trucks/${b.slug}`} className="block">
                        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                          <img src={resolveImage(b.hero_image_url || b.logo_url)} alt={b.name}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                          <span className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur ${AVAILABILITY_TONE[state]}`}>
                            {AVAILABILITY_LABEL[state]}
                          </span>
                        </div>
                      </Link>
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-display text-lg font-semibold leading-tight">
                            {b.emoji && <span className="mr-1.5">{b.emoji}</span>}{b.name}
                          </h3>
                          <Link to={`/food-trucks/${b.slug}`}><ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" /></Link>
                        </div>
                        {b.cuisine && <p className="mt-1 text-sm text-muted-foreground">{b.cuisine}</p>}
                        {b.service_area && <p className="mt-1 text-xs text-muted-foreground">Serves: {b.service_area}</p>}
                        <div className="mt-4 flex gap-2">
                          <Button asChild size="sm" variant="outline" className="rounded-full"><Link to={`/food-trucks/${b.slug}`}>View profile</Link></Button>
                          <Button asChild size="sm" className="rounded-full"><Link to={`/book/${b.slug}`}>Contact vendor</Link></Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* REQUEST */}
            <TabsContent value="request" className="mt-6">
              <form onSubmit={submit} className="grid gap-6 rounded-2xl border border-border bg-card p-6 md:p-8">
                <input type="text" tabIndex={-1} autoComplete="off" value={form.hp}
                  onChange={(e) => set("hp", e.target.value)} className="hidden" aria-hidden="true" />

                <section className="grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-3"><h2 className="font-display text-xl font-semibold">Your contact info</h2></div>
                  <div><Label>Name *</Label><Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} required /></div>
                  <div><Label>Email *</Label><Input type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} required /></div>
                  <div><Label>Phone *</Label><Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} required /></div>
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-3"><h2 className="font-display text-xl font-semibold">Event details</h2></div>
                  <div><Label>Event date *</Label><Input type="date" value={form.event_date} onChange={(e) => set("event_date", e.target.value)} required /></div>
                  <div><Label>Start time</Label><Input type="time" value={form.event_start_time} onChange={(e) => set("event_start_time", e.target.value)} /></div>
                  <div><Label>End time</Label><Input type="time" value={form.event_end_time} onChange={(e) => set("event_end_time", e.target.value)} /></div>
                  <div className="md:col-span-2"><Label>Event location *</Label><Input value={form.event_location} onChange={(e) => set("event_location", e.target.value)} required /></div>
                  <div><Label>ZIP</Label><Input value={form.event_zip} onChange={(e) => set("event_zip", e.target.value)} /></div>
                  <div><Label>Guest count *</Label><Input inputMode="numeric" value={form.guest_count} onChange={(e) => set("guest_count", e.target.value)} required /></div>
                  <div>
                    <Label>Event type</Label>
                    <Select value={form.event_type || "any"} onValueChange={(v) => set("event_type", v === "any" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">—</SelectItem>
                        {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cuisine / category preference</Label>
                    <Select value={form.category_id || "any"} onValueChange={(v) => set("category_id", v === "any" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Budget</Label>
                    <Select value={form.budget_range || "any"} onValueChange={(v) => set("budget_range", v === "any" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Not sure" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Not sure</SelectItem>
                        {BUDGETS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3">
                    <Label>Additional notes</Label>
                    <Textarea rows={3} value={form.message} onChange={(e) => set("message", e.target.value)} />
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-3"><h2 className="font-display text-xl font-semibold">Request preferences</h2></div>
                  <div>
                    <Label>What are you looking for?</Label>
                    <Select value={form.request_type} onValueChange={(v) => set("request_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{REQUEST_TYPES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Is this event recurring?</Label>
                    <Select value={form.event_frequency} onValueChange={(v) => set("event_frequency", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FREQUENCIES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Preferred service style</Label>
                    <Select value={form.service_style} onValueChange={(v) => set("service_style", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SERVICE_STYLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </section>

                <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
                  <Checkbox id="consent" checked={form.consent} onCheckedChange={(v) => set("consent", v === true)} />
                  <Label htmlFor="consent" className="text-sm font-normal leading-relaxed">
                    I confirm that matching vendors may contact me about this request using the information I provided. *
                  </Label>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <Button type="submit" size="lg" className="rounded-full" disabled={submitting || !form.consent}>
                    {submitting ? "Sending…" : "Send My Event Request"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}