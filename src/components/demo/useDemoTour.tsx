import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { TOUR_STEPS } from "./tourSteps";
import { useAuth } from "@/hooks/useAuth";

type DemoTourCtx = {
  active: boolean;
  stepIndex: number;
  demoMode: boolean;
  canShow: boolean;
  start: () => void;
  exit: () => void;
  next: () => void;
  prev: () => void;
  goTo: (i: number) => void;
  restart: () => void;
  toggleDemoMode: () => void;
};

const Ctx = createContext<DemoTourCtx | undefined>(undefined);

const DEMO_KEY = "truckhub.demoMode";

export function DemoTourProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [demoMode, setDemoMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DEMO_KEY) === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("demo") === "1") {
      localStorage.setItem(DEMO_KEY, "1");
      setDemoMode(true);
    }
  }, []);

  // Only surface the demo tour when explicitly enabled via ?demo=1 or Demo Tools.
  // Admins do NOT see it by default during normal admin use.
  void isAdmin; // intentionally unused; kept for future per-role gates
  const canShow = demoMode;

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);
  const exit = useCallback(() => setActive(false), []);
  const next = useCallback(
    () => setStepIndex((i) => Math.min(TOUR_STEPS.length - 1, i + 1)),
    [],
  );
  const prev = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);
  const goTo = useCallback((i: number) => setStepIndex(Math.max(0, Math.min(TOUR_STEPS.length - 1, i))), []);
  const restart = useCallback(() => setStepIndex(0), []);
  const toggleDemoMode = useCallback(() => {
    setDemoMode((v) => {
      const nv = !v;
      if (nv) localStorage.setItem(DEMO_KEY, "1");
      else localStorage.removeItem(DEMO_KEY);
      return nv;
    });
  }, []);

  return (
    <Ctx.Provider value={{ active, stepIndex, demoMode, canShow, start, exit, next, prev, goTo, restart, toggleDemoMode }}>
      {children}
    </Ctx.Provider>
  );
}

export function useDemoTour() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDemoTour must be used within DemoTourProvider");
  return ctx;
}