import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import api from '@/services/api';
import { RescueLocation } from '@/types/amasha-map';
import AmashaBaseMap from '@/components/communityMonitoring/amasha-BaseMap';

export default function AmashaMonitoringMapScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const [locations, setLocations] = useState<RescueLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDonations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/monitoring/map/donations');
      setLocations(res.data.points ?? []);
    } catch (err) {
      setError('Could not load donation locations. Pull to refresh or try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDonations();
  }, [loadDonations]);

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
      <AmashaBaseMap locations={locations} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});