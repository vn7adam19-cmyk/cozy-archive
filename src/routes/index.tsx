import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Clapperboard, Coffee, Layers, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Cozy Archive — track books, films, and shows by vibe" },
      {
        name: "description",
        content:
          "A warm little library for the books, films, and shows you love — organised by mood, not genre.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="paper-surface">
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-24 md:pt-24 md:pb-32">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground animate-cozy-in">
          A cup of tea, a soft chair, a good story
        </p>
        <h1 className="mt-6 font-display text-5xl leading-[1.05] text-foreground md:text-7xl">
          Every book, film, and show
          <br />
          you love — kept together{" "}
          <span className="ink-underline">by vibe</span>.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          The Cozy Archive is a slow, warm place to track what you're reading and
          watching. Forget clinical genre tags. What did it <em>feel</em> like?
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/auth"
            className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-cozy transition-all hover:opacity-90"
          >
            Start your archive
          </Link>
          <Link
            to="/library/screen"
            className="rounded-full border border-border bg-card px-6 py-3 text-sm text-foreground transition-all hover:bg-secondary"
          >
            Peek inside
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: BookOpen,
            title: "Three pillars",
            body: "Books, movies, TV — one shared shelf, one shared language.",
          },
          {
            icon: Sparkles,
            title: "Mood over genre",
            body: "Cozy · Rainy Day · Mind-bending · Nostalgic · Bittersweet.",
          },
          {
            icon: Layers,
            title: "Cross-media pairings",
            body: "Loved the book? Here's the film that shares its bones.",
          },
          {
            icon: Coffee,
            title: "A vibe quote per review",
            body: "Save the sentence that stayed with you, not just a rating.",
          },
        ].map((f) => (
          <article
            key={f.title}
            className="rounded-2xl border border-border bg-card p-6 shadow-paper transition-transform hover:-translate-y-0.5"
          >
            <f.icon className="h-6 w-6 text-accent" />
            <h3 className="mt-4 font-display text-xl text-foreground">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-6 rounded-3xl border border-border bg-card p-10 shadow-cozy md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-accent">
              Change the vibe
            </p>
            <h2 className="mt-4 font-display text-3xl text-foreground md:text-4xl">
              The whole site changes with your mood.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Try the vibe switcher in the header — swap between{" "}
              <strong>Rainy Afternoon</strong>, <strong>Midnight Library</strong>,
              and <strong>Foggy Morning</strong>. The colours, paper, and shadows
              all shift together.
            </p>
          </div>
          <div className="flex items-center justify-center gap-4">
            <Clapperboard className="h-10 w-10 text-muted-foreground" />
            <BookOpen className="h-14 w-14 text-primary" />
            <Coffee className="h-10 w-10 text-accent" />
          </div>
        </div>
      </section>
    </div>
  );
}
