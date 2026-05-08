export type TourStep = {
  id: string;
  route?: string;
  target?: string;
  title: string;
  body: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "home",
    route: "/",
    target: '[data-tour="home-hero"]',
    title: "1. Public homepage",
    body: "This is what customers and food truck owners see first. Customers find trucks; owners learn what TruckHub does for them.",
    position: "bottom",
  },
  {
    id: "directory",
    route: "/food-trucks",
    target: '[data-tour="directory-filters"]',
    title: "2. Public directory",
    body: "Customers discover local food trucks here, with filters for cuisine, city, and availability.",
    position: "bottom",
  },
  {
    id: "profile",
    route: "/food-trucks/smoke-trail-bbq",
    target: '[data-tour="truck-hero"]',
    title: "3. Public truck profile",
    body: "Each truck gets a customer-facing page with menu, location, schedule, ordering, socials, and a booking inquiry.",
    position: "bottom",
  },
  {
    id: "book",
    route: "/book/smoke-trail-bbq",
    target: '[data-tour="book-form"]',
    title: "4. Booking inquiry form",
    body: "Customers can submit catering and event inquiries without creating an account.",
    position: "right",
  },
  {
    id: "owner-home",
    route: "/owner",
    target: '[data-tour="owner-stats"]',
    title: "5. Owner dashboard",
    body: "A command center with leads, upcoming events, bookings, menu status, and quick actions.",
    position: "bottom",
  },
  {
    id: "leads",
    route: "/owner/leads",
    target: '[data-tour="leads-pipeline"]',
    title: "6. Leads pipeline",
    body: "All inquiries land in a CRM pipeline. Move leads through stages so nothing slips.",
    position: "top",
  },
  {
    id: "lead-detail",
    route: "/owner/leads",
    title: "7. Lead conversation",
    body: "Open any lead to see the customer summary, original inquiry, threaded messages, internal notes, stage controls, and quote/deposit tools.",
    position: "center",
  },
  {
    id: "messages",
    route: "/owner/messages",
    target: '[data-tour="messages-list"]',
    title: "8. Messages",
    body: "Owner replies are saved as threaded conversations so leads don't get lost in email.",
    position: "right",
  },
  {
    id: "deposits",
    route: "/owner/leads",
    title: "9. Quote & deposit workflow",
    body: "Owners can optionally request a deposit once a lead gets serious. Deposits are off by default — turn them on in Settings.",
    position: "center",
  },
  {
    id: "menu",
    route: "/owner/menu",
    target: '[data-tour="menu-manager"]',
    title: "10. Menu manager",
    body: "Update categories and items directly. Mark fan favorites and toggle availability — no web designer needed.",
    position: "top",
  },
  {
    id: "calendar",
    route: "/owner/calendar",
    target: '[data-tour="calendar-grid"]',
    title: "11. Calendar / Next Stops",
    body: "Manage public popups and private events from one calendar.",
    position: "top",
  },
  {
    id: "profile-editor",
    route: "/owner/profile",
    target: '[data-tour="profile-editor"]',
    title: "12. Truck Page editor",
    body: "Update the public truck page, online ordering link, today's location, recurring spots, photos, and visibility.",
    position: "top",
  },
  {
    id: "settings",
    route: "/owner/settings",
    target: '[data-tour="settings-root"]',
    title: "13. Settings",
    body: "Notification preferences, deposit settings, account info, and future payment options.",
    position: "top",
  },
  {
    id: "admin",
    route: "/admin",
    target: '[data-tour="admin-root"]',
    title: "14. Admin console",
    body: "Platform admins manage businesses, users, categories, leads, and moderation from here.",
    position: "bottom",
  },
  {
    id: "end",
    title: "🎉 That's the full flow",
    body: "Public discovery → inquiry capture → owner CRM → messaging → scheduling → menu updates → optional deposit collection.",
    position: "center",
  },
];