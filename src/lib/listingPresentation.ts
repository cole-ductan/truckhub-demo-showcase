const FOOD_BUSINESS_PATTERN =
  /\b(food|truck|bbq|barbecue|bakery|baker|beverage|coffee|cafe|café|restaurant|taco|pizza|burger|kitchen|catering|cuisine|grill|seafood|waffle|chicken)\b/i;

export function isClearlyFoodBusiness(fields: {
  cuisine?: string | null;
  categoryName?: string | null;
}): boolean {
  return FOOD_BUSINESS_PATTERN.test(`${fields.cuisine ?? ""} ${fields.categoryName ?? ""}`);
}

/** A nested row is sample when it is marked demo or its parent listing is. */
export function isSampleInventory(
  recordIsDemo?: boolean | null,
  parentIsDemo?: boolean | null,
): boolean {
  return Boolean(recordIsDemo || parentIsDemo);
}

export type ListingCopyInput = {
  name: string;
  is_demo: boolean;
  description?: string | null;
  tagline?: string | null;
  cuisine?: string | null;
  categoryName?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  image?: string | null;
  url?: string | null;
};

export function listingPageCopy(input: ListingCopyInput): {
  title: string;
  description: string;
  jsonLd: Record<string, unknown> | null;
} {
  if (input.is_demo) {
    return {
      title: `Sample demo listing: ${input.name}`,
      description: `Sample demo listing for ${input.name}. Not a confirmed operating business.`,
      jsonLd: null,
    };
  }

  const food = isClearlyFoodBusiness({ cuisine: input.cuisine, categoryName: input.categoryName });
  return {
    title: `${input.name} — FoodXMobile listing`,
    description: input.description?.slice(0, 155) || input.tagline || `${input.name} listing on FoodXMobile.`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": food ? "FoodEstablishment" : "LocalBusiness",
      name: input.name,
      description: input.description || input.tagline || undefined,
      image: input.image || undefined,
      ...(food && input.cuisine ? { servesCuisine: input.cuisine } : {}),
      telephone: input.phone || undefined,
      email: input.email || undefined,
      url: input.url || undefined,
      ...(input.city
        ? { address: { "@type": "PostalAddress", addressLocality: input.city, addressRegion: "WI", addressCountry: "US" } }
        : {}),
      sameAs: [input.website, input.instagram, input.facebook].filter(Boolean),
    },
  };
}
