import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-4 h-10 w-72" />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-md" />
        ))}
      </div>
    </div>
  );
}
