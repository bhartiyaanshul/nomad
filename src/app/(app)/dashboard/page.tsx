import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PersonalityQuiz } from "@/components/onboarding/personality-quiz";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, personality: true },
  });

  if (!user) redirect("/login");

  const showQuiz = user.personality === null;
  const firstName = user.name.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-sm tracking-wide uppercase">
          Welcome back
        </p>
        <h1 className="font-display text-3xl tracking-tight">
          Hello, {firstName}
        </h1>
      </div>

      <Card className="border-border/70 mt-10 shadow-none">
        <CardContent className="flex flex-col items-start gap-4 p-10">
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
            Your planning surface lights up in Phase 2 — recommended
            destinations, upcoming trips, the AI itinerary entry point, and
            recent activity. For now, the shell is in place and authentication
            is wired.
          </p>
          <Button disabled>Plan a new trip</Button>
        </CardContent>
      </Card>

      {showQuiz ? <PersonalityQuiz open /> : null}
    </div>
  );
}
