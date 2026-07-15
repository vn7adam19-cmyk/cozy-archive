import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const recommendMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ type: z.enum(["book", "movie", "tv"]), limit: z.number().int().min(1).max(50).default(12) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("recommend_media", {
      _user_id: context.userId,
      _type: data.type,
      _limit: data.limit,
    });
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return [];

    const ids = rows.map((r: { media_id: string }) => r.media_id);
    const { data: media } = await context.supabase
      .from("media_items")
      .select("id, type, title, year, cover_url, metadata")
      .in("id", ids);

    const byId = new Map(media?.map((m) => [m.id, m]) ?? []);
    type Row = { score: number; shared_vibes: number; media: NonNullable<ReturnType<typeof byId.get>> };
    const results: Row[] = [];
    for (const r of rows as { media_id: string; score: number; shared_vibes: number }[]) {
      const m = byId.get(r.media_id);
      if (m) results.push({ score: r.score, shared_vibes: r.shared_vibes, media: m });
    }
    return results;
  });

export const pairAcrossMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ sourceId: z.string().uuid(), limit: z.number().int().min(1).max(20).default(8) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("pair_cross_media", {
      _source_id: data.sourceId,
      _limit: data.limit,
    });
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return [];

    const ids = rows.map((r: { media_id: string }) => r.media_id);
    const { data: media } = await context.supabase
      .from("media_items")
      .select("id, type, title, year, cover_url, metadata")
      .in("id", ids);
    const byId = new Map(media?.map((m) => [m.id, m]) ?? []);
    type Row = { score: number; shared_vibes: number; media: NonNullable<ReturnType<typeof byId.get>> };
    const results: Row[] = [];
    for (const r of rows as { media_id: string; score: number; shared_vibes: number }[]) {
      const m = byId.get(r.media_id);
      if (m) results.push({ score: r.score, shared_vibes: r.shared_vibes, media: m });
    }
    return results;
  });

export const listPairableSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // High-rated (>=4) reviews are the seed for pairings.
    const { data, error } = await context.supabase
      .from("reviews")
      .select("rating, media:media_items(id, type, title, year, cover_url)")
      .eq("user_id", context.userId)
      .gte("rating", 4)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).filter((r) => r.media);
  });
