import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ShieldCheck, ShieldOff, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";

type Profile = {
  id: string;
  display_name: string | null;
  owner_title: string | null;
  created_at: string;
};
type Role = "admin" | "owner";

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, Role[]>>({});
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const { data: ps } = await supabase
      .from("profiles")
      .select("id,display_name,owner_title,created_at")
      .order("created_at", { ascending: false });
    setProfiles((ps ?? []) as Profile[]);

    const { data: rs } = await supabase.from("user_roles").select("user_id,role");
    const map: Record<string, Role[]> = {};
    (rs ?? []).forEach((r: any) => {
      map[r.user_id] = [...(map[r.user_id] ?? []), r.role];
    });
    setRolesByUser(map);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return profiles;
    return profiles.filter((p) =>
      [p.display_name, p.owner_title, p.id].filter(Boolean).join(" ").toLowerCase().includes(t)
    );
  }, [profiles, q]);

  const toggleRole = async (userId: string, role: Role, has: boolean) => {
    if (role === "admin" && userId === me?.id && has) {
      toast.error("You cannot remove your own admin role.");
      return;
    }
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) return toast.error(error.message);
      toast.success(`${role} removed`);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) return toast.error(error.message);
      toast.success(`${role} granted`);
    }
    load();
  };

  const deleteUser = async (p: Profile, isAdmin: boolean, isMe: boolean) => {
    if (isMe) return toast.error("You cannot delete your own account from the admin table.");
    if (isAdmin) return toast.error("Remove the admin role before deleting this account.");
    if (!confirm(`Permanently delete ${p.display_name ?? p.id}? Listings must be reassigned or removed first.`)) return;
    setBusyId(p.id);
    const { error } = await supabase.functions.invoke("delete-account", { body: { target_user_id: p.id } });
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("User account deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Users & Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">{filtered.length} of {profiles.length} users</p>
      </div>

      <Card className="rounded-2xl"><CardContent className="p-4"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, title, or ID…" className="pl-9" /></div></CardContent></Card>

      <Card className="rounded-2xl">
        <Table>
          <TableHeader><TableRow><TableHead>Display name</TableHead><TableHead>Title</TableHead><TableHead>Roles</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const roles = rolesByUser[p.id] ?? [];
              const isAdmin = roles.includes("admin");
              const isOwner = roles.includes("owner");
              const isMe = p.id === me?.id;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.display_name ?? "—"}{isMe && <Badge variant="outline" className="ml-2">You</Badge>}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.owner_title ?? "—"}</TableCell>
                  <TableCell><div className="flex gap-1">{isAdmin && <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" /> admin</Badge>}{isOwner && <Badge variant="outline">owner</Badge>}{!isAdmin && !isOwner && <span className="text-xs text-muted-foreground">none</span>}</div></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right"><div className="inline-flex flex-wrap justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => toggleRole(p.id, "admin", isAdmin)} disabled={isAdmin && isMe} title={isAdmin && isMe ? "You can't remove your own admin role" : ""}>{isAdmin ? <><ShieldOff className="mr-1 h-3.5 w-3.5" /> Revoke admin</> : <><ShieldCheck className="mr-1 h-3.5 w-3.5" /> Make admin</>}</Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleRole(p.id, "owner", isOwner)}><UserCog className="mr-1 h-3.5 w-3.5" /> {isOwner ? "Revoke owner" : "Make owner"}</Button>
                    <Button variant="ghost" size="sm" className="text-destructive" disabled={busyId === p.id || isMe || isAdmin} onClick={() => deleteUser(p, isAdmin, isMe)}><Trash2 className="mr-1 h-3.5 w-3.5" /> {busyId === p.id ? "Deleting…" : "Delete"}</Button>
                  </div></TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No users.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
