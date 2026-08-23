import React, { useEffect, useState, useMemo } from 'react';
import { View, FlatList, Text, ActivityIndicator, RefreshControl, StyleSheet, useColorScheme } from 'react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Donation } from '@/types/amasha-donation';
import DonationCard from '@/components/communityMonitoring/amasha-DonationCard';
import DonationFilterTabs, { FilterValue } from '@/components/communityMonitoring/amasha-DonationFilterTabs';
import api from '@/services/api'; 

export default function DonationStatusMonitoringScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [error, setError] = useState(false);

  async function loadDonations() {
    try {
      setError(false);
      const res = await api.get('/ngo/donations');
      setDonations(res.data);
    } catch (err) {
      console.error('Failed to load donations', err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDonations();
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? donations : donations.filter((d) => d.status === filter)),
    [donations, filter]
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[Typography.h3, { color: colors.text, marginBottom: Spacing.three }]}>
        Donation Status Monitoring
      </Text>

      <DonationFilterTabs active={filter} onChange={setFilter} />

      {error ? (
        <View style={styles.centered}>
          <Text style={[Typography.body, { color: colors.textSecondary, marginBottom: Spacing.two }]}>
            Couldn't load donations.
          </Text>
          <Text style={[Typography.bodySmall, { color: colors.primary }]} onPress={loadDonations}>
            Tap to retry
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[Typography.body, { color: colors.textMuted }]}>
            No donations in this category yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DonationCard donation={item} />}
          contentContainerStyle={{ paddingTop: Spacing.three, paddingBottom: Spacing.five }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadDonations();
              }}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
});