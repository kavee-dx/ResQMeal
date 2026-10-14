import api from './api';

export type AssignmentStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'PICKING_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

// One factor of the match: its own 0-100 score and its weighted points.
export interface AssignmentFactor {
  score?: number | null;
  points?: number | null;
}

export interface Assignment {
  _id: string;
  donationId: any; // populated Donation object
  volunteerId: string;
  requestId?: string | null;
  status: AssignmentStatus;
  // Why the engine picked this volunteer (null on legacy/test assignments).
  matchScore?: number | null;
  matchBreakdown?: {
    distance?: AssignmentFactor;
    area?: AssignmentFactor;
    time?: AssignmentFactor;
    urgency?: AssignmentFactor;
  } | null;
  matchReasons?: string[];
  routeDistanceKm?: number | null;
  locationPrecision?: 'EXACT' | 'APPROXIMATE' | null;
  assignedAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  inTransitAt?: string;
  deliveredAt?: string;
  cancelledAt?: string | null;
}

// Which leg of the delivery the volunteer is on (server-computed). TO_PICKUP
// means navigate toward the donor; TO_DROPOFF means the pickup is done and the
// only remaining route is toward the recipient. COMPLETE/CANCELLED carry no
// active route.
export type DeliveryStage = 'TO_PICKUP' | 'TO_DROPOFF' | 'COMPLETE' | 'CANCELLED';

// A route point as the server knows it. `exact: false` means the coordinates
// are a district-centre placement, not the doorstep — never present them as
// the precise address. Null coordinates mean the point could not be placed at
// all; show the label with a "location unavailable" note, no marker.
export interface DeliveryLocation {
  label: string | null;
  district: string | null;
  exact: boolean;
  latitude: number | null;
  longitude: number | null;
}

// Pickup / drop-off points for the delivery card and the map, plus the
// recipient's contact details — the server only fills recipientContact once
// the volunteer has accepted, so the app must not assume it is there.
export interface DeliveryView {
  status: AssignmentStatus;
  stage: DeliveryStage | null;
  pickup: DeliveryLocation | null;
  dropoff: DeliveryLocation | null;
  recipientContact: { name: string | null; phone: string } | null;
}

// Outcome of syncing the linked FoodRequest after a status move (step 11).
// FAILED means the assignment change stands but the recipient's progress
// update needs recovery.
export interface RequestSyncResult {
  status: 'SYNCED' | 'SKIPPED' | 'FAILED';
  requestId?: string;
  message?: string;
}

export interface AssignmentSummary {
  completedCount: number;
  hoursContributed: number;
}

export async function getCurrentAssignment(): Promise<Assignment | null> {
  const response = await api.get('/assignments/current');
  return response.data.assignment;
}

// The same fetch with the delivery view the assignment screen renders.
export async function getCurrentAssignmentDetail(): Promise<{
  assignment: Assignment | null;
  delivery: DeliveryView | null;
}> {
  const response = await api.get('/assignments/current');
  return {
    assignment: response.data.assignment ?? null,
    delivery: response.data.delivery ?? null,
  };
}

export async function updateAssignmentStatus(
  id: string,
  status: AssignmentStatus
): Promise<{ assignment: Assignment; requestSync?: RequestSyncResult }> {
  const response = await api.patch(`/assignments/${id}/status`, { status });
  return { assignment: response.data.assignment, requestSync: response.data.requestSync };
}

// Dashboard totals (completed deliveries + hours contributed).
export async function getAssignmentSummary(): Promise<AssignmentSummary> {
  const response = await api.get('/assignments/summary');
  return response.data.summary;
}
