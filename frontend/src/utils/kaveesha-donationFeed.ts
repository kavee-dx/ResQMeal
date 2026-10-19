// frontend/src/utils/kaveesha-donationFeed.ts
// Owner: Kaveesha
//
// Pure rules behind the donor home feed. No React, no React Native and no
// network here, so every rule can be checked with plain Jest unit tests and
// reused by the screen without changing what it renders.

import type {
  Donation,
  DonationStatus,
} from "../types/kaveesha-donation.types";

/* ========================================================= */
/* TYPES                                                      */
/* ========================================================= */

export type StatusTone = "success" | "warning" | "info" | "danger" | "muted";

/* Only two ways to slice the home feed: time-critical posts and the rest. */
export type FeedFilterId = "urgent" | "normal";

/**
 * Icon names used by the feed, kept as a literal union so this module stays
 * free of any React Native import. Every member is a valid Ionicons name.
 */
export type FeedIconName =
  | "pulse-outline"
  | "hourglass-outline"
  | "checkmark-done-outline"
  | "close-circle-outline"
  | "alarm-outline";

export interface DonationStatusMeta {
  label: string;
  icon: FeedIconName;
  tone: StatusTone;
}

export interface DonorFeedCounts {
  urgent: number;
  normal: number;
}

export interface DonorImpactSummary {
  pledged: number;
  delivered: number;
  live: number;
}

/* ========================================================= */
/* LABELS                                                     */
/* ========================================================= */

/**
 * Every piece of text on a post comes from the saved donation, so the feed
 * can never show a state the donor has not actually reached.
 */
export function donationStatusMeta(
  status: DonationStatus,
): DonationStatusMeta {
  switch (status) {
    case "active":
      return {
        label: "Open for rescue",
        icon: "pulse-outline",
        tone: "success",
      };

    case "pending":
      return {
        label: "Waiting for match",
        icon: "hourglass-outline",
        tone: "warning",
      };

    case "completed":
      return {
        label: "Delivered",
        icon: "checkmark-done-outline",
        tone: "info",
      };

    case "cancelled":
      return {
        label: "Cancelled",
        icon: "close-circle-outline",
        tone: "muted",
      };

    default:
      return {
        label: "Expired",
        icon: "alarm-outline",
        tone: "danger",
      };
  }
}

export const DONATION_FOOT_NOTE: Record<DonationStatus, string> = {
  active: "Recipients and NGOs can claim this now",
  pending: "In review before it goes live",
  completed: "Handed over to a rescuer",
  cancelled: "You closed this post",
  expired: "The pickup window has passed",
};

/* "18h left", "3d left" - only while the post is still available. */
export function donationExpiryLabel(donation: Donation): string | null {
  if (donation.status !== "active" && donation.status !== "pending") {
    return null;
  }

  const hours = donation.expiresInHours;

  if (typeof hours !== "number" || Number.isNaN(hours)) {
    return null;
  }

  if (hours <= 0) {
    return "Closing now";
  }

  if (hours < 48) {
    return `${hours}h left`;
  }

  return `${Math.round(hours / 24)}d left`;
}

/* Short "when was it posted" label used as the post timestamp. */
export function donationPostedLabel(createdAt?: string): string {
  const time = createdAt ? new Date(createdAt).getTime() : Number.NaN;

  if (Number.isNaN(time)) {
    return "Recent post";
  }

  const minutes = Math.floor((Date.now() - time) / 60000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(createdAt as string).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/* ========================================================= */
/* IDENTITY + URGENCY                                         */
/* ========================================================= */

/* A post is urgent when the donor marked it time-critical at posting time. */
export function isUrgentDonation(donation: Donation): boolean {
  return donation.donationType === "URGENT" || donation.urgency === "HIGH";
}

/*
  /donor/donations answers with lean Mongo documents, where the identifier is
  carried on `_id` and there is no `id`. Reading only `id` produced an empty
  donationId, so the detail page opened with nothing to show.
*/
export function donationRouteId(donation: Donation): string {
  return String(donation.id || donation._id || "");
}

/* ========================================================= */
/* FILTERING + DERIVATION                                     */
/* ========================================================= */

/*
  Expired posts stay off the home page - a pickup window that has already
  closed is not something the donor can act on here. They remain in
  My Donations and still count as pledges in the impact numbers.
*/
export function isVisibleInDonorFeed(donation: Donation): boolean {
  return donation.status !== "expired";
}

/* With no chip selected both tones pass, so the chip only ever narrows. */
export function matchesToneFilter(
  donation: Donation,
  filter: FeedFilterId | null,
): boolean {
  if (!filter) {
    return true;
  }

  return filter === "urgent"
    ? isUrgentDonation(donation)
    : !isUrgentDonation(donation);
}

/* Posts are matched on the words the donor typed against the visible label. */
export function matchesDonationQuery(
  donation: Donation,
  rawQuery: string,
): boolean {
  const query = rawQuery.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return `${donation.foodName ?? ""} ${donation.category ?? ""} ${
    donation.donationCode ?? ""
  } ${donation.pickupLocation ?? ""}`
    .toLowerCase()
    .includes(query);
}

/* Newest first, so the feed opens with what was just posted. */
export function sortDonationsNewestFirst(donations: Donation[]): Donation[] {
  return [...donations].sort(
    (a, b) =>
      new Date(b.createdAt ?? 0).getTime() -
      new Date(a.createdAt ?? 0).getTime(),
  );
}

/* The strip the donor actually sees: pool, then words, then tone, then order. */
export function buildDonorFeed(
  donations: Donation[],
  options: { query: string; filter: FeedFilterId | null },
): Donation[] {
  return sortDonationsNewestFirst(
    donations.filter(
      (donation) =>
        isVisibleInDonorFeed(donation) &&
        matchesDonationQuery(donation, options.query) &&
        matchesToneFilter(donation, options.filter),
    ),
  );
}

/* Chip counts come from the visible pool, so they match what a chip opens. */
export function countToneFilters(donations: Donation[]): DonorFeedCounts {
  const counts: DonorFeedCounts = {
    urgent: 0,
    normal: 0,
  };

  donations
    .filter(isVisibleInDonorFeed)
    .forEach((donation) => {
      counts[isUrgentDonation(donation) ? "urgent" : "normal"] += 1;
    });

  return counts;
}

/**
 * Impact numbers are counted from the donor's own saved donations instead of
 * a preset figure, so nothing on the home page claims a meal that has not
 * actually been posted. Filters never touch these figures.
 */
export function summarizeDonorImpact(
  donations: Donation[],
): DonorImpactSummary {
  let pledged = 0;

  let delivered = 0;

  let live = 0;

  donations.forEach((donation) => {
    const portions = donation.numberOfPortions ?? donation.portions ?? 0;

    pledged += portions;

    if (donation.status === "completed") {
      delivered += portions;
    }

    if (donation.status === "active" || donation.status === "pending") {
      live += 1;
    }
  });

  return {
    pledged,
    delivered,
    live,
  };
}
