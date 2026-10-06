import api from '@/services/api';
import { RescueLocation } from '@/types/amasha-map';

interface MapPointsResponse {
  success: boolean;
  points: RescueLocation[];
  unplaced?: number;
}

async function fetchPoints(path: string): Promise<RescueLocation[]> {
  const res = await api.get<MapPointsResponse>(path);
  return res.data.points ?? [];
}

/** Live donations available for rescue (public endpoint). */
export async function getAvailableFoodPoints(): Promise<RescueLocation[]> {
  return fetchPoints('/monitoring/map/donations');
}

/** Open recipient food requests (public endpoint). */
export async function getRecipientRequestPoints(): Promise<RescueLocation[]> {
  return fetchPoints('/monitoring/map/requests');
}

/** Approved donors, placed at district level (auth required). */
export async function getDonorPoints(): Promise<RescueLocation[]> {
  return fetchPoints('/monitoring/map/donors');
}

/** Approved NGO partners, placed at district level (auth required). */
export async function getNgoPoints(): Promise<RescueLocation[]> {
  return fetchPoints('/monitoring/map/ngos');
}

/**
 * Loads every food rescue location type for the rescue map.
 *
 * Donation/request points are public, while donor/NGO points need a session —
 * so a partial failure still returns whatever loaded. Only when every request
 * fails (e.g. the API is unreachable) does this throw.
 */
export async function getFoodRescueLocations(): Promise<RescueLocation[]> {
  const results = await Promise.allSettled([
    getAvailableFoodPoints(),
    getRecipientRequestPoints(),
    getDonorPoints(),
    getNgoPoints(),
  ]);

  if (results.every((result) => result.status === 'rejected')) {
    throw new Error('Could not load map locations');
  }

  return results.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : [],
  );
}
