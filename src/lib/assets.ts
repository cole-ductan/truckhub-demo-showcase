import bbq from "@/assets/truck-bbq.jpg";
import burger from "@/assets/truck-burger.jpg";
import tacos from "@/assets/truck-tacos.jpg";
import pizza from "@/assets/truck-pizza.jpg";
import waffles from "@/assets/truck-waffles.jpg";
import chicken from "@/assets/truck-chicken.jpg";
import hero from "@/assets/hero-truck.jpg";
import smokeHero from "@/assets/smoketrail-hero.jpg";
import g1 from "@/assets/gallery-1.jpg";
import g2 from "@/assets/gallery-2.jpg";
import g3 from "@/assets/gallery-3.jpg";
import g4 from "@/assets/gallery-4.jpg";

const map: Record<string, string> = {
  "truck-bbq.jpg": bbq,
  "truck-burger.jpg": burger,
  "truck-tacos.jpg": tacos,
  "truck-pizza.jpg": pizza,
  "truck-waffles.jpg": waffles,
  "truck-chicken.jpg": chicken,
  "hero-truck.jpg": hero,
  "smoketrail-hero.jpg": smokeHero,
  "gallery-1.jpg": g1,
  "gallery-2.jpg": g2,
  "gallery-3.jpg": g3,
  "gallery-4.jpg": g4,
};

/**
 * Resolves an image URL. Supports:
 *   - "asset:filename.jpg" -> bundled asset
 *   - "https://..." or "/..." -> returned as-is
 *   - falsy -> fallback hero image
 */
export function resolveImage(url?: string | null): string {
  if (!url) return hero;
  if (url.startsWith("asset:")) {
    const name = url.slice("asset:".length);
    return map[name] ?? hero;
  }
  return url;
}

export const fallbackHero = hero;