import { useEffect } from "react";

type SEOOptions = {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
};

const SITE_NAME = "FoodXMobile";
const normalizeBrand = (value: string) => value
  .replace(new RegExp("TruckHub Green Bay", "g"), SITE_NAME)
  .replace(new RegExp("TruckHub", "g"), SITE_NAME)
  .replace(new RegExp("truckhubgb.com", "g"), "foodxmobile.com");

const upsertMeta = (selector: string, attrs: Record<string, string>) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
    document.head.appendChild(el);
    return el;
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
  return el;
};

export const useSEO = ({ title, description, canonical, image, jsonLd }: SEOOptions) => {
  useEffect(() => {
    const normalizedTitle = title ? normalizeBrand(title) : undefined;
    const normalizedDescription = description ? normalizeBrand(description) : undefined;

    if (normalizedTitle) document.title = normalizedTitle.length > 60 ? normalizedTitle.slice(0, 57) + "…" : normalizedTitle;
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: SITE_NAME });

    if (normalizedDescription) {
      const desc = normalizedDescription.length > 160 ? normalizedDescription.slice(0, 157) + "…" : normalizedDescription;
      upsertMeta('meta[name="description"]', { name: "description", content: desc });
      upsertMeta('meta[property="og:description"]', { property: "og:description", content: desc });
      upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: desc });
    }

    if (normalizedTitle) {
      upsertMeta('meta[property="og:title"]', { property: "og:title", content: normalizedTitle });
      upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: normalizedTitle });
    }

    if (image) {
      upsertMeta('meta[property="og:image"]', { property: "og:image", content: image });
      upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });
    }

    const href = canonical ?? window.location.href;
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = href;

    let script: HTMLScriptElement | null = null;
    if (jsonLd) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = JSON.stringify(jsonLd);
      script.dataset.seoJsonld = "true";
      document.head.appendChild(script);
    }

    return () => {
      if (script && script.parentNode) script.parentNode.removeChild(script);
    };
  }, [title, description, canonical, image, JSON.stringify(jsonLd)]);
};

export default useSEO;
