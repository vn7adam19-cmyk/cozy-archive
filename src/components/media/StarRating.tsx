import { Star } from "lucide-react";
import { useState } from "react";

export function StarRating({
  value,
  onChange,
  size = 22,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? value;
  const readOnly = !onChange;
  return (
    <div className="inline-flex items-center gap-1" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          className={`transition-transform ${readOnly ? "cursor-default" : "hover:scale-110"}`}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Star
            width={size}
            height={size}
            className={n <= active ? "fill-accent text-accent" : "text-muted-foreground/50"}
          />
        </button>
      ))}
    </div>
  );
}
