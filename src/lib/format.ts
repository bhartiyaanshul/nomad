import { format, formatDistanceToNowStrict, isAfter, isBefore } from "date-fns";

export function formatDateRange(
  start: Date | string,
  end: Date | string,
): string {
  const s = new Date(start);
  const e = new Date(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();
  if (sameMonth) {
    return `${format(s, "d")}–${format(e, "d MMM yyyy")}`;
  }
  if (sameYear) {
    return `${format(s, "d MMM")} – ${format(e, "d MMM yyyy")}`;
  }
  return `${format(s, "d MMM yyyy")} – ${format(e, "d MMM yyyy")}`;
}

export function formatTripStatus(
  start: Date | string,
  end: Date | string,
): "upcoming" | "ongoing" | "completed" {
  const now = new Date();
  if (isBefore(now, new Date(start))) return "upcoming";
  if (isAfter(now, new Date(end))) return "completed";
  return "ongoing";
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNowStrict(new Date(date), { addSuffix: true });
}

export function formatCurrency(
  amount: number,
  currency = "USD",
  options: Intl.NumberFormatOptions = {},
): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
      ...options,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function tripDayCount(
  start: Date | string,
  end: Date | string,
): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / 86_400_000) + 1);
}
