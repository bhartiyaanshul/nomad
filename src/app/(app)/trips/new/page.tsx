import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, PenLine, Sparkles } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateTripForm } from "@/components/trip/create-trip-form";
import { AIGenerateDialog } from "@/components/ai/ai-generate-dialog";
import { AIStatusBanner } from "@/components/ai/ai-status-banner";

export const metadata = { title: "Plan a new trip" };

export default async function NewTripPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { currency: true, personality: true },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        href="/trips"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition"
      >
        <ArrowLeft className="size-4" />
        Back to trips
      </Link>

      <div className="mt-6 mb-10">
        <p className="text-muted-foreground text-sm tracking-wide uppercase">
          Plan a new trip
        </p>
        <h1 className="font-display mt-2 text-3xl tracking-tight">
          Where are you going?
        </h1>
        <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
          Generate a full multi-city plan with AI, or build it manually
          stop by stop.
        </p>
      </div>

      <AIStatusBanner />

      <div className="mb-10 grid gap-px bg-border/60 sm:grid-cols-2">
        <ModeCard
          kicker="Fastest"
          title="Plan with AI"
          description="A region, a budget, a personality. The model returns a costed multi-city itinerary in under a minute."
          icon={Sparkles}
          action={
            <AIGenerateDialog
              defaultPersonality={user?.personality ?? null}
              defaultCurrency={user?.currency ?? "USD"}
              trigger={
                <Button className="gap-2">
                  Generate itinerary
                  <ArrowRight className="size-4" />
                </Button>
              }
            />
          }
        />
        <ModeCard
          kicker="Manual"
          title="Build it yourself"
          description="Set the basics first, then add stops and activities at your own pace."
          icon={PenLine}
          action={
            <Button asChild variant="outline" className="gap-2">
              <a href="#manual">
                Start from scratch
                <ArrowRight className="size-4" />
              </a>
            </Button>
          }
        />
      </div>

      <Card id="manual" className="border-border/70 shadow-sm">
        <CardContent className="p-8">
          <h2 className="font-display text-lg tracking-tight">
            Manual draft
          </h2>
          <p className="text-muted-foreground mt-1 mb-6 text-sm">
            Set name, dates, and budget. You&apos;ll add stops next.
          </p>
          <CreateTripForm
            defaultCurrency={user?.currency ?? "USD"}
            defaultPersonality={user?.personality ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}

interface ModeCardProps {
  kicker: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
  action: React.ReactNode;
}

function ModeCard({
  kicker,
  title,
  description,
  icon: Icon,
  action,
}: ModeCardProps) {
  return (
    <article className="bg-card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <div className="bg-accent text-accent-foreground rounded-md p-2">
          <Icon className="size-4" />
        </div>
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {kicker}
        </p>
      </div>
      <div>
        <h2 className="font-display text-xl tracking-tight">{title}</h2>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          {description}
        </p>
      </div>
      <div className="mt-auto pt-2">{action}</div>
    </article>
  );
}
