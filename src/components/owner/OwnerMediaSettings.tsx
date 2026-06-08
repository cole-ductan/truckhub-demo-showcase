import { useEffect, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BusinessImageUpload } from "@/components/business/BusinessImageUpload";
import { toast } from "sonner";

export function OwnerMediaSettings({
  business,
}: {
  business: { id: string; hero_image_url?: string | null; logo_url?: string | null };
}) {
  const [hero, setHero] = useState(business.hero_image_url ?? "");
  const [logo, setLogo] = useState(business.logo_url ?? "");

  useEffect(() => {
    setHero(business.hero_image_url ?? "");
    setLogo(business.logo_url ?? "");
  }, [business.id, business.hero_image_url, business.logo_url]);

  async function save(field: "hero_image_url" | "logo_url", value: string) {
    if (field === "hero_image_url") setHero(value);
    else setLogo(value);

    const { error } = await (supabase as any).from("businesses").update({ [field]: value || null }).eq("id", business.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(field === "hero_image_url" ? "Hero image saved" : "Logo saved");
  }

  return (
    <section id="media" className="scroll-mt-20 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground/70"><ImageIcon className="h-4 w-4" /></span>
        <div>
          <h2 className="font-display text-lg font-semibold">Truck page media</h2>
          <p className="text-xs text-muted-foreground">Upload your logo and hero image. URL entry remains available as an advanced fallback.</p>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hero image</p>
          <BusinessImageUpload businessId={business.id} kind="hero" value={hero} onChange={(value) => save("hero_image_url", value)} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logo</p>
          <BusinessImageUpload businessId={business.id} kind="logo" value={logo} onChange={(value) => save("logo_url", value)} />
        </div>
      </div>
    </section>
  );
}
