// frontend/src/constants/kaveesha-mockData.ts
// Placeholder data for KaveeshaDonorHomeScreen.
// Swap these for real API calls once the matching endpoints exist.
// Owner: Kaveesha

import {
  CommunityPost,
  Donation,
  NgoCampaign,
  RecipientPreview,
} from '../types/kaveesha-donation.types';

export const MOCK_IMPACT = {
  mealsRescued: 128,
  activeDonations: 3,
};

export const MOCK_CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: 'active', label: 'Active', icon: 'time-outline' },
  { id: 'pending', label: 'Pending', icon: 'hourglass-outline' },
  { id: 'completed', label: 'Completed', icon: 'checkmark-done-outline' },
  { id: 'urgent', label: 'Urgent', icon: 'alert-circle-outline' },
  { id: 'history', label: 'History', icon: 'archive-outline' },
];

export const MOCK_DONATIONS: Donation[] = [
  {
    id: '1',
    foodName: 'Vegetable Fried Rice',
    category: 'Cooked Meal',
    quantity: '5 kg',
    portions: 12,
    expiresInHours: 4,
    urgency: 'HIGH',
    status: 'PENDING',
    pickupLocation: 'Colombo 05',
  },
  {
    id: '2',
    foodName: 'Fresh Bakery Bread',
    category: 'Bakery',
    quantity: '30 loaves',
    portions: 30,
    expiresInHours: 18,
    urgency: 'MEDIUM',
    status: 'MATCHED',
    pickupLocation: 'Nugegoda',
  },
  {
    id: '3',
    foodName: 'Assorted Fruits',
    category: 'Produce',
    quantity: '10 kg',
    portions: 20,
    expiresInHours: 30,
    urgency: 'NORMAL',
    status: 'COMPLETED',
    pickupLocation: 'Rajagiriya',
  },
];

export const MOCK_NGO_CAMPAIGNS: NgoCampaign[] = [
  {
    id: 'c1',
    title: 'Ramadan Meal Drive',
    orgName: 'Sarvodaya Foundation',
    location: 'Colombo',
    goalText: '420 / 600 meals',
  },
  {
    id: 'c2',
    title: 'Flood Relief Kitchen',
    orgName: 'Red Cross Sri Lanka',
    location: 'Kalutara',
    goalText: '180 / 300 meals',
  },
  {
    id: 'c3',
    title: 'School Lunch Program',
    orgName: 'Hope for Children',
    location: 'Kandy',
    goalText: '95 / 200 meals',
  },
];

export const MOCK_RECIPIENTS: RecipientPreview[] = [
  {
    id: 'r1',
    name: 'Little Hearts Orphanage',
    type: 'Charity',
    distanceKm: 2.4,
    needsText: 'Needs 40 portions today',
  },
  {
    id: 'r2',
    name: 'The Fernando Family',
    type: 'Family',
    distanceKm: 1.1,
    needsText: 'Needs meals for 5',
  },
  {
    id: 'r3',
    name: 'Green Valley School',
    type: 'School',
    distanceKm: 4.8,
    needsText: 'Needs 60 lunch packs',
  },
];

export const MOCK_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'p1',
    foodName: 'Chicken Biriyani Trays',
    donorName: 'Spice Garden Hotel',
    urgency: 'HIGH',
    quantity: '8 kg',
    location: 'Colombo 03',
    expiresInHours: 3,
  },
  {
    id: 'p2',
    foodName: 'Mixed Vegetable Curry',
    donorName: 'Green Leaf Restaurant',
    urgency: 'HIGH',
    quantity: '6 kg',
    location: 'Wellawatte',
    expiresInHours: 5,
  },
  {
    id: 'p3',
    foodName: 'Assorted Pastries',
    donorName: 'Sweet Corner Bakery',
    urgency: 'NORMAL',
    quantity: '15 pcs',
    location: 'Mount Lavinia',
    expiresInHours: 22,
  },
  {
    id: 'p4',
    foodName: 'Rice & Curry Packs',
    donorName: 'Home Kitchen Catering',
    urgency: 'NORMAL',
    quantity: '25 packs',
    location: 'Dehiwala',
    expiresInHours: 26,
  },
];