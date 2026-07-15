export type VibeId = "rainy-afternoon" | "midnight-library" | "foggy-morning";

export interface Vibe {
  id: VibeId;
  label: string;
  description: string;
  swatch: string; // used to preview the vibe
}

export const VIBES: Vibe[] = [
  {
    id: "rainy-afternoon",
    label: "Rainy Afternoon",
    description: "Warm cream, dark coffee, caramel light through the window.",
    swatch: "oklch(0.62 0.115 55)",
  },
  {
    id: "midnight-library",
    label: "Midnight Library",
    description: "Deep espresso rooms lit by a single candlelight lamp.",
    swatch: "oklch(0.85 0.09 70)",
  },
  {
    id: "foggy-morning",
    label: "Foggy Morning",
    description: "Soft greys, quiet paper, a whisper of teal outside.",
    swatch: "oklch(0.62 0.06 200)",
  },
];

export const DEFAULT_VIBE: VibeId = "rainy-afternoon";
export const VIBE_STORAGE_KEY = "cozy-archive:vibe";

export function isVibeId(value: string | null | undefined): value is VibeId {
  return !!value && VIBES.some((v) => v.id === value);
}
