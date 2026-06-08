import { useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AccountDeletionCard({
  email,
  onDeleted,
}: {
  email?: string | null;
  onDeleted?: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function removeAccount() {
    if (!confirm("Permanently delete this account? This cannot be undone. Listings must be reassigned or removed first.")) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("delete-account", { body: {} });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account deleted");
    await onDeleted?.();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="text-sm">
        <p className="font-semibold text-destructive">Delete account</p>
        <p className="text-xs text-muted-foreground">
          Permanently removes {email ? email : "your login"}. Historical claim records are retained without personal contact details.
        </p>
      </div>
      <Button variant="destructive" disabled={busy} onClick={removeAccount} className="rounded-full">
        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {busy ? "Deleting…" : "Delete account"}
      </Button>
    </div>
  );
}
