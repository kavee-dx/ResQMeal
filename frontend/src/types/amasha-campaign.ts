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