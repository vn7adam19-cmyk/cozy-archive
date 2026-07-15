import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const upsertInput = z.object({
  mediaId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(6000).nullable().optional(),
  vibeQuote: z.string().max(1000).nullable().optional(),
  consumedOn: z.string().nullable().optional(), // ISO date
});

export const upsertReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => upsertInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("reviews").upsert(
      {
        user_id: context.userId,
        media_id: data.mediaId,
        rating: data.rating,
        body: data.body ?? null,
        vibe_quote: data.vibeQuote ?? null,
        consumed_on: data.consumedOn ?? null,
      },
      { onConflict: "user_id,media_id" },
    );
    if (error) throw new Error(error.message);

    // Rebuild the user's vibe profile whenever a review lands.
    await context.supabase.rpc("recompute_user_tag_preferences", { _user_id: context.userId });
    return { ok: true };
  });

export const listMyReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("reviews")
      .select(
        "id, rating, body, vibe_quote, consumed_on, created_at, media:media_items(id, type, title, year, cover_url)",
      )
      .eq("user_id", context.userId)
      .order("consumed_on", { ascending: false, nullsFirst: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ mediaId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("reviews")
      .select("id, rating, body, vibe_quote, consumed_on")
      .eq("user_id", context.userId)
      .eq("media_id", data.mediaId)
      .maybeSingle();
    return row;
  });
