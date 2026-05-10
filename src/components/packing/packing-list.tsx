"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  deletePackingItemAction,
  togglePackingItemAction,
} from "@/server/actions/packing";

interface PackingItemShape {
  id: string;
  item: string;
  category: string;
  quantity: number;
  essential: boolean;
  packed: boolean;
  notes: string | null;
}

interface PackingListProps {
  items: PackingItemShape[];
  isOwner: boolean;
}

const CATEGORY_ORDER: Array<PackingItemShape["category"]> = [
  "documents",
  "clothing",
  "toiletries",
  "electronics",
  "gear",
  "misc",
];

const CATEGORY_LABELS: Record<string, string> = {
  documents: "Documents",
  clothing: "Clothing",
  toiletries: "Toiletries",
  electronics: "Electronics",
  gear: "Gear",
  misc: "Other",
};

export function PackingList({ items, isOwner }: PackingListProps) {
  const grouped = items.reduce<Record<string, PackingItemShape[]>>((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category].push(i);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-8">
      {CATEGORY_ORDER.map((cat) => {
        const list = grouped[cat];
        if (!list || list.length === 0) return null;
        const packed = list.filter((i) => i.packed).length;
        return (
          <section key={cat}>
            <header className="border-border/60 mb-3 flex items-baseline justify-between border-b pb-2">
              <h3 className="font-display text-base tracking-tight">
                {CATEGORY_LABELS[cat]}
              </h3>
              <span className="text-muted-foreground text-xs tabular-nums">
                {packed} / {list.length}
              </span>
            </header>
            <ul className="flex flex-col gap-1.5">
              {list
                .sort((a, b) =>
                  a.essential === b.essential
                    ? a.item.localeCompare(b.item)
                    : a.essential
                      ? -1
                      : 1,
                )
                .map((i) => (
                  <PackingRow key={i.id} item={i} canDelete={isOwner} />
                ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function PackingRow({
  item,
  canDelete,
}: {
  item: PackingItemShape;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <li
      className={cn(
        "border-border/70 hover:bg-accent/30 flex items-center gap-3 rounded-md border bg-card p-2.5 transition",
        item.packed && "opacity-60",
      )}
    >
      <Checkbox
        checked={item.packed}
        disabled={pending}
        onCheckedChange={() =>
          startTransition(async () => {
            await togglePackingItemAction(item.id);
          })
        }
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm",
            item.packed && "line-through",
          )}
        >
          {item.item}
          {item.quantity > 1 ? (
            <span className="text-muted-foreground"> × {item.quantity}</span>
          ) : null}
        </p>
        {item.notes ? (
          <p className="text-muted-foreground mt-0.5 text-xs">{item.notes}</p>
        ) : null}
      </div>
      {item.essential ? (
        <Badge variant="outline" className="text-[10px]">
          Essential
        </Badge>
      ) : null}
      {canDelete ? (
        <Button
          variant="ghost"
          size="icon"
          disabled={pending}
          aria-label={`Remove ${item.item}`}
          onClick={() =>
            startTransition(async () => {
              await deletePackingItemAction(item.id);
              toast.success("Removed");
            })
          }
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}
    </li>
  );
}
