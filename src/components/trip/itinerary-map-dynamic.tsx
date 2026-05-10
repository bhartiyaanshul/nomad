"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

export const ItineraryMapDynamic = dynamic(
  () => import("./itinerary-map").then((m) => m.ItineraryMap),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="border-border/70 h-[60vh] min-h-[480px] w-full rounded-md border" />
    ),
  },
);
