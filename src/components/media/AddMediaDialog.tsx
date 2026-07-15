import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { X, Search, Loader2 } from "lucide-react";
import { createMedia } from "@/lib/media.functions";
import { listTags } from "@/lib/tags.functions";
import {
  searchOmdb,
  getOmdbDetail,
  searchGoogleBooks,
  ensureGenreTags,
  type OmdbSearchResult,
  type GoogleBookResult,
} from "@/lib/import.functions";
import { TagChip } from "./TagChip";

type Mode = "search" | "manual";

export function AddMediaDialog({
  open,
  onOpenChange,
  defaultType,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultType: "book" | "movie" | "tv";
}) {
  const qc = useQueryClient();
  const createFn = useServerFn(createMedia);
  const tagsFn = useServerFn(listTags);
  const omdbSearchFn = useServerFn(searchOmdb);
  const omdbDetailFn = useServerFn(getOmdbDetail);
  const gbSearchFn = useServerFn(searchGoogleBooks);
  const ensureTagsFn = useServerFn(ensureGenreTags);

  const { data: tags = [], refetch: refetchTags } = useQuery({
    queryKey: ["tags"],
    queryFn: () => tagsFn(),
  });

  const [mode, setMode] = useState<Mode>("search");
  const [type, setType] = useState(defaultType);
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [year, setYear] = useState("");
  const [overview, setOverview] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [screenResults, setScreenResults] = useState<OmdbSearchResult[]>([]);
  const [bookResults, setBookResults] = useState<GoogleBookResult[]>([]);

  const reset = () => {
    setTitle("");
    setCreator("");
    setYear("");
    setOverview("");
    setCoverUrl("");
    setSelected(new Set());
    setSearchQ("");
    setScreenResults([]);
    setBookResults([]);
    setMode("search");
  };

  const mutation = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          type,
          title,
          creator: creator || null,
          year: year ? Number(year) : null,
          overview: overview || null,
          cover_url: coverUrl || null,
          tagIds: Array.from(selected),
        },
      }),
    onSuccess: () => {
      toast.success("Added to the archive.");
      qc.invalidateQueries({ queryKey: ["media"] });
      onOpenChange(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      if (type === "book") {
        const rows = await gbSearchFn({ data: { query: searchQ } });
        setBookResults(rows);
        setScreenResults([]);
      } else {
        const rows = await omdbSearchFn({ data: { query: searchQ, type } });
        setScreenResults(rows);
        setBookResults([]);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const applyGenres = async (labels: string[]) => {
    if (labels.length === 0) return;
    try {
      const rows = await ensureTagsFn({ data: { labels } });
      await refetchTags();
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of rows) next.add(r.id);
        return next;
      });
    } catch (e) {
      toast.error("Couldn't attach genre tags: " + (e as Error).message);
    }
  };

  const pickScreen = async (r: OmdbSearchResult) => {
    setImporting(true);
    try {
      const d = await omdbDetailFn({ data: { imdbID: r.imdbID } });
      setTitle(d.title);
      setCreator(d.creator ?? "");
      setYear(d.year ? String(d.year) : "");
      setOverview(d.overview ?? "");
      setCoverUrl(d.cover_url ?? "");
      await applyGenres(d.genres);
      setMode("manual");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const pickBook = async (b: GoogleBookResult) => {
    setImporting(true);
    try {
      setTitle(b.title);
      setCreator(b.authors.join(", "));
      setYear(b.year ? String(b.year) : "");
      setOverview(b.overview ?? "");
      setCoverUrl(b.cover_url ?? "");
      // Flatten Google's slash-separated categories: "Fiction / Fantasy" -> ["Fiction","Fantasy"]
      const flat = b.categories.flatMap((c) => c.split("/").map((s) => s.trim())).filter(Boolean);
      await applyGenres(flat);
      setMode("manual");
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  const vibes = tags.filter((t) => t.kind === "vibe");
  const genres = tags.filter((t) => t.kind === "genre");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card p-8 shadow-cozy">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Add to the archive
            </p>
            <h2 className="mt-1 font-display text-2xl text-foreground">Something new</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              reset();
            }}
            className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 flex gap-2">
          {(["book", "movie", "tv"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setScreenResults([]);
                setBookResults([]);
              }}
              className={`rounded-full border px-4 py-1.5 text-sm transition-all ${
                type === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "book" ? "Book" : t === "movie" ? "Film" : "Show"}
            </button>
          ))}
        </div>

        <div className="mb-5 inline-flex rounded-full border border-border p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("search")}
            className={`rounded-full px-3 py-1 transition-all ${
              mode === "search" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            }`}
          >
            Search & import
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`rounded-full px-3 py-1 transition-all ${
              mode === "manual" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            }`}
          >
            Enter manually
          </button>
        </div>

        {mode === "search" ? (
          <div className="flex flex-col gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runSearch();
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder={
                    type === "book"
                      ? "Search Google Books…"
                      : type === "movie"
                        ? "Search films on OMDb…"
                        : "Search shows on OMDb…"
                  }
                  className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                type="submit"
                disabled={searching || !searchQ.trim()}
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-paper transition-all hover:opacity-90 disabled:opacity-60"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </button>
            </form>

            {importing && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Pulling details…
              </p>
            )}

            {type !== "book" && screenResults.length > 0 && (
              <ul className="flex flex-col gap-2">
                {screenResults.map((r) => (
                  <li key={r.imdbID}>
                    <button
                      type="button"
                      onClick={() => pickScreen(r)}
                      disabled={importing}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-2 text-left transition-all hover:border-primary disabled:opacity-60"
                    >
                      {r.poster ? (
                        <img src={r.poster} alt="" className="h-16 w-11 rounded object-cover" />
                      ) : (
                        <div className="h-16 w-11 rounded bg-secondary" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.year}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {type === "book" && bookResults.length > 0 && (
              <ul className="flex flex-col gap-2">
                {bookResults.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => pickBook(b)}
                      disabled={importing}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-2 text-left transition-all hover:border-primary disabled:opacity-60"
                    >
                      {b.cover_url ? (
                        <img src={b.cover_url} alt="" className="h-16 w-11 rounded object-cover" />
                      ) : (
                        <div className="h-16 w-11 rounded bg-secondary" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{b.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {b.authors.join(", ")}
                          {b.year ? ` · ${b.year}` : ""}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!searching &&
              !importing &&
              searchQ &&
              screenResults.length === 0 &&
              bookResults.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Hit search — nothing to see yet.
                </p>
              )}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return toast.error("Give it a title.");
              mutation.mutate();
            }}
            className="flex flex-col gap-4"
          >
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">
                  {type === "book" ? "Author" : "Director / creator"}
                </span>
                <input
                  value={creator}
                  onChange={(e) => setCreator(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Year</span>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Cover image URL (optional)</span>
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://…"
                className="rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Overview</span>
              <textarea
                value={overview}
                onChange={(e) => setOverview(e.target.value)}
                rows={3}
                className="rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Vibes</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {vibes.map((t) => (
                  <TagChip
                    key={t.id}
                    tag={t}
                    active={selected.has(t.id)}
                    onClick={() =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(t.id)) next.delete(t.id);
                        else next.add(t.id);
                        return next;
                      })
                    }
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Genres</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {genres.map((t) => (
                  <TagChip
                    key={t.id}
                    tag={t}
                    active={selected.has(t.id)}
                    onClick={() =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(t.id)) next.delete(t.id);
                        else next.add(t.id);
                        return next;
                      })
                    }
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="mt-4 self-start rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-paper transition-all hover:opacity-90 disabled:opacity-60"
            >
              {mutation.isPending ? "Adding…" : "Add to archive"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
