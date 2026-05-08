import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";
import { useDemoTour } from "./useDemoTour";

export function DemoLauncher() {
  const { canShow, active, start } = useDemoTour();
  if (!canShow || active) return null;
  return (
    <button
      onClick={start}
      className="fixed bottom-5 right-5 z-[998] inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105"
      aria-label="Start demo tour"
    >
      <Compass className="h-4 w-4" />
      Start Demo Tour
    </button>
  );
}