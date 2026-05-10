"use client";

import { useTransition } from "react";
import { Copy, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteTripAction, duplicateTripAction } from "@/server/actions/trips";

interface TripActionsProps {
  tripId: string;
}

export function TripActions({ tripId }: TripActionsProps) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={pending}>
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Trip actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onSelect={() =>
              startTransition(async () => {
                await duplicateTripAction(tripId);
              })
            }
            className="gap-2"
          >
            <Copy className="size-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="text-destructive gap-2"
              >
                <Trash2 className="size-4" />
                Delete trip
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display tracking-tight">
                  Delete this trip?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the trip, every stop, every
                  activity, and any unsettled expenses. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await deleteTripAction(tripId);
                          toast.success("Trip deleted");
                        } catch {
                          // redirect counts as success
                        }
                      })
                    }
                  >
                    Delete forever
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
