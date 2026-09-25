import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { theme } from '@/constants/theme';
import { RescueLocation } from '@/types/amasha-map';
import { useUserLocation } from './amasha-useUserLocation';

// NOTE: swap these keys for whatever your actual theme.ts calls them —
// this file doesn't add new colors, just reads existing ones.
const markerColor: Record<string, string> = {
  donor: theme.colors.primary,
  available_food: theme.colors.success,
  recipient: theme.colors.warning,
  ngo: theme.colors.info,
  pickup: theme.colors.secondary,
  delivery: theme.colors.secondary,
};

interface Props {
  locations: RescueLocation[];
  onMarkerPress?: (loc: RescueLocation) => void;
}

export default function AmashaBaseMap({ locations, onMarkerPress }: Props) {
  const { region } = useUserLocation();

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        mapType="none"
        initialRegion={{
          latitude: region?.latitude ?? 6.9271,
          longitude: region?.longitude ?? 79.8612,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
            title={loc.title}
            description={loc.description}
            pinColor={markerColor[loc.type] ?? theme.colors.primary}
            onPress={() => onMarkerPress?.(loc)}
          />
        ))}
      </MapView>
      {/* Required by OSM's ODbL license — keep this visible on the map */}
      <View style={styles.attribution}>
        <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  attribution: {
    position: 'absolute',
    bottom: 4,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 4,
  },
  attributionText: { fontSize: 10, color: '#333' },
});