import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function BusinessImageUpload({
  businessId,
  kind,
  value,
  onChange,
  allowUrlFallback = true,
}: {
  businessId: string;
  kind: "hero" | "logo";
  value: string;
  onChange: (value: string) => void;
  allowUrlFallback?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const trimmed = value.trim();
  const isAsset = trimmed.startsWith("asset:");
  const isHttps = /^https:\/\//i.test(trimmed);

  async function upload(file?: File) {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) return toast.error("Use a JPEG, PNG, WebP, or GIF image.");
    if (file.size > MAX_BYTES) return toast.error("Image must be 6 MB or smaller.");

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${businessId}/${kind}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("business-assets").upload(path, file, { upsert: false, contentType: file.type });
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }

    const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
    const previous = storagePath(trimmed);
    onChange(data.publicUrl);
    setPreviewFailed(false);
    setUploading(false);
    toast.success(`${kind === "hero" ? "Hero image" : "Logo"} uploaded. Save changes to publish it.`);

    if (previous) await supabase.storage.from("business-assets").remove([previous]);
  }

  function storagePath(url: string): string | null {
    const marker = "/storage/v1/object/public/business-assets/";
    const index = url.indexOf(marker);
    return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
  }

  function clear() {
    const previous = storagePath(trimmed);
    onChange("");
    setPreviewFailed(false);
    if (previous) supabase.storage.from("business-assets").remove([previous]);
  }

  return (
    <div className="space-y-3">
      <input ref={inputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => upload(e.target.files?.[0])} />
      <div
        className={`rounded-xl border border-dashed p-4 transition ${dragging ? "border-primary bg-primary/5" : "border-border bg-muted/20"}`}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files?.[0]); }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-background"><ImagePlus className="h-5 w-5 text-muted-foreground" /></span>
            <div><p className="text-sm font-medium">Drag and drop an image</p><p className="text-xs text-muted-foreground">JPEG, PNG, WebP, or GIF · max 6 MB</p></div>
          </div>
          <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
            {uploading ? "Uploading…" : "Choose file"}
          </Button>
        </div>
      </div>

      {allowUrlFallback && (
        <details>
          <summary className="cursor-pointer text-xs text-muted-foreground">Advanced: use an existing image URL</summary>
          <Input className="mt-2" value={value} onChange={(e) => { setPreviewFailed(false); onChange(e.target.value); }} placeholder="https://… or asset:logo.png" />
        </details>
      )}

      {trimmed && (
        <div className="flex flex-wrap items-start gap-3 rounded-lg border border-border p-3">
          {isAsset ? (
            <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-mono uppercase">bundled asset</span>
          ) : isHttps && !previewFailed ? (
            <img src={trimmed} alt="" className="h-20 w-28 rounded-md border border-border object-cover" onError={() => setPreviewFailed(true)} />
          ) : (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">{previewFailed ? "Image failed to load." : "Use a direct HTTPS image URL."}</div>
          )}
          <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={clear}><Trash2 className="mr-1 h-3.5 w-3.5" />Clear</Button>
        </div>
      )}
    </div>
  );
}
