//Defines the shape of profile data for each role — no logic, just type definitions.


export type Role = 'DONOR' | 'RECIPIENT' | 'NGO' | 'VOLUNTEER';

export type DonorType =
  | 'INDIVIDUAL' | 'HOTEL' | 'RESTAURANT' | 'BAKERY'
  | 'SUPERMARKET' | 'CATERING' | 'EVENT_ORGANIZER' | 'OTHER';

export type RecipientType =
  | 'INDIVIDUAL' | 'FAMILY' | 'CHARITY' | 'COMMUNITY_CENTER'
  | 'SCHOOL' | 'DISASTER_RELIEF_ORGANIZATION' | 'OTHER';

export type NgoType =
  | 'NON_PROFIT_ORGANIZATION' | 'CHARITY' | 'COMMUNITY_ORGANIZATION'
  | 'RELIEF_ORGANIZATION' | 'SOCIAL_SERVICE_ORGANIZATION' | 'OTHER';

export type VehicleType =
  | 'WALKING' | 'BICYCLE' | 'MOTORBIKE' | 'THREE_WHEELER'
  | 'CAR' | 'VAN' | 'OTHER';

// Fields every role shares — mirrors backend User.js
export interface BaseProfile {
  id: string;
  fullName?: string;
  email?: string;
  phoneNumber: string;
  role: Role;
  profilePicture?: string;
  address: string;
  district: string;
  city: string;
}

export interface DonorProfile extends BaseProfile {
  role: 'DONOR';
  donorType: DonorType;
  specifiedDonorType?: string;
  businessName?: string;
  authorizedPerson?: string;
  position?: string;
  businessRegistrationNumber?: string;
  businessContactNumber?: string;
  businessEmail?: string;
  businessLogo?: string;
  website?: string;
  description?: string;
}

export interface RecipientProfile extends BaseProfile {
  role: 'RECIPIENT';
  recipientType: RecipientType;
  specifiedRecipientType?: string;
  organizationName?: string;
  organizationRegistrationNumber?: string;
  authorizedPerson?: string;
  position?: string;
  website?: string;
  description?: string;
  peopleNeedingFood: number;
  foodRequirements: string[];
  specialRequirements?: string;
}

export interface NgoProfile extends BaseProfile {
  role: 'NGO';
  organizationName: string;
  ngoRegistrationNumber: string;
  organizationType: NgoType;
  specifiedOrganizationType?: string;
  authorizedPerson: string;
  position: string;
  website?: string;
  description?: string;
  organizationLogo?: string;
}

export interface VolunteerProfile extends BaseProfile {
  role: 'VOLUNTEER';
  vehicleType: VehicleType;
  vehicleNumber?: string;
  preferredDeliveryArea: string;
  preferredDeliveryTime?: string;
}

export type AnyProfile =
  | DonorProfile | RecipientProfile | NgoProfile | VolunteerProfile;