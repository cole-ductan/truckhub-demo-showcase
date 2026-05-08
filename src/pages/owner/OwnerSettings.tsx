import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { useOwnerProfile } from "@/hooks/useOwnerProfile";
import { useAuth } from "@/hooks/useAuth";
import { Onboarding } from "@/components/owner/Onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Bell, CreditCard, LogOut, Mail, Phone, Save, ShieldAlert, User, Link2, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type Prefs = {
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
  new_lead_notifications_enabled: boolean;
  owner_reply_notifications_enabled: boolean;
  deposit_percentage: number;
  stripe_deposits_enabled: boolean;
  external_payment_url: string | null;
  manual_deposit_instructions: string | null;
  payment_mode: "no_deposits" | "stripe" | "external_link" | "manual_instructions";
};

const DEFAULTS: Prefs = {
  email_notifications_enabled: true,
  sms_notifications_enabled: false,
  new_lead_notifications_enabled: true,
  owner_reply_notifications_enabled: true,
  deposit_percentage: 0,
  stripe_deposits_enabled: false,
  external_payment_url: null,
  manual_deposit_instructions: null,
  payment_mode: "no_deposits",
};

export default function OwnerSettings() {
  const { business, loading } = useOwnerBusiness();
  const { profile, update: updateProfile } = useOwnerProfile();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [ownerTitle, setOwnerTitle] = useState("");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDisplayName(profile?.display_name ?? ""); setOwnerTitle(profile?.owner_title ?? ""); }, [profile]);

  useEffect(() => {
    if (!business) return;
    supabase.from("owner_preferences").select("*").eq("business_id", business.id).maybeSingle()
      .then(({ data }) => { if (data) setPrefs({
        email_notifications_enabled: data.email_notifications_enabled,
        sms_notifications_enabled: data.sms_notifications_enabled,
        new_lead_notifications_enabled: data.new_lead_notifications_enabled,
        owner_reply_notifications_enabled: data.owner_reply_notifications_enabled,
        deposit_percentage: Number(data.deposit_percentage),
        stripe_deposits_enabled: !!(data as any).stripe_deposits_enabled,
        external_payment_url: (data as any).external_payment_url ?? null,
        manual_deposit_instructions: (data as any).manual_deposit_instructions ?? null,
        payment_mode: ((data as any).payment_mode ?? "no_deposits") as Prefs["payment_mode"],
      }); });
  }, [business]);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!business) return <Onboarding />;

  async function save() {
    setSaving(true);
    await updateProfile({ display_name: displayName.trim() || null, owner_title: ownerTitle.trim() || null });
    const { error } = await supabase.from("owner_preferences").upsert({
      business_id: business!.id, ...prefs,
    }, { onConflict: "business_id" });
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Settings saved" });
  }

  return (
    <div data-tour="settings-root" className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <div className="space-y-6">
        <div>
          <span className="badge-ember">Account</span>
          <h1 className="mt-3 font-display text-3xl font-bold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Profile, notifications, payments & team.</p>
        </div>
        <nav className="sticky top-20 hidden flex-col gap-1 text-sm lg:flex">
          {[
            { href: "#profile", label: "Owner profile", icon: User },
            { href: "#notifications", label: "Notifications", icon: Bell },
            { href: "#payments", label: "Payments", icon: CreditCard },
            { href: "#team", label: "Team", icon: User },
            { href: "#account", label: "Account", icon: ShieldAlert },
          ].map((s) => (
            <a key={s.href} href={s.href} className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <s.icon className="h-3.5 w-3.5" /> {s.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="space-y-6">
      <Section id="profile" icon={User} title="Owner profile" desc="Shown in the sidebar and on your team.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Display name</Label>
            <Input className="mt-1.5" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ray Sandoval" />
          </div>
          <div>
            <Label>Title (optional)</Label>
            <Input className="mt-1.5" value={ownerTitle} onChange={(e) => setOwnerTitle(e.target.value)} placeholder="Owner / Pitmaster" />
          </div>
          <div>
            <Label>Email</Label>
            <Input className="mt-1.5" value={user?.email ?? ""} disabled />
          </div>
        </div>
      </Section>

      <Section id="notifications" icon={Bell} title="Notifications" desc="Email & SMS sending isn't connected yet — these toggles save your preferences for when it ships.">
        <ToggleRow icon={Mail} label="Email me when a new lead comes in"
          checked={prefs.new_lead_notifications_enabled}
          onChange={(v) => setPrefs((p) => ({ ...p, new_lead_notifications_enabled: v }))} />
        <ToggleRow icon={Mail} label="Email me on customer replies"
          checked={prefs.owner_reply_notifications_enabled}
          onChange={(v) => setPrefs((p) => ({ ...p, owner_reply_notifications_enabled: v }))} />
        <ToggleRow icon={Mail} label="Allow email notifications"
          checked={prefs.email_notifications_enabled}
          onChange={(v) => setPrefs((p) => ({ ...p, email_notifications_enabled: v }))} />
        <ToggleRow icon={Phone} label="Allow SMS notifications (urgent inquiries)"
          checked={prefs.sms_notifications_enabled}
          onChange={(v) => setPrefs((p) => ({ ...p, sms_notifications_enabled: v }))} />
      </Section>

      <Section id="payments" icon={CreditCard} title="Payments & deposits" desc="Deposits are an optional power-up. Off by default — turn them on whenever you're ready.">
        <ToggleRow icon={CreditCard} label="Accept deposits through TruckHub"
          checked={prefs.stripe_deposits_enabled}
          onChange={(v) => setPrefs((p) => ({
            ...p,
            stripe_deposits_enabled: v,
            payment_mode: v ? (p.payment_mode === "no_deposits" ? "stripe" : p.payment_mode) : "no_deposits",
          }))} />

        {prefs.stripe_deposits_enabled && (
          <>
            <div className="rounded-xl border border-border p-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Payment mode</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {[
                  { v: "stripe", label: "Stripe Checkout", sub: "Card payment via TruckHub" },
                  { v: "external_link", label: "External link", sub: "Square, Toast, Venmo, etc." },
                  { v: "manual_instructions", label: "Manual instructions", sub: "Bank transfer, in-person, etc." },
                ].map((o) => (
                  <button type="button" key={o.v}
                    onClick={() => setPrefs((p) => ({ ...p, payment_mode: o.v as Prefs["payment_mode"] }))}
                    className={`rounded-lg border p-3 text-left text-sm transition ${prefs.payment_mode === o.v ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <p className="font-semibold">{o.label}</p>
                    <p className="text-xs text-muted-foreground">{o.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="max-w-xs">
              <Label>Default deposit percentage</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <Input type="number" min={0} max={100} step={1}
                  value={prefs.deposit_percentage}
                  onChange={(e) => setPrefs((p) => ({ ...p, deposit_percentage: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))} />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>

            {prefs.payment_mode === "external_link" && (
              <div>
                <Label className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> External payment link</Label>
                <Input className="mt-1.5" placeholder="https://square.link/u/..."
                  value={prefs.external_payment_url ?? ""}
                  onChange={(e) => setPrefs((p) => ({ ...p, external_payment_url: e.target.value || null }))} />
              </div>
            )}

            {prefs.payment_mode === "manual_instructions" && (
              <div>
                <Label className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Manual deposit instructions</Label>
                <Textarea className="mt-1.5" rows={3} placeholder="e.g. Send Zelle to ray@example.com — reference the event date."
                  value={prefs.manual_deposit_instructions ?? ""}
                  onChange={(e) => setPrefs((p) => ({ ...p, manual_deposit_instructions: e.target.value || null }))} />
              </div>
            )}

            {prefs.payment_mode === "stripe" && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300">
                Stripe is in test/config mode. Live card payments require Stripe production keys (Phase G2).
              </div>
            )}
          </>
        )}
      </Section>

      <Section id="team" icon={User} title="Team" desc="Invites coming soon.">
        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          You're the only member of this workspace right now. Team invites will land in a future update.
        </div>
      </Section>

      <Section id="account" icon={ShieldAlert} title="Account" desc="Sign out or manage account access.">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div className="text-sm">
            <p className="font-semibold">Signed in as {user?.email}</p>
            <p className="text-xs text-muted-foreground">Ending your session will return you to the home page.</p>
          </div>
          <Button variant="outline" onClick={signOut} className="rounded-full">
            <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="text-sm">
            <p className="font-semibold text-destructive">Delete account</p>
            <p className="text-xs text-muted-foreground">Permanent account deletion isn't self-serve yet — email support to remove your workspace.</p>
          </div>
          <Button variant="ghost" disabled className="rounded-full text-destructive">Request deletion</Button>
        </div>
      </Section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="rounded-full">
          <Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
      </div>
    </div>
  );
}

function Section({ id, icon: Icon, title, desc, children }: { id?: string; icon: any; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground/70"><Icon className="h-4 w-4" /></span>
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ToggleRow({ icon: Icon, label, checked, onChange }: { icon: any; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
      <div className="flex items-center gap-2.5 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span>{label}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
