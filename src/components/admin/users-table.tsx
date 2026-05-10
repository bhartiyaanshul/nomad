"use client";

import { useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ShieldCheck, Ban, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  toggleAdminAction,
  toggleBanAction,
} from "@/server/actions/admin";
import { useRouter, useSearchParams } from "next/navigation";

interface UserRow {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  banned: boolean;
  createdAt: Date;
  tripCount: number;
}

interface UsersTableProps {
  rows: UserRow[];
  currentUserId: string;
}

export function UsersTable({ rows, currentUserId }: UsersTableProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function exportCsv() {
    const header = ["id", "email", "name", "isAdmin", "banned", "createdAt", "tripCount"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          r.email,
          `"${r.name.replace(/"/g, '""')}"`,
          r.isAdmin,
          r.banned,
          r.createdAt.toISOString(),
          r.tripCount,
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `traveloop-users-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function search(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("q", value);
    else next.delete("q");
    startTransition(() => router.replace(`/admin?${next.toString()}`));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name or email"
            defaultValue={params.get("q") ?? ""}
            onChange={(e) => search(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>

      <div className="border-border/70 overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Trips</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {r.email}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.tripCount}
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums text-xs">
                  {format(r.createdAt, "d MMM yyyy")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {r.isAdmin ? (
                      <Badge variant="secondary" className="text-[10px]">
                        <ShieldCheck className="size-3" />
                        Admin
                      </Badge>
                    ) : null}
                    {r.banned ? (
                      <Badge
                        variant="outline"
                        className="text-destructive border-destructive/40 text-[10px]"
                      >
                        Banned
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {r.id === currentUserId ? (
                      <span className="text-muted-foreground text-xs">
                        (you)
                      </span>
                    ) : (
                      <>
                        <RowAction
                          label={r.isAdmin ? "Demote" : "Promote"}
                          icon={ShieldCheck}
                          run={() => toggleAdminAction(r.id, !r.isAdmin)}
                        />
                        <RowAction
                          label={r.banned ? "Unban" : "Ban"}
                          icon={Ban}
                          tone={!r.banned ? "destructive" : undefined}
                          run={() => toggleBanAction(r.id, !r.banned)}
                        />
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-muted-foreground text-xs">
        Showing first 100 results.{" "}
        <Link href="/admin" className="hover:text-foreground underline-offset-4 hover:underline">
          Reset
        </Link>
      </p>
    </div>
  );
}

function RowAction({
  label,
  icon: Icon,
  tone,
  run,
}: {
  label: string;
  icon: typeof ShieldCheck;
  tone?: "destructive";
  run: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => startTransition(run)}
      className={tone === "destructive" ? "text-destructive" : ""}
    >
      <Icon className="size-3.5" />
      <span className="text-xs">{label}</span>
    </Button>
  );
}
