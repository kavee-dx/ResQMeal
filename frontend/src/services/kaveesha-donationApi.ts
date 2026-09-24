// frontend/src/services/kaveesha-donationApi.ts
// Donation API service.
// Owner: Kaveesha

import api from './api';
import axios from 'axios';

import type {
  Donation,
  DonationStatus,
  CreateDonationFormState,
} from '../types/kaveesha-donation.types';

import type {
  CreateDonationState,
} from '../context/kaveesha-CreateDonationContext';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

/* ========================================================= */
/* DONATION NORMALIZATION                                    */
/* ========================================================= */

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

  let expiresInHours =
    donation.expiresInHours;

  if (
    expiresInHours === undefined &&
    donation.expiryTime
  ) {
    const expiry =
      new Date(
        donation.expiryTime,
      ).getTime();

    if (!Number.isNaN(expiry)) {
      expiresInHours = Math.max(
        0,
        Math.ceil(
          (expiry - Date.now()) /
            (1000 * 60 * 60),
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
    expiresInHours,
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

/* ========================================================= */
/* TIME HELPERS                                               */
/* ========================================================= */

function parseTimeToISO(
  value: string,
): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(
      'Time is required.',
    );
  }

  const directDate =
    new Date(trimmed);

  if (
    !Number.isNaN(
      directDate.getTime(),
    ) &&
    /[-/]/.test(trimmed)
  ) {
    return directDate.toISOString();
  }

  const match =
    trimmed.match(
      /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i,
    );

  if (!match) {
    throw new Error(
      `Invalid time "${value}". Please use a format such as 10:00 AM.`,
    );
  }

  let hour =
    Number(match[1]);

  const minute =
    Number(match[2] || '0');

  const period =
    match[3].toUpperCase();

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

/* ========================================================= */
/* CREATE PAYLOAD                                             */
/* ========================================================= */

function mapDonationStateToPayload(
  state: CreateDonationState,
) {
  const quantity =
    Number(state.quantity);

  const numberOfPortions =
    Number(state.portions);

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
    parseTimeToISO(
      state.preparationTime,
    );

  const expiryTime =
    parseTimeToISO(
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

    availabilityStart:
      preparationTime,

    availabilityEnd:
      expiryTime,

    storageCondition:
      state.storageCondition,

    allergenInfo,

    packagingCondition,

    additionalDetails:
      state.additionalDetails.trim(),

    photoBase64:
      state.photoBase64 ||
      null,

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

/* ========================================================= */
/* CREATE                                                     */
/* ========================================================= */

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

/* ========================================================= */
/* GET MY DONATIONS                                           */
/* ========================================================= */

export async function getMyDonations(
  status: 'all' | DonationStatus = 'all',
): Promise<Donation[]> {
  const response =
    await api.get<
      ApiResponse<Donation[]>
    >(
      '/donor/donations',
      {
        params: {
          status,
        },
      },
    );

  return normalizeDonations(
    response.data.data,
  );
}

/* ========================================================= */
/* BACKWARD-COMPATIBLE GET                                    */
/* ========================================================= */

export async function getDonations(
  status: 'all' | DonationStatus = 'all',
): Promise<Donation[]> {
  return getMyDonations(
    status,
  );
}

/* ========================================================= */
/* GET ONE                                                     */
/* ========================================================= */

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

/* ========================================================= */
/* UPDATE                                                      */
/* ========================================================= */

export async function updateDonation(
  id: string,
  values: Partial<CreateDonationFormState>,
): Promise<Donation> {
  const payload: Record<
    string,
    unknown
  > = {};

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
    const quantity =
      Number(
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
    const portions =
      Number(
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

    payload.numberOfPortions =
      portions;
  }

  if (
    values.storageCondition !==
    undefined
  ) {
    payload.storageCondition =
      values.storageCondition;
  }

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

  if (
    values.additionalDetails !==
    undefined
  ) {
    payload.additionalDetails =
      values.additionalDetails.trim();
  }

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
}

export default {
  createDonation,
  getMyDonations,
  getDonations,
  getDonationById,
  updateDonation,
};