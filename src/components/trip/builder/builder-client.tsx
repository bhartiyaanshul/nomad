"use client";

import { useState, useTransition } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { reorderStopsAction } from "@/server/actions/stops";

import { AddStopDialog } from "./add-stop-dialog";
import { StopEditor } from "./stop-editor";
import type { BuilderStop, BuilderTrip } from "./types";

interface BuilderClientProps {
  trip: BuilderTrip;
}

function stableKey(stops: BuilderStop[]) {
  return stops
    .map(
      (s) =>
        `${s.id}:${s.orderIndex}:${s.arrivalDay}:${s.departureDay}:${s.activities.length}`,
    )
    .join("|");
}

export function BuilderClient({ trip }: BuilderClientProps) {
  // Local optimistic ordering — reset whenever the server-provided stops
  // identity changes (added/removed/reordered/updated).
  const [stops, setStops] = useState<BuilderStop[]>(trip.stops);
  const [stopsKey, setStopsKey] = useState(stableKey(trip.stops));
  const incomingKey = stableKey(trip.stops);
  if (incomingKey !== stopsKey) {
    setStops(trip.stops);
    setStopsKey(incomingKey);
  }

  const [selectedId, setSelectedId] = useState<string | null>(
    trip.stops[0]?.id ?? null,
  );
  const validSelected =
    selectedId && stops.some((s) => s.id === selectedId)
      ? selectedId
      : (stops[0]?.id ?? null);
  if (validSelected !== selectedId) {
    setSelectedId(validSelected);
  }

  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stops.findIndex((s) => s.id === active.id);
    const newIndex = stops.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(stops, oldIndex, newIndex);
    setStops(next);
    startTransition(async () => {
      await reorderStopsAction({
        tripId: trip.id,
        orderedIds: next.map((s) => s.id),
      });
    });
  };

  const selected = stops.find((s) => s.id === selectedId) ?? null;
  const selectedIndex = selected
    ? stops.findIndex((s) => s.id === selected.id)
    : -1;

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <aside className="flex flex-col gap-4">
        <div>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            Stops · {stops.length}
          </p>
          <h2 className="font-display mt-1 text-lg tracking-tight">
            {stops.length > 1 ? "Drag to reorder" : "Add a stop"}
          </h2>
        </div>

        {stops.length === 0 ? (
          <div className="border-border/60 rounded-md border border-dashed p-6 text-center">
            <MapPin className="text-muted-foreground mx-auto size-5" />
            <p className="text-muted-foreground mt-2 text-sm">
              No stops yet. Add your first one to start planning.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stops.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="flex flex-col gap-2">
                {stops.map((stop, idx) => (
                  <SortableStopRow
                    key={stop.id}
                    stop={stop}
                    index={idx}
                    selected={selectedId === stop.id}
                    onSelect={() => setSelectedId(stop.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        <AddStopDialog
          tripId={trip.id}
          totalDays={trip.totalDays}
          defaultStartDay={
            stops[stops.length - 1]?.departureDay
              ? Math.min(
                  trip.totalDays,
                  (stops[stops.length - 1].departureDay ?? 0) + 1,
                )
              : 1
          }
        />
      </aside>

      <section>
        {selected ? (
          <div>
            <header className="border-border/60 mb-6 flex flex-wrap items-baseline justify-between gap-2 border-b pb-4">
              <div>
                <p className="text-muted-foreground text-xs tracking-wide uppercase">
                  Stop {selectedIndex + 1}
                </p>
                <h2 className="font-display mt-1 text-2xl tracking-tight">
                  {selected.city}
                  <span className="text-muted-foreground">
                    , {selected.country}
                  </span>
                </h2>
              </div>
              <p className="text-muted-foreground text-sm">
                Day {selected.arrivalDay}
                {selected.departureDay > selected.arrivalDay
                  ? `–${selected.departureDay}`
                  : ""}{" "}
                of {trip.totalDays}
              </p>
            </header>
            <StopEditor
              stop={selected}
              totalDays={trip.totalDays}
              isLast={selectedIndex === stops.length - 1}
              currency={trip.currency}
            />
          </div>
        ) : (
          <div className="border-border/60 rounded-md border border-dashed p-12 text-center">
            <MapPin className="text-muted-foreground mx-auto size-6" />
            <h3 className="font-display mt-3 text-lg tracking-tight">
              Add your first stop
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Pick a city, set a date range, and start planning days.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

interface SortableStopRowProps {
  stop: BuilderStop;
  index: number;
  selected: boolean;
  onSelect: () => void;
}

function SortableStopRow({
  stop,
  index,
  selected,
  onSelect,
}: SortableStopRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "border-border/70 group flex w-full items-center gap-3 rounded-md border bg-card px-3 py-3 text-left transition",
          selected
            ? "border-primary bg-primary/5"
            : "hover:border-border hover:bg-accent/40",
          isDragging && "opacity-50",
        )}
      >
        <span
          {...listeners}
          {...attributes}
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="size-4" />
        </span>
        <span className="bg-muted text-muted-foreground flex size-7 items-center justify-center rounded-full text-xs font-medium tabular-nums">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight truncate">
            {stop.city}
            <span className="text-muted-foreground"> · {stop.country}</span>
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Day {stop.arrivalDay}
            {stop.departureDay > stop.arrivalDay
              ? `–${stop.departureDay}`
              : ""}
            {stop.activities.length > 0 ? (
              <> · {stop.activities.length} planned</>
            ) : null}
          </p>
        </div>
      </button>
    </li>
  );
}
