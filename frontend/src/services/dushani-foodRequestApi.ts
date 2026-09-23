import api from './api';

export type FoodRequestUrgency = 'URGENT' | 'NORMAL';
export type FoodRequestStatus =
  | 'PENDING'
  | 'MATCHED'
  | 'FULFILLED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface FoodRequestPayload {
  foodType: string;
  quantity: string;
  location: string;
  details?: string;
  contactNumber: string;
  urgency?: FoodRequestUrgency;
}

export interface FoodRequest {
  _id: string;
  foodType: string;
  quantity: string;
  location: string;
  details?: string;
  contactNumber?: string;
  urgency: FoodRequestUrgency;
  priority: 'HIGH' | 'NORMAL';
  status: FoodRequestStatus;
  expiresAt?: string;
  createdAt: string;
}

// POST /api/recipient/food-requests
export async function createFoodRequest(payload: FoodRequestPayload) {
  const response = await api.post<FoodRequest>(
    '/recipient/food-requests',
    payload,
  );
  return response.data;
}

// POST /api/recipient/food-requests/emergency
// Server forces urgency=URGENT + priority=HIGH regardless of payload.
export async function createEmergencyFoodRequest(
  payload: Omit<FoodRequestPayload, 'urgency'>,
) {
  const response = await api.post<FoodRequest>(
    '/recipient/food-requests/emergency',
    payload,
  );
  return response.data;
}

// GET /api/recipient/food-requests/mine
export async function getMyFoodRequests(): Promise<FoodRequest[]> {
  const response = await api.get<FoodRequest[]>(
    '/recipient/food-requests/mine',
  );
  return response.data;
}
