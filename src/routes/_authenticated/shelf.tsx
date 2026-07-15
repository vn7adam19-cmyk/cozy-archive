import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { listShelf, moveShelfItem, removeFromShelf } from "@/lib/shelf.functions";
import { X } from "lucide-react";
import { toast } from "sonner";

type ShelfCol = "priority" | "reading" | "later" | "done";

const COLUMNS: { key: ShelfCol; label: string; hint: string }[] = [
  { key: "priority", label: "Priority", hint: "Reading next" },
  { key: "reading", label: "Currently", hint: "Open on the table" },
  { key: "later", label: "Maybe later", hint: "For a rainy day" },
  { key: "done", label: "Finished", hint: "The good ones you kept" },
];

interface ShelfItem {
  id: string;
  column_key: ShelfCol;
  position: number;
  note: string | null;
  media: { id: string; type: "book" | "movie" | "tv"; title: string; year: number | null; cover_url: string | null; metadata: Record<string, unknown> | null };
}

export const Route = createFileRoute("/_authenticated/shelf")({
  head: () => ({
    meta: [
      { title: "Shelf — The Cozy Archive" },
      { name: "description", content: "A drag-and-drop backlog of everything you plan to read and watch." },
    ],
  }),
  component: ShelfPage,
});

function ShelfPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listShelf);
  const moveFn = useServerFn(moveShelfItem);
  const removeFn = useServerFn(removeFromShelf);

  const { data = [], isLoading } = useQuery({
    queryKey: ["shelf"],
    queryFn: () => listFn(),
  });

  const [activeId, setActiveId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<ShelfCol, ShelfItem[]> = { priority: [], reading: [], later: [], done: [] };
    for (const it of data as ShelfItem[]) map[it.column_key].push(it);
    return map;
  }, [data]);

  const move = useMutation({
    mutationFn: (v: { id: string; column: ShelfCol; position: number }) => moveFn({ data: v }),
    onError: (e: Error) => {
      toast.error(e.message);
      qc.invalidateQueries({ queryKey: ["shelf"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shelf"] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findContainer = (id: string): ShelfCol | undefined => {
    for (const c of COLUMNS) if (grouped[c.key].some((i) => i.id === id)) return c.key;
    return undefined;
  };

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const from = findContainer(activeId);
    if (!from) return;
    const to = (COLUMNS.some((c) => c.key === overId) ? (overId as ShelfCol) : findContainer(overId)) ?? from;

    // Optimistic reorder
    qc.setQueryData<ShelfItem[]>(["shelf"], (curr) => {
      if (!curr) return curr;
      const arr = [...curr];
      const activeItem = arr.find((i) => i.id === activeId);
      if (!activeItem) return curr;
      const overItem = arr.find((i) => i.id === overId);
      const overIndex = overItem ? arr.indexOf(overItem) : arr.length;
      const activeIndex = arr.indexOf(activeItem);

      if (from === to) {
        return arrayMove(arr, activeIndex, overIndex).map((it) =>
          it.column_key === to
            ? {
                ...it,
                position: arr.filter((x) => x.column_key === to).findIndex((x) => x.id === it.id),
              }
            : it,
        );
      }
      activeItem.column_key = to;
      return arr;
    });

    // Compute new position within destination column and persist
    const dest = grouped[to];
    let newPos = dest.length;
    const overIdx = dest.findIndex((i) => i.id === overId);
    if (overIdx >= 0) newPos = overIdx;
    move.mutate({ id: activeId, column: to, position: newPos });
  }

  const activeItem = (data as ShelfItem[]).find((i) => i.id === activeId);

  return (
    <div className="paper-surface min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Backlog</p>
        <h1 className="mt-2 font-display text-4xl text-foreground">Your shelf</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Drag anything between columns. Rain-day picks live in <em>Priority</em>; the rest can wait for the light.
        </p>

        {isLoading ? (
          <p className="mt-10 text-muted-foreground">Dusting the shelf…</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {COLUMNS.map((c) => (
                <Column key={c.key} col={c} items={grouped[c.key]} onRemove={(id) => remove.mutate(id)} />
              ))}
            </div>
            <DragOverlay>{activeItem ? <Card item={activeItem} isOverlay /> : null}</DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function Column({
  col,
  items,
  onRemove,
}: {
  col: { key: ShelfCol; label: string; hint: string };
  items: ShelfItem[];
  onRemove: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border border-border bg-card p-4 shadow-paper transition-colors ${
        isOver ? "ring-2 ring-accent" : ""
      }`}
    >
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-lg text-foreground">{col.label}</h2>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {items.length}
        </span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{col.hint}</p>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-[100px] flex-col gap-2">
          {items.length === 0 && (
            <p className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
              Drop here
            </p>
          )}
          {items.map((it) => (
            <SortableCard key={it.id} item={it} onRemove={onRemove} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({ item, onRemove }: { item: ShelfItem; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
    >
      <Card item={item} onRemove={onRemove} />
    </div>
  );
}

function Card({
  item,
  onRemove,
  isOverlay,
}: {
  item: ShelfItem;
  onRemove?: (id: string) => void;
  isOverlay?: boolean;
}) {
  const creator =
    (item.media.metadata as Record<string, string> | null)?.author ??
    (item.media.metadata as Record<string, string> | null)?.director ??
    null;
  return (
    <div
      className={`group flex gap-3 rounded-xl border border-border bg-background p-2.5 text-left shadow-paper ${
        isOverlay ? "shadow-cozy" : ""
      }`}
    >
      <div className="h-16 w-11 flex-shrink-0 overflow-hidden rounded-md bg-muted">
        {item.media.cover_url && <img src={item.media.cover_url} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <p className="truncate font-display text-sm text-foreground">{item.media.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[creator, item.media.year].filter(Boolean).join(" · ") || item.media.type}
        </p>
      </div>
      {onRemove && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          className="self-start rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100"
          aria-label="Remove"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
