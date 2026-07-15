import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { listMyReviews } from "@/lib/reviews.functions";

export const Route = createFileRoute("/_authenticated/timeline")({
  head: () => ({
    meta: [
      { title: "Timeline — The Cozy Archive" },
      { name: "description", content: "A gentle heatmap of everything you've read and watched." },
    ],
  }),
  component: TimelinePage,
});

const WEEKS = 26; // ~half a year

function TimelinePage() {
  const fn = useServerFn(listMyReviews);
  const { data = [], isLoading } = useQuery({ queryKey: ["my-reviews"], queryFn: () => fn() });

  const { grid, maxCount, totals } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of data) {
      if (!r.consumed_on) continue;
      counts.set(r.consumed_on, (counts.get(r.consumed_on) ?? 0) + 1);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - (WEEKS * 7 - 1));
    // align to Sunday
    start.setDate(start.getDate() - start.getDay());

    const grid: { date: string; count: number }[][] = [];
    let max = 0;
    let sum = 0;
    for (let w = 0; w < WEEKS; w++) {
      const col: { date: string; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const dt = new Date(start);
        dt.setDate(start.getDate() + w * 7 + d);
        const iso = dt.toISOString().slice(0, 10);
        const count = counts.get(iso) ?? 0;
        if (count > max) max = count;
        sum += count;
        col.push({ date: iso, count });
      }
      grid.push(col);
    }
    return { grid, maxCount: max, totals: { logged: data.length, in_window: sum } };
  }, [data]);

  const level = (n: number) => {
    if (!maxCount || n === 0) return 0;
    const t = n / maxCount;
    if (t > 0.75) return 4;
    if (t > 0.5) return 3;
    if (t > 0.25) return 2;
    return 1;
  };
  const bg = (lvl: number) => {
    if (lvl === 0) return "oklch(from var(--muted) l c h / 0.6)";
    if (lvl === 1) return "oklch(from var(--accent) l c h / 0.3)";
    if (lvl === 2) return "oklch(from var(--accent) l c h / 0.55)";
    if (lvl === 3) return "oklch(from var(--accent) l c h / 0.8)";
    return "var(--accent)";
  };

  return (
    <div className="paper-surface min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Consumption</p>
        <h1 className="mt-2 font-display text-4xl text-foreground">Your reading & watching year</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Each square is a day. Warmer squares are days with more finishes.
        </p>

        <div className="mt-8 flex gap-6 rounded-2xl border border-border bg-card p-6 shadow-paper">
          <div className="text-center">
            <p className="font-display text-3xl text-foreground">{totals.logged}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total finishes</p>
          </div>
          <div className="text-center">
            <p className="font-display text-3xl text-foreground">{totals.in_window}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Last 26 weeks</p>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-8 text-muted-foreground">Turning pages…</p>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <div className="inline-flex gap-1" role="grid" aria-label="Consumption heatmap">
              {grid.map((col, i) => (
                <div key={i} className="flex flex-col gap-1">
                  {col.map((cell) => (
                    <div
                      key={cell.date}
                      title={`${cell.date}: ${cell.count} finish${cell.count === 1 ? "" : "es"}`}
                      className="h-3.5 w-3.5 rounded-sm ring-1 ring-inset ring-border/50"
                      style={{ background: bg(level(cell.count)) }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <section className="mt-14">
          <h2 className="font-display text-2xl text-foreground">Recently finished</h2>
          <ul className="mt-4 divide-y divide-border">
            {data.slice(0, 20).map((r) => (
              <li key={r.id} className="flex items-center gap-4 py-3">
                <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                  {r.media?.cover_url && <img src={r.media.cover_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="font-display text-lg text-foreground">{r.media?.title ?? "Untitled"}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.consumed_on ? new Date(r.consumed_on).toLocaleDateString() : "No date"} · {r.rating}★
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
