import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export default function OwnerSetPassword() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [mustChange, setMustChange] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    (supabase as any).from("profiles").select("must_change_password").eq("id", user.id).maybeSingle().then(({ data }: any) => {
      setMustChange(Boolean(data?.must_change_password));
    });
  }, [user]);

  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (mustChange === false) return <Navigate to="/owner" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw !== pw2) return toast.error("Passwords don't match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setBusy(false); return toast.error(error.message); }
    const { error: pErr } = await (supabase as any).from("profiles").update({ must_change_password: false, account_status: "active" }).eq("id", user!.id);
    setBusy(false);
    if (pErr) return toast.error(pErr.message);
    toast.success("Password updated");
    nav("/owner", { replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-cream-deep px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
        <div className="flex items-center gap-2 text-primary"><KeyRound className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-wider">Set your password</span></div>
        <h1 className="mt-2 font-display text-2xl font-bold">Replace your temporary password</h1>
        <p className="mt-2 text-sm text-muted-foreground">For your security, choose a new password before accessing your dashboard.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div><Label htmlFor="np">New password</Label><Input id="np" type="password" autoComplete="new-password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <div><Label htmlFor="np2">Confirm new password</Label><Input id="np2" type="password" autoComplete="new-password" minLength={8} required value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
          <Button type="submit" disabled={busy} className="h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">{busy ? "Saving…" : "Set password & continue"}</Button>
        </form>
      </div>
    </div>
  );
}