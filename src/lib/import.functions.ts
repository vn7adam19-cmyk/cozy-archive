import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------- OMDb (films & shows) ----------

const omdbSearchInput = z.object({
  query: z.string().min(1).max(200),
  type: z.enum(["movie", "tv"]),
});

export type OmdbSearchResult = {
  imdbID: string;
  title: string;
  year: string;
  poster: string | null;
  type: "movie" | "tv";
};

export const searchOmdb = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => omdbSearchInput.parse(raw))
  .handler(async ({ data }): Promise<OmdbSearchResult[]> => {
    const key = process.env.OMDB_API_KEY;
    if (!key) throw new Error("OMDb key not configured.");
    const omdbType = data.type === "movie" ? "movie" : "series";
    const url = `https://www.omdbapi.com/?apikey=${key}&s=${encodeURIComponent(data.query)}&type=${omdbType}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OMDb search failed (HTTP ${res.status}).`);
    const json = (await res.json()) as {
      Response: string;
      Search?: Array<{ imdbID: string; Title: string; Year: string; Poster: string; Type: string }>;
      Error?: string;
    };
    if (json.Response !== "True") {
      if (json.Error && /movie not found|no .* found/i.test(json.Error)) return [];
      throw new Error(`OMDb: ${json.Error ?? "unknown error"}`);
    }
    if (!json.Search) return [];
    return json.Search.slice(0, 10).map((r) => ({
      imdbID: r.imdbID,
      title: r.Title,
      year: r.Year,
      poster: r.Poster && r.Poster !== "N/A" ? r.Poster : null,
      type: data.type,
    }));
  });

const omdbDetailInput = z.object({ imdbID: z.string().min(1) });

export type OmdbDetail = {
  imdbID: string;
  title: string;
  year: number | null;
  overview: string | null;
  cover_url: string | null;
  creator: string | null; // Director for movies, or creator/writer for series
  genres: string[];
};

export const getOmdbDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => omdbDetailInput.parse(raw))
  .handler(async ({ data }): Promise<OmdbDetail> => {
    const key = process.env.OMDB_API_KEY;
    if (!key) throw new Error("OMDb key not configured.");
    const url = `https://www.omdbapi.com/?apikey=${key}&i=${encodeURIComponent(data.imdbID)}&plot=short`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("OMDb lookup failed.");
    const j = (await res.json()) as Record<string, string>;
    if (j.Response !== "True") throw new Error(j.Error ?? "Not found.");
    const yearNum = parseInt((j.Year ?? "").slice(0, 4), 10);
    return {
      imdbID: j.imdbID,
      title: j.Title,
      year: Number.isFinite(yearNum) ? yearNum : null,
      overview: j.Plot && j.Plot !== "N/A" ? j.Plot : null,
      cover_url: j.Poster && j.Poster !== "N/A" ? j.Poster : null,
      creator: j.Director && j.Director !== "N/A" ? j.Director : (j.Writer && j.Writer !== "N/A" ? j.Writer : null),
      genres: (j.Genre ?? "")
        .split(",")
        .map((g) => g.trim())
        .filter((g) => g.length > 0 && g !== "N/A"),
    };
  });

// ---------- Google Books ----------

const gbSearchInput = z.object({ query: z.string().min(1).max(200) });

export type GoogleBookResult = {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  overview: string | null;
  cover_url: string | null;
  categories: string[];
};

export const searchGoogleBooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => gbSearchInput.parse(raw))
  .handler(async ({ data }): Promise<GoogleBookResult[]> => {
    const gbKey = process.env.GOOGLE_BOOKS_API_KEY;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(data.query)}&maxResults=10&printType=books${gbKey ? `&key=${gbKey}` : ""}`;
    const res = await fetch(url);
    const json = (await res.json()) as {
      error?: { code?: number; message?: string };
      items?: Array<{
        id: string;
        volumeInfo: {
          title?: string;
          authors?: string[];
          publishedDate?: string;
          description?: string;
          imageLinks?: { thumbnail?: string; smallThumbnail?: string };
          categories?: string[];
        };
      }>;
    };
    if (!res.ok || json.error) {
      throw new Error(`Google Books: ${json.error?.message ?? `HTTP ${res.status}`}`);
    }
    return (json.items ?? []).map((it) => {
      const v = it.volumeInfo;
      const yearNum = v.publishedDate ? parseInt(v.publishedDate.slice(0, 4), 10) : NaN;
      const rawCover = v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail ?? null;
      return {
        id: it.id,
        title: v.title ?? "Untitled",
        authors: v.authors ?? [],
        year: Number.isFinite(yearNum) ? yearNum : null,
        overview: v.description ?? null,
        cover_url: rawCover ? rawCover.replace(/^http:/, "https:") : null,
        categories: v.categories ?? [],
      };
    });
  });

// ---------- Ensure genre tags exist ----------

const ensureInput = z.object({ labels: z.array(z.string().min(1).max(80)).max(20) });

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export const ensureGenreTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ensureInput.parse(raw))
  .handler(async ({ data, context }) => {
    const cleaned = Array.from(
      new Map(
        data.labels
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
          .map((l) => [slugify(l), l]),
      ).entries(),
    ).filter(([slug]) => slug.length > 0);
    if (cleaned.length === 0) return [] as Array<{ id: string; slug: string; label: string; kind: "genre" }>;

    const slugs = cleaned.map(([slug]) => slug);
    const { data: existing, error: exErr } = await context.supabase
      .from("tags")
      .select("id, slug, label, kind")
      .in("slug", slugs);
    if (exErr) throw new Error(exErr.message);

    const bySlug = new Map((existing ?? []).map((t) => [t.slug, t]));
    const toInsert = cleaned
      .filter(([slug]) => !bySlug.has(slug))
      .map(([slug, label]) => ({ slug, label, kind: "genre" as const }));

    if (toInsert.length) {
      const { data: inserted, error: inErr } = await context.supabase
        .from("tags")
        .insert(toInsert)
        .select("id, slug, label, kind");
      if (inErr) throw new Error(inErr.message);
      for (const t of inserted ?? []) bySlug.set(t.slug, t);
    }

    return slugs
      .map((s) => bySlug.get(s))
      .filter((t): t is { id: string; slug: string; label: string; kind: "genre" } => Boolean(t));
  });
