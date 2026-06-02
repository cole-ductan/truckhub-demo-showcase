import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PaymentSuccess() {
  const [params] = useSearchParams();
  const depositId = params.get("deposit");
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
        <span className="grid h-14 w-14 mx-auto place-items-center rounded-full bg-emerald-500/15 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></span>
        <h1 className="mt-4 font-display text-2xl font-bold">Deposit received</h1>
        <p className="mt-2 text-sm text-muted-foreground">Thanks — your deposit is confirmed. Your event organizer has been notified.</p>
        {depositId && <p className="mt-3 text-[11px] text-muted-foreground">Reference: {depositId.slice(0, 8)}</p>}
        <Button asChild className="mt-6 rounded-full"><Link to="/">Back to FoodXMobile</Link></Button>
      </div>
    </div>
  );
}

export function PaymentCancel() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
        <span className="grid h-14 w-14 mx-auto place-items-center rounded-full bg-muted text-muted-foreground"><XCircle className="h-7 w-7" /></span>
        <h1 className="mt-4 font-display text-2xl font-bold">Payment canceled</h1>
        <p className="mt-2 text-sm text-muted-foreground">No worries — nothing was charged. You can use the same payment link again whenever you're ready.</p>
        <Button asChild className="mt-6 rounded-full"><Link to="/">Back to FoodXMobile</Link></Button>
      </div>
    </div>
  );
}
