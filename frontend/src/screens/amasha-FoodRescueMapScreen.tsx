import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { RescueLocation, RescueLocationType } from '@/types/amasha-map';
import { getFoodRescueLocations } from '@/services/amasha-mapApi';
import { distanceKm } from '@/utils/amasha-mapUtils';
import AmashaBaseMap from '@/components/communityMonitoring/amasha-BaseMap';
import AmashaLocationDetailsSheet from '@/components/communityMonitoring/amasha-LocationDetailsSheet';
import { useUserLocation } from '@/components/communityMonitoring/amasha-useUserLocation';

// Rescue points within this radius count as "nearby" when the Near Me filter
// is on. District-level pins make this approximate on purpose.
const NEARBY_RADIUS_KM = 10;

type FilterKey = RescueLocationType | 'all';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'available_food', label: 'Available Food' },
  { key: 'donor', label: 'Donors' },
  { key: 'recipient', label: 'Recipients' },
  { key: 'ngo', label: 'NGOs' },
];

export default function AmashaFoodRescueMapScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  // Location permission is only requested while this screen is open —
  // the app never tracks users continuously.
  const { region: userRegion } = useUserLocation();

  const [locations, setLocations] = useState<RescueLocation[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [nearMe, setNearMe] = useState(false);
  const [locationHint, setLocationHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RescueLocation | null>(null);

  const loadMapPoints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLocations(await getFoodRescueLocations());
    } catch {
      setError('Could not load map locations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMapPoints();
  }, [loadMapPoints]);

  const visible = useMemo(() => {
    let result =
      filter === 'all'
        ? locations
        : locations.filter((loc) => loc.type === filter);
    if (nearMe && userRegion) {
      result = result.filter(
        (loc) => distanceKm(userRegion, loc) <= NEARBY_RADIUS_KM,
      );
    }
    return result;
  }, [locations, filter, nearMe, userRegion]);

  const toggleNearMe = () => {
    if (!userRegion) {
      setLocationHint('Location unavailable — allow location access to find nearby rescues.');
      return;
    }
    setLocationHint(null);
    setNearMe((value) => !value);
  };

  const chips: { key: FilterKey | 'near'; label: string; active: boolean }[] = [
    ...FILTERS.map(({ key, label }) => ({ key, label, active: filter === key })),
    { key: 'near', label: 'Near Me', active: nearMe },
  ];

  const onChipPress = (key: FilterKey | 'near') => {
    if (key === 'near') {
      toggleNearMe();
      return;
    }
    setFilter(key);
  };

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
        <Text style={[Typography.body, { color: colors.error }]}>{error}</Text>
        <Pressable
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={loadMapPoints}
        >
          <Text style={[Typography.buttonSmall, { color: colors.textOnPrimary }]}>
            Try Again
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AmashaBaseMap locations={visible} onMarkerPress={setSelected} />

      {/* Type filters + Near Me toggle */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {chips.map(({ key, label, active }) => (
            <Pressable
              key={key}
              onPress={() => onChipPress(key)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  Typography.buttonSmall,
                  { color: active ? colors.textOnPrimary : colors.text },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {!!locationHint && (
          <Text style={[Typography.bodySmall, styles.hint, { color: colors.textSecondary }]}>
            {locationHint}
          </Text>
        )}
      </View>

      {/* Count + privacy note */}
      <View style={styles.footer}>
        <Text style={[Typography.caption, { color: colors.textSecondary }]}>
          {`${visible.length} ${visible.length === 1 ? 'location' : 'locations'}`}
        </Text>
        <Text style={[Typography.bodySmall, { color: colors.textSecondary }]}>
          Location is shared only for rescue coordination — never tracked
          continuously.
        </Text>
      </View>

      <AmashaLocationDetailsSheet
        location={selected}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  filterBar: {
    position: 'absolute',
    top: Spacing.two,
    left: 0,
    right: 0,
  },
  chipRow: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    marginHorizontal: Spacing.one,
    ...Shadows.card,
  },
  hint: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  footer: {
    position: 'absolute',
    bottom: Spacing.two,
    left: Spacing.two,
    right: 70, // keeps the OpenStreetMap attribution visible
    gap: 2,
  },
  retryButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
  },
});
