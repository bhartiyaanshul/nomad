"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImageUp } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { updateProfileAction } from "@/server/actions/user";
import type { ActionResult } from "@/server/actions/result";

interface ProfileTabProps {
  user: {
    name: string;
    email: string;
    bio: string | null;
    avatarUrl: string | null;
  };
}

const initial: ActionResult<{ updated: true }> | null = null;

export function ProfileTab({ user }: ProfileTabProps) {
  const [state, action] = useActionState(updateProfileAction, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const [previewUrl, setPreviewUrl] = useState<string | null>(user.avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok) toast.success("Profile updated");
  }, [state]);

  const initials = user.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <form action={action} className="flex max-w-xl flex-col gap-6">
      <div className="flex items-center gap-5">
        <Avatar className="size-16">
          {previewUrl ? <AvatarImage src={previewUrl} alt="" /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <ImageUp className="size-4" />
            Change photo
          </Button>
          <p className="text-muted-foreground text-xs">
            JPEG, PNG, or WebP. 4 MB max.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPreviewUrl(URL.createObjectURL(file));
            }}
          />
        </div>
      </div>

      <Field id="name" label="Name" required errors={fieldErrors?.name}>
        <Input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={user.name}
        />
      </Field>

      <Field id="email" label="Email" hint="Email is not editable here.">
        <Input
          id="email"
          type="email"
          value={user.email}
          disabled
          readOnly
        />
      </Field>

      <Field
        id="bio"
        label="Bio"
        hint="Optional, up to 280 characters."
        errors={fieldErrors?.bio}
      >
        <Textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={user.bio ?? ""}
          maxLength={280}
        />
      </Field>

      {state && !state.ok && !fieldErrors ? (
        <FormError message={state.error} />
      ) : null}

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving">Save changes</SubmitButton>
      </div>
    </form>
  );
}
