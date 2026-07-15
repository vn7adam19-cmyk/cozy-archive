import { useEffect, useState } from "react";
import { DEFAULT_VIBE, VIBES, VIBE_STORAGE_KEY, isVibeId, type VibeId } from "./vibes";

function applyVibe(id: VibeId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.vibe = id;
}

export function useVibe(): [VibeId, (id: VibeId) => void] {
  const [vibe, setVibe] = useState<VibeId>(DEFAULT_VIBE);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(VIBE_STORAGE_KEY) : null;
    const initial = isVibeId(stored) ? stored : DEFAULT_VIBE;
    setVibe(initial);
    applyVibe(initial);
  }, []);

  const update = (id: VibeId) => {
    setVibe(id);
    applyVibe(id);
    try {
      window.localStorage.setItem(VIBE_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  };

  return [vibe, update];
}

export function VibeSwitcher() {
  const [vibe, setVibe] = useVibe();

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground sm:inline">
        Vibe
      </span>
      <div className="flex gap-1 rounded-full border border-border bg-card p-1 shadow-paper">
        {VIBES.map((v) => {
          const active = v.id === vibe;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setVibe(v.id)}
              aria-pressed={active}
              title={`${v.label} — ${v.description}`}
              className={`group flex items-center gap-2 rounded-full px-3 py-1 text-xs transition-all ${
                active
                  ? "bg-primary text-primary-foreground shadow-paper"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full ring-1 ring-inset ring-border"
                style={{ background: v.swatch }}
              />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
