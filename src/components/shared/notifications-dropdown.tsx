"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Bell, CheckCheck } from "lucide-react";
import useSWR from "swr";
import { formatDistanceToNowStrict } from "date-fns";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notifications";

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const fetcher = (url: string): Promise<{ items: NotificationItem[]; count: number }> =>
  fetch(url).then((r) => r.json());

export function NotificationsDropdown() {
  const { data, mutate } = useSWR("/api/notifications/unread", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });
  const items = data?.items ?? [];
  const count = data?.count ?? 0;
  const [, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Notifications, ${count} unread`}
          className="relative"
        >
          <Bell className="size-4" />
          {count > 0 ? (
            <span
              aria-hidden
              className="bg-destructive text-destructive-foreground absolute top-1.5 right-1.5 inline-flex size-4 items-center justify-center rounded-full text-[9px] tabular-nums"
            >
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-border/60 flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          {count > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() =>
                startTransition(async () => {
                  await markAllNotificationsReadAction();
                  mutate();
                })
              }
            >
              <CheckCheck className="size-3" />
              Mark all read
            </Button>
          ) : null}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-xs">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="flex flex-col">
              {items.map((n) => {
                const inner = (
                  <div
                    className="hover:bg-accent/40 flex flex-col gap-1 px-3 py-2.5 transition cursor-pointer"
                    onClick={() =>
                      startTransition(async () => {
                        await markNotificationReadAction(n.id);
                        mutate();
                      })
                    }
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium leading-tight truncate">
                        {n.title}
                      </p>
                      <span className="text-muted-foreground text-[10px] tabular-nums shrink-0">
                        {formatDistanceToNowStrict(new Date(n.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    {n.body ? (
                      <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
                        {n.body}
                      </p>
                    ) : null}
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? <Link href={n.link}>{inner}</Link> : inner}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
