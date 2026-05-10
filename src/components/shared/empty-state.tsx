import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border-border/60 flex flex-col items-center justify-center gap-4 rounded-md border border-dashed px-6 py-16 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="bg-accent text-accent-foreground rounded-full p-3">
          <Icon className="size-5" />
        </div>
      ) : null}
      <div>
        <h3 className="font-display text-lg tracking-tight">{title}</h3>
        {description ? (
          <p className="text-muted-foreground mt-1 max-w-md text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
