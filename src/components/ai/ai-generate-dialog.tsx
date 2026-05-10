"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FormError } from "@/components/forms/field";
import { cn } from "@/lib/utils";

const PERSONALITIES = [
  { value: "foodie", label: "Foodie" },
  { value: "adventurer", label: "Adventurer" },
  { value: "culture", label: "Culture" },
  { value: "chill", label: "Chill" },
  { value: "social", label: "Social" },
  { value: "budget", label: "Budget" },
  { value: "luxury", label: "Luxury" },
  { value: "mixed", label: "Mixed" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "INR", "AUD", "CAD"];

interface AIGenerateDialogProps {
  trigger: React.ReactNode;
  defaultPersonality?: string | null;
  defaultCurrency?: string;
}

type Stage = "idle" | "thinking" | "mapping" | "saving";

const STAGE_LABELS: Record<Exclude<Stage, "idle">, string> = {
  thinking: "Drafting your itinerary",
  mapping: "Mapping each stop",
  saving: "Saving the trip",
};

export function AIGenerateDialog({
  trigger,
  defaultPersonality,
  defaultCurrency = "USD",
}: AIGenerateDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[]> | undefined
  >();

  const isPending = stage !== "idle";

  // Reset stage and errors when the dialog closes — derived from the same
  // render rather than scheduled via an effect, to satisfy React 19's
  // set-state-in-effect rule.
  if (!open && (stage !== "idle" || errorMessage || fieldErrors)) {
    setStage("idle");
    setErrorMessage(null);
    setFieldErrors(undefined);
  }

  async function handleSubmit(form: FormData) {
    setErrorMessage(null);
    setFieldErrors(undefined);
    setStage("thinking");

    const payload = {
      region: form.get("region"),
      days: form.get("days"),
      budget: form.get("budget"),
      currency: form.get("currency") ?? "USD",
      personality: form.get("personality"),
      numStops: form.get("numStops") ?? 3,
      discoveryMode: form.get("discoveryMode") ?? "popular",
      startDate: form.get("startDate"),
      tripName: form.get("tripName") || undefined,
    };

    const stageWalker = setTimeout(() => setStage("mapping"), 8_000);
    const stageWalker2 = setTimeout(() => setStage("saving"), 24_000);

    try {
      const res = await fetch("/api/ai/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        tripId?: string;
        error?: string;
        code?: string;
        fieldErrors?: Record<string, string[]>;
      };

      if (!res.ok) {
        if (res.status === 503 && data.code === "ollama_unavailable") {
          setErrorMessage(data.error ?? "Ollama isn't reachable.");
        } else if (res.status === 400 && data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
          setErrorMessage(data.error ?? "Check the form");
        } else {
          setErrorMessage(data.error ?? "Could not generate itinerary");
        }
        setStage("idle");
        return;
      }

      toast.success("Itinerary ready");
      setOpen(false);
      router.push(`/trips/${data.tripId}`);
    } catch (err) {
      console.error(err);
      setErrorMessage("Network error — try again");
      setStage("idle");
    } finally {
      clearTimeout(stageWalker);
      clearTimeout(stageWalker2);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (isPending && !o) return; // don't allow closing mid-call
        setOpen(o);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="sm:max-w-xl"
        onInteractOutside={(e) => isPending && e.preventDefault()}
      >
        <DialogHeader>
          <div className="bg-primary/10 text-primary inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
            <Sparkles className="size-3.5" />
            AI itinerary
          </div>
          <DialogTitle className="font-display text-2xl tracking-tight">
            Plan a trip with AI
          </DialogTitle>
          <DialogDescription>
            Describe what you want — the model returns a costed multi-city
            itinerary with stops, activities, accommodation, and transport.
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <ProgressView stage={stage as Exclude<Stage, "idle">} />
        ) : (
          <form
            action={handleSubmit}
            className="flex flex-col gap-5"
            noValidate
          >
            <Field
              id="ai-region"
              label="Region or country"
              required
              errors={fieldErrors?.region}
              hint='Try "Vietnam", "Northern Italy", "Andalusia"'
            >
              <Input
                id="ai-region"
                name="region"
                required
                placeholder="Vietnam"
                maxLength={120}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field
                id="ai-days"
                label="Days"
                required
                errors={fieldErrors?.days}
              >
                <Input
                  id="ai-days"
                  name="days"
                  type="number"
                  min={1}
                  max={60}
                  defaultValue={10}
                  required
                />
              </Field>
              <Field
                id="ai-numStops"
                label="Cities"
                hint="1 to 12"
                errors={fieldErrors?.numStops}
              >
                <Input
                  id="ai-numStops"
                  name="numStops"
                  type="number"
                  min={1}
                  max={12}
                  defaultValue={3}
                />
              </Field>
              <Field
                id="ai-startDate"
                label="Start date"
                required
                errors={fieldErrors?.startDate}
              >
                <Input
                  id="ai-startDate"
                  name="startDate"
                  type="date"
                  required
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field
                id="ai-budget"
                label="Total budget"
                required
                errors={fieldErrors?.budget}
                className="sm:col-span-2"
              >
                <Input
                  id="ai-budget"
                  name="budget"
                  type="number"
                  min={0}
                  step={50}
                  defaultValue={1500}
                  required
                />
              </Field>
              <Field
                id="ai-currency"
                label="Currency"
                errors={fieldErrors?.currency}
              >
                <Select name="currency" defaultValue={defaultCurrency}>
                  <SelectTrigger id="ai-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                id="ai-personality"
                label="Personality"
                required
                errors={fieldErrors?.personality}
              >
                <Select
                  name="personality"
                  defaultValue={defaultPersonality ?? "mixed"}
                >
                  <SelectTrigger id="ai-personality">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERSONALITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                id="ai-discoveryMode"
                label="Discovery mode"
                hint="Popular for crowd favourites, Explore for offbeat picks"
              >
                <Select name="discoveryMode" defaultValue="popular">
                  <SelectTrigger id="ai-discoveryMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Popular</SelectItem>
                    <SelectItem value="explore">Explore</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field
              id="ai-tripName"
              label="Trip name"
              hint="Optional. Auto-generated if blank."
            >
              <Input
                id="ai-tripName"
                name="tripName"
                maxLength={120}
                placeholder="Vietnam street-food run"
              />
            </Field>

            {errorMessage ? <FormError message={errorMessage} /> : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2">
                <Sparkles className="size-4" />
                Generate itinerary
              </Button>
            </div>

            <p className="text-muted-foreground text-xs leading-relaxed">
              Generation usually takes 10 to 30 seconds depending on the
              model and the number of stops. The plan stays open until the
              trip is saved.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProgressView({ stage }: { stage: Exclude<Stage, "idle"> }) {
  const stages: Array<Exclude<Stage, "idle">> = ["thinking", "mapping", "saving"];
  const currentIndex = stages.indexOf(stage);

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8">
      <div className="bg-primary/10 text-primary rounded-full p-4">
        <Loader2 className="size-6 animate-spin" />
      </div>
      <div className="text-center">
        <p className="font-display text-lg tracking-tight">
          {STAGE_LABELS[stage]}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          This usually takes 10 to 30 seconds.
        </p>
      </div>
      <ol className="flex flex-col gap-2">
        {stages.map((s, idx) => {
          const done = idx < currentIndex;
          const active = idx === currentIndex;
          return (
            <li
              key={s}
              className={cn(
                "flex items-center gap-2 text-sm transition",
                done && "text-foreground",
                active && "text-foreground font-medium",
                !done && !active && "text-muted-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-block size-1.5 rounded-full",
                  done
                    ? "bg-primary"
                    : active
                      ? "bg-primary animate-pulse"
                      : "bg-border",
                )}
              />
              {STAGE_LABELS[s]}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
