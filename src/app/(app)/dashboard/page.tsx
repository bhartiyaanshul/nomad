import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "Traveller";

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-sm tracking-wide uppercase">
          Welcome back
        </p>
        <h1 className="font-display text-3xl tracking-tight">
          Hello, {name.split(" ")[0]}
        </h1>
      </div>

      <Card className="border-border/70 mt-10 shadow-none">
        <CardContent className="flex flex-col items-start gap-4 p-10">
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
            Your dashboard becomes a planning surface in Phase 2 — recommended
            destinations, upcoming trips, AI itinerary entry point, and recent
            activity. For now, the shell is in place and authentication is
            wired.
          </p>
          <Button disabled>Plan a new trip</Button>
        </CardContent>
      </Card>
    </div>
  );
}
