import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listShelf = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("shelf_items")
      .select(
        "id, column_key, position, note, updated_at, media:media_items(id, type, title, year, cover_url, metadata)",
      )
      .eq("user_id", context.userId)
      .order("column_key", { ascending: true })
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addToShelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        mediaId: z.string().uuid(),
        column: z.enum(["priority", "later", "reading", "done"]).default("later"),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: max } = await context.supabase
      .from("shelf_items")
      .select("position")
      .eq("user_id", context.userId)
      .eq("column_key", data.column)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPos = (max?.position ?? -1) + 1;
    const { error } = await context.supabase.from("shelf_items").upsert(
      {
        user_id: context.userId,
        media_id: data.mediaId,
        column_key: data.column,
        position: nextPos,
      },
      { onConflict: "user_id,media_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const moveShelfItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        column: z.enum(["priority", "later", "reading", "done"]),
        position: z.number().int().min(0),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("shelf_items")
      .update({ column_key: data.column, position: data.position })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeFromShelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("shelf_items")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
