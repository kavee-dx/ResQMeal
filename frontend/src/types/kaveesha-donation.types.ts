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

export interface DonationFormErrors {
  [key: string]: string | undefined;
}