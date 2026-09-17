export type RequestStatus = "pending" | "accepted" | "fulfilled" | "expired";
export type RequestUrgency = "fresh" | "soon" | "urgent";

export interface EmergencyRequest {
  id: string;
  requesterName: string;
  foodNeeded: string;
  quantity: string;
  status: RequestStatus;
  urgency: RequestUrgency;
  location?: string;
  requestedAt: string;
  expiresAt: string;
}