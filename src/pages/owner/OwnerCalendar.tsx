import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { Onboarding } from "@/components/owner/Onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalIcon, Clock, MapPin, Pencil, Plus, Trash2 } from "lucide-react";

type Event = {
  id: string;
  business_id: string;
  kind: "weekly" | "one_off";
  title: string;
  weekday: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  tag: string | null;
  is_public: boolean;
};

const blank: Partial<Event> = {
  kind: "one_off", title: "", event_date: "", start_time: "",
  end_time: "", location: "", notes: "", weekday: null, tag: null, is_public: true,
};

export default function OwnerCalendar() {
  const { business, loading } = useOwnerBusiness();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [editing, setEditing] = useState<Partial<Event> | null>(null);

  async function reload() {
    if (!business) return;
    const { data } = await supabase.from("business_events").select("*").eq("business_id", business.id).order("event_date", { ascending: false });
    setEvents((data ?? []) as Event[]);
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [business]);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!business) return <Onboarding />;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => !e.event_date || e.event_date >= today).sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
  const past = events.filter((e) => e.event_date && e.event_date < today);

  async function save() {
    if (!editing || !business) return;
    if (!editing.title?.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    const payload = {
      business_id: business.id,
      kind: editing.kind ?? "one_off",
      title: editing.title.trim(),
      event_date: editing.event_date || null,
      start_time: editing.start_time || null,
      end_time: editing.end_time || null,
      location: editing.location || null,
      notes: editing.notes || null,
      weekday: editing.weekday || null,
      tag: editing.tag || null,
      is_public: editing.is_public ?? true,
    };
    if (editing.id) {
      const { error } = await supabase.from("business_events").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("business_events").insert(payload);
      if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    }
    setEditing(null);
    toast({ title: "Saved" });
    reload();
  }

  async function remove(id: string) {
    if (!confirm("Delete this event?")) return;
    const { error } = await supabase.from("business_events").delete().eq("id", id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setEvents((p) => p.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Weekly spots and one-off events. Public events show on your truck profile.</p>
        </div>
        <Button onClick={() => setEditing({ ...blank })}><Plus className="mr-1.5 h-4 w-4" /> Add event</Button>
      </div>

      <Group title="Upcoming" events={upcoming} emptyText="No upcoming events. Add one so customers know where to find you." onEdit={setEditing} onRemove={remove} />
      <Group title="Past" events={past} emptyText="No past events yet." muted onEdit={setEditing} onRemove={remove} />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit event" : "New event"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <select className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={editing?.kind ?? "one_off"}
                onChange={(e) => setEditing((x) => x ? { ...x, kind: e.target.value as any } : null)}>
                <option value="one_off">One-off event</option>
                <option value="weekly">Weekly recurring</option>
              </select>
            </div>
            <div>
              <Label>Title</Label>
              <Input className="mt-1.5" value={editing?.title ?? ""} onChange={(e) => setEditing((x) => x ? { ...x, title: e.target.value } : null)} placeholder="Friday Night at Titletown" />
            </div>
            {editing?.kind === "weekly" ? (
              <div>
                <Label>Weekday</Label>
                <select className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editing?.weekday ?? ""} onChange={(e) => setEditing((x) => x ? { ...x, weekday: e.target.value || null } : null)}>
                  <option value="">— Choose —</option>
                  {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <Label>Date</Label>
                <Input type="date" className="mt-1.5" value={editing?.event_date ?? ""} onChange={(e) => setEditing((x) => x ? { ...x, event_date: e.target.value } : null)} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start time</Label>
                <Input className="mt-1.5" placeholder="11:00" value={editing?.start_time ?? ""} onChange={(e) => setEditing((x) => x ? { ...x, start_time: e.target.value } : null)} />
              </div>
              <div>
                <Label>End time</Label>
                <Input className="mt-1.5" placeholder="20:00" value={editing?.end_time ?? ""} onChange={(e) => setEditing((x) => x ? { ...x, end_time: e.target.value } : null)} />
              </div>
            </div>
            <div>
              <Label>Location / address</Label>
              <Input className="mt-1.5" value={editing?.location ?? ""} onChange={(e) => setEditing((x) => x ? { ...x, location: e.target.value } : null)} placeholder="Titletown · Lot 7" />
            </div>
            <div>
              <Label>Public notes</Label>
              <Textarea className="mt-1.5" rows={2} value={editing?.notes ?? ""} onChange={(e) => setEditing((x) => x ? { ...x, notes: e.target.value } : null)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-semibold">Show on public profile</p>
                <p className="text-xs text-muted-foreground">Turn off to keep this internal-only.</p>
              </div>
              <Switch checked={editing?.is_public ?? true} onCheckedChange={(v) => setEditing((x) => x ? { ...x, is_public: v } : null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Group({ title, events, emptyText, muted, onEdit, onRemove }: { title: string; events: Event[]; emptyText: string; muted?: boolean; onEdit: (e: Event) => void; onRemove: (id: string) => void; }) {
  return (
    <section>
      <h2 className={`font-display text-lg font-semibold ${muted ? "text-muted-foreground" : ""}`}>{title} <span className="text-sm font-normal text-muted-foreground">· {events.length}</span></h2>
      {events.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {events.map((e) => (
            <li key={e.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 ${muted ? "opacity-75" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display font-semibold">{e.title}</p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">{e.kind === "weekly" ? "Weekly" : "One-off"}</span>
                  {!e.is_public && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">Private</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><CalIcon className="h-3 w-3" /> {e.kind === "weekly" ? e.weekday : e.event_date}</span>
                  {(e.start_time || e.end_time) && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {e.start_time}{e.end_time ? ` – ${e.end_time}` : ""}</span>}
                  {e.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => onEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onRemove(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}