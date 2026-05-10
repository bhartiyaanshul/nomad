"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { SubmitButton } from "@/components/forms/submit-button";
import {
  inviteMemberAction,
  removeMemberAction,
  updateMemberRoleAction,
} from "@/server/actions/members";
import type { ActionResult } from "@/server/actions/result";

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface MembersPanelProps {
  tripId: string;
  members: Member[];
  isOwner: boolean;
  currentUserId: string;
  ownerId: string;
}

const initial: ActionResult<{ status: "added" | "pending" }> | null = null;

export function MembersPanel({
  tripId,
  members,
  isOwner,
  currentUserId,
  ownerId,
}: MembersPanelProps) {
  const action = inviteMemberAction.bind(null, tripId);
  const [state, formAction] = useActionState(action, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Member added");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg tracking-tight">Members</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Owners can invite, change roles, and remove travellers.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {members.map((m) => {
          const initials = m.user.name
            .split(" ")
            .map((s) => s[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          const isMe = m.user.id === currentUserId;
          const isOwnerRow = m.user.id === ownerId;
          return (
            <li
              key={m.id}
              className="border-border/70 bg-card flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="size-9">
                  {m.user.avatarUrl ? (
                    <AvatarImage src={m.user.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback className="text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {m.user.name}
                    {isMe ? (
                      <span className="text-muted-foreground"> · you</span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {m.user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOwner && !isOwnerRow ? (
                  <RoleSelect
                    memberId={m.id}
                    currentRole={m.role}
                    onChanged={() => toast.success("Role updated")}
                  />
                ) : (
                  <span className="text-muted-foreground text-xs capitalize">
                    {m.role.replace("-", " ")}
                  </span>
                )}
                {isOwner && !isOwnerRow ? (
                  <RemoveButton memberId={m.id} userName={m.user.name} />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {isOwner ? (
        <form
          ref={formRef}
          action={formAction}
          className="border-border/60 flex flex-col gap-3 border-t pt-6"
          noValidate
        >
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Invite by email
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <Field
              id="invite-email"
              label="Email"
              required
              errors={fieldErrors?.email}
            >
              <Input
                id="invite-email"
                name="email"
                type="email"
                placeholder="friend@example.com"
                required
              />
            </Field>
            <Field id="invite-role" label="Role" errors={fieldErrors?.role}>
              <Select name="role" defaultValue="traveler">
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="traveler">Traveller</SelectItem>
                  <SelectItem value="co-planner">Co-planner</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {state && !state.ok && !fieldErrors ? (
            <FormError message={state.error} />
          ) : null}
          <div className="flex justify-end">
            <SubmitButton size="sm" pendingLabel="Adding">
              <UserPlus className="size-4" />
              Add member
            </SubmitButton>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function RoleSelect({
  memberId,
  currentRole,
  onChanged,
}: {
  memberId: string;
  currentRole: string;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      defaultValue={currentRole}
      disabled={pending}
      onValueChange={(v) =>
        startTransition(async () => {
          await updateMemberRoleAction(memberId, v);
          onChanged();
        })
      }
    >
      <SelectTrigger className="h-8 w-32 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="traveler">Traveller</SelectItem>
        <SelectItem value="co-planner">Co-planner</SelectItem>
      </SelectContent>
    </Select>
  );
}

function RemoveButton({
  memberId,
  userName,
}: {
  memberId: string;
  userName: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label={`Remove ${userName}`}
      onClick={() =>
        startTransition(async () => {
          await removeMemberAction(memberId);
          toast.success(`Removed ${userName}`);
        })
      }
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
