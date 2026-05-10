"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, format } from "date-fns";
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

const REGION_SUGGESTIONS = [
  "Vietnam",
  "Thailand",
  "Japan",
  "Indonesia",
  "South Korea",
  "India",
  "Sri Lanka",
  "Northern Italy",
  "Andalusia, Spain",
  "Portugal",
  "Greece",
  "Croatia",
  "Iceland",
  "Norway",
  "Morocco",
  "Egypt",
  "Kenya",
  "South Africa",
  "Patagonia",
  "Peru",
  "Mexico",
  "Costa Rica",
  "Pacific Northwest USA",
  "New Zealand South Island",
];

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

interface FormValues {
  region: string;
  days: string;
  numStops: string;
  startDate: string;
  budget: string;
  currency: string;
  personality: string;
  discoveryMode: string;
  tripName: string;
}

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

  // Controlled form values so they survive Pending → Idle transitions.
  const [values, setValues] = useState<FormValues>({
    region: "",
    days: "10",
    numStops: "3",
    startDate: "",
    budget: "1500",
    currency: defaultCurrency,
    personality: defaultPersonality ?? "mixed",
    discoveryMode: "popular",
    tripName: "",
  });

  const isPending = stage !== "idle";

  // Reset only errors and stage when the dialog closes — keep form values
  // so the user gets them back if they reopen the dialog.
  if (!open && (stage !== "idle" || errorMessage || fieldErrors)) {
    setStage("idle");
    setErrorMessage(null);
    setFieldErrors(undefined);
  }

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  // Computed end date for display only — the API takes start + days.
  const computedEndDate =
    values.startDate && Number(values.days) > 0
      ? format(
          addDays(new Date(values.startDate), Math.max(0, Number(values.days) - 1)),
          "EEE d MMM yyyy",
        )
      : null;

  async function handleSubmit() {
    setErrorMessage(null);
    setFieldErrors(undefined);
    setStage("thinking");

    const stageWalker = setTimeout(() => setStage("mapping"), 20_000);
    const stageWalker2 = setTimeout(() => setStage("saving"), 60_000);

    try {
      const res = await fetch("/api/ai/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          tripName: values.tripName.trim() || undefined,
        }),
      });

      const data = (await res.json()) as {
        tripId?: string;
        error?: string;
        code?: string;
        fieldErrors?: Record<string, string[]>;
      };

      if (!res.ok) {
        if (res.status === 503 && data.code === "ollama_unavailable") {
          setErrorMessage(
            "AI generation is offline. Start Ollama with `ollama serve` and pull the model with `ollama pull qwen3.5`. Your inputs are saved.",
          );
        } else if (res.status === 504 || data.code === "timeout") {
          setErrorMessage(
            "Ollama took too long to respond. Try a smaller plan (fewer days or stops) — your inputs are saved.",
          );
        } else if (data.code === "ollama_error") {
          setErrorMessage(
            (data.error ?? "The model returned an error.") +
              " Your inputs are saved.",
          );
        } else if (res.status === 400 && data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
          setErrorMessage(data.error ?? "Check the highlighted fields");
        } else {
          setErrorMessage(
            (data.error ?? "Could not generate itinerary") +
              " Your inputs are saved.",
          );
        }
        setStage("idle");
        return;
      }

      toast.success("Itinerary ready");
      // Clear values only on success.
      setOpen(false);
      setValues({
        region: "",
        days: "10",
        numStops: "3",
        startDate: "",
        budget: "1500",
        currency: defaultCurrency,
        personality: defaultPersonality ?? "mixed",
        discoveryMode: "popular",
        tripName: "",
      });
      router.push(`/trips/${data.tripId}`);
    } catch (err) {
      const isAbort =
        err instanceof Error && /aborted|timeout/i.test(err.message);
      console.error(err);
      setErrorMessage(
        isAbort
          ? "Request timed out before the model finished. Try fewer days or stops — your inputs are saved."
          : "Network error. Try again — your inputs are saved.",
      );
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
        if (isPending && !o) return;
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

        <div className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isPending) handleSubmit();
            }}
            className={cn(
              "flex flex-col gap-5 transition",
              isPending && "pointer-events-none opacity-30",
            )}
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
                value={values.region}
                onChange={(e) => update("region", e.target.value)}
                list="ai-region-suggestions"
                autoComplete="off"
              />
              <datalist id="ai-region-suggestions">
                {REGION_SUGGESTIONS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
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
                  value={values.days}
                  onChange={(e) => update("days", e.target.value)}
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
                  value={values.numStops}
                  onChange={(e) => update("numStops", e.target.value)}
                />
              </Field>
              <Field
                id="ai-startDate"
                label="Start date"
                hint={
                  computedEndDate ? `Returns ${computedEndDate}` : undefined
                }
                required
                errors={fieldErrors?.startDate}
              >
                <Input
                  id="ai-startDate"
                  name="startDate"
                  type="date"
                  required
                  value={values.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
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
                  value={values.budget}
                  onChange={(e) => update("budget", e.target.value)}
                  required
                />
              </Field>
              <Field
                id="ai-currency"
                label="Currency"
                errors={fieldErrors?.currency}
              >
                <Select
                  value={values.currency}
                  onValueChange={(v) => update("currency", v)}
                >
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
                  value={values.personality}
                  onValueChange={(v) => update("personality", v)}
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
                <Select
                  value={values.discoveryMode}
                  onValueChange={(v) => update("discoveryMode", v)}
                >
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
                value={values.tripName}
                onChange={(e) => update("tripName", e.target.value)}
              />
            </Field>

            {errorMessage ? <FormError message={errorMessage} /> : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" className="gap-2" disabled={isPending}>
                <Sparkles className="size-4" />
                Generate itinerary
              </Button>
            </div>

            <p className="text-muted-foreground text-xs leading-relaxed">
              Generation usually takes 30 seconds to a few minutes depending on
              your hardware and the number of stops. Your inputs are kept if
              anything fails.
            </p>
          </form>

          {isPending ? (
            <div className="bg-background/85 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
              <ProgressView stage={stage as Exclude<Stage, "idle">} />
            </div>
          ) : null}
        </div>
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
          This can take up to a few minutes on local models.
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
