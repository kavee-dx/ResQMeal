// frontend/src/services/dilshara-recipientSuggestionService.ts
// Owner: Dilshara

import api from "./api";

export type SuggestionCriteria =
  | "smart"
  | "location"
  | "urgency"
  | "food"
  | "quantity"
  | "people";

export interface RecipientSuggestion {
  requestId: string;
  recipientId: string;
  recipientType: string | null;
  displayName: string;
  foodType: string;
  quantity: string;
  quantityNote: string | null;
  location: string;
  peopleNeedingFood: number | null;
  urgency: "URGENT" | "NORMAL";
  priority: "HIGH" | "NORMAL";
  foodRequirements: string[];
  specialRequirements: string;
  details: string;
  preferredAt: string | null;
  expiresAt: string;
  matchReason: string;
}

interface SuggestionResponse {
  success: boolean;
  criteria: SuggestionCriteria;
  count: number;
  data: RecipientSuggestion[];
}

export async function getRecipientSuggestions(
  donationId: string,
  criteria: SuggestionCriteria,
): Promise<RecipientSuggestion[]> {
  const response = await api.get<SuggestionResponse>("/recipient-suggestions", {
    params: { donationId, criteria },
  });
  return response.data.data;
}