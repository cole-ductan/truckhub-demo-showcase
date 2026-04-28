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
import { Bell, CreditCard, Mail, Phone, Save, User } from "lucide-react";

type Prefs = {
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
  new_lead_notifications_enabled: boolean;
  owner_reply_notifications_enabled: boolean;
  deposit_percentage: number;
};

const DEFAULTS: Prefs = {
  email_notifications_enabled: true,
  sms_notifications_enabled: false,
  new_lead_notifications_enabled: true,
  owner_reply_notifications_enabled: true,
  deposit_percentage: 0,
};

export default function OwnerSettings() {
  const { business, loading } = useOwnerBusiness();
  const { profile, update: updateProfile } = useOwnerProfile();
  const { user } = useAuth();
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
    <div className="space-y-6">
      <div>
        <span className="badge-ember">Account</span>
        <h1 className="mt-3 font-display text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your owner profile, notifications, and team access.</p>
      </div>

      <Section icon={User} title="Owner profile" desc="Shown in the sidebar and on your team.">
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

      <Section icon={Bell} title="Notifications" desc="Email & SMS sending isn't connected yet — these toggles save your preferences for when it ships.">
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

      <Section icon={CreditCard} title="Payments & deposits" desc="Stripe isn't connected yet. Set your default deposit percentage so it's ready when payments go live.">
        <div className="max-w-xs">
          <Label>Default deposit percentage</Label>
          <div className="mt-1.5 flex items-center gap-2">
            <Input type="number" min={0} max={100} step={1}
              value={prefs.deposit_percentage}
              onChange={(e) => setPrefs((p) => ({ ...p, deposit_percentage: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))} />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
      </Section>

      <Section icon={User} title="Team" desc="Invites coming soon.">
        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          You're the only member of this workspace right now. Team invites will land in a future update.
        </div>
      </Section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="rounded-full">
          <Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, desc, children }: { icon: any; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
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
