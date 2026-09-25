import api from './api';

export interface Assignment {
  _id: string;
  donationId: any; // populated Donation object
  volunteerId: string;
  status: 'ASSIGNED' | 'ACCEPTED' | 'PICKING_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  assignedAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  inTransitAt?: string;
  deliveredAt?: string;
}

export async function getCurrentAssignment(): Promise<Assignment | null> {
  const response = await api.get('/assignments/current');
  return response.data.assignment;
}

export async function updateAssignmentStatus(
  id: string,
  status: Assignment['status']
): Promise<Assignment> {
  const response = await api.patch(`/assignments/${id}/status`, { status });
  return response.data.assignment;
}