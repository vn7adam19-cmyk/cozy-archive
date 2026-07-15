import { Link } from "@tanstack/react-router";
import { BookOpen, Clapperboard, Tv } from "lucide-react";

type MediaType = "book" | "movie" | "tv";

const ICONS = { book: BookOpen, movie: Clapperboard, tv: Tv } as const;
const LABELS = { book: "Book", movie: "Film", tv: "Show" } as const;

export interface MediaCardMedia {
  id: string;
  type: MediaType;
  title: string;
  year?: number | null;
  cover_url?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}

export function MediaCard({ media, footer }: { media: MediaCardMedia; footer?: React.ReactNode }) {
  const Icon = ICONS[media.type];
  const creator =
    (media.metadata?.["author"] as string | undefined) ??
    (media.metadata?.["director"] as string | undefined) ??
    null;

  return (
    <Link
      to="/media/$type/$id"
      params={{ type: media.type, id: media.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-paper transition-all hover:-translate-y-0.5 hover:shadow-cozy"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        {media.cover_url ? (
          <img
            src={media.cover_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="paper-surface flex h-full items-center justify-center">
            <Icon className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
          <Icon className="h-3 w-3" />
          {LABELS[media.type]}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-display text-lg leading-tight text-foreground line-clamp-2">
          {media.title}
        </h3>
        <p className="text-xs text-muted-foreground">
          {[creator, media.year].filter(Boolean).join(" · ")}
        </p>
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </Link>
  );
}
