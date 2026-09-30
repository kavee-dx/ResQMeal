// frontend/src/services/kaveesha-donationApi.ts
// Owner: Kaveesha

import axios from 'axios';

import api from './api';

import type {
  Donation,
  DonationStatus,
  CreateDonationFormState,
  DonationFormValues,
} from '../types/kaveesha-donation.types';

import type { CreateDonationState } from '../context/kaveesha-CreateDonationContext';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

/**
 * Parse a time-only value into an ISO timestamp using today's date.
 *
 * This remains as a fallback for older code/data.
 */
function parseTimeToISO(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error('Time is required.');
  }

  /*
   * Already a full date/ISO value.
   */
  const directDate = new Date(trimmed);

  if (
    !Number.isNaN(directDate.getTime()) &&
    /[-/T]/.test(trimmed)
  ) {
    return directDate.toISOString();
  }

  /*
   * 12-hour format.
   *
   * Examples:
   * 10:00 AM
   * 5:30 PM
   */
  const twelveHourMatch =
    trimmed.match(
      /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i,
    );

  if (twelveHourMatch) {
    let hour = Number(
      twelveHourMatch[1],
    );

    const minute = Number(
      twelveHourMatch[2] || '0',
    );

    const period =
      twelveHourMatch[3].toUpperCase();

    if (
      hour < 1 ||
      hour > 12 ||
      minute < 0 ||
      minute > 59
    ) {
      throw new Error(
        `Invalid time "${value}".`,
      );
    }

    if (period === 'AM') {
      if (hour === 12) {
        hour = 0;
      }
    } else {
      if (hour !== 12) {
        hour += 12;
      }
    }

    const date = new Date();

    date.setHours(
      hour,
      minute,
      0,
      0,
    );

    return date.toISOString();
  }

  /*
   * 24-hour format.
   *
   * Example:
   * 17:30
   */
  const twentyFourHourMatch =
    trimmed.match(
      /^(\d{1,2}):(\d{2})$/,
    );

  if (twentyFourHourMatch) {
    const hour = Number(
      twentyFourHourMatch[1],
    );

    const minute = Number(
      twentyFourHourMatch[2],
    );

    if (
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      throw new Error(
        `Invalid time "${value}".`,
      );
    }

    const date = new Date();

    date.setHours(
      hour,
      minute,
      0,
      0,
    );

    return date.toISOString();
  }

  throw new Error(
    `Invalid time "${value}". Please use a format such as 10:00 AM.`,
  );
}

/**
 * Combine:
 *
 * YYYY-MM-DD
 * +
 * 10:00 AM
 *
 * into an ISO timestamp.
 */
function combineDateAndTimeToISO(
  dateValue: string,
  timeValue: string,
): string {
  const date = dateValue.trim();
  const time = timeValue.trim();

  if (!date) {
    /*
     * Backward compatibility for older
     * time-only data.
     */
    return parseTimeToISO(time);
  }

  if (!time) {
    throw new Error(
      'Time is required.',
    );
  }

  const dateMatch =
    date.match(
      /^(\d{4})-(\d{2})-(\d{2})$/,
    );

  if (!dateMatch) {
    throw new Error(
      `Invalid date "${date}". Please use YYYY-MM-DD.`,
    );
  }

  const year = Number(
    dateMatch[1],
  );

  const month = Number(
    dateMatch[2],
  );

  const day = Number(
    dateMatch[3],
  );

  /*
   * Parse time.
   */
  let hours: number;
  let minutes: number;

  const twelveHourMatch =
    time.match(
      /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
    );

  const twentyFourHourMatch =
    time.match(
      /^(\d{1,2}):(\d{2})$/,
    );

  if (twelveHourMatch) {
    hours = Number(
      twelveHourMatch[1],
    );

    minutes = Number(
      twelveHourMatch[2],
    );

    const period =
      twelveHourMatch[3].toUpperCase();

    if (
      hours < 1 ||
      hours > 12 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new Error(
        `Invalid time "${time}".`,
      );
    }

    if (period === 'AM') {
      if (hours === 12) {
        hours = 0;
      }
    } else {
      if (hours !== 12) {
        hours += 12;
      }
    }
  } else if (twentyFourHourMatch) {
    hours = Number(
      twentyFourHourMatch[1],
    );

    minutes = Number(
      twentyFourHourMatch[2],
    );

    if (
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new Error(
        `Invalid time "${time}".`,
      );
    }
  } else {
    throw new Error(
      `Invalid time "${time}". Please use a format such as 10:00 AM.`,
    );
  }

  const localDate = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    0,
    0,
  );

  /*
   * Prevent JavaScript from silently converting
   * invalid dates such as 2026-02-31.
   */
  if (
    localDate.getFullYear() !== year ||
    localDate.getMonth() !== month - 1 ||
    localDate.getDate() !== day
  ) {
    throw new Error(
      `Invalid date "${date}".`,
    );
  }

  return localDate.toISOString();
}

/**
 * Use separate date + time fields when available.
 *
 * Otherwise fall back to the old time-only field.
 */
function resolveDateTime(
  dateValue: string | undefined,
  timeValue: string | undefined,
): string {
  const date =
    dateValue?.trim() || '';

  const time =
    timeValue?.trim() || '';

  if (date) {
    return combineDateAndTimeToISO(
      date,
      time,
    );
  }

  return parseTimeToISO(time);
}

/**
 * Normalize one donation so existing screens
 * can use both backend and UI compatibility fields.
 */
function normalizeDonation(
  donation: Donation,
): Donation {
  const foodName =
    donation.foodName ??
    donation.foodType ??
    '';

  const category =
    donation.category ??
    donation.foodCategory ??
    '';

  const portions =
    donation.portions ??
    donation.numberOfPortions ??
    0;

  const pickupLocation =
    donation.pickupLocation ??
    donation.pickupAddress ??
    '';

  /*
   * Donation lifecycle is based on the end of
   * the pickup/availability window.
   *
   * availabilityEnd is preferred because it represents
   * how long the donation is available for rescue.
   *
   * expiryTime remains as a fallback for older records.
   */
  let expiresInHours =
    donation.expiresInHours;

  if (
    expiresInHours === undefined &&
    (
      donation.availabilityEnd ||
      donation.expiryTime
    )
  ) {
    const availabilityEnd =
      donation.availabilityEnd ||
      donation.expiryTime;

    const endTime =
      new Date(
        availabilityEnd,
      ).getTime();

    if (!Number.isNaN(endTime)) {
      expiresInHours =
        Math.max(
          0,
          Math.ceil(
            (
              endTime -
              Date.now()
            ) /
              (
                1000 *
                60 *
                60
              ),
          ),
        );
    }
  }

  const urgency =
    donation.urgency ??
    (
      donation.donationType ===
      'URGENT'
        ? 'HIGH'
        : 'NORMAL'
    );

  return {
    ...donation,

    foodName,
    category,
    portions,
    pickupLocation,

    expiresInHours:
      expiresInHours ?? 0,

    urgency,
  };
}

function normalizeDonations(
  donations: Donation[],
): Donation[] {
  return donations.map(
    normalizeDonation,
  );
}

/**
 * Map Create Donation context into backend payload.
 *
 * IMPORTANT:
 * The new date fields are now used when available.
 */
function mapDonationStateToPayload(
  state: CreateDonationState,
) {
  const quantity = Number(
    state.quantity,
  );

  const numberOfPortions = Number(
    state.portions,
  );

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      'Quantity must be a positive number.',
    );
  }

  if (
    !Number.isFinite(
      numberOfPortions,
    ) ||
    numberOfPortions <= 0
  ) {
    throw new Error(
      'Number of portions must be a positive number.',
    );
  }

  const preparationTime =
    resolveDateTime(
      state.preparationDate,
      state.preparationTime,
    );

  const expiryTime =
    resolveDateTime(
      state.expiryDate,
      state.expiryTime,
    );

  if (
    new Date(expiryTime) <=
    new Date(preparationTime)
  ) {
    throw new Error(
      'Expiry time must be after preparation time.',
    );
  }

  /*
   * Pickup window.
   *
   * If the new pickup date fields exist,
   * use them.
   *
   * Otherwise preserve the previous fallback
   * behaviour.
   */
  let pickupWindowStart: string;
  let pickupWindowEnd: string;

  if (
    state.pickupAvailableFromDate &&
    state.pickupAvailableFromTime
  ) {
    pickupWindowStart =
      combineDateAndTimeToISO(
        state.pickupAvailableFromDate,
        state.pickupAvailableFromTime,
      );
  } else {
    pickupWindowStart =
      preparationTime;
  }

  if (
    state.pickupAvailableUntilDate &&
    state.pickupAvailableUntilTime
  ) {
    pickupWindowEnd =
      combineDateAndTimeToISO(
        state.pickupAvailableUntilDate,
        state.pickupAvailableUntilTime,
      );
  } else {
    pickupWindowEnd =
      expiryTime;
  }

  if (
    new Date(pickupWindowEnd) <=
    new Date(pickupWindowStart)
  ) {
    throw new Error(
      'Pickup end time must be after pickup start time.',
    );
  }

  const allergenInfo =
    state.safety.allergens ===
    'YES'
      ? 'Contains known allergens'
      : state.safety.allergens ===
          'NOT_SURE'
        ? 'Allergen information is not certain'
        : 'No known allergens reported';

  const packagingCondition =
    state.safety.packaging ===
    'YES'
      ? 'Container reported clean and intact'
      : state.safety.packaging ===
          'NO'
        ? 'Container reported as not clean or intact'
        : '';

  return {
    donationType:
      state.donationType,

    foodType:
      state.foodType.trim(),

    foodCategory:
      state.category.trim() ||
      'Uncategorized',

    quantity,

    quantityUnit:
      state.quantityUnit,

    numberOfPortions,

    preparationTime,

    expiryTime,

    /*
     * Keep availability fields synchronized
     * with the pickup window.
     */
    availabilityStart:
      pickupWindowStart,

    availabilityEnd:
      pickupWindowEnd,

    /*
     * Explicit pickup window fields.
     */
    pickupWindowStart,

    pickupWindowEnd,

    storageCondition:
      state.storageCondition,

    allergenInfo,

    packagingCondition,

    additionalDetails:
      state.additionalDetails.trim(),

    photoBase64:
      state.photoBase64 || null,

    photoMimeType:
      state.photoMimeType ||
      'image/jpeg',

    pickupAddress:
      state.pickupLocation.trim(),

    pickupDistrict:
      state.pickupDistrict.trim(),

    aiResult:
      state.aiResult,

    aiReason:
      state.aiReason.trim(),

    safety:
      state.safety,
  };
}

/**
 * Create donation.
 */
export async function createDonation(
  state: CreateDonationState,
): Promise<Donation> {
  const payload =
    mapDonationStateToPayload(
      state,
    );

  try {
    const response =
      await api.post<
        ApiResponse<Donation>
      >(
        '/donor/donations',
        payload,
      );

    return normalizeDonation(
      response.data.data,
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        '[createDonation] Server response:',
        JSON.stringify(
          error.response?.data,
          null,
          2,
        ),
      );

      console.error(
        '[createDonation] Status:',
        error.response?.status,
      );

      console.error(
        '[createDonation] Payload:',
        JSON.stringify(
          payload,
          null,
          2,
        ),
      );
    } else {
      console.error(
        '[createDonation] Unexpected error:',
        error,
      );
    }

    throw error;
  }
}

/**
 * Get current user's donations.
 *
 * IMPORTANT:
 * When status is "all", we do NOT send
 * ?status=all to the backend.
 *
 * This avoids the previous 400 error.
 */
export async function getMyDonations(
  status:
    | 'all'
    | DonationStatus = 'all',
): Promise<Donation[]> {
  const params =
    status === 'all'
      ? undefined
      : {
          status,
        };

  const response =
    await api.get<
      ApiResponse<Donation[]>
    >(
      '/donor/donations',
      {
        params,
      },
    );

  return normalizeDonations(
    response.data.data,
  );
}

/**
 * Alias used by existing screens.
 */
export async function getDonations(
  status:
    | 'all'
    | DonationStatus = 'all',
): Promise<Donation[]> {
  return getMyDonations(
    status,
  );
}

/**
 * Get one donation.
 */
export async function getDonationById(
  id: string,
): Promise<Donation> {
  const response =
    await api.get<
      ApiResponse<Donation>
    >(
      `/donor/donations/${id}`,
    );

  return normalizeDonation(
    response.data.data,
  );
}

/**
 * Update donation.
 *
 * Only editable donation information is sent.
 *
 * IMPORTANT:
 * Safety assessment, AI screening result,
 * storage condition, allergen information,
 * packaging condition and photo are NOT
 * sent here because those are locked after
 * the donation has been posted.
 */
export async function updateDonation(
  id: string,
  values: Partial<
    CreateDonationFormState &
      DonationFormValues
  >,
): Promise<Donation> {
  const payload: Record<
    string,
    unknown
  > = {};

  /*
   * ---------------------------------------------------------
   * Basic donation information
   * ---------------------------------------------------------
   */

  if (
    values.donationType !==
    undefined
  ) {
    payload.donationType =
      values.donationType;
  }

  if (
    values.foodType !==
    undefined
  ) {
    payload.foodType =
      values.foodType.trim();
  }

  if (
    values.category !==
    undefined
  ) {
    payload.foodCategory =
      values.category.trim() ||
      'Uncategorized';
  }

  if (
    values.quantity !==
    undefined
  ) {
    const quantity = Number(
      values.quantity,
    );

    if (
      !Number.isFinite(
        quantity,
      ) ||
      quantity <= 0
    ) {
      throw new Error(
        'Quantity must be a positive number.',
      );
    }

    payload.quantity =
      quantity;
  }

  if (
    values.quantityUnit !==
    undefined
  ) {
    payload.quantityUnit =
      values.quantityUnit;
  }

  if (
    values.portions !==
    undefined
  ) {
    const portions = Number(
      values.portions,
    );

    if (
      !Number.isFinite(
        portions,
      ) ||
      portions <= 0
    ) {
      throw new Error(
        'Number of portions must be a positive number.',
      );
    }

    if (
      !Number.isInteger(
        portions,
      )
    ) {
      throw new Error(
        'Number of portions must be a whole number.',
      );
    }

    payload.numberOfPortions =
      portions;
  }

  /*
   * ---------------------------------------------------------
   * Preparation / expiry
   * ---------------------------------------------------------
   */

  const hasPreparationDate =
    values.preparationDate !==
    undefined;

  const hasPreparationTime =
    values.preparationTime !==
    undefined;

  if (
    hasPreparationDate ||
    hasPreparationTime
  ) {
    payload.preparationTime =
      resolveDateTime(
        values.preparationDate,
        values.preparationTime,
      );
  }

  const hasExpiryDate =
    values.expiryDate !==
    undefined;

  const hasExpiryTime =
    values.expiryTime !==
    undefined;

  if (
    hasExpiryDate ||
    hasExpiryTime
  ) {
    payload.expiryTime =
      resolveDateTime(
        values.expiryDate,
        values.expiryTime,
      );
  }

  if (
    payload.preparationTime &&
    payload.expiryTime
  ) {
    if (
      new Date(
        String(
          payload.expiryTime,
        ),
      ) <=
      new Date(
        String(
          payload.preparationTime,
        ),
      )
    ) {
      throw new Error(
        'Expiry time must be after preparation time.',
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * Pickup information
   * ---------------------------------------------------------
   */

  if (
    values.pickupLocation !==
    undefined
  ) {
    payload.pickupAddress =
      values.pickupLocation.trim();
  }

  if (
    values.pickupDistrict !==
    undefined
  ) {
    payload.pickupDistrict =
      values.pickupDistrict.trim();
  }

  const hasPickupStartDate =
    values.pickupAvailableFromDate !==
    undefined;

  const hasPickupStartTime =
    values.pickupAvailableFromTime !==
    undefined;

  const hasPickupEndDate =
    values.pickupAvailableUntilDate !==
    undefined;

  const hasPickupEndTime =
    values.pickupAvailableUntilTime !==
    undefined;

  /*
   * Convert the supplied pickup fields.
   */
  if (
    hasPickupStartDate ||
    hasPickupStartTime
  ) {
    payload.pickupWindowStart =
      resolveDateTime(
        values.pickupAvailableFromDate,
        values.pickupAvailableFromTime,
      );
  }

  if (
    hasPickupEndDate ||
    hasPickupEndTime
  ) {
    payload.pickupWindowEnd =
      resolveDateTime(
        values.pickupAvailableUntilDate,
        values.pickupAvailableUntilTime,
      );
  }

  /*
   * Keep availabilityStart/availabilityEnd
   * synchronized whenever either pickup window
   * side is being changed.
   *
   * If only one side was supplied, the other side
   * will be preserved by the backend using the
   * existing donation value.
   */
  if (
    payload.pickupWindowStart
  ) {
    payload.availabilityStart =
      payload.pickupWindowStart;
  }

  if (
    payload.pickupWindowEnd
  ) {
    payload.availabilityEnd =
      payload.pickupWindowEnd;
  }

  /*
   * If both pickup values are available in this
   * update, validate their order here as well.
   */
  if (
    payload.pickupWindowStart &&
    payload.pickupWindowEnd
  ) {
    if (
      new Date(
        String(
          payload.pickupWindowEnd,
        ),
      ) <=
      new Date(
        String(
          payload.pickupWindowStart,
        ),
      )
    ) {
      throw new Error(
        'Pickup end time must be after pickup start time.',
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * Additional information
   * ---------------------------------------------------------
   */

  if (
    values.additionalDetails !==
    undefined
  ) {
    payload.additionalDetails =
      values.additionalDetails.trim();
  }

  /*
   * ---------------------------------------------------------
   * IMPORTANT:
   *
   * Do NOT send these fields when editing:
   *
   * - safety
   * - aiResult
   * - aiReason
   * - storageCondition
   * - allergenInfo
   * - packagingCondition
   * - photoUrl
   *
   * They are locked after posting.
   * ---------------------------------------------------------
   */

  try {
    const response =
      await api.patch<
        ApiResponse<Donation>
      >(
        `/donor/donations/${id}`,
        payload,
      );

    return normalizeDonation(
      response.data.data,
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        '[updateDonation] Server response:',
        JSON.stringify(
          error.response?.data,
          null,
          2,
        ),
      );

      console.error(
        '[updateDonation] Status:',
        error.response?.status,
      );

      console.error(
        '[updateDonation] Payload:',
        JSON.stringify(
          payload,
          null,
          2,
        ),
      );
    } else {
      console.error(
        '[updateDonation] Unexpected error:',
        error,
      );
    }

    throw error;
  }
}

/**
 * Delete donation.
 */
export async function deleteDonation(
  id: string,
): Promise<void> {
  await api.delete(
    `/donor/donations/${id}`,
  );
}

/**
 * Cancel donation.
 */
export async function cancelDonation(
  id: string,
): Promise<Donation> {
  const response =
    await api.patch<
      ApiResponse<Donation>
    >(
      `/donor/donations/${id}/cancel`,
    );

  return normalizeDonation(
    response.data.data,
  );
}

export default {
  createDonation,
  getMyDonations,
  getDonations,
  getDonationById,
  updateDonation,
  deleteDonation,
  cancelDonation,
};
