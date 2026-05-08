import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RotateCcw, Sparkles } from "lucide-react";

export default function AdminDemoTools() {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<"reset" | "seed" | null>(null);
  const [result, setResult] = useState<{ message: string; summary?: Record<string, number> } | null>(null);

  const run = async (action: "reset" | "seed_lead") => {
    setBusy(action === "reset" ? "reset" : "seed");
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-demo-reset", {
        body: action === "reset" ? { action: "reset", confirm } : { action: "seed_lead" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const d = data as { message: string; summary?: Record<string, number> };
      setResult(d);
      setConfirm("");
      toast({ title: "Done", description: d.message });
    } catch (e: any) {
      toast({ title: "Demo tool failed", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Demo Data Tools</h1>
        <p className="text-sm text-muted-foreground">
          Restore sample trucks, menus, leads, messages, bookings, and settings for sales demos. Only records tagged as demo will be affected.
        </p>
      </header>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Reset Demo Data
          </CardTitle>
          <CardDescription>
            Wipes demo-tagged leads, messages, bookings, deposits, menus, events, and locations,
            then restores Smoke Trail BBQ to a clean, polished demo state. Real owner data is never touched.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="confirm" className="text-xs uppercase tracking-wider text-muted-foreground">
            Type <span className="font-mono font-bold text-destructive">RESET DEMO</span> to confirm
          </Label>
          <Input
            id="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="RESET DEMO"
            className="font-mono"
          />
          <Button
            variant="destructive"
            disabled={confirm !== "RESET DEMO" || busy !== null}
            onClick={() => run("reset")}
          >
            <RotateCcw className="h-4 w-4" />
            {busy === "reset" ? "Resetting…" : "Reset Demo Data"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Seed Demo Lead
          </CardTitle>
          <CardDescription>Create one fresh sample lead on Smoke Trail BBQ without touching anything else.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" disabled={busy !== null} onClick={() => run("seed_lead")}>
            {busy === "seed" ? "Seeding…" : "Add sample lead"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last run</CardTitle>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
          {result.summary && (
            <CardContent>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                {Object.entries(result.summary).map(([k, v]) => (
                  <li key={k} className="flex justify-between border-b border-border/50 py-1">
                    <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
                    <span className="font-mono font-semibold">{v}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}