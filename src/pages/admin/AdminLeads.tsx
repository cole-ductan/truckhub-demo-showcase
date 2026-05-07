import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Flag, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type Lead = {
  id: string; business_id: string;
  contact_name: string; contact_email: string; contact_phone: string | null;
  event_type: string | null; event_date: string | null;
  message: string | null; stage: string;
  is_spam: boolean; is_archived: boolean;
  created_at: string;
};

export default function AdminLeads() {
  const [params] = useSearchParams();
  const [rows, setRows] = useState<Lead[]>([]);
  const [bizMap, setBizMap] = useState<Record<string, { name: string; slug: string }>>({});
  const [q, setQ] = useState("");
  const [biz, setBiz] = useState<string>(params.get("biz") ?? "all");
  const [view, setView] = useState<string>("active");

  const load = async () => {
    const { data: ls } = await supabase
      .from("leads")
      .select("id,business_id,contact_name,contact_email,contact_phone,event_type,event_date,message,stage,is_spam,is_archived,created_at")
      .order("created_at", { ascending: false });
    setRows((ls ?? []) as Lead[]);
    const { data: bs } = await supabase.from("businesses").select("id,name,slug");
    const m: Record<string, any> = {};
    (bs ?? []).forEach((b) => (m[b.id] = b));
    setBizMap(m);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (view === "active" && (r.is_spam || r.is_archived)) return false;
      if (view === "spam" && !r.is_spam) return false;
      if (view === "archived" && !r.is_archived) return false;
      if (biz !== "all" && r.business_id !== biz) return false;
      if (!t) return true;
      const bn = bizMap[r.business_id]?.name ?? "";
      return [r.contact_name, r.contact_email, r.contact_phone, r.event_type, r.message, bn].filter(Boolean).join(" ").toLowerCase().includes(t);
    });
  }, [rows, q, biz, view, bizMap]);

  const update = async (id: string, patch: Partial<Lead>) => {
    const { error } = await supabase.from("leads").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    load();
  };

  const businesses = Object.entries(bizMap).map(([id, b]) => ({ id, name: b.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">{filtered.length} of {rows.length} leads</p>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, message…" className="pl-9" />
          </div>
          <Select value={biz} onValueChange={setBiz}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All businesses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All businesses</SelectItem>
              {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={view} onValueChange={setView}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="spam">Spam</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <div className="font-medium">{l.contact_name}</div>
                  <div className="text-xs text-muted-foreground">{l.contact_email}</div>
                </TableCell>
                <TableCell className="text-sm">{bizMap[l.business_id]?.name ?? "—"}</TableCell>
                <TableCell className="text-sm">
                  <div>{l.event_type ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{l.event_date ?? ""}</div>
                </TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{l.stage}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {l.is_spam && <Badge variant="destructive">spam</Badge>}
                    {l.is_archived && <Badge variant="secondary">archived</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    {l.is_spam || l.is_archived ? (
                      <Button variant="ghost" size="sm" onClick={() => update(l.id, { is_spam: false, is_archived: false })}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restore
                      </Button>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => update(l.id, { is_spam: true })}>
                          <Flag className="mr-1 h-3.5 w-3.5" /> Spam
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => update(l.id, { is_archived: true })}>
                          <Archive className="mr-1 h-3.5 w-3.5" /> Archive
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No leads match.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}