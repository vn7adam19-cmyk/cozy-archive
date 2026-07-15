import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getMyReview, upsertReview } from "@/lib/reviews.functions";
import { StarRating } from "./StarRating";

export function ReviewForm({ mediaId }: { mediaId: string }) {
  const qc = useQueryClient();
  const fetchReview = useServerFn(getMyReview);
  const save = useServerFn(upsertReview);

  const { data: existing } = useQuery({
    queryKey: ["review", mediaId],
    queryFn: () => fetchReview({ data: { mediaId } }),
  });

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [vibeQuote, setVibeQuote] = useState("");
  const [consumedOn, setConsumedOn] = useState("");

  useEffect(() => {
    if (existing) {
      setRating(existing.rating ?? 0);
      setBody(existing.body ?? "");
      setVibeQuote(existing.vibe_quote ?? "");
      setConsumedOn(existing.consumed_on ?? "");
    }
  }, [existing]);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          mediaId,
          rating,
          body: body || null,
          vibeQuote: vibeQuote || null,
          consumedOn: consumedOn || null,
        },
      }),
    onSuccess: () => {
      toast.success("Kept.");
      qc.invalidateQueries({ queryKey: ["review", mediaId] });
      qc.invalidateQueries({ queryKey: ["my-reviews"] });
      qc.invalidateQueries({ queryKey: ["recommendations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (rating < 1) {
          toast.error("Add a rating first.");
          return;
        }
        mutation.mutate();
      }}
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-paper"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Your rating
        </p>
        <div className="mt-2">
          <StarRating value={rating} onChange={setRating} />
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Vibe quote — the sentence that stayed with you
        </span>
        <textarea
          value={vibeQuote}
          onChange={(e) => setVibeQuote(e.target.value)}
          rows={2}
          placeholder="A single line, an internal monologue, a line of dialogue…"
          className="rounded-md border border-input bg-background px-3 py-2 font-display text-lg italic text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Notes
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="What did it feel like? Where were you?"
          className="rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Finished on
        </span>
        <input
          type="date"
          value={consumedOn}
          onChange={(e) => setConsumedOn(e.target.value)}
          className="w-fit rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="self-start rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-paper transition-all hover:opacity-90 disabled:opacity-60"
      >
        {mutation.isPending ? "Saving…" : existing ? "Update review" : "Save to archive"}
      </button>
    </form>
  );
}
