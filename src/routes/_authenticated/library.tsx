import { createFileRoute, Outlet, Link, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Library — The Cozy Archive" },
      { name: "description", content: "Browse everything in your archive, filtered by pillar." },
    ],
  }),
  beforeLoad: ({ location }) => {
    if (location.pathname === "/library" || location.pathname === "/library/") {
      throw redirect({ to: "/library/screen" });
    }
  },
  component: LibraryLayout,
});

function LibraryLayout() {
  return (
    <div className="paper-surface min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-6xl px-6 pt-10">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">The Library</p>
        <h1 className="mt-2 font-display text-4xl text-foreground">Your archive</h1>
        <div className="mt-6 inline-flex rounded-full border border-border bg-card p-1 shadow-paper">
          {[
            { to: "/library/written", label: "Written Media" },
            { to: "/library/screen", label: "TV / Film Media" },
          ].map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="rounded-full px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              activeProps={{
                className:
                  "rounded-full px-4 py-1.5 text-sm bg-primary text-primary-foreground shadow-paper",
              }}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </div>
    </div>
  );
}
