import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";
import smokeHero from "@/assets/smoketrail-hero.jpg";
import g1 from "@/assets/gallery-1.jpg";
import g2 from "@/assets/gallery-2.jpg";
import g3 from "@/assets/gallery-3.jpg";
import g4 from "@/assets/gallery-4.jpg";
import bbq from "@/assets/truck-bbq.jpg";
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Briefcase,
  Instagram,
  Facebook,
  MapPin,
  Clock,
  Star,
  Flame,
  Calendar,
} from "lucide-react";

const menu = [
  {
    section: "Smoked by the pound",
    items: [
      { name: "Brisket", desc: "16-hour oak-smoked, sliced to order", price: "$28/lb" },
      { name: "Pulled Pork", desc: "Slow-smoked Boston butt, simple and perfect", price: "$22/lb" },
      { name: "Burnt Ends", desc: "Caramelized brisket cubes glazed in our house sauce", price: "$26/lb" },
      { name: "St. Louis Ribs", desc: "Half slab or full slab, dry-rubbed and finished sticky", price: "$18/half" },
    ],
  },
  {
    section: "Sandwiches",
    items: [
      { name: "The Trail Boss", desc: "Brisket, pickles, onion, BBQ on a brioche bun", price: "$14" },
      { name: "Pulled Pork Stack", desc: "Pulled pork, slaw, pickle on toasted bun", price: "$12" },
      { name: "Hot Link Hoagie", desc: "House-made jalapeño cheddar sausage", price: "$11" },
    ],
  },
  {
    section: "Sides",
    items: [
      { name: "Smoked Mac & Cheese", desc: "Three cheeses, crispy panko top", price: "$6" },
      { name: "Bourbon Baked Beans", desc: "Brisket bits + maple", price: "$5" },
      { name: "Vinegar Slaw", desc: "Crunchy, bright, never sweet", price: "$5" },
      { name: "Cornbread", desc: "Honey butter on the side", price: "$4" },
    ],
  },
];

const schedule = [
  { day: "Mon", date: "Apr 22", spot: "Closed (Prep day)", hours: "—", closed: true },
  { day: "Tue", date: "Apr 23", spot: "Bellin Health Campus — Lunch Pop-up", hours: "11:00a – 2:00p" },
  { day: "Wed", date: "Apr 24", spot: "Hinterland Brewery — Ashwaubenon", hours: "5:00p – 9:00p" },
  { day: "Thu", date: "Apr 25", spot: "Titletown District — Brookwood Dr", hours: "11:30a – 8:00p" },
  { day: "Fri", date: "Apr 26", spot: "First Friday on Broadway", hours: "4:00p – 10:00p" },
  { day: "Sat", date: "Apr 27", spot: "Titletown Spring Food Truck Rally", hours: "11:00a – 9:00p" },
  { day: "Sun", date: "Apr 28", spot: "Leicht Memorial Park — Family Day", hours: "12:00p – 6:00p" },
];

const upcoming = [
  { date: "May 03", title: "First Friday on Broadway", location: "On Broadway District" },
  { date: "May 18", title: "Packers Draft Watch Party", location: "Lambeau Field — Lot 1" },
  { date: "Jun 01", title: "Bayfest Kickoff", location: "Leicht Memorial Park" },
  { date: "Jun 22", title: "Wisconsin BBQ Championship", location: "Brown County Fairgrounds" },
];

const reviews = [
  { name: "Kaitlin R.", quote: "The brisket. Just… the brisket. Pull over for it. Worth the wait every single time.", rating: 5 },
  { name: "Marcus T.", quote: "Catered our company picnic for 80 — flawless. People are still talking about the burnt ends.", rating: 5 },
  { name: "Jenna O.", quote: "Showed up at Hinterland on a whim, left as a regular. Best ribs in Northeast Wisconsin.", rating: 5 },
];

const faqs = [
  { q: "Do you cater weddings and private events?", a: "Yes — we cater anything from 25 to 400+ guests. Use the catering form below or text us. We can do drop-off, on-site service, or a full carving station." },
  { q: "How do I find today's location?", a: "We post each morning by 9 AM. Check the 'This Week' schedule below or follow us on Instagram for live updates if we move." },
  { q: "When do you sell out?", a: "Honestly? Sometimes by 7 PM on busy nights. If you're coming late, send us a quick text and we'll set something aside." },
  { q: "Are you on any food delivery apps?", a: "We're a truck, so we keep it in person. But you can pre-order full trays for pickup — text us 24 hours ahead." },
  { q: "Do you have vegetarian options?", a: "Yes — smoked mac & cheese, beans (vegetarian on request), slaw, cornbread, and a smoked portobello sandwich on Saturdays." },
];

const SmokeTrail = () => {
  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <SiteHeader />

      {/* Sample-page banner */}
      <div className="bg-primary/10 pt-20">
        <div className="container-tight flex items-center justify-between gap-4 py-3 text-xs">
          <Link to="/" className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to TruckHub
          </Link>
          <span className="hidden text-muted-foreground sm:inline">
            👀 You're viewing a <span className="font-semibold text-primary">sample truck page</span> — this is what every paying client gets.
          </span>
        </div>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden bg-ink text-ink-foreground">
        <div className="absolute inset-0">
          <img src={smokeHero} alt="Smoke Trail BBQ truck at golden hour" className="h-full w-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/70 to-ink" />
        </div>
        <div className="container-tight relative py-20 md:py-32">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-cream/20 bg-cream/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cream/85 backdrop-blur">
              <Flame className="h-3 w-3 text-primary-glow" /> Green Bay · Est. 2019
            </span>
            <h1 className="mt-6 font-display text-[clamp(3rem,8vw,6rem)] font-black leading-[0.95] text-cream">
              Smoke Trail
              <span className="block text-primary-glow">BBQ Truck.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-cream/85">
              Low and slow Wisconsin BBQ — 16-hour brisket, sticky ribs, and the kind of mac & cheese that ends arguments.
            </p>

            <div className="mt-8 flex flex-wrap gap-2.5">
              <Button asChild className="h-11 rounded-full bg-primary px-5 text-primary-foreground shadow-ember hover:bg-primary/90">
                <a href="tel:9205550144"><Phone className="mr-1.5 h-4 w-4" /> Call</a>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full border-cream/25 bg-cream/5 px-5 text-cream backdrop-blur hover:bg-cream/10">
                <a href="sms:9205550144"><MessageSquare className="mr-1.5 h-4 w-4" /> Text</a>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full border-cream/25 bg-cream/5 px-5 text-cream backdrop-blur hover:bg-cream/10">
                <a href="#catering"><Briefcase className="mr-1.5 h-4 w-4" /> Catering Inquiry</a>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full border-cream/25 bg-cream/5 px-5 text-cream backdrop-blur hover:bg-cream/10">
                <a href="#"><Instagram className="mr-1.5 h-4 w-4" /> Instagram</a>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full border-cream/25 bg-cream/5 px-5 text-cream backdrop-blur hover:bg-cream/10">
                <a href="#"><Facebook className="mr-1.5 h-4 w-4" /> Facebook</a>
              </Button>
            </div>

            <div className="mt-10 inline-flex items-center gap-3 rounded-2xl border border-cream/15 bg-cream/5 px-5 py-3 text-sm text-cream backdrop-blur">
              <span className="relative inline-flex h-2.5 w-2.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span><span className="font-semibold">Open now</span> · Titletown District · until 8:00p</span>
            </div>
          </div>
        </div>
      </section>

      {/* MENU */}
      <section className="py-20 md:py-28">
        <div className="container-tight grid gap-12 md:grid-cols-[1fr_1.4fr]">
          <div>
            <span className="badge-ember">The Menu</span>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">
              Smoked daily. <em className="text-primary not-italic">Sold 'til it's gone.</em>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Everything is smoked over Wisconsin oak the morning of. When we sell out, we sell out.
              Get there early on Saturdays.
            </p>
            <div className="mt-8 overflow-hidden rounded-2xl">
              <img src={bbq} alt="Sliced brisket with pickles and onions" loading="lazy" className="h-72 w-full object-cover" />
            </div>
          </div>

          <div className="space-y-10">
            {menu.map((s) => (
              <div key={s.section}>
                <h3 className="font-display text-2xl font-semibold text-primary">{s.section}</h3>
                <div className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card">
                  {s.items.map((item) => (
                    <div key={item.name} className="flex items-baseline justify-between gap-4 p-5">
                      <div>
                        <h4 className="font-display text-lg font-semibold leading-tight">{item.name}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      <span className="font-display text-lg font-bold text-foreground">{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCHEDULE */}
      <section className="bg-cream-deep py-20 md:py-28">
        <div className="container-tight">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="badge-ember"><Calendar className="h-3 w-3" /> This Week</span>
              <h2 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">Where to find us.</h2>
            </div>
            <p className="max-w-sm text-muted-foreground">Updated every Sunday. Follow us on Instagram if we move last-minute.</p>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-card">
            {schedule.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-[64px_1fr_auto] items-center gap-4 border-b border-border p-5 last:border-b-0 ${
                  row.closed ? "opacity-60" : ""
                }`}
              >
                <div className="text-center leading-tight">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{row.day}</div>
                  <div className="font-display text-lg font-bold">{row.date}</div>
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {row.spot}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {row.hours}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UPCOMING EVENTS */}
      <section className="py-20 md:py-28">
        <div className="container-tight">
          <div className="max-w-xl">
            <span className="badge-ember">Public Events</span>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">Catch us out.</h2>
            <p className="mt-4 text-muted-foreground">Festivals, tailgates, and brewery nights coming up.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.map((e, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:shadow-card">
                <div className="font-display text-2xl font-bold text-primary">{e.date}</div>
                <h3 className="mt-2 font-display text-lg font-semibold leading-tight">{e.title}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-3 w-3" />{e.location}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATERING */}
      <section id="catering" className="bg-secondary py-20 text-secondary-foreground md:py-28">
        <div className="container-tight grid gap-12 md:grid-cols-[1fr_1.1fr] md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cream/15 bg-cream/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cream/85">
              <Briefcase className="h-3 w-3" /> Catering & Private Events
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold leading-tight text-cream md:text-5xl">
              Bring the smoke to your event.
            </h2>
            <p className="mt-5 text-cream/85">
              Weddings, corporate lunches, graduations, backyard parties, tailgates. We do drop-off,
              on-site service, and the full carving-station experience. Tell us what you're planning.
            </p>
            <ul className="mt-6 space-y-2 text-cream/80">
              <li>· Groups from 25 to 400+</li>
              <li>· Custom menus & dietary options</li>
              <li>· On-site smoker available for premium events</li>
              <li>· Books up 6–8 weeks ahead in summer</li>
            </ul>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); alert("Catering inquiry sent! (sample form)"); }}
            className="rounded-2xl bg-background p-6 text-foreground shadow-lift"
          >
            <h3 className="font-display text-xl font-semibold">Catering inquiry</h3>
            <p className="mt-1 text-sm text-muted-foreground">We reply within 24 hours.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input required placeholder="Your name" className="h-11 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary" />
              <input required type="email" placeholder="Email" className="h-11 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary" />
              <input placeholder="Phone" className="h-11 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary" />
              <input placeholder="Event date" className="h-11 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary" />
              <select className="h-11 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary sm:col-span-2">
                <option>Event type — Wedding</option>
                <option>Corporate lunch</option>
                <option>Birthday / Backyard</option>
                <option>Graduation</option>
                <option>Other</option>
              </select>
              <input placeholder="# of guests" className="h-11 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary sm:col-span-2" />
              <textarea rows={3} placeholder="Tell us about your event…" className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary sm:col-span-2" />
            </div>
            <Button className="mt-5 h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              Send inquiry
            </Button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">Demo form — no information stored.</p>
          </form>
        </div>
      </section>

      {/* GALLERY */}
      <section className="py-20 md:py-28">
        <div className="container-tight">
          <div className="max-w-xl">
            <span className="badge-ember">Gallery</span>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">A few from the smoker.</h2>
          </div>
          <div className="mt-10 grid auto-rows-[200px] grid-cols-2 gap-3 md:grid-cols-4 md:auto-rows-[240px]">
            <img src={g1} alt="Pulled pork sandwich" loading="lazy" className="h-full w-full rounded-2xl object-cover transition hover:scale-[1.02] md:row-span-2" />
            <img src={g2} alt="Smoked ribs" loading="lazy" className="h-full w-full rounded-2xl object-cover transition hover:scale-[1.02]" />
            <img src={g3} alt="Mac and cheese" loading="lazy" className="h-full w-full rounded-2xl object-cover transition hover:scale-[1.02]" />
            <img src={g4} alt="Pitmaster at the smoker" loading="lazy" className="h-full w-full rounded-2xl object-cover transition hover:scale-[1.02] md:row-span-2 md:col-span-2" />
            <img src={bbq} alt="Brisket on butcher paper" loading="lazy" className="h-full w-full rounded-2xl object-cover transition hover:scale-[1.02]" />
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="bg-cream-deep py-20 md:py-28">
        <div className="container-tight">
          <div className="max-w-xl">
            <span className="badge-ember">Reviews</span>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">From the line.</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {reviews.map((r) => (
              <div key={r.name} className="rounded-2xl border border-border bg-card p-7">
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(r.rating)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="mt-4 font-display text-lg italic leading-snug">"{r.quote}"</p>
                <p className="mt-4 text-sm font-medium text-muted-foreground">— {r.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28">
        <div className="container-tight grid gap-12 md:grid-cols-[1fr_1.4fr]">
          <div>
            <span className="badge-ember">FAQ</span>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">Good questions.</h2>
            <p className="mt-4 text-muted-foreground">Can't find what you need? Text us — we actually answer.</p>
            <Button asChild className="mt-6 rounded-full bg-foreground text-background hover:bg-foreground/85">
              <a href="sms:9205550144"><MessageSquare className="mr-1.5 h-4 w-4" /> Text the truck</a>
            </Button>
          </div>
          <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-2">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border">
                <AccordionTrigger className="px-4 py-5 text-left font-display text-lg font-semibold hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-5 text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* MINI CTA back to hub */}
      <section className="pb-24">
        <div className="container-tight">
          <div className="overflow-hidden rounded-3xl bg-ink p-10 text-ink-foreground md:p-14">
            <div className="grid items-center gap-6 md:grid-cols-[1.5fr_1fr]">
              <div>
                <h3 className="font-display text-3xl font-bold leading-tight text-cream md:text-4xl">
                  Want a page like this for your truck?
                </h3>
                <p className="mt-3 text-cream/75">
                  This whole page took us 5 days to design and build. Yours can too.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button asChild className="h-11 rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90">
                  <Link to="/#demo">Book a demo</Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-full border-cream/25 bg-cream/5 px-5 text-cream hover:bg-cream/10">
                  <Link to="/">Back to TruckHub</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default SmokeTrail;
