import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, X, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type Cat = {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
  parent_id: string | null;
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function AdminCategories() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [primaryCounts, setPrimaryCounts] = useState<Record<string, number>>({});
  const [specialtyCounts, setSpecialtyCounts] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Cat>>({});
  const [creatingParent, setCreatingParent] = useState(false);
  const [newParent, setNewParent] = useState<Partial<Cat>>({ name: "", emoji: "", sort_order: 0, is_active: true });
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [newSub, setNewSub] = useState<Partial<Cat>>({ name: "", emoji: "", sort_order: 0, is_active: true });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    const { data } = await supabase.from("business_categories").select("*").order("sort_order").order("name");
    setCats((data ?? []) as Cat[]);
    const { data: bs } = await supabase.from("businesses").select("category_id");
    const c: Record<string, number> = {};
    (bs ?? []).forEach((b: any) => { if (b.category_id) c[b.category_id] = (c[b.category_id] ?? 0) + 1; });
    setPrimaryCounts(c);
    const { data: subs } = await (supabase as any).from("business_subcategories").select("category_id");
    const sc: Record<string, number> = {};
    (subs ?? []).forEach((r: any) => { sc[r.category_id] = (sc[r.category_id] ?? 0) + 1; });
    setSpecialtyCounts(sc);
  };

  useEffect(() => { load(); }, []);

  const parents = useMemo(() => cats.filter((c) => !c.parent_id), [cats]);
  const childrenOf = (pid: string) => cats.filter((c) => c.parent_id === pid);

  const startEdit = (c: Cat) => { setEditingId(c.id); setDraft(c); };
  const cancelEdit = () => { setEditingId(null); setDraft({}); };
  const saveEdit = async () => {
    if (!editingId || !draft.name) return;
    const { error } = await supabase.from("business_categories").update({
      name: draft.name, emoji: draft.emoji ?? null, sort_order: draft.sort_order ?? 0, is_active: draft.is_active ?? true,
    }).eq("id", editingId);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    cancelEdit();
    load();
  };
  const createParent = async () => {
    if (!newParent.name) return toast.error("Name required");
    const { error } = await supabase.from("business_categories").insert({
      name: newParent.name, slug: slugify(newParent.name),
      emoji: newParent.emoji ?? null, sort_order: newParent.sort_order ?? 0,
      is_active: newParent.is_active ?? true, parent_id: null,
    });
    if (error) return toast.error(error.message);
    toast.success("Parent created");
    setCreatingParent(false);
    setNewParent({ name: "", emoji: "", sort_order: 0, is_active: true });
    load();
  };
  const createSub = async (parentId: string) => {
    if (!newSub.name) return toast.error("Name required");
    const { error } = await supabase.from("business_categories").insert({
      name: newSub.name, slug: slugify(newSub.name),
      emoji: newSub.emoji ?? null, sort_order: newSub.sort_order ?? 0,
      is_active: newSub.is_active ?? true, parent_id: parentId,
    });
    if (error) return toast.error(error.message);
    toast.success("Subcategory created");
    setAddingSubFor(null);
    setNewSub({ name: "", emoji: "", sort_order: 0, is_active: true });
    setExpanded((e) => ({ ...e, [parentId]: true }));
    load();
  };
  const remove = async (c: Cat) => {
    const childCount = childrenOf(c.id).length;
    const used = (primaryCounts[c.id] ?? 0) + (specialtyCounts[c.id] ?? 0);
    if (childCount > 0) return toast.error("Remove subcategories first.");
    if (used > 0) return toast.error("Cannot delete: category is in use.");
    if (!confirm(`Delete "${c.name}"?`)) return;
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

  const renderEditableRow = (c: Cat, isChild: boolean) => {
    const editing = editingId === c.id;
    const used = (primaryCounts[c.id] ?? 0) + (specialtyCounts[c.id] ?? 0);
    return (
      <div className={`flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 ${isChild ? "ml-8" : ""}`}>
        {editing ? (
          <>
            <Input value={draft.emoji ?? ""} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} className="h-8 w-14" placeholder="🍔" />
            <Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="h-8 flex-1 min-w-[150px]" />
            <Input type="number" value={draft.sort_order ?? 0} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} className="h-8 w-20" />
            <Switch checked={!!draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
            <Button size="sm" onClick={saveEdit}><Save className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="h-3.5 w-3.5" /></Button>
          </>
        ) : (
          <>
            <span className="text-lg w-7 text-center">{c.emoji ?? ""}</span>
            <span className={`flex-1 min-w-[120px] ${isChild ? "" : "font-semibold"}`}>{c.name}</span>
            <span className="text-xs text-muted-foreground font-mono">{c.slug}</span>
            <Badge variant="outline" className="text-[10px]">#{c.sort_order}</Badge>
            {used > 0 && <Badge variant="secondary" className="text-[10px]">{used} use{used === 1 ? "" : "s"}</Badge>}
            {!c.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
            <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
            <Button size="sm" variant="ghost" onClick={() => startEdit(c)}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => remove(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">{parents.length} parents · {cats.length - parents.length} subcategories</p>
        </div>
        <Button onClick={() => setCreatingParent(true)}><Plus className="mr-1 h-4 w-4" /> New parent</Button>
      </div>

      {creatingParent && (
        <Card className="rounded-2xl">
          <CardContent className="grid gap-2 p-4 sm:grid-cols-[60px_1fr_100px_auto]">
            <Input placeholder="🍔" value={newParent.emoji ?? ""} onChange={(e) => setNewParent({ ...newParent, emoji: e.target.value })} />
            <Input placeholder="Parent name" value={newParent.name ?? ""} onChange={(e) => setNewParent({ ...newParent, name: e.target.value })} />
            <Input type="number" placeholder="Sort" value={newParent.sort_order ?? 0} onChange={(e) => setNewParent({ ...newParent, sort_order: Number(e.target.value) })} />
            <div className="flex gap-2">
              <Button onClick={createParent}><Save className="mr-1 h-4 w-4" /> Save</Button>
              <Button variant="ghost" onClick={() => setCreatingParent(false)}><X className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {parents.map((p) => {
          const kids = childrenOf(p.id);
          const isOpen = expanded[p.id] ?? true;
          return (
            <Card key={p.id} className="rounded-2xl">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setExpanded((e) => ({ ...e, [p.id]: !isOpen }))} className="rounded p-1 hover:bg-muted">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <div className="flex-1">{renderEditableRow(p, false)}</div>
                </div>

                {isOpen && (
                  <div className="space-y-2 pt-2">
                    {kids.map((k) => <div key={k.id}>{renderEditableRow(k, true)}</div>)}
                    {kids.length === 0 && <p className="ml-8 text-xs text-muted-foreground">No subcategories yet.</p>}

                    {addingSubFor === p.id ? (
                      <div className="ml-8 grid gap-2 rounded-lg border border-dashed border-border p-3 sm:grid-cols-[60px_1fr_100px_auto]">
                        <Input placeholder="🍦" value={newSub.emoji ?? ""} onChange={(e) => setNewSub({ ...newSub, emoji: e.target.value })} />
                        <Input placeholder="Subcategory name" value={newSub.name ?? ""} onChange={(e) => setNewSub({ ...newSub, name: e.target.value })} />
                        <Input type="number" placeholder="Sort" value={newSub.sort_order ?? 0} onChange={(e) => setNewSub({ ...newSub, sort_order: Number(e.target.value) })} />
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => createSub(p.id)}><Save className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => { setAddingSubFor(null); setNewSub({ name: "", emoji: "", sort_order: 0, is_active: true }); }}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" className="ml-8" onClick={() => setAddingSubFor(p.id)}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Add subcategory
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {parents.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No parent categories yet.</p>
        )}
      </div>
    </div>
  );
}