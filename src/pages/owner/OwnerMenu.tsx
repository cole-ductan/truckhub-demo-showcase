import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { Onboarding } from "@/components/owner/Onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronUp, ExternalLink, Plus, Trash2, Pencil, Eye, EyeOff } from "lucide-react";

type Cat = { id: string; name: string; sort_order: number };
type Item = {
  id: string; category_id: string; name: string; description: string | null;
  price: string | null; sort_order: number; is_available: boolean;
  dietary_tags: string[] | null;
};

export default function OwnerMenu() {
  const { business, loading } = useOwnerBusiness();
  const { toast } = useToast();
  const [cats, setCats] = useState<Cat[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [editingCat, setEditingCat] = useState<Cat | null>(null);
  const [editingItem, setEditingItem] = useState<{ item: Partial<Item>; categoryId: string } | null>(null);

  async function reload() {
    if (!business) return;
    const [c, i] = await Promise.all([
      supabase.from("menu_categories").select("*").eq("business_id", business.id).order("sort_order"),
      supabase.from("menu_items").select("*").eq("business_id", business.id).order("sort_order"),
    ]);
    setCats((c.data ?? []) as Cat[]);
    setItems((i.data ?? []) as Item[]);
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [business]);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!business) return <Onboarding />;

  async function saveCategory(c: Cat) {
    if (!c.name.trim()) return;
    if ((c as any).id?.startsWith("new")) {
      const next = (cats[cats.length - 1]?.sort_order ?? -1) + 1;
      const { data, error } = await supabase.from("menu_categories")
        .insert({ business_id: business!.id, name: c.name.trim(), sort_order: next }).select().maybeSingle();
      if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
      setCats((p) => [...p, data as Cat]);
    } else {
      const { error } = await supabase.from("menu_categories").update({ name: c.name.trim() }).eq("id", c.id);
      if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
      setCats((p) => p.map((x) => x.id === c.id ? { ...x, name: c.name.trim() } : x));
    }
    setEditingCat(null);
    toast({ title: "Saved" });
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category and all its items?")) return;
    await supabase.from("menu_items").delete().eq("category_id", id);
    const { error } = await supabase.from("menu_categories").delete().eq("id", id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setCats((p) => p.filter((c) => c.id !== id));
    setItems((p) => p.filter((i) => i.category_id !== id));
  }

  async function reorderCat(id: string, dir: -1 | 1) {
    const idx = cats.findIndex((c) => c.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= cats.length) return;
    const a = cats[idx], b = cats[j];
    await Promise.all([
      supabase.from("menu_categories").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("menu_categories").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    const next = [...cats]; next[idx] = { ...a, sort_order: b.sort_order }; next[j] = { ...b, sort_order: a.sort_order };
    next.sort((x, y) => x.sort_order - y.sort_order);
    setCats(next);
  }

  async function saveItem() {
    if (!editingItem || !business) return;
    const it = editingItem.item;
    if (!it.name?.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    const payload = {
      business_id: business.id,
      category_id: editingItem.categoryId,
      name: it.name.trim(),
      description: it.description ?? null,
      price: it.price ?? null,
      is_available: it.is_available ?? true,
      sort_order: it.sort_order ?? items.filter((x) => x.category_id === editingItem.categoryId).length,
      dietary_tags: it.dietary_tags ?? null,
    };
    if (it.id) {
      const { data, error } = await supabase.from("menu_items").update(payload).eq("id", it.id).select().maybeSingle();
      if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
      setItems((p) => p.map((x) => x.id === it.id ? (data as Item) : x));
    } else {
      const { data, error } = await supabase.from("menu_items").insert(payload).select().maybeSingle();
      if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
      setItems((p) => [...p, data as Item]);
    }
    setEditingItem(null);
    toast({ title: "Saved" });
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    await supabase.from("menu_items").delete().eq("id", id);
    setItems((p) => p.filter((i) => i.id !== id));
  }

  async function toggleAvail(it: Item) {
    const { error } = await supabase.from("menu_items").update({ is_available: !it.is_available }).eq("id", it.id);
    if (error) return;
    setItems((p) => p.map((x) => x.id === it.id ? { ...x, is_available: !it.is_available } : x));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Menu</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your categories and items. Changes appear on your public profile immediately.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><a href={`/food-trucks/${business.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-4 w-4" /> Public profile</a></Button>
          <Button onClick={() => setEditingCat({ id: `new-${Date.now()}`, name: "", sort_order: cats.length } as any)}><Plus className="mr-1.5 h-4 w-4" /> Add category</Button>
        </div>
      </div>

      {cats.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="text-muted-foreground">No menu categories yet.</p>
          <Button className="mt-4" onClick={() => setEditingCat({ id: `new-${Date.now()}`, name: "", sort_order: 0 } as any)}>
            <Plus className="mr-1.5 h-4 w-4" /> Create your first category
          </Button>
        </div>
      )}

      {cats.map((c, idx) => {
        const list = items.filter((i) => i.category_id === c.id);
        return (
          <section key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button onClick={() => reorderCat(c.id, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                  <button onClick={() => reorderCat(c.id, 1)} disabled={idx === cats.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                </div>
                <h3 className="font-display text-xl font-semibold text-primary">{c.name}</h3>
                <span className="text-xs text-muted-foreground">{list.length} item{list.length === 1 ? "" : "s"}</span>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setEditingCat(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteCategory(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                <Button size="sm" onClick={() => setEditingItem({ item: { is_available: true }, categoryId: c.id })}><Plus className="mr-1 h-3.5 w-3.5" /> Item</Button>
              </div>
            </div>
            {list.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No items yet in this category.</p>}
            <ul className="mt-3 divide-y divide-border">
              {list.map((it) => (
                <li key={it.id} className={`flex items-start justify-between gap-3 py-3 ${!it.is_available ? "opacity-60" : ""}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-base font-semibold">{it.name}</p>
                      {!it.is_available && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">Hidden</span>}
                    </div>
                    {it.description && <p className="mt-0.5 text-sm text-muted-foreground">{it.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {it.price && <span className="font-display text-base font-bold">{it.price}</span>}
                    <button onClick={() => toggleAvail(it)} title={it.is_available ? "Hide" : "Show"} className="text-muted-foreground hover:text-foreground">
                      {it.is_available ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setEditingItem({ item: it, categoryId: c.id })} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => deleteItem(it.id)} className="text-destructive/80 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {/* Public preview */}
      {cats.length > 0 && (
        <section className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Public preview</h3>
            <Link to={`/food-trucks/${business.slug}`} target="_blank" className="text-xs font-semibold text-primary hover:underline">Open full page →</Link>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {cats.map((c) => (
              <div key={c.id}>
                <h4 className="font-display text-base font-semibold text-primary">{c.name}</h4>
                <div className="mt-2 divide-y divide-border rounded-xl border border-border bg-card">
                  {items.filter((i) => i.category_id === c.id && i.is_available).map((it) => (
                    <div key={it.id} className="flex items-baseline justify-between gap-4 p-3">
                      <div>
                        <p className="font-semibold">{it.name}</p>
                        {it.description && <p className="mt-0.5 text-xs text-muted-foreground">{it.description}</p>}
                      </div>
                      {it.price && <span className="font-display font-bold">{it.price}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Category dialog */}
      <Dialog open={!!editingCat} onOpenChange={(o) => !o && setEditingCat(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCat && (editingCat as any).id?.startsWith("new") ? "New category" : "Edit category"}</DialogTitle></DialogHeader>
          <div>
            <Label>Name</Label>
            <Input className="mt-1.5" value={editingCat?.name ?? ""} onChange={(e) => setEditingCat((c) => c ? { ...c, name: e.target.value } : null)} placeholder="Sandwiches" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCat(null)}>Cancel</Button>
            <Button onClick={() => editingCat && saveCategory(editingCat)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={!!editingItem} onOpenChange={(o) => !o && setEditingItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingItem?.item.id ? "Edit item" : "New item"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <select
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={editingItem?.categoryId ?? ""}
                onChange={(e) => setEditingItem((s) => s ? { ...s, categoryId: e.target.value } : null)}
              >
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <div>
                <Label>Name</Label>
                <Input className="mt-1.5" value={editingItem?.item.name ?? ""} onChange={(e) => setEditingItem((s) => s ? { ...s, item: { ...s.item, name: e.target.value } } : null)} />
              </div>
              <div>
                <Label>Price</Label>
                <Input className="mt-1.5" value={editingItem?.item.price ?? ""} onChange={(e) => setEditingItem((s) => s ? { ...s, item: { ...s.item, price: e.target.value } } : null)} placeholder="$12" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea className="mt-1.5" rows={3} value={editingItem?.item.description ?? ""} onChange={(e) => setEditingItem((s) => s ? { ...s, item: { ...s.item, description: e.target.value } } : null)} />
            </div>
            <div>
              <Label>Dietary tags (comma separated)</Label>
              <Input
                className="mt-1.5"
                value={(editingItem?.item.dietary_tags ?? []).join(", ")}
                onChange={(e) => setEditingItem((s) => s ? { ...s, item: { ...s.item, dietary_tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) } } : null)}
                placeholder="vegetarian, gluten-free"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-semibold">Available</p>
                <p className="text-xs text-muted-foreground">Hidden items don't show on your public menu.</p>
              </div>
              <Switch checked={editingItem?.item.is_available ?? true} onCheckedChange={(v) => setEditingItem((s) => s ? { ...s, item: { ...s.item, is_available: v } } : null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
            <Button onClick={saveItem}>Save item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}