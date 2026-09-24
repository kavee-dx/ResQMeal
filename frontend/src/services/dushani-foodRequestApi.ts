import api from './api';

export type FoodRequestUrgency = 'URGENT' | 'NORMAL';
export type FoodRequestStatus =
  | 'PENDING'
  | 'MATCHED'
  | 'DISPATCHED'
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
  /** ISO instant the recipient wants the food — within the next two days. */
  preferredAt?: string;
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
  preferredAt?: string | null;
  expiresAt?: string;
  createdAt: string;
}

/** A live request as it appears on the board — no recipient contact details. */
export interface OpenFoodRequest {
  id: string;
  foodType: string;
  quantity: string;
  location: string;
  urgency: FoodRequestUrgency;
  priority: 'HIGH' | 'NORMAL';
  status: FoodRequestStatus;
  preferredAt: string | null;
  expiresAt: string;
  createdAt: string;
}

/** What a donor gets back after claiming a request — now with contact details. */
export interface AcceptedFoodRequest {
  id: string;
  status: FoodRequestStatus;
  foodType: string;
  quantity: string;
  location: string;
  details: string;
  contactNumber: string;
  urgency: FoodRequestUrgency;
  preferredAt: string | null;
  acceptedAt: string;
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

// GET /api/recipient/food-requests/open
// Every logged-in role can see what recipients still need; emergency requests
// come first and no contact details are included.
export async function getOpenFoodRequests(): Promise<OpenFoodRequest[]> {
  const response = await api.get<OpenFoodRequest[]>(
    '/recipient/food-requests/open',
  );
  return response.data;
}

// POST /api/recipient/food-requests/:id/accept
// Donors only. A request another donor claimed returns a 409.
export async function acceptFoodRequest(
  requestId: string,
): Promise<AcceptedFoodRequest> {
  const response = await api.post<AcceptedFoodRequest>(
    `/recipient/food-requests/${requestId}/accept`,
  );
  return response.data;
}

export type ProgressOutcome = 'active' | 'complete' | 'stopped';
export type TimelineState = 'done' | 'current' | 'upcoming' | 'stopped';

export interface RequestTimelineEntry {
  key: string;
  label: string;
  description: string;
  at: string | null;
  state: TimelineState;
}

export interface RequestProgress {
  status: FoodRequestStatus;
  stage: string;
  stageLabel: string;
  stageTotal: number;
  stepsCompleted: number;
  stepsTotal: number;
  percent: number;
  outcome: ProgressOutcome;
  expiresAt: string | null;
  expiresInMs: number | null;
}

export interface FoodRequestProgress {
  request: Omit<FoodRequest, '_id'> & { id: string };
  progress: RequestProgress;
  timeline: RequestTimelineEntry[];
}

// GET /api/recipient/food-requests/:id/progress
export async function getFoodRequestProgress(
  requestId: string,
): Promise<FoodRequestProgress> {
  const response = await api.get<FoodRequestProgress>(
    `/recipient/food-requests/${requestId}/progress`,
  );
  return response.data;
}

// DELETE /api/recipient/food-requests/:id
// Only succeeds while no donor has claimed the request.
export async function deleteFoodRequest(requestId: string) {
  const response = await api.delete<{ success: boolean; id: string }>(
    `/recipient/food-requests/${requestId}`,
  );
  return response.data;
}
