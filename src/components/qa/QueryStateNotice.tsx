type QueryStateNoticeProps = {
  kind: "error" | "empty";
  title: string;
  message: string;
};

/** Error and empty are different states. Callers should not pass a failed query as empty. */
export function QueryStateNotice({ kind, title, message }: QueryStateNoticeProps) {
  if (kind === "error") {
    return (
      <div
        role="alert"
        data-query-state="error"
        className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm"
      >
        <p className="font-semibold">{title} failed to load</p>
        <p className="mt-1 text-muted-foreground">{message}</p>
      </div>
    );
  }

  return (
    <div data-query-state="empty" className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}
