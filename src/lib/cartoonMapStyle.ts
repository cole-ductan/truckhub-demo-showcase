// Repaints a loaded MapLibre style into FoodXMobile's cartoon brand look.
// Works with MapTiler's streets-v2 style — we iterate existing layers and
// reassign paint properties rather than authoring a style.json from scratch.

// Brand colors (kept in sync with src/index.css design tokens).
const C = {
  cream: "#faf6ee",
  creamDeep: "#f1e8d4",
  ink: "#1f160e",
  inkSoft: "#4b3a2a",
  ember: "#ea580c",
  emberDeep: "#b8410a",
  tangerine: "#fb923c",
  mustard: "#f4b740",
  forest: "#2f5d3a",
  sage: "#bcd9b2",
  water: "#a9d6e5",
  waterDeep: "#7bb8cc",
  sand: "#ecd9b0",
};

const matches = (id: string, parts: string[]) =>
  parts.some((p) => id.toLowerCase().includes(p));

export function applyCartoonStyle(map: any) {
  const style = map.getStyle();
  if (!style?.layers) return;

  // Background → warm cream
  try {
    if (map.getLayer("background")) {
      map.setPaintProperty("background", "background-color", C.cream);
    }
  } catch {}

  for (const layer of style.layers) {
    const id: string = layer.id;
    const type: string = layer.type;

    try {
      if (type === "fill") {
        if (matches(id, ["water", "ocean", "lake", "river"])) {
          map.setPaintProperty(id, "fill-color", C.water);
          map.setPaintProperty(id, "fill-outline-color", C.waterDeep);
        } else if (matches(id, ["park", "wood", "forest", "grass", "golf", "vegetation", "scrub"])) {
          map.setPaintProperty(id, "fill-color", C.sage);
        } else if (matches(id, ["sand", "beach"])) {
          map.setPaintProperty(id, "fill-color", C.sand);
        } else if (matches(id, ["landcover", "landuse", "residential", "industrial", "commercial", "retail", "urban"])) {
          map.setPaintProperty(id, "fill-color", C.creamDeep);
        } else if (matches(id, ["building"])) {
          map.setPaintProperty(id, "fill-color", "#e6d4b8");
          map.setPaintProperty(id, "fill-outline-color", C.inkSoft);
        } else {
          // generic land fallback
          map.setPaintProperty(id, "fill-color", C.cream);
        }
      }

      if (type === "line") {
        if (matches(id, ["water", "river", "stream", "waterway"])) {
          map.setPaintProperty(id, "line-color", C.waterDeep);
        } else if (matches(id, ["motorway", "trunk"])) {
          map.setPaintProperty(id, "line-color", C.ember);
          map.setPaintProperty(id, "line-width", [
            "interpolate", ["linear"], ["zoom"],
            8, 2, 12, 5, 16, 10, 20, 22,
          ]);
        } else if (matches(id, ["primary"])) {
          map.setPaintProperty(id, "line-color", C.tangerine);
          map.setPaintProperty(id, "line-width", [
            "interpolate", ["linear"], ["zoom"],
            10, 1.5, 14, 4, 18, 12,
          ]);
        } else if (matches(id, ["secondary", "tertiary"])) {
          map.setPaintProperty(id, "line-color", C.mustard);
          map.setPaintProperty(id, "line-width", [
            "interpolate", ["linear"], ["zoom"],
            11, 1, 14, 3, 18, 9,
          ]);
        } else if (matches(id, ["road", "street", "service", "residential", "minor"])) {
          map.setPaintProperty(id, "line-color", "#ffffff");
          map.setPaintProperty(id, "line-width", [
            "interpolate", ["linear"], ["zoom"],
            12, 0.5, 16, 2, 20, 6,
          ]);
        } else if (matches(id, ["rail", "transit"])) {
          map.setPaintProperty(id, "line-color", C.inkSoft);
        } else if (matches(id, ["boundary", "admin", "border"])) {
          map.setPaintProperty(id, "line-color", C.inkSoft);
          map.setPaintProperty(id, "line-dasharray", [3, 2]);
        } else if (matches(id, ["path", "trail", "footway", "cycle"])) {
          map.setPaintProperty(id, "line-color", C.emberDeep);
          map.setPaintProperty(id, "line-dasharray", [2, 2]);
        }
      }

      if (type === "symbol") {
        // Cartoon labels: dark brown text with cream halo
        try { map.setPaintProperty(id, "text-color", C.ink); } catch {}
        try { map.setPaintProperty(id, "text-halo-color", C.cream); } catch {}
        try { map.setPaintProperty(id, "text-halo-width", 1.6); } catch {}
        try { map.setPaintProperty(id, "text-halo-blur", 0.4); } catch {}
      }
    } catch {
      // layer doesn't support a given property — skip silently
    }
  }
}