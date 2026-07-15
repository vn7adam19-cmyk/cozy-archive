type Tag = { id: string; slug: string; label: string; kind: "vibe" | "genre" };

export function TagChip({
  tag,
  active,
  onClick,
}: {
  tag: Tag;
  active?: boolean;
  onClick?: () => void;
}) {
  const vibe = tag.kind === "vibe";
  const base =
    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-all";
  const activeCls = vibe
    ? "border-accent bg-accent text-accent-foreground"
    : "border-primary bg-primary text-primary-foreground";
  const idleCls = vibe
    ? "border-accent/40 bg-transparent text-accent hover:bg-accent/10"
    : "border-border bg-transparent text-muted-foreground hover:text-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${active ? activeCls : idleCls}`}
      aria-pressed={active}
    >
      {vibe && <span aria-hidden>·</span>}
      {tag.label}
    </button>
  );
}
