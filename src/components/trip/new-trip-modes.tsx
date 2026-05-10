"use client";

import Link from "next/link";
import { ArrowRight, PenLine, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AIGenerateDialog } from "@/components/ai/ai-generate-dialog";

interface NewTripModesProps {
  defaultPersonality: string | null;
  defaultCurrency: string;
}

export function NewTripModes({
  defaultPersonality,
  defaultCurrency,
}: NewTripModesProps) {
  return (
    <div className="mb-10 grid gap-px bg-border/60 sm:grid-cols-2">
      <article className="bg-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2">
          <div className="bg-accent text-accent-foreground rounded-md p-2">
            <Sparkles className="size-4" />
          </div>
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Fastest
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl tracking-tight">Plan with AI</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            A region, a budget, a personality. The model returns a costed
            multi-city itinerary in under a minute.
          </p>
        </div>
        <div className="mt-auto pt-2">
          <AIGenerateDialog
            defaultPersonality={defaultPersonality}
            defaultCurrency={defaultCurrency}
            trigger={
              <Button className="gap-2">
                <Sparkles className="size-4" />
                Generate itinerary
                <ArrowRight className="size-4" />
              </Button>
            }
          />
        </div>
      </article>

      <article className="bg-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2">
          <div className="bg-accent text-accent-foreground rounded-md p-2">
            <PenLine className="size-4" />
          </div>
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Manual
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl tracking-tight">
            Build it yourself
          </h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Set the basics first, then add stops and activities at your own
            pace.
          </p>
        </div>
        <div className="mt-auto pt-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="#manual">
              Start from scratch
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </article>
    </div>
  );
}
