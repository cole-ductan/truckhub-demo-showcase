import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Inbox, ListOrdered, Settings, Sparkles } from "lucide-react";

const tiles = [
  { to: "/owner/profile", label: "Business Profile", icon: Settings, body: "Logo, photos, today's location, contact info." },
  { to: "/owner/menu", label: "Menu", icon: ListOrdered, body: "Categories, items, prices, dietary tags." },
  { to: "/owner/calendar", label: "Calendar", icon: Calendar, body: "Weekly spots and one-off public events." },
  { to: "/owner/leads", label: "Leads", icon: Inbox, body: "Catering inquiries from your TruckHub page." },
];

export default function OwnerHome() {
  const { user } = useAuth();
  return (
    <div>
      <span className="badge-ember"><Sparkles className="h-3 w-3" /> Phase 2 coming soon</span>
      <h1 className="mt-3 font-display text-4xl font-bold leading-tight">Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}.</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Your owner console will let you fully manage your truck — profile, menu, schedule, and inquiries.
        We're wiring these up next. The backend is ready and your inquiries are already being captured.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:shadow-card"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
              <t.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">{t.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}