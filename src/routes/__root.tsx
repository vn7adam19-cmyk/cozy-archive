import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { VibeSwitcher } from "@/theme/VibeSwitcher";
import { DEFAULT_VIBE } from "@/theme/vibes";
import { Toaster } from "sonner";

const SITE_TITLE = "The Cozy Archive — a vibe-first media tracker";
const SITE_DESCRIPTION =
  "A warm little library for the books you read, the films you watch, and the moods they leave behind.";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">A missing page</p>
        <h1 className="mt-4 font-display text-6xl text-foreground">404</h1>
        <p className="mt-3 text-muted-foreground">
          This chapter isn't in the archive yet.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-paper transition-all hover:opacity-90"
          >
            Back to the shelf
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl text-foreground">Something spilled the tea</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page didn't load. Try again, or head back to the archive.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-paper transition-all hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "author", content: "The Cozy Archive" },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
    scripts: [
      // Set the vibe before hydration so we never flash the wrong palette.
      {
        children: `try{var v=localStorage.getItem('cozy-archive:vibe');document.documentElement.dataset.vibe=v||'${DEFAULT_VIBE}';}catch(e){document.documentElement.dataset.vibe='${DEFAULT_VIBE}';}`,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hide = pathname === "/auth";
  if (hide) return null;

  const tabs = [
    { to: "/library/written", label: "Written" },
    { to: "/library/screen", label: "Screen" },
    { to: "/pairings", label: "Pairings" },
    { to: "/shelf", label: "Shelf" },
    { to: "/timeline", label: "Timeline" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="group flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground shadow-paper"
          >
            <span className="font-display text-lg">c</span>
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg text-foreground">The Cozy Archive</span>
            <span className="text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">
              a vibe-first library
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "rounded-full px-3 py-1.5 text-sm bg-secondary text-foreground" }}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <VibeSwitcher />
      </div>
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6 pb-3 md:hidden">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            activeProps={{ className: "whitespace-nowrap rounded-full px-3 py-1.5 text-sm bg-secondary text-foreground" }}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="border-t border-border/60 py-8 text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
          brewed slowly · The Cozy Archive
        </footer>
      </div>
      <Toaster
        theme="system"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--card)",
            color: "var(--card-foreground)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-body)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
