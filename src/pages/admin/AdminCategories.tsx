import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";

type Cat = {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function AdminCategories() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Cat>>({});
  const [creating, setCreating] = useState(false);
  const [newCat, setNewCat] = useState<Partial<Cat>>({ name: "", emoji: "", sort_order: 0, is_active: true });

  const load = async () => {
    const { data } = await supabase.from("business_categories").select("*").order("sort_order").order("name");
    setCats((data ?? []) as Cat[]);
    const { data: bs } = await supabase.from("businesses").select("category_id");
    const c: Record<string, number> = {};
    (bs ?? []).forEach((b: any) => { if (b.category_id) c[b.category_id] = (c[b.category_id] ?? 0) + 1; });
    setCounts(c);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (c: Cat) => { setEditingId(c.id); setDraft(c); };
  const cancelEdit = () => { setEditingId(null); setDraft({}); };
  const saveEdit = async () => {
    if (!editingId || !draft.name) return;
    const { error } = await supabase.from("business_categories").update({
      name: draft.name, emoji: draft.emoji ?? null, sort_order: draft.sort_order ?? 0, is_active: draft.is_active ?? true,
    }).eq("id", editingId);
    if (error) return toast.error(error.message);
    toast.success("Category updated");
    cancelEdit();
    load();
  };
  const create = async () => {
    if (!newCat.name) return toast.error("Name required");
    const { error } = await supabase.from("business_categories").insert({
      name: newCat.name, slug: slugify(newCat.name),
      emoji: newCat.emoji ?? null, sort_order: newCat.sort_order ?? 0, is_active: newCat.is_active ?? true,
    });
    if (error) return toast.error(error.message);
    toast.success("Category created");
    setCreating(false);
    setNewCat({ name: "", emoji: "", sort_order: 0, is_active: true });
    load();
  };
  const remove = async (c: Cat) => {
    if ((counts[c.id] ?? 0) > 0) return toast.error("Cannot delete: category is in use.");
    if (!confirm(`Delete category "${c.name}"?`)) return;
    const { error } = await supabase.from("business_categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };
  const toggleActive = async (c: Cat) => {
    const { error } = await supabase.from("business_categories").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">{cats.length} categories</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="mr-1 h-4 w-4" /> New</Button>
      </div>

      {creating && (
        <Card className="rounded-2xl">
          <CardContent className="grid gap-3 p-4 sm:grid-cols-[60px_1fr_120px_auto]">
            <Input placeholder="🌮" value={newCat.emoji ?? ""} onChange={(e) => setNewCat({ ...newCat, emoji: e.target.value })} />
            <Input placeholder="Name" value={newCat.name ?? ""} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
            <Input type="number" placeholder="Sort" value={newCat.sort_order ?? 0} onChange={(e) => setNewCat({ ...newCat, sort_order: Number(e.target.value) })} />
            <div className="flex gap-2">
              <Button onClick={create}><Save className="mr-1 h-4 w-4" /> Save</Button>
              <Button variant="ghost" onClick={() => setCreating(false)}><X className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Emoji</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="w-[80px]">Sort</TableHead>
              <TableHead className="w-[100px]">Active</TableHead>
              <TableHead>Used by</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cats.map((c) => {
              const editing = editingId === c.id;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    {editing
                      ? <Input value={draft.emoji ?? ""} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} className="h-8" />
                      : <span className="text-lg">{c.emoji ?? "—"}</span>}
                  </TableCell>
                  <TableCell>
                    {editing
                      ? <Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="h-8" />
                      : <span className="font-medium">{c.name}</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.slug}</TableCell>
                  <TableCell>
                    {editing
                      ? <Input type="number" value={draft.sort_order ?? 0} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} className="h-8" />
                      : c.sort_order}
                  </TableCell>
                  <TableCell>
                    <Switch checked={editing ? !!draft.is_active : c.is_active} onCheckedChange={(v) => editing ? setDraft({ ...draft, is_active: v }) : toggleActive(c)} />
                  </TableCell>
                  <TableCell><Badge variant="outline">{counts[c.id] ?? 0}</Badge></TableCell>
                  <TableCell className="text-right">
                    {editing ? (
                      <div className="inline-flex gap-1">
                        <Button size="sm" onClick={saveEdit}><Save className="mr-1 h-3.5 w-3.5" /> Save</Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    ) : (
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(c)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(c)} disabled={(counts[c.id] ?? 0) > 0}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {cats.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No categories yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}