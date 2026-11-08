import { Link, useSearchParams } from "react-router-dom";

export function CatalogLoading() {
  return (
    <div role="status" aria-busy="true" className="mt-8 space-y-3">
      <p className="text-sm text-muted-foreground">Loading synthetic demo catalog</p>
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

export function CatalogError({ message }: { message: string }) {
  const [params, setParams] = useSearchParams();
  return (
    <div role="alert" className="mt-8 rounded-2xl border border-destructive/30 bg-card p-8">
      <h2 className="font-display text-2xl font-semibold">Catalog unavailable</h2>
      <p className="mt-3 max-w-xl text-muted-foreground">{message}</p>
      <button
        type="button"
        className="mt-5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        onClick={() => {
          const next = new URLSearchParams(params);
          next.delete("catalog");
          setParams(next);
        }}
      >
        Show the demo catalog
      </button>
    </div>
  );
}

export function CatalogEmpty({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{body}</p>
      {actionHref && actionLabel ? (
        <Link to={actionHref} className="mt-5 inline-block text-sm font-semibold text-primary hover:underline">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
