import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const listInput = z.object({
  type: z.enum(["book", "movie", "tv"]).optional(),
});

export const listMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => listInput.parse(raw))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("media_items")
      .select("id, type, title, year, cover_url, overview, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.type) query = query.eq("type", data.type);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: media, error } = await context.supabase
      .from("media_items")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!media) throw new Error("Not found");

    const { data: tags } = await context.supabase
      .from("media_tags")
      .select("weight, tag:tags(id, slug, label, kind)")
      .eq("media_id", data.id);

    const { data: reviews } = await context.supabase
      .from("reviews")
      .select("id, user_id, rating, body, vibe_quote, consumed_on, created_at")
      .eq("media_id", data.id)
      .order("created_at", { ascending: false });

    return { media, tags: tags ?? [], reviews: reviews ?? [] };
  });

const createInput = z.object({
  type: z.enum(["book", "movie", "tv"]),
  title: z.string().min(1).max(300),
  year: z.number().int().min(0).max(3000).nullable().optional(),
  overview: z.string().max(4000).nullable().optional(),
  cover_url: z.string().url().nullable().optional(),
  creator: z.string().max(300).nullable().optional(), // author, director, etc.
  tagIds: z.array(z.string().uuid()).default([]),
});

export const createMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => createInput.parse(raw))
  .handler(async ({ data, context }) => {
    const metadata: Record<string, string> = {};
    if (data.creator) {
      metadata[data.type === "book" ? "author" : "director"] = data.creator;
    }
    const { data: inserted, error } = await context.supabase
      .from("media_items")
      .insert({
        type: data.type,
        title: data.title,
        year: data.year ?? null,
        overview: data.overview ?? null,
        cover_url: data.cover_url ?? null,
        metadata,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.tagIds.length) {
      const rows = data.tagIds.map((tag_id) => ({ media_id: inserted.id, tag_id, weight: 1 }));
      const { error: tErr } = await context.supabase.from("media_tags").insert(rows);
      if (tErr) throw new Error(tErr.message);
    }
    return { id: inserted.id };
  });

export const setMediaTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ mediaId: z.string().uuid(), tagIds: z.array(z.string().uuid()) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await context.supabase.from("media_tags").delete().eq("media_id", data.mediaId);
    if (data.tagIds.length) {
      const rows = data.tagIds.map((tag_id) => ({ media_id: data.mediaId, tag_id, weight: 1 }));
      const { error } = await context.supabase.from("media_tags").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
