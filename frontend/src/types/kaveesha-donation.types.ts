// frontend/src/types/kaveesha-donation.types.ts
// Owner: Kaveesha

export type DonationStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type DonationPriority =
  | 'low'
  | 'medium'
  | 'high';

export type DonationUrgency =
  | 'NORMAL'
  | 'MEDIUM'
  | 'HIGH';

export type DonationTypeOption =
  | 'NORMAL'
  | 'URGENT';

export type InputMethod =
  | 'MANUAL'
  | 'VOICE';

export type QuantityUnit =
  | 'kg'
  | 'g'
  | 'L'
  | 'mL'
  | 'items'
  | 'boxes'
  | 'trays'
  | 'packs'
  | 'other';

export type StorageCondition =
  | 'Refrigerated'
  | 'Frozen'
  | 'Room Temperature'
  | 'Other';

/**
 * Backend donation object
 */
export interface Donation {
  id: string;
  _id?: string;

  donor?: string;
  donationCode?: string;

  donationType?: DonationTypeOption;

  // Backend fields
  foodType: string;
  foodCategory: string;

  quantity: number;
  quantityUnit?: QuantityUnit;

  numberOfPortions: number;

  preparationTime: string;
  expiryTime: string;

  availabilityStart?: string;
  availabilityEnd?: string;

  storageCondition?: string;
  allergenInfo?: string;
  packagingCondition?: string;

  additionalDetails?: string;

  photoUrl?: string | null;

  pickupAddress?: string;
  pickupDistrict?: string;

  pickupWindowStart?: string | null;
  pickupWindowEnd?: string | null;

  aiResult?: string;
  aiReason?: string;

  safety?: {
    storage: string | null;
    temperature: string | null;
    handling: string | null;
    packaging: string | null;
    allergens: string | null;
  };

  priority?: DonationPriority;

  status: DonationStatus;

  createdAt?: string;
  updatedAt?: string;

  // Existing UI compatibility fields
  foodName: string;
  category: string;
  portions: number;
  pickupLocation: string;
  urgency: DonationUrgency;
  expiresInHours: number;
}

/**
 * Create donation state used by the Create Donation flow.
 */
export interface CreateDonationFormState {
  donationType: DonationTypeOption;
  inputMethod: InputMethod;

  foodType: string;
  category: string;

  quantity: string;
  quantityUnit: QuantityUnit;

  portions: string;

  preparationDate?: string;
  preparationTime: string;

  expiryDate?: string;
  expiryTime: string;

  storageCondition: string;

  pickupLocation: string;
  pickupDistrict: string;

  pickupAvailableFromDate?: string;
  pickupAvailableFromTime?: string;

  pickupAvailableUntilDate?: string;
  pickupAvailableUntilTime?: string;

  additionalDetails: string;

  allergenInfo?: string;
  packagingCondition?: string;

  photoUri: string | null;
  photoBase64?: string | null;
  photoMimeType?: string | null;
}

/**
 * Form state specifically used by Edit Donation.
 *
 * Safety answers are intentionally not part of this editable form.
 * They are displayed as read-only information on the Edit screen.
 */
export interface DonationFormValues {
  donationType: DonationTypeOption;

  foodType: string;
  category: string;

  quantity: string;
  quantityUnit: QuantityUnit;

  portions: string;

  preparationDate: string;
  preparationTime: string;

  expiryDate: string;
  expiryTime: string;

  pickupLocation: string;
  pickupDistrict: string;

  pickupAvailableFromDate: string;
  pickupAvailableFromTime: string;

  pickupAvailableUntilDate: string;
  pickupAvailableUntilTime: string;

  additionalDetails: string;

  // Read-only safety information
  storageCondition: string;
  allergenInfo: string;
  packagingCondition: string;
}

export type DonationFormErrors = Partial<
  Record<keyof DonationFormValues, string>
>;

/**
 * Empty edit form.
 */
export const emptyDonationForm: DonationFormValues = {
  donationType: 'NORMAL',

  foodType: '',
  category: '',

  quantity: '',
  quantityUnit: 'kg',

  portions: '',

  preparationDate: '',
  preparationTime: '',

  expiryDate: '',
  expiryTime: '',

  pickupLocation: '',
  pickupDistrict: '',

  pickupAvailableFromDate: '',
  pickupAvailableFromTime: '',

  pickupAvailableUntilDate: '',
  pickupAvailableUntilTime: '',

  additionalDetails: '',

  storageCondition: '',
  allergenInfo: '',
  packagingCondition: '',
};

/**
 * Convert an ISO/backend date-time value into separate
 * YYYY-MM-DD and 12-hour time fields.
 *
 * Example:
 * 2026-09-29T04:30:00.000Z
 * -> 2026-09-29 / 10:00 AM
 */
function splitDateTime(value?: string | null) {
  if (!value) {
    return {
      date: '',
      time: '',
    };
  }

  const parsed = new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');

    let hours = parsed.getHours();
    const minutes = String(parsed.getMinutes()).padStart(2, '0');

    const period = hours >= 12 ? 'PM' : 'AM';

    if (hours === 0) {
      hours = 12;
    } else if (hours > 12) {
      hours -= 12;
    }

    return {
      date: `${year}-${month}-${day}`,
      time: `${String(hours).padStart(2, '0')}:${minutes} ${period}`,
    };
  }

  /**
   * If an old donation contains only a time value,
   * preserve the time so the user can provide the missing date.
   */
  const timeOnly = value.match(
    /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i,
  );

  if (timeOnly) {
    return {
      date: '',
      time: value,
    };
  }

  return {
    date: '',
    time: value,
  };
}

/**
 * Convert a backend Donation into the Edit Donation form.
 */
export function donationToFormValues(
  donation: Donation,
): DonationFormValues {
  const preparation = splitDateTime(donation.preparationTime);

  const expiry = splitDateTime(donation.expiryTime);

  /**
   * Newer records should use pickupWindowStart/End.
   *
   * availabilityStart/End are used as a fallback because
   * older records may have stored pickup availability there.
   */
  const pickupStart = splitDateTime(
    donation.pickupWindowStart || donation.availabilityStart,
  );

  const pickupEnd = splitDateTime(
    donation.pickupWindowEnd || donation.availabilityEnd,
  );

  const quantityUnit: QuantityUnit =
    donation.quantityUnit &&
    [
      'kg',
      'g',
      'L',
      'mL',
      'items',
      'boxes',
      'trays',
      'packs',
      'other',
    ].includes(donation.quantityUnit)
      ? donation.quantityUnit
      : 'kg';

  return {
    donationType:
      donation.donationType === 'URGENT'
        ? 'URGENT'
        : 'NORMAL',

    foodType:
      donation.foodType ||
      donation.foodName ||
      '',

    category:
      donation.foodCategory ||
      donation.category ||
      '',

    quantity:
      donation.quantity !== undefined
        ? String(donation.quantity)
        : '',

    quantityUnit,

    portions:
      donation.numberOfPortions !== undefined
        ? String(donation.numberOfPortions)
        : donation.portions !== undefined
          ? String(donation.portions)
          : '',

    preparationDate: preparation.date,
    preparationTime: preparation.time,

    expiryDate: expiry.date,
    expiryTime: expiry.time,

    pickupLocation:
      donation.pickupAddress ||
      donation.pickupLocation ||
      '',

    pickupDistrict:
      donation.pickupDistrict ||
      '',

    pickupAvailableFromDate: pickupStart.date,
    pickupAvailableFromTime: pickupStart.time,

    pickupAvailableUntilDate: pickupEnd.date,
    pickupAvailableUntilTime: pickupEnd.time,

    additionalDetails:
      donation.additionalDetails ||
      '',

    storageCondition:
      donation.storageCondition ||
      '',

    allergenInfo:
      donation.allergenInfo ||
      '',

    packagingCondition:
      donation.packagingCondition ||
      '',
  };
}