import Link from "next/link";
import { cn } from "@/lib/utils";

interface WordMarkProps {
  className?: string;
  href?: string;
}

export function WordMark({ className, href = "/" }: WordMarkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-baseline gap-1.5 select-none",
        className,
      )}
    >
      <span
        aria-hidden
        className="bg-primary inline-block size-2 translate-y-[-2px] rounded-full"
      />
      <span className="font-display text-foreground text-lg tracking-tight">
        Traveloop
      </span>
    </Link>
  );
}
