import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { listPairableSources, pairAcrossMedia } from "@/lib/recommendations.functions";
import { MediaCard } from "@/components/media/MediaCard";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pairings")({
  head: () => ({
    meta: [
      { title: "Cross-Media Pairings — The Cozy Archive" },
      { name: "description", content: "If you loved this book, watch this film. Vibe-matched cross-media pairings." },
    ],
  }),
  component: PairingsPage,
});

function PairingsPage() {
  const sourcesFn = useServerFn(listPairableSources);
  const pairFn = useServerFn(pairAcrossMedia);

  const { data: sources = [] } = useQuery({
    queryKey: ["pairable-sources"],
    queryFn: () => sourcesFn(),
  });

  const [sourceId, setSourceId] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceId && sources.length > 0) setSourceId(sources[0].media!.id);
  }, [sources, sourceId]);

  const { data: pairings = [], isFetching } = useQuery({
    queryKey: ["pairings-page", sourceId],
    queryFn: () => pairFn({ data: { sourceId: sourceId!, limit: 12 } }),
    enabled: !!sourceId,
  });

  const selected = sources.find((s) => s.media?.id === sourceId)?.media;

  return (
    <div className="paper-surface min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Cross-media</p>
        <h1 className="mt-2 font-display text-4xl text-foreground">Vibe pairings</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Pick something you loved — we'll find the film, show, or book on the other side of the same feeling.
        </p>

        {sources.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center">
            <p className="font-display text-xl text-foreground">Nothing to pair yet.</p>
            <p className="mt-2 text-muted-foreground">
              Rate something 4 or 5 stars, tag it with a couple of vibes, and pairings will appear here.
            </p>
            <Link
              to="/library/screen"
              className="mt-6 inline-block rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground shadow-paper hover:opacity-90"
            >
              Go to the library
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap gap-2">
              {sources.map((s) =>
                s.media ? (
                  <button
                    key={s.media.id}
                    onClick={() => setSourceId(s.media!.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                      sourceId === s.media.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.media.title}
                  </button>
                ) : null,
              )}
            </div>

            {selected && (
              <div className="mt-10 flex items-center gap-4">
                <div className="w-40">
                  <MediaCard media={selected} />
                </div>
                <ArrowRight className="h-6 w-6 flex-shrink-0 text-accent" />
                <p className="font-display text-lg text-foreground">
                  ...shares its vibe with
                </p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {isFetching && pairings.length === 0 ? (
                <p className="text-muted-foreground">Cross-referencing the shelves…</p>
              ) : pairings.length === 0 ? (
                <p className="col-span-full text-muted-foreground">
                  No pairings yet — add more tags to this one, or rate more media.
                </p>
              ) : (
                pairings.map(
                  (p: { media: { id: string; type: "book" | "movie" | "tv"; title: string } }) => (
                    <MediaCard key={p.media.id} media={p.media} />
                  ),
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
