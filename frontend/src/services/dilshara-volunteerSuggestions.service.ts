import api from "./api";
import type { Assignment } from "./dilshara-assignmentService";

export interface VolunteerSuggestionFactor {
  score: number;
  points: number;
}

export interface VolunteerSuggestion {
  rank: number;
  volunteerId: string;
  displayName: string;
  vehicleType: string | null;
  preferredDeliveryArea: string | null;
  score: number;
  breakdown: {
    distance: VolunteerSuggestionFactor;
    area: VolunteerSuggestionFactor;
    time: VolunteerSuggestionFactor;
    urgency: VolunteerSuggestionFactor;
  };
  reasons: string[];
  routeDistanceKm: number;
  locationPrecision: "EXACT" | "APPROXIMATE";
}

export interface VolunteerSuggestionsResult {
  donation: {
    donationId: string;
    requestId: string;
    foodType: string;
    urgent: boolean;
    pickupDistrict: string | null;
    dropoffDistrict: string | null;
  };
  eligibleCount: number;
  volunteers: VolunteerSuggestion[];
}

export async function getVolunteerSuggestions(
  donationId: string,
): Promise<VolunteerSuggestionsResult> {
  const response = await api.get<VolunteerSuggestionsResult & { success: boolean }>(
    `/assignments/suggestions/${donationId}`,
  );
  return response.data;
}

export async function assignSuggestedVolunteer(
  donationId: string,
  volunteerId: string,
): Promise<Assignment> {
  const response = await api.post<{ success: boolean; assignment: Assignment }>(
    `/assignments/suggestions/${donationId}/assign`,
    { volunteerId },
  );
  return response.data.assignment;
}
