// Distance between two coordinates in kilometres, using the haversine
// formula. Used by the rescue map's "Near Me" filter — approximate by design,
// since rescue points are placed at district level rather than exact spots.

export interface LatLng {
  latitude: number;
  longitude: number;
}

export function distanceKm(a: LatLng, b: LatLng): number {
  const earthRadiusKm = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}
