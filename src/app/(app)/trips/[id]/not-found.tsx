import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function TripNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-muted-foreground text-sm tracking-wide uppercase">
        Not found
      </p>
      <h1 className="font-display text-2xl tracking-tight">
        That trip isn&apos;t here.
      </h1>
      <p className="text-muted-foreground max-w-md text-sm">
        It may have been deleted, or you&apos;re not on the member list.
      </p>
      <Button asChild className="mt-2">
        <Link href="/trips">Back to your trips</Link>
      </Button>
    </div>
  );
}
