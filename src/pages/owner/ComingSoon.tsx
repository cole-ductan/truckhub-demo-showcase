export default function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        This section is wired into the database and protected by your owner role. Full UI ships in the next pass.
      </p>
      <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
        Owner controls for <span className="font-semibold text-foreground">{title}</span> coming next.
      </div>
    </div>
  );
}