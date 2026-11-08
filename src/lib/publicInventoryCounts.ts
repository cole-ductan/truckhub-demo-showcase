import type { PublicInventoryCounts } from "@/lib/publicInventoryCopy";

interface CountQuery extends PromiseLike<{ count: number | null; error: { message?: string } | null }> {
  eq: (column: string, value: boolean) => CountQuery;
}

/**
 * Minimal client shape. The page passes the Supabase client through a cast
 * so the generated query types do not have to match this test double.
 * The offline test records the select and eq calls this function makes.
 */
export type InventoryCountClient = {
  from: (table: string) => {
    select: (columns: string, options: { count: "exact"; head: true }) => CountQuery;
  };
};

const unavailable = (): PublicInventoryCounts => ({
  verifiedPublished: null,
  demoPublished: null,
  unavailable: true,
});

/**
 * Public directory totals. Both queries require is_published = true.
 * Verified is is_demo = false. Demo is is_demo = true.
 * A thrown client, a query error, or a null count becomes unavailable
 * and must not be printed as an estimated total.
 */
export async function loadPublicInventoryCounts(client: InventoryCountClient): Promise<PublicInventoryCounts> {
  try {
    const [verified, demo] = await Promise.all([
      client.from("businesses").select("id", { count: "exact", head: true }).eq("is_published", true).eq("is_demo", false),
      client.from("businesses").select("id", { count: "exact", head: true }).eq("is_published", true).eq("is_demo", true),
    ]);
    if (verified.error || demo.error || verified.count == null || demo.count == null) return unavailable();
    return {
      verifiedPublished: verified.count,
      demoPublished: demo.count,
      unavailable: false,
    };
  } catch {
    return unavailable();
  }
}
