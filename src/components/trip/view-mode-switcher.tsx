"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, List, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

const MODES = [
  { value: "timeline", label: "Timeline", icon: List },
  { value: "calendar", label: "Calendar", icon: CalendarDays },
  { value: "map", label: "Map", icon: MapPin },
] as const;

type Mode = (typeof MODES)[number]["value"];

export function ViewModeSwitcher() {
  const params = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Derive directly from URL — no mirrored state, no effect to sync.
  const mode = (params.get("view") as Mode) ?? "timeline";

  function set(next: Mode) {
    if (next === mode) return;
    const url = new URLSearchParams(params.toString());
    if (next === "timeline") url.delete("view");
    else url.set("view", next);
    startTransition(() => {
      router.replace(`?${url.toString()}`, { scroll: false });
    });
  }

  return (
    <div
      role="tablist"
      aria-label="View mode"
      className="border-border/70 bg-card inline-flex items-center gap-0.5 rounded-md border p-1"
    >
      {MODES.map((m) => {
        const active = mode === m.value;
        const Icon = m.icon;
        return (
          <button
            key={m.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => set(m.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
