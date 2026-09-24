// frontend/src/types/kaveesha-donation.types.ts

// Owner: Kaveesha

export type DonationStatus =
  | 'pending'
  | 'active'
  | 'expiring'
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

export interface CreateDonationFormState {
  donationType: DonationTypeOption;

  inputMethod: InputMethod;

  foodType: string;

  category: string;

  quantity: string;

  quantityUnit: QuantityUnit;

  portions: string;

  preparationTime: string;

  expiryTime: string;

  storageCondition: string;

  pickupLocation: string;

  pickupDistrict: string;

  additionalDetails: string;

  photoUri: string | null;

  photoBase64?: string | null;

  photoMimeType?: string | null;
}