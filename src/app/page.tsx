import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { WordMark } from "@/components/word-mark";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border/60 border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <WordMark />
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-6 pt-24 pb-20 sm:pt-32">
          <div className="max-w-3xl">
            <p className="text-muted-foreground text-sm tracking-wide uppercase">
              Travel planning, reimagined
            </p>
            <h1 className="font-display mt-5 text-5xl leading-[1.05] tracking-tight text-balance sm:text-6xl">
              Plan trips that match the traveller you are, not the one a form
              imagines.
            </h1>
            <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-relaxed">
              Traveloop turns a region, a duration, and a budget into a
              detailed multi-city itinerary — then lets your group shape it,
              adapts when reality changes, and quietly handles the
              expense-splitting at the end of the day.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="group">
                <Link href="/signup">
                  Create your first trip
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-border/60 border-t">
          <div className="bg-border/60 mx-auto grid w-full max-w-6xl grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <article
                key={f.title}
                className="bg-background flex flex-col gap-3 p-8"
              >
                <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  {f.kicker}
                </p>
                <h2 className="font-display text-xl tracking-tight">
                  {f.title}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {f.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-24">
          <div className="grid items-start gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-muted-foreground text-sm tracking-wide uppercase">
                Built for the way travel actually works
              </p>
              <h2 className="font-display mt-4 text-3xl tracking-tight text-balance sm:text-4xl">
                A planner that adapts when your plans don&apos;t.
              </h2>
            </div>
            <div className="text-muted-foreground space-y-6 leading-relaxed lg:col-span-7">
              <p>
                Mark a destination as compromised — bad weather, a closed
                border, a change of heart — and Traveloop suggests three
                alternatives that preserve your cost band, distance, and the
                feel of the trip you wanted.
              </p>
              <p>
                Plan as a group with Trip Blend. Everyone proposes places,
                everyone votes, and the model re-blends the itinerary in real
                time as preferences shift. The deadline closes the vote and
                turns the latest version into the official trip.
              </p>
              <p>
                When you&apos;re back, settle up. Multi-currency expenses are
                converted, balances are calculated, and the suggested transfers
                clear everything in the minimum number of payments.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-border/60 border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 text-sm">
          <span>Traveloop · {new Date().getFullYear()}</span>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-foreground transition">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-foreground transition">
              Get started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    kicker: "Itinerary",
    title: "Generated, not templated.",
    description:
      "Describe a region, a budget, and a personality. Get a day-by-day plan with stops, activities, transport, and accommodation — costed within ten percent.",
  },
  {
    kicker: "Personality",
    title: "Shaped by who you are.",
    description:
      "Foodie, Adventurer, Culture, Chill, Social, Budget, Luxury. The model weights every recommendation around the way you actually travel.",
  },
  {
    kicker: "Trip Blend",
    title: "Group planning, in real time.",
    description:
      "Invite your group, propose cities, vote, and watch the AI re-blend the itinerary as votes come in. The deadline is the decision.",
  },
  {
    kicker: "Settle up",
    title: "Expenses without spreadsheets.",
    description:
      "Multi-currency, multiple split modes, suggested transfers in the minimum number of moves. Settle up before you part ways.",
  },
];
