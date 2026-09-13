// frontend/src/types/kaveesha-donation.types.ts
// Owner: Kaveesha

export type DonationStatus =
  | 'PENDING'
  | 'MATCHED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'PUBLISHED';

export type DonationUrgency = 'NORMAL' | 'MEDIUM' | 'HIGH';

export type DonationTypeOption = 'NORMAL' | 'URGENT';

export type InputMethod = 'MANUAL' | 'VOICE';

export interface Donation {
  id: string;
  foodName: string;
  category: string;
  quantity: string;
  portions: number;
  expiresInHours: number;
  urgency: DonationUrgency;
  status: DonationStatus;
  imageUrl?: string;
  pickupLocation: string;
}

export interface CreateDonationFormState {
  donationType: DonationTypeOption;
  inputMethod: InputMethod;
  foodType: string;
  category: string;
  quantity: string;
  portions: string;
  preparationTime: string;
  expiryTime: string;
  storageCondition: string;
  pickupLocation: string;
  additionalDetails: string;
  photoUri: string | null;
}

// --- Discovery sections shown below "Your Donations" ---

export interface NgoCampaign {
  id: string;
  title: string;
  orgName: string;
  location: string;
  goalText: string;
}

export interface RecipientPreview {
  id: string;
  name: string;
  type: string; // e.g. 'Charity', 'Family', 'School'
  distanceKm: number;
  needsText: string;
}

export interface CommunityPost {
  id: string;
  foodName: string;
  donorName: string;
  urgency: DonationUrgency;
  quantity: string;
  location: string;
  expiresInHours: number;
}