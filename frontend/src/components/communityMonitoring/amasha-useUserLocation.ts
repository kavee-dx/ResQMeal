import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

// Requests location only while this hook is mounted (i.e. only while the map
// screen is open) — matches the app's no-continuous-tracking privacy note.
export function useUserLocation() {
  const [region, setRegion] = useState<{ latitude: number; longitude: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })();
  }, []);

  return { region, errorMsg };
}