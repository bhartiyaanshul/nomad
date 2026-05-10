"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { slug: "", label: "Itinerary" },
  { slug: "/build", label: "Build" },
  { slug: "/budget", label: "Budget" },
  { slug: "/expenses", label: "Expenses" },
  { slug: "/packing", label: "Packing" },
  { slug: "/notes", label: "Notes" },
  { slug: "/todos", label: "Todos" },
  { slug: "/blend", label: "Blend" },
];

interface TripSubNavProps {
  tripId: string;
}

export function TripSubNav({ tripId }: TripSubNavProps) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;

  return (
    <nav
      aria-label="Trip sections"
      className="mx-auto w-full max-w-6xl px-6"
    >
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const href = `${base}${t.slug}`;
          const active =
            t.slug === ""
              ? pathname === base
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={t.slug}>
              <Link
                href={href}
                className={cn(
                  "inline-block px-4 py-3 text-sm transition border-b-2 -mb-px",
                  active
                    ? "border-primary text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
