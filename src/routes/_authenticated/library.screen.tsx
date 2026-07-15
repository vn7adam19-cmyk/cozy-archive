import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus } from "lucide-react";
import { listMedia } from "@/lib/media.functions";
import { recommendMedia } from "@/lib/recommendations.functions";
import { MediaCard } from "@/components/media/MediaCard";
import { AddMediaDialog } from "@/components/media/AddMediaDialog";

export const Route = createFileRoute("/_authenticated/library/screen")({
  head: () => ({
    meta: [
      { title: "Films & Shows — The Cozy Archive" },
      { name: "description", content: "Your screen archive — films and shows kept by vibe." },
    ],
  }),
  component: ScreenLibrary,
});

function ScreenLibrary() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"movie" | "tv">("movie");
  const listFn = useServerFn(listMedia);
  const recFn = useServerFn(recommendMedia);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["media", tab],
    queryFn: () => listFn({ data: { type: tab } }),
  });

  const { data: recs = [] } = useQuery({
    queryKey: ["recommendations", tab],
    queryFn: () => recFn({ data: { type: tab, limit: 6 } }),
  });

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          {(["movie", "tv"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm transition-all ${
                tab === t
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "movie" ? "Films" : "Shows"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-paper transition-all hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add {tab === "movie" ? "film" : "show"}
        </button>
      </div>

      {recs.length > 0 && (
        <section>
          <p className="text-xs uppercase tracking-[0.3em] text-accent">
            Because you loved something with this vibe
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
        <h2 className="font-display text-2xl text-foreground">
          {tab === "movie" ? "Films" : "Shows"} in the archive
        </h2>
        {isLoading ? (
          <p className="mt-6 text-muted-foreground">Turning the pages…</p>
        ) : items.length === 0 ? (
          <EmptyState onAdd={() => setOpen(true)} label={tab === "movie" ? "film" : "show"} />
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((m) => (
              <MediaCard key={m.id} media={m} />
            ))}
          </div>
        )}
      </section>

      <AddMediaDialog open={open} onOpenChange={setOpen} defaultType={tab} />
    </div>
  );
}

function EmptyState({ onAdd, label }: { onAdd: () => void; label: string }) {
  return (
    <div className="mt-6 rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center">
      <p className="font-display text-xl text-foreground">Nothing here yet.</p>
      <p className="mt-2 text-muted-foreground">Add your first {label} and start the archive.</p>
      <button
        onClick={onAdd}
        className="mt-6 rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground shadow-paper hover:opacity-90"
      >
        Add {label}
      </button>
    </div>
  );
}
