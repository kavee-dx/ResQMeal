export type CampaignCategory =
  | 'surplus_pickup'
  | 'food_drive'
  | 'volunteer_call'
  | 'awareness';

export const CAMPAIGN_CATEGORIES: { value: CampaignCategory; label: string }[] = [
  { value: 'surplus_pickup', label: 'Surplus pickup' },
  { value: 'food_drive', label: 'Food drive' },
  { value: 'volunteer_call', label: 'Volunteer call' },
  { value: 'awareness', label: 'Awareness' },
];

export interface CampaignFormValues {
  title: string;
  description: string;
  category: CampaignCategory;
  location: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  targetMeals: string; // kept as text in the form, sent as a number
  contactPhone: string;
  imageUri: string | null; // optional
}

export type CampaignFormErrors = Partial<Record<keyof CampaignFormValues, string>>;

// A campaign as returned by the API
export interface CampaignPost {
  _id: string;
  title: string;
  description: string;
  category: CampaignCategory;
  location: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  targetMeals?: number;
  contactPhone: string;
  imageUrl?: string; // relative path, e.g. /uploads/campaigns/123.jpg
  status: 'active' | 'closed';
  createdAt: string;
}