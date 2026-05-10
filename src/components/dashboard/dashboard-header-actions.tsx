"use client";

import Link from "next/link";
import { Map as MapIcon, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AIGenerateDialog } from "@/components/ai/ai-generate-dialog";

interface DashboardHeaderActionsProps {
  defaultPersonality: string | null;
  defaultCurrency: string;
}

export function DashboardHeaderActions({
  defaultPersonality,
  defaultCurrency,
}: DashboardHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" className="gap-2">
        <Link href="/trips">
          <MapIcon className="size-4" />
          All trips
        </Link>
      </Button>
      <AIGenerateDialog
        defaultPersonality={defaultPersonality}
        defaultCurrency={defaultCurrency}
        trigger={
          <Button variant="outline" className="gap-2">
            <Sparkles className="size-4" />
            Plan with AI
          </Button>
        }
      />
      <Button asChild className="gap-2">
        <Link href="/trips/new">
          <Plus className="size-4" />
          Plan a new trip
        </Link>
      </Button>
    </div>
  );
}
