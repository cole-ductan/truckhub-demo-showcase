import bbq from "@/assets/truck-bbq.jpg";
import burger from "@/assets/truck-burger.jpg";
import tacos from "@/assets/truck-tacos.jpg";
import pizza from "@/assets/truck-pizza.jpg";
import waffles from "@/assets/truck-waffles.jpg";
import chicken from "@/assets/truck-chicken.jpg";

export type Truck = {
  slug: string;
  name: string;
  cuisine: string;
  emoji: string;
  image: string;
  todayLocation: string;
  todayHours: string;
  status: "open" | "soon" | "closed";
  tagline: string;
};

export const trucks: Truck[] = [
  {
    slug: "smoke-trail-bbq",
    name: "Smoke Trail BBQ",
    cuisine: "Low & slow Wisconsin BBQ",
    emoji: "🔥",
    image: bbq,
    todayLocation: "Titletown District · Brookwood Dr",
    todayHours: "11:30a – 8:00p",
    status: "open",
    tagline: "16-hour smoked brisket, fall-off-the-bone ribs.",
  },
  {
    slug: "bay-burger-co",
    name: "Bay Burger Co.",
    cuisine: "Smash burgers · Wisco cheese",
    emoji: "🍔",
    image: burger,
    todayLocation: "Leicht Memorial Park · Downtown",
    todayHours: "11:00a – 9:00p",
    status: "open",
    tagline: "Crispy edges, melty cheddar, locally raised beef.",
  },
  {
    slug: "tortilla-norte",
    name: "Tortilla Norte",
    cuisine: "Street tacos · Birria",
    emoji: "🌮",
    image: tacos,
    todayLocation: "De Pere — George St. Park",
    todayHours: "4:00p – 9:30p",
    status: "soon",
    tagline: "Hand-pressed corn tortillas, salsas made fresh daily.",
  },
  {
    slug: "stone-oven-pies",
    name: "Stone Oven Pies",
    cuisine: "Wood-fired pizza",
    emoji: "🍕",
    image: pizza,
    todayLocation: "Hinterland Brewery · Ashwaubenon",
    todayHours: "5:00p – 10:00p",
    status: "soon",
    tagline: "60-second Neapolitan pies from a mobile wood oven.",
  },
  {
    slug: "north-coast-waffles",
    name: "North Coast Waffles",
    cuisine: "Sweet & savory waffles",
    emoji: "🧇",
    image: waffles,
    todayLocation: "Farmers' Market on Broadway",
    todayHours: "8:00a – 1:00p",
    status: "closed",
    tagline: "Liège-style waffles, real Wisconsin maple.",
  },
  {
    slug: "fowl-play",
    name: "Fowl Play Hot Chicken",
    cuisine: "Nashville hot chicken",
    emoji: "🐔",
    image: chicken,
    todayLocation: "Bellin Health Campus — Lunch Pop-up",
    todayHours: "11:00a – 2:00p",
    status: "open",
    tagline: "Mild to 'Bay Inferno' — bring a friend, and milk.",
  },
];

export type TruckEvent = {
  date: string;
  weekday: string;
  title: string;
  location: string;
  trucks: string;
  tag: string;
};

export const events: TruckEvent[] = [
  { date: "Apr 27", weekday: "Sat", title: "Titletown Spring Food Truck Rally", location: "Titletown District", trucks: "12 trucks · live music", tag: "Festival" },
  { date: "May 03", weekday: "Fri", title: "First Friday on Broadway", location: "On Broadway District", trucks: "6 trucks · DJ until 10p", tag: "Block Party" },
  { date: "May 11", weekday: "Sat", title: "Mother's Day Farmers' Market", location: "Broadway Farmers' Market", trucks: "5 trucks · brunch lineup", tag: "Market" },
  { date: "May 18", weekday: "Sat", title: "Packers Draft Watch Party", location: "Lambeau Field — Lot 1", trucks: "8 trucks · all-day tailgate", tag: "Tailgate" },
  { date: "Jun 01", weekday: "Sat", title: "Bayfest Kickoff", location: "Leicht Memorial Park", trucks: "10 trucks · fireworks", tag: "Festival" },
  { date: "Jun 14", weekday: "Fri", title: "Hinterland Summer Series", location: "Hinterland Brewery", trucks: "4 trucks · craft beer pairings", tag: "Brewery" },
];
