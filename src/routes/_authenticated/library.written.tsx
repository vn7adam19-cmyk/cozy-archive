import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus } from "lucide-react";
import { listMedia } from "@/lib/media.functions";
import { recommendMedia } from "@/lib/recommendations.functions";
import { MediaCard } from "@/components/media/MediaCard";
import { AddMediaDialog } from "@/components/media/AddMediaDialog";

export const Route = createFileRoute("/_authenticated/library/written")({
  head: () => ({
    meta: [
      { title: "Books — The Cozy Archive" },
      { name: "description", content: "Your reading archive — books kept by vibe, not just genre." },
    ],
  }),
  component: WrittenLibrary,
});

function WrittenLibrary() {
  const [open, setOpen] = useState(false);
  const listFn = useServerFn(listMedia);
  const recFn = useServerFn(recommendMedia);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["media", "book"],
    queryFn: () => listFn({ data: { type: "book" } }),
  });
  const { data: recs = [] } = useQuery({
    queryKey: ["recommendations", "book"],
    queryFn: () => recFn({ data: { type: "book", limit: 6 } }),
  });

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Every book you've read — bookmarked by mood.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-paper transition-all hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add book
        </button>
      </div>

      {recs.length > 0 && (
        <section>
          <p className="text-xs uppercase tracking-[0.3em] text-accent">
            You may love these next
          </p>
          <h2 className="mt-1 font-display text-2xl text-foreground">Recommended for you</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {recs.map(
              (r: { media: { id: string; type: "book" | "movie" | "tv"; title: string } }) => (
                <MediaCard key={r.media.id} media={r.media} />
              ),
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-2xl text-foreground">Books in the archive</h2>
        {isLoading ? (
          <p className="mt-6 text-muted-foreground">Turning the pages…</p>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center">
            <p className="font-display text-xl text-foreground">A blank first page.</p>
            <p className="mt-2 text-muted-foreground">Add the first book to your archive.</p>
            <button
              onClick={() => setOpen(true)}
              className="mt-6 rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground shadow-paper hover:opacity-90"
            >
              Add book
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((m) => (
              <MediaCard key={m.id} media={m} />
            ))}
          </div>
        )}
      </section>

      <AddMediaDialog open={open} onOpenChange={setOpen} defaultType="book" />
    </div>
  );
}
