"use client";

import { useTransition } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copyPublicTripAction } from "@/server/actions/share";

export function CopyTripButton({ slug }: { slug: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await copyPublicTripAction(slug);
          // copyPublicTripAction redirects on success; if we get here, it failed.
          if (result && !result.ok) toast.error(result.error);
        })
      }
      className="gap-2"
    >
      <Copy className="size-4" />
      {pending ? "Copying" : "Copy to my trips"}
    </Button>
  );
}
