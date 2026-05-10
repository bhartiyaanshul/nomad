// Currency conversion via exchangerate-api.com (free tier).
// Cached in the CurrencyRate table for 24h. Without an API key we
// pass amounts through unchanged and surface that in the UI.

import { db } from "@/lib/db";

const TTL_MS = 24 * 60 * 60 * 1000;

const apiKey = process.env.EXCHANGE_RATE_API_KEY;

export const currencyConversionEnabled = Boolean(apiKey);

export interface ConversionResult {
  amount: number;
  rate: number;
  converted: boolean;
}

export async function convertAmount(
  amount: number,
  from: string,
  to: string,
): Promise<ConversionResult> {
  if (from === to) return { amount, rate: 1, converted: false };
  if (!apiKey) return { amount, rate: 1, converted: false };

  const rate = await fetchRate(from, to);
  return {
    amount: Math.round(amount * rate * 100) / 100,
    rate,
    converted: true,
  };
}

async function fetchRate(from: string, to: string): Promise<number> {
  const cached = await db.currencyRate.findUnique({
    where: { base_target: { base: from, target: to } },
  });
  if (cached && Date.now() - cached.fetchedAt.getTime() < TTL_MS) {
    return cached.rate;
  }

  try {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${from}/${to}`,
      { next: { revalidate: 0 } },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { conversion_rate?: number };
    const rate = data.conversion_rate ?? 1;
    await db.currencyRate.upsert({
      where: { base_target: { base: from, target: to } },
      create: { base: from, target: to, rate },
      update: { rate, fetchedAt: new Date() },
    });
    return rate;
  } catch (err) {
    console.warn(`[currency] ${from}->${to} failed, using cached/1.0`, err);
    return cached?.rate ?? 1;
  }
}
