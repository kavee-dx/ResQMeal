import { Donation } from "@/types/amasha-donation";
import { EmergencyRequest } from "@/types/amasha-request";

export interface TrendPoint {
  label: string; // e.g. "Mon", "09/20"
  count: number;
}

function startOfDay(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

/** Donations posted per day, over the last `days` days. */
export function getDonationsTrend(donations: Donation[], days = 7): TrendPoint[] {
  const buckets = lastNDays(days);
  const counts: Record<string, number> = Object.fromEntries(buckets.map((d) => [d, 0]));

  donations.forEach((d) => {
    const day = startOfDay(d.donatedAt);
    if (day in counts) counts[day]++;
  });

  return buckets.map((day) => ({ label: dayLabel(day), count: counts[day] }));
}

/** Requests that reached 'fulfilled' status per day, over the last `days` days.
 *  Requires an EmergencyRequest.fulfilledAt timestamp — see note below. */
export function getFulfilledTrend(requests: EmergencyRequest[], days = 7): TrendPoint[] {
  const buckets = lastNDays(days);
  const counts: Record<string, number> = Object.fromEntries(buckets.map((d) => [d, 0]));

  requests
    .filter((r) => r.status === "fulfilled" && r.fulfilledAt)
    .forEach((r) => {
      const day = startOfDay(r.fulfilledAt as string);
      if (day in counts) counts[day]++;
    });

  return buckets.map((day) => ({ label: dayLabel(day), count: counts[day] }));
}

/** % of resolved requests (fulfilled or expired) that were fulfilled. */
export function getFulfillmentRate(requests: EmergencyRequest[]): number {
  const resolved = requests.filter((r) => r.status === "fulfilled" || r.status === "expired");
  if (resolved.length === 0) return 0;
  const fulfilled = resolved.filter((r) => r.status === "fulfilled").length;
  return Math.round((fulfilled / resolved.length) * 100);
}

/** Average hours between a request being made and being fulfilled. */
export function getAvgTimeToFulfillmentHours(requests: EmergencyRequest[]): number | null {
  const fulfilled = requests.filter((r) => r.status === "fulfilled" && r.fulfilledAt);
  if (fulfilled.length === 0) return null;

  const totalHours = fulfilled.reduce((sum, r) => {
    const requested = new Date(r.requestedAt).getTime();
    const done = new Date(r.fulfilledAt as string).getTime();
    return sum + (done - requested) / 3_600_000;
  }, 0);

  return Math.round((totalHours / fulfilled.length) * 10) / 10; // 1 decimal
}