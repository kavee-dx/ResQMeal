// Shape of the delivery preferences payload, agreed with the
// user-management backend (VolunteerProfile). Not a database model —
// just the contract the frontend codes against until the branches
// merge and the real schema field (maxDeliveryDistance on
// VolunteerProfile) exists.

export interface DeliveryPreferencesPayload {
  preferredDeliveryArea: string;
  preferredDeliveryTime: string;
  maxDeliveryDistance: number;
}