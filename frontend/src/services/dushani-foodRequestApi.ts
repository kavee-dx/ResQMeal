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

/** Stages the donor, volunteer or recipient can move a request on to. */
export type FoodRequestAdvance = 'DISPATCHED' | 'FULFILLED';

export interface FoodRequestStage {
  id: string;
  status: FoodRequestStatus;
  stageLabel: string;
  foodType: string;
  quantity: string;
  location: string;
  contactNumber: string;
  acceptedAt: string | null;
  dispatchedAt: string | null;
  fulfilledAt: string | null;
}

// PATCH /api/recipient/food-requests/:id/status
// Forward only: the claiming donor or a volunteer can set DISPATCHED, and
// donor, volunteer or the recipient themselves can set FULFILLED.
export async function updateFoodRequestStatus(
  requestId: string,
  status: FoodRequestAdvance,
): Promise<FoodRequestStage> {
  const response = await api.patch<FoodRequestStage>(
    `/recipient/food-requests/${requestId}/status`,
    { status },
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

/** One of the four criteria the matcher scores a donation on. */
export interface MatchCriterion {
  key: 'foodType' | 'quantity' | 'proximity' | 'urgency';
  label: string;
  weight: number;
  description: string;
}

/** A live donation scored against one of the recipient's own requests. */
export interface DonationMatch {
  donationId: string;
  donationCode: string | null;
  foodType: string;
  foodCategory: string;
  photoUrl: string | null;
  quantity: number;
  numberOfPortions: number | null;
  pickupAddress: string;
  pickupDistrict: string;
  status: string;
  priority: string;
  expiryTime: string | null;
  score: number;
  percent: number;
  breakdown: Record<MatchCriterion['key'], number>;
  reasons: string[];
}

export interface SuggestionGroup {
  request: {
    id: string;
    foodType: string;
    quantity: string;
    location: string;
    urgency: FoodRequestUrgency;
    status: FoodRequestStatus;
    preferredAt: string | null;
    expiresAt: string | null;
  };
  urgent: boolean;
  score: number;
  matches: DonationMatch[];
}

export interface MatchSuggestions {
  criteria: MatchCriterion[];
  groups: SuggestionGroup[];
  suggestions: (DonationMatch & { requestId: string; urgent: boolean })[];
}

// GET /api/recipient/food-requests/matches
// Emergency requests' suggestions are ranked first, so an urgent need is the
// first thing the recipient sees when they search for food.
export async function getMatchSuggestions(): Promise<MatchSuggestions> {
  const response = await api.get<MatchSuggestions>('/recipient/food-requests/matches');
  return response.data;
}

// GET /api/recipient/food-requests/:id/matches
export async function getRequestMatches(
  requestId: string,
): Promise<{ criteria: MatchCriterion[]; request: SuggestionGroup['request']; matches: DonationMatch[] }> {
  const response = await api.get(`/recipient/food-requests/${requestId}/matches`);
  return response.data;
}

/** Which of the recipient's own open requests a donation answers, if any. */
export interface DonationAnswer {
  requestId: string;
  requestFood: string;
  urgency: FoodRequestUrgency;
  urgent: boolean;
  score: number;
  percent: number;
  reasons: string[];
}

/** One live donation from a donor, as the browse page lists it. */
export interface BrowseDonation {
  id: string;
  donationCode: string | null;
  foodType: string;
  foodCategory: string;
  foodGroup: string;
  photoUrl: string | null;
  quantity: number | null;
  numberOfPortions: number | null;
  storageCondition: string | null;
  pickupAddress: string;
  pickupDistrict: string;
  pickupWindowStart: string | null;
  expiryTime: string | null;
  status: string;
  readyWhen: string;
  distanceLabel: string;
  distanceTier: number;
  inOwnDistrict: boolean;
  donorName: string;
  answering: DonationAnswer | null;
}

export interface DonationFilters {
  search?: string;
  /** One of the food groups the server returns, e.g. 'Rice'. */
  group?: string;
  /** Smallest number of portions worth showing. */
  minPortions?: number | null;
  /** 'own-district' keeps only pickups near the recipient's address. */
  distance?: 'own-district' | 'anywhere';
  sort?: 'suggested' | 'nearest' | 'expiring' | 'newest';
}

export interface DonationBrowse {
  criteria: MatchCriterion[];
  viewer: { district: string; city: string };
  filters: DonationFilters & {
    foodGroups: string[];
    distances: string[];
  };
  stats: {
    total: number;
    urgent: number;
    answering: number;
    nearby: number;
    expiringSoon: number;
  };
  donations: BrowseDonation[];
}

// GET /api/recipient/food-requests/donations
// The donation pool donors have posted. The server does the filtering and puts
// what answers an urgent request at the top of the list.
export async function browseDonations(
  filters: DonationFilters = {},
): Promise<DonationBrowse> {
  const params: Record<string, string> = {};
  if (filters.search) params.search = filters.search;
  if (filters.group) params.group = filters.group;
  if (filters.minPortions) params.minPortions = String(filters.minPortions);
  if (filters.distance && filters.distance !== 'anywhere') params.distance = filters.distance;
  if (filters.sort) params.sort = filters.sort;

  const response = await api.get<DonationBrowse>(
    '/recipient/food-requests/donations',
    { params },
  );
  return response.data;
}
