import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SiteHeader } from "@/components/site/SiteHeader";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export default function Auth() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav("/owner", { replace: true });
    });
  }, [nav]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, displayName: mode === "sign-up" ? displayName : undefined });
    if (!parsed.success) {
      toast({ title: "Invalid input", description: parsed.error.issues[0]?.message ?? "Check your fields", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav("/owner", { replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/owner",
            data: { display_name: displayName },
          },
        });
        if (error) throw error;
        toast({ title: "Welcome aboard!", description: "Account created. Setting up your dashboard…" });
        nav("/owner", { replace: true });
      }
    } catch (err: any) {
      toast({ title: "Auth error", description: err.message ?? String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/owner" });
    if (result.error) {
      toast({ title: "Google sign-in failed", description: String(result.error), variant: "destructive" });
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container-tight flex justify-center px-4 pt-12 pb-20 md:pt-20">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
          <h1 className="font-display text-3xl font-bold">{mode === "sign-in" ? "Welcome back" : "Create your TruckHub account"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "sign-in" ? "Sign in to manage your truck." : "Owners only — claim and manage your truck page."}
          </p>

          <Button onClick={google} disabled={busy} variant="outline" className="mt-6 h-11 w-full rounded-full">
            Continue with Google
          </Button>
          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "sign-up" && (
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (8+ chars)"
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <Button disabled={busy} className="h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              {busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "sign-in" ? "New here?" : "Already have an account?"}{" "}
            <button
              className="font-semibold text-primary hover:underline"
              onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
            >
              {mode === "sign-in" ? "Create one" : "Sign in"}
            </button>
          </p>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">← Back to TruckHub</Link>
          </p>
        </div>
      </main>
    </div>
  );
}