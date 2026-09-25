export type RescueLocationType = 'donor' | 'available_food' | 'recipient' | 'ngo' | 'pickup' | 'delivery';

export interface RescueLocation {
  id: string;
  type: RescueLocationType;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}