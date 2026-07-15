import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listTags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tags")
      .select("id, slug, label, kind")
      .order("kind", { ascending: true })
      .order("label", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
