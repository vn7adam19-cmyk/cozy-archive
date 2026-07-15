import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMedia, setMediaTags } from "@/lib/media.functions";
import { listTags } from "@/lib/tags.functions";
import { addToShelf } from "@/lib/shelf.functions";
import { pairAcrossMedia } from "@/lib/recommendations.functions";
import { ReviewForm } from "@/components/media/ReviewForm";
import { TagChip } from "@/components/media/TagChip";
import { MediaCard } from "@/components/media/MediaCard";
import { StarRating } from "@/components/media/StarRating";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { ChevronLeft, Plus } from "lucide-react";

const paramsSchema = z.object({
  type: z.enum(["book", "movie", "tv"]),
  id: z.string().uuid(),
});

export const Route = createFileRoute("/_authenticated/media/$type/$id")({
  params: {
    parse: (raw) => paramsSchema.parse(raw),
    stringify: (p) => p,
  },
  head: ({ params }) => ({
    meta: [{ title: `${params.type === "book" ? "Book" : params.type === "movie" ? "Film" : "Show"} — The Cozy Archive` }],
  }),
  component: MediaDetail,
});

function MediaDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getMedia);
  const tagsFn = useServerFn(listTags);
  const setTagsFn = useServerFn(setMediaTags);
  const shelfFn = useServerFn(addToShelf);
  const pairFn = useServerFn(pairAcrossMedia);

  const { data, isLoading } = useQuery({
    queryKey: ["media-detail", id],
    queryFn: () => getFn({ data: { id } }),
  });
  const { data: allTags = [] } = useQuery({ queryKey: ["tags"], queryFn: () => tagsFn() });
  const { data: pairings = [] } = useQuery({
    queryKey: ["pairings", id],
    queryFn: () => pairFn({ data: { sourceId: id, limit: 6 } }),
  });

  const currentTagIds = new Set(data?.tags.map((t) => t.tag.id) ?? []);

  const toggleTag = useMutation({
    mutationFn: (tagId: string) => {
      const next = new Set(currentTagIds);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return setTagsFn({ data: { mediaId: id, tagIds: Array.from(next) } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media-detail", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addShelf = useMutation({
    mutationFn: (col: "priority" | "later") => shelfFn({ data: { mediaId: id, column: col } }),
    onSuccess: () => {
      toast.success("On the shelf.");
      qc.invalidateQueries({ queryKey: ["shelf"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <div className="paper-surface min-h-[70vh] p-10 text-muted-foreground">Loading…</div>;
  }

  const { media, reviews } = data;
  const creator =
    (media.metadata as Record<string, string> | null)?.author ??
    (media.metadata as Record<string, string> | null)?.director ??
    null;
  const vibes = allTags.filter((t) => t.kind === "vibe");
  const genres = allTags.filter((t) => t.kind === "genre");

  return (
    <div className="paper-surface min-h-[calc(100vh-4rem)] pb-24">
      <div className="mx-auto max-w-5xl px-6 pt-10">
        <Link to="/library/screen" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          Back to the shelf
        </Link>

        <div className="mt-8 grid gap-10 md:grid-cols-[280px_1fr]">
          <div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-cozy">
              <div className="aspect-[2/3] w-full bg-muted">
                {media.cover_url ? (
                  <img src={media.cover_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="paper-surface h-full" />
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => addShelf.mutate("priority")}
                className="inline-flex items-center justify-center gap-1 rounded-full border border-accent bg-transparent px-4 py-2 text-sm text-accent transition-all hover:bg-accent/10"
              >
                <Plus className="h-4 w-4" /> Priority shelf
              </button>
              <button
                onClick={() => addShelf.mutate("later")}
                className="inline-flex items-center justify-center gap-1 rounded-full border border-border bg-transparent px-4 py-2 text-sm text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
              >
                <Plus className="h-4 w-4" /> Maybe later
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {media.type === "book" ? "Book" : media.type === "movie" ? "Film" : "Show"}
            </p>
            <h1 className="mt-2 font-display text-4xl leading-tight text-foreground md:text-5xl">
              {media.title}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {[creator, media.year].filter(Boolean).join(" · ")}
            </p>
            {media.overview && (
              <p className="mt-6 max-w-prose text-foreground/85">{media.overview}</p>
            )}

            <div className="mt-8">
              <p className="text-xs uppercase tracking-[0.25em] text-accent">Vibes</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {vibes.map((t) => (
                  <TagChip
                    key={t.id}
                    tag={t}
                    active={currentTagIds.has(t.id)}
                    onClick={() => toggleTag.mutate(t.id)}
                  />
                ))}
              </div>
            </div>
            <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Genres</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {genres.map((t) => (
                  <TagChip
                    key={t.id}
                    tag={t}
                    active={currentTagIds.has(t.id)}
                    onClick={() => toggleTag.mutate(t.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <section className="mt-14">
          <h2 className="font-display text-2xl text-foreground">Your review</h2>
          <div className="mt-4">
            <ReviewForm mediaId={id} />
          </div>
        </section>

        {reviews.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl text-foreground">The archive says</h2>
            <div className="mt-4 flex flex-col gap-4">
              {reviews.map((r) => (
                <article
                  key={r.id}
                  className="rounded-2xl border border-border bg-card p-6 shadow-paper"
                >
                  <div className="flex items-center justify-between">
                    <StarRating value={r.rating} size={16} />
                    {r.consumed_on && (
                      <span className="text-xs text-muted-foreground">
                        Finished {new Date(r.consumed_on).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {r.vibe_quote && (
                    <blockquote className="mt-4 border-l-2 border-accent pl-4 font-display text-xl italic text-foreground">
                      &ldquo;{r.vibe_quote}&rdquo;
                    </blockquote>
                  )}
                  {r.body && <p className="mt-4 whitespace-pre-wrap text-foreground/85">{r.body}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {pairings.length > 0 && (
          <section className="mt-14">
            <p className="text-xs uppercase tracking-[0.3em] text-accent">
              If you loved this, try
            </p>
            <h2 className="mt-1 font-display text-2xl text-foreground">Cross-media pairings</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
              {pairings.map(
                (p: { media: { id: string; type: "book" | "movie" | "tv"; title: string } }) => (
                  <MediaCard key={p.media.id} media={p.media} />
                ),
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
