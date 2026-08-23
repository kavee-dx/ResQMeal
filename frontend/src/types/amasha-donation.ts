export type DonationStatus = 'available' | 'pending' | 'accepted' | 'expired' | 'delivered';

export interface Donation {
  id: string;
  donorName: string;
  foodType: string;
  quantity: string; 
  status: DonationStatus;
  distanceAway?: string; 
  donatedAt: string; 
}