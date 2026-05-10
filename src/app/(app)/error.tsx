"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div className="bg-destructive/10 text-destructive rounded-full p-3">
        <AlertTriangle className="size-5" />
      </div>
      <p className="text-muted-foreground text-sm tracking-wide uppercase">
        Something went wrong
      </p>
      <h1 className="font-display text-2xl tracking-tight">
        We hit an error rendering this page.
      </h1>
      <p className="text-muted-foreground max-w-md text-sm">
        Try refreshing. If the issue keeps happening, check the server logs
        — and let us know.
      </p>
      <div className="mt-2 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <a href="/dashboard">Back to dashboard</a>
        </Button>
      </div>
    </div>
  );
}
