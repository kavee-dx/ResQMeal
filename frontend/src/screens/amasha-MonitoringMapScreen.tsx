import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import api from '@/services/api';
import { RescueLocation } from '@/types/amasha-map';
import AmashaBaseMap from '@/components/communityMonitoring/amasha-BaseMap';
import AmashaLocationDetailsSheet from '@/components/communityMonitoring/amasha-LocationDetailsSheet';

export default function AmashaMonitoringMapScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const [locations, setLocations] = useState<RescueLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<RescueLocation | null>(null);

  const loadMapPoints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [donationsRes, requestsRes] = await Promise.all([
        api.get('/monitoring/map/donations'),
        api.get('/monitoring/map/requests'),
      ]);
      const donationPoints: RescueLocation[] = donationsRes.data.points ?? [];
      const requestPoints: RescueLocation[] = requestsRes.data.points ?? [];
      setLocations([...donationPoints, ...requestPoints]);
    } catch (err) {
      setError('Could not load map locations. Pull to refresh or try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMapPoints();
  }, [loadMapPoints]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.error }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AmashaBaseMap locations={locations} onMarkerPress={setSelectedLocation} />
      <AmashaLocationDetailsSheet
        location={selectedLocation}
        onClose={() => setSelectedLocation(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});