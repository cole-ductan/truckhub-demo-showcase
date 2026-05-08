import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft, ArrowRight, RotateCcw, Compass } from "lucide-react";
import { TOUR_STEPS } from "./tourSteps";
import { useDemoTour } from "./useDemoTour";

type Rect = { top: number; left: number; width: number; height: number };

export function GuidedTour() {
  const { active, stepIndex, next, prev, exit, restart, goTo } = useDemoTour();
  const navigate = useNavigate();
  const location = useLocation();
  const [rect, setRect] = useState<Rect | null>(null);

  const step = active ? TOUR_STEPS[stepIndex] : null;

  // Navigate to step's route when needed
  useEffect(() => {
    if (!step?.route) return;
    if (location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [step?.route, step?.id, location.pathname, navigate]);

  // Locate target element
  const updateRect = useCallback(() => {
    if (!step?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [step?.target, step?.id]);

  useLayoutEffect(() => {
    if (!active) return;
    // Wait for route to mount
    const t = setTimeout(updateRect, 350);
    return () => clearTimeout(t);
  }, [active, stepIndex, location.pathname, updateRect]);

  useEffect(() => {
    if (!active) return;
    const handler = () => updateRect();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [active, updateRect]);

  if (!active || !step) return null;

  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const isFirst = stepIndex === 0;

  // Compute popover position
  const padding = 8;
  let popStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 1000,
    maxWidth: 360,
  };
  if (rect && step.position && step.position !== "center") {
    const pos = step.position;
    if (pos === "bottom") {
      popStyle.top = rect.top + rect.height + padding;
      popStyle.left = Math.max(16, Math.min(window.innerWidth - 376, rect.left));
    } else if (pos === "top") {
      popStyle.top = Math.max(16, rect.top - padding - 200);
      popStyle.left = Math.max(16, Math.min(window.innerWidth - 376, rect.left));
    } else if (pos === "right") {
      popStyle.top = Math.max(16, rect.top);
      popStyle.left = Math.min(window.innerWidth - 376, rect.left + rect.width + padding);
    } else if (pos === "left") {
      popStyle.top = Math.max(16, rect.top);
      popStyle.left = Math.max(16, rect.left - padding - 360);
    }
  } else {
    popStyle.top = "50%";
    popStyle.left = "50%";
    popStyle.transform = "translate(-50%, -50%)";
  }

  return (
    <>
      {/* Dim overlay with cutout via box-shadow trick */}
      <div
        className="pointer-events-none fixed inset-0 z-[999]"
        style={{
          background: rect ? "transparent" : "rgba(0,0,0,0.45)",
        }}
      >
        {rect && (
          <div
            className="absolute rounded-lg ring-2 ring-primary transition-all"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
            }}
          />
        )}
      </div>

      {/* Popover card */}
      <div
        style={popStyle}
        className="rounded-xl border border-border bg-background p-4 shadow-2xl"
        role="dialog"
        aria-label={step.title}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Compass className="h-3.5 w-3.5" />
            Demo Tour
          </div>
          <button onClick={exit} className="text-muted-foreground hover:text-foreground" aria-label="Exit tour">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="text-base font-bold text-foreground">{step.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>

        <div className="mt-3 flex items-center gap-1.5">
          {TOUR_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Step {stepIndex + 1} of {TOUR_STEPS.length}
          </span>
          <div className="flex items-center gap-2">
            {isLast ? (
              <>
                <Button variant="ghost" size="sm" onClick={restart}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restart
                </Button>
                <Button size="sm" onClick={() => { exit(); navigate("/owner"); }}>
                  Owner Dashboard
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={prev} disabled={isFirst}>
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
                </Button>
                <Button size="sm" onClick={next}>
                  Next <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}