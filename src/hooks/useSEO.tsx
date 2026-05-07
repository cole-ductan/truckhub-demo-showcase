import { useEffect } from "react";

type SEOOptions = {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
};

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
    if (title) document.title = title.length > 60 ? title.slice(0, 57) + "…" : title;

    if (description) {
      const desc = description.length > 160 ? description.slice(0, 157) + "…" : description;
      upsertMeta('meta[name="description"]', { name: "description", content: desc });
      upsertMeta('meta[property="og:description"]', { property: "og:description", content: desc });
      upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: desc });
    }

    if (title) {
      upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
      upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
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