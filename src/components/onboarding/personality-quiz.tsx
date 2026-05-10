"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QUIZ } from "@/lib/personality";
import {
  skipPersonalityQuizAction,
  submitPersonalityQuizAction,
} from "@/server/actions/personality";
import { cn } from "@/lib/utils";

interface PersonalityQuizProps {
  open: boolean;
}

const PERSONALITY_LABELS: Record<string, string> = {
  foodie: "Foodie",
  adventurer: "Adventurer",
  culture: "Culture",
  chill: "Chill",
  social: "Social",
  budget: "Budget",
  luxury: "Luxury",
  mixed: "Mixed",
};

export function PersonalityQuiz({ open }: PersonalityQuizProps) {
  const [isOpen, setIsOpen] = useState(open);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  const total = QUIZ.length;
  const current = QUIZ[step];
  const selected = current ? answers[current.id] : undefined;
  const canBack = step > 0 && !result;
  const canNext = Boolean(selected);
  const isLast = step === total - 1;

  function next() {
    if (!canNext) return;
    if (isLast) {
      startTransition(async () => {
        const res = await submitPersonalityQuizAction(answers);
        if (res.ok) {
          setResult(res.personality);
          toast.success("Personality saved");
        } else {
          toast.error(res.error);
        }
      });
      return;
    }
    setStep((s) => s + 1);
  }

  function skip() {
    startTransition(async () => {
      await skipPersonalityQuizAction();
      setIsOpen(false);
    });
  }

  function close() {
    if (!result) return;
    setIsOpen(false);
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o && !result) return; // require completion or skip
        setIsOpen(o);
      }}
    >
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        {result ? (
          <div className="flex flex-col gap-6 py-2">
            <DialogHeader>
              <p className="text-muted-foreground text-xs tracking-wide uppercase">
                Your travel personality
              </p>
              <DialogTitle className="font-display text-3xl tracking-tight">
                {PERSONALITY_LABELS[result] ?? "Mixed"}
              </DialogTitle>
              <DialogDescription>
                We&apos;ll weight every itinerary, recommendation, and match
                around this. You can change it in Settings any time.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end">
              <Button onClick={close}>Continue to dashboard</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs tracking-wide uppercase">
                Personality · question {step + 1} of {total}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={skip}
                disabled={pending}
                className="text-muted-foreground h-7 px-2 text-xs"
              >
                Skip for now
              </Button>
            </div>
            <Progress
              value={((step + 1) / total) * 100}
              className="h-1.5"
            />
            <DialogHeader>
              <DialogTitle className="font-display text-2xl tracking-tight">
                {current.prompt}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Choose the option that fits best.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              {current.options.map((opt) => {
                const active = selected === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setAnswers((a) => ({ ...a, [current.id]: opt.id }))
                    }
                    className={cn(
                      "border-border/70 hover:border-primary/60 hover:bg-accent/40 rounded-md border px-4 py-3 text-left text-sm transition",
                      active &&
                        "border-primary bg-primary/5 text-foreground shadow-[inset_0_0_0_1px_var(--color-primary)]",
                    )}
                  >
                    {opt.label.replace(/&apos;/g, "’")}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!canBack || pending}
                onClick={() => setStep((s) => s - 1)}
                className="gap-2"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button
                type="button"
                disabled={!canNext || pending}
                onClick={next}
                className="gap-2"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : isLast ? (
                  "See result"
                ) : (
                  <>
                    Next
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
