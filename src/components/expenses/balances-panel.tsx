"use client";

import { useTransition } from "react";
import { ArrowRight, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { settleSharesAction } from "@/server/actions/expenses";
import { formatCurrency } from "@/lib/format";

interface MemberShape {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

interface Transaction {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

interface BalancesPanelProps {
  tripId: string;
  currency: string;
  balances: Array<{ userId: string; net: number }>;
  transactions: Transaction[];
  membersById: Record<string, MemberShape>;
}

export function BalancesPanel({
  tripId,
  currency,
  balances,
  transactions,
  membersById,
}: BalancesPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg tracking-tight">Balances</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Net per traveller after every expense and share.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {balances.map((b) => {
          const m = membersById[b.userId];
          if (!m) return null;
          const initials = m.name
            .split(" ")
            .map((s) => s[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          const tone =
            b.net > 0.01
              ? "text-emerald-600 dark:text-emerald-400"
              : b.net < -0.01
                ? "text-destructive"
                : "text-muted-foreground";
          const label =
            b.net > 0.01 ? "is owed" : b.net < -0.01 ? "owes" : "settled";
          return (
            <li
              key={b.userId}
              className="border-border/70 bg-card flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="flex items-center gap-3">
                <Avatar className="size-8">
                  {m.avatarUrl ? <AvatarImage src={m.avatarUrl} alt="" /> : null}
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-muted-foreground text-xs">{label}</p>
                </div>
              </div>
              <p
                className={`font-display tabular-nums text-base tracking-tight ${tone}`}
              >
                {b.net === 0
                  ? "—"
                  : formatCurrency(Math.abs(b.net), currency)}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="border-border/60 border-t pt-6">
        <h3 className="font-display text-base tracking-tight">Settle up</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Suggested transfers — the minimum number of moves to clear all
          balances.
        </p>

        {transactions.length === 0 ? (
          <p className="text-muted-foreground mt-4 flex items-center gap-2 text-sm">
            <CheckCheck className="size-4" />
            Everyone is settled.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {transactions.map((t, i) => {
              const from = membersById[t.fromUserId];
              const to = membersById[t.toUserId];
              if (!from || !to) return null;
              return (
                <li
                  key={`${t.fromUserId}-${t.toUserId}-${i}`}
                  className="border-border/70 bg-card flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="flex flex-1 items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{from.name}</span>
                    <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                    <span className="truncate font-medium">{to.name}</span>
                  </div>
                  <span className="font-display tabular-nums text-sm">
                    {formatCurrency(t.amount, currency)}
                  </span>
                  <SettleButton
                    tripId={tripId}
                    fromUserId={t.fromUserId}
                    toUserId={t.toUserId}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function SettleButton({
  tripId,
  fromUserId,
  toUserId,
}: {
  tripId: string;
  fromUserId: string;
  toUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await settleSharesAction({
            tripId,
            fromUserId,
            toUserId,
          });
          if (result.ok) toast.success("Marked settled");
          else toast.error(result.error);
        })
      }
    >
      Mark settled
    </Button>
  );
}
