/**
 * kaveesha-donation.types.ts
 * Location: frontend/src/types/kaveesha-donation.types.ts
 */

export type DonationStatus = 'pending' | 'active' | 'expiring' | 'completed' | 'cancelled';
export type DonationPriority = 'low' | 'medium' | 'high';
export type StorageCondition = 'Refrigerated' | 'Frozen' | 'Room Temperature' | 'Other';

export interface Donation {
  _id: string;
  donor: string;
  foodType: string;
  foodCategory: string;
  quantity: number;
  numberOfPortions: number;
  preparationTime: string;
  expiryTime: string;
  storageCondition: StorageCondition;
  allergenInfo?: string;
  packagingCondition?: string;
  photoUrl?: string | null;
  pickupAddress?: string;
  pickupDistrict?: string;
  pickupWindowStart?: string | null;
  pickupWindowEnd?: string | null;
  status: DonationStatus;
  priority: DonationPriority;
  donationCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DonationFormValues {
  foodType: string;
  foodCategory: string;
  quantity: string;
  numberOfPortions: string;
  preparationTime: string;
  expiryTime: string;
  storageCondition: StorageCondition;
  allergenInfo: string;
  packagingCondition: string;
  pickupAddress: string;
  pickupDistrict: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
}

export const emptyDonationForm: DonationFormValues = {
  foodType: '',
  foodCategory: '',
  quantity: '',
  numberOfPortions: '',
  preparationTime: '',
  expiryTime: '',
  storageCondition: 'Room Temperature',
  allergenInfo: '',
  packagingCondition: '',
  pickupAddress: '',
  pickupDistrict: '',
  pickupWindowStart: '',
  pickupWindowEnd: '',
};

/** Converts a Donation record back into editable form values (for the Edit screen) */
export function donationToFormValues(donation: Donation): DonationFormValues {
  return {
    foodType: donation.foodType ?? '',
    foodCategory: donation.foodCategory ?? '',
    quantity: String(donation.quantity ?? ''),
    numberOfPortions: String(donation.numberOfPortions ?? ''),
    preparationTime: donation.preparationTime ?? '',
    expiryTime: donation.expiryTime ?? '',
    storageCondition: donation.storageCondition ?? 'Room Temperature',
    allergenInfo: donation.allergenInfo ?? '',
    packagingCondition: donation.packagingCondition ?? '',
    pickupAddress: donation.pickupAddress ?? '',
    pickupDistrict: donation.pickupDistrict ?? '',
    pickupWindowStart: donation.pickupWindowStart ?? '',
    pickupWindowEnd: donation.pickupWindowEnd ?? '',
  };
}

export interface DonationFormErrors {
  [key: string]: string | undefined;
}