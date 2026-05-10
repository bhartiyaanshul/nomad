"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { MarkdownEditor } from "@/components/notes/markdown-editor";
import { addNoteAction } from "@/server/actions/notes";
import type { ActionResult } from "@/server/actions/result";

interface StopOption {
  id: string;
  city: string;
  arrivalDay: number;
  departureDay: number;
}

interface NoteFormProps {
  tripId: string;
  stops: StopOption[];
}

const initial: ActionResult<{ id: string }> | null = null;

export function NoteForm({ tripId, stops }: NoteFormProps) {
  const action = addNoteAction.bind(null, tripId);
  const [state, formAction] = useActionState(action, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formRef = useRef<HTMLFormElement>(null);

  const [stopId, setStopId] = useState("trip");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (state?.ok) {
      toast.success("Note saved");
      formRef.current?.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset after server action
      setContent("");
      setStopId("trip");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="content" value={content} />

      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <Field id="note-title" label="Title" errors={fieldErrors?.title}>
          <Input
            id="note-title"
            name="title"
            maxLength={120}
            placeholder="Optional"
          />
        </Field>
        <Field id="note-stop" label="Scope" errors={fieldErrors?.stopId}>
          <Select
            value={stopId}
            onValueChange={setStopId}
            name="stopId"
          >
            <SelectTrigger id="note-stop">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trip">Whole trip</SelectItem>
              {stops.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.city} (D{s.arrivalDay}
                  {s.departureDay > s.arrivalDay ? `–${s.departureDay}` : ""})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field
        id="note-content"
        label="Content"
        required
        errors={fieldErrors?.content}
      >
        <MarkdownEditor value={content} onChange={setContent} />
      </Field>

      {state && !state.ok && !fieldErrors ? (
        <FormError message={state.error} />
      ) : null}

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving" disabled={!content.trim()}>
          Save note
        </SubmitButton>
      </div>
    </form>
  );
}
