import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";

type Prefs = {
  business_id: string;
  receive_inquiries: boolean;
  paused: boolean;
  service_area: string | null;
  max_travel_miles: number | null;
  cuisine_categories: string[];
  min_guest_count: number | null;
  accepts_private: boolean;
  accepts_festivals: boolean;
  accepts_catering: boolean;
  accepts_individual_purchase: boolean;
  preferred_contact_method: string | null;
};

const blank = (id: string): Prefs => ({
  business_id: id, receive_inquiries: true, paused: false,
  service_area: "", max_travel_miles: null,
  cuisine_categories: [], min_guest_count: null,
  accepts_private: true, accepts_festivals: true,
  accepts_catering: true, accepts_individual_purchase: true,
  preferred_contact_method: "email",
});

export default function OwnerLeadPreferences() {
  const { business, businesses } = useOwnerBusiness();
  const isClaimantOnly = businesses.length === 0;
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!business?.id) { setLoading(false); return; }
    setLoading(true);
    (supabase as any).from("vendor_lead_preferences").select("*").eq("business_id", business.id).maybeSingle()
      .then(({ data }: any) => { setPrefs((data as Prefs) ?? blank(business.id)); setLoading(false); });
  }, [business?.id]);

  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setPrefs((p) => p ? { ...p, [k]: v } : p);

  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    const { error } = await (supabase as any).from("vendor_lead_preferences").upsert(prefs, { onConflict: "business_id" });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Lead preferences saved");
  };

  if (isClaimantOnly) {
    return (
      <div className="max-w-2xl rounded-2xl border border-dashed border-border bg-card p-8">
        <h1 className="font-display text-2xl font-bold">Lead Preferences</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your listing claim is still pending. Once an admin approves your claim, you'll be able to control which event inquiries route to your business here.
        </p>
      </div>
    );
  }

  if (loading || !prefs) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Lead Preferences</h1>
        <p className="mt-1 text-sm text-muted-foreground">Control which "Book a Truck" event inquiries route to {business?.name ?? "your business"}.</p>
      </div>

      <Card className="rounded-2xl"><CardContent className="space-y-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Receive booking inquiries</Label>
            <p className="text-xs text-muted-foreground">Turn off to stop being matched to public event requests.</p>
          </div>
          <Switch checked={prefs.receive_inquiries} onCheckedChange={(v) => set("receive_inquiries", v)} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Pause notifications</Label>
            <p className="text-xs text-muted-foreground">Stay matched, but temporarily pause new lead pings.</p>
          </div>
          <Switch checked={prefs.paused} onCheckedChange={(v) => set("paused", v)} />
        </div>
      </CardContent></Card>

      <Card className="rounded-2xl"><CardContent className="grid gap-4 p-6 md:grid-cols-2">
        <div><Label>Service area</Label><Input value={prefs.service_area ?? ""} onChange={(e) => set("service_area", e.target.value)} placeholder="Green Bay / Fox Valley" /></div>
        <div><Label>Maximum travel (miles)</Label><Input type="number" value={prefs.max_travel_miles ?? ""} onChange={(e) => set("max_travel_miles", e.target.value ? Number(e.target.value) : null)} /></div>
        <div><Label>Minimum guest count</Label><Input type="number" value={prefs.min_guest_count ?? ""} onChange={(e) => set("min_guest_count", e.target.value ? Number(e.target.value) : null)} /></div>
        <div>
          <Label>Preferred contact method</Label>
          <Select value={prefs.preferred_contact_method ?? "email"} onValueChange={(v) => set("preferred_contact_method", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="sms">Text message</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label>Cuisine categories (comma separated)</Label>
          <Textarea rows={2} value={(prefs.cuisine_categories ?? []).join(", ")}
            onChange={(e) => set("cuisine_categories", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
        </div>
      </CardContent></Card>

      <Card className="rounded-2xl"><CardContent className="grid gap-3 p-6 sm:grid-cols-2">
        {[
          ["accepts_private","Private events"],
          ["accepts_festivals","Festivals & rallies"],
          ["accepts_catering","Catering / host-paid"],
          ["accepts_individual_purchase","Individual-purchase events"],
        ].map(([k,l]) => (
          <div key={k} className="flex items-center justify-between rounded-xl border border-border p-3">
            <Label className="text-sm">{l as string}</Label>
            <Switch checked={(prefs as any)[k]} onCheckedChange={(v) => set(k as any, v as any)} />
          </div>
        ))}
      </CardContent></Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="rounded-full">{saving ? "Saving…" : "Save preferences"}</Button>
      </div>
    </div>
  );
}