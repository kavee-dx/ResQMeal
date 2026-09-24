import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Radius, Spacing } from '@/constants/theme';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';
import { useDisplayName } from '../hooks/dushani-useDisplayName';
import { useIsWide } from '../hooks/dushani-useWideLayout';
import type { RootStackParamList } from '../navigation/types';
import DonationCard from '../components/dushani-donationCard';
import {
  browseDonations,
  type DonationBrowse,
  type DonationFilters,
} from '../services/dushani-foodRequestApi';

type Props = NativeStackScreenProps<RootStackParamList, 'AvailableFood'>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];
type SortOption = NonNullable<DonationFilters['sort']>;

// User-management palette (same constants as the Create Request screen).
const C = {
  navy: '#023047',
  teal: '#126782',
  tealSoft: '#E1EEF2',
  amber: '#FFB703',
  orange: '#FB8500',
  white: '#FFFFFF',
  offWhite: '#F6F8FA',
  cardBorder: '#E4E9ED',
  textMuted: '#6B7B85',
  error: '#D64545',
  errorSoft: '#FBEAEA',
  success: '#3FA34D',
  successSoft: '#E2F2E5',
};

// Used until the server answers with the groups it actually recognises.
const FALLBACK_GROUPS = ['Rice', 'Bread', 'Vegetables', 'Fruits', 'Water', 'Dry Foods', 'Other'];

const QUANTITIES: { label: string; value: number | null }[] = [
  { label: 'Any amount', value: null },
  { label: '10+ portions', value: 10 },
  { label: '25+ portions', value: 25 },
  { label: '50+ portions', value: 50 },
];

const SORTS: { label: string; value: SortOption; icon: IconName }[] = [
  { label: 'Suggested for me', value: 'suggested', icon: 'sparkles-outline' },
  { label: 'Nearest pickup', value: 'nearest', icon: 'navigate-outline' },
  { label: 'Expiring soon', value: 'expiring', icon: 'time-outline' },
  { label: 'Newest', value: 'newest', icon: 'calendar-outline' },
];

/** Navy brand band behind the card — identical to the Create Request screen. */
function Backdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.band}>
        <View style={styles.bandGlowTeal} />
        <View style={styles.bandGlowAmber} />
      </View>
    </View>
  );
}

function FilterGroup({
  title,
  hint,
  icon,
  options,
  value,
  onSelect,
}: {
  title: string;
  hint?: string;
  icon: IconName;
  options: { label: string; value: string }[];
  value: string;
  onSelect: (value: string) => void;
}) {
  const T = useAppTypography();
  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <Ionicons name={icon} size={13} color={C.teal} />
        <Text style={{ ...T.labelStrong, fontSize: 10.5, color: C.navy, letterSpacing: 0.5 }}>
          {title}
        </Text>
      </View>
      {hint ? (
        <Text style={{ ...T.caption, fontSize: 11, color: C.textMuted, marginBottom: Spacing.two + 2 }}>
          {hint}
        </Text>
      ) : null}
      <View style={styles.chipWrap}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <TouchableOpacity
              key={`${title}-${option.value}`}
              onPress={() => onSelect(option.value)}
              activeOpacity={0.85}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${title}: ${option.label}`}
            >
              <Text style={{ ...T.bodySmall, fontSize: 12, color: active ? C.white : C.navy }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Sprint item 4 — Browse Donations. The recipient searches the food donors have
 * actually posted, by type, amount and distance, and the donations that answer
 * one of her own open requests are pushed to the top — an urgent request's
 * matches above everything else. There is no donor chat yet, so a card opens its
 * own details in place instead of navigating away.
 */
export default function AvailableFoodScreen({ navigation }: Props) {
  const T = useAppTypography();
  const wide = useIsWide();
  const displayName = useDisplayName();

  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('All');
  const [minPortions, setMinPortions] = useState<number | null>(null);
  const [nearOnly, setNearOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>('suggested');
  const [openId, setOpenId] = useState<string | null>(null);

  const [data, setData] = useState<DonationBrowse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo<DonationFilters>(
    () => ({
      search: search.trim(),
      group: group === 'All' ? '' : group,
      minPortions,
      distance: nearOnly ? 'own-district' : 'anywhere',
      sort,
    }),
    [search, group, minPortions, nearOnly, sort],
  );

  const load = useCallback(async (filters: DonationFilters, showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const result = await browseDonations(filters);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load the food on offer. Please try again.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Every filter change searches again, but typing is debounced so a recipient
  // on a phone connection does not fire a request per letter.
  const firstRun = useRef(true);
  useEffect(() => {
    const delay = firstRun.current ? 0 : 300;
    firstRun.current = false;
    const timer = setTimeout(() => load(query, true), delay);
    return () => clearTimeout(timer);
  }, [load, query]);

  const filtersActive =
    search.trim() !== '' || group !== 'All' || minPortions !== null || nearOnly;

  const clearFilters = () => {
    setSearch('');
    setGroup('All');
    setMinPortions(null);
    setNearOnly(false);
  };

  const stats = data?.stats;
  const donations = data?.donations ?? [];
  const groups = ['All', ...(data?.filters.foodGroups ?? FALLBACK_GROUPS)];
  const district = data?.viewer.district;

  return (
    <View style={styles.screen}>
      <Backdrop />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(query, false);
            }}
            tintColor={C.teal}
          />
        }
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={C.navy} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ ...T.caption, color: C.amber }}>{displayName}</Text>
            <Text style={{ ...T.h2, color: C.white, fontSize: 26 }}>Find food</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('FoodRequest')}
            activeOpacity={0.88}
            style={styles.newRequestPill}
            accessibilityLabel="Post a new food request"
          >
            <Ionicons name="add" size={16} color={C.navy} />
            <Text style={{ ...T.labelStrong, fontSize: 12.5, color: C.navy }}>New request</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.page, wide && styles.pageWide]}>
          <View style={styles.filterCard}>
            <View style={styles.searchRow}>
              <View style={styles.searchIcon}>
                <Ionicons name="search" size={17} color={C.teal} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search food, area or donor"
                placeholderTextColor={C.textMuted}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel="Search food donations"
              />
              {search !== '' && (
                <TouchableOpacity
                  onPress={() => setSearch('')}
                  style={styles.clearSearch}
                  accessibilityLabel="Clear the search text"
                >
                  <Ionicons name="close-circle" size={19} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FilterGroup
              title="FOOD TYPE"
              icon="restaurant-outline"
              options={groups.map((name) => ({ label: name, value: name }))}
              value={group}
              onSelect={setGroup}
            />

            <FilterGroup
              title="HOW MUCH YOU NEED"
              hint="Donations are counted in portions, not weight."
              icon="layers-outline"
              options={QUANTITIES.map((entry) => ({
                label: entry.label,
                value: entry.value === null ? '' : String(entry.value),
              }))}
              value={minPortions === null ? '' : String(minPortions)}
              onSelect={(value) => setMinPortions(value === '' ? null : Number(value))}
            />

            <View style={styles.group}>
              <View style={styles.groupHead}>
                <Ionicons name="navigate-outline" size={13} color={C.teal} />
                <Text style={{ ...T.labelStrong, fontSize: 10.5, color: C.navy, letterSpacing: 0.5 }}>
                  DISTANCE AND ORDER
                </Text>
              </View>
              <View style={styles.distanceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...T.bodySmall, fontSize: 12.5, color: C.navy }}>
                    Only in {district || 'my district'}
                  </Text>
                  <Text style={{ ...T.caption, fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                    {district
                      ? 'Pickups that sit in the district on your profile.'
                      : 'Add your district to your profile to filter by distance.'}
                  </Text>
                </View>
                <Switch
                  value={nearOnly}
                  onValueChange={setNearOnly}
                  disabled={!district}
                  trackColor={{ false: C.cardBorder, true: C.tealSoft }}
                  thumbColor={nearOnly ? C.teal : C.white}
                  ios_backgroundColor={C.cardBorder}
                  accessibilityLabel="Only show donations in my district"
                />
              </View>
              <View style={styles.chipWrap}>
                {SORTS.map((option) => {
                  const active = option.value === sort;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setSort(option.value)}
                      activeOpacity={0.85}
                      style={[styles.chip, active && styles.chipActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Order by ${option.label}`}
                    >
                      <Ionicons
                        name={option.icon}
                        size={13}
                        color={active ? C.white : C.teal}
                        style={{ marginRight: 5 }}
                      />
                      <Text style={{ ...T.bodySmall, fontSize: 12, color: active ? C.white : C.navy }}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {!loading && (
              <View style={styles.resultBar}>
                <Text style={{ ...T.bodySmall, fontSize: 12, color: C.textMuted, flex: 1 }}>
                  {donations.length} donation{donations.length === 1 ? '' : 's'} on offer
                  {stats && stats.answering > 0 ? ` · ${stats.answering} match your requests` : ''}
                  {stats && stats.nearby > 0 ? ` · ${stats.nearby} near you` : ''}
                </Text>
                {filtersActive && (
                  <TouchableOpacity onPress={clearFilters} accessibilityLabel="Clear all filters">
                    <Text style={{ ...T.labelStrong, fontSize: 12, color: C.teal }}>Clear filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {!loading && !error && stats && stats.urgent > 0 && (
            <View style={styles.urgentBanner}>
              <Ionicons name="flash" size={17} color={C.error} style={{ marginRight: Spacing.three }} />
              <Text style={{ ...T.bodySmall, fontSize: 12.5, color: C.error, flex: 1 }}>
                {stats.urgent} donation{stats.urgent === 1 ? '' : 's'} answer
                {stats.urgent === 1 ? 's' : ''} your urgent request{stats.urgent === 1 ? '' : 's'} and
                {stats.urgent === 1 ? ' is' : ' are'} listed first.
              </Text>
            </View>
          )}

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={C.teal} />
            </View>
          ) : error ? (
            <View style={styles.stateBlock}>
              <View style={styles.stateIcon}>
                <Ionicons name="cloud-offline-outline" size={26} color={C.error} />
              </View>
              <Text style={{ ...T.h3, color: C.navy, fontSize: 18, textAlign: 'center' }}>
                Could not load the food on offer
              </Text>
              <Text style={{ ...T.body, color: C.textMuted, textAlign: 'center', marginTop: Spacing.two }}>
                {error}
              </Text>
              <TouchableOpacity
                onPress={() => load(query, true)}
                activeOpacity={0.88}
                style={styles.stateButton}
                accessibilityLabel="Try loading donations again"
              >
                <Ionicons name="refresh" size={18} color={C.navy} style={{ marginRight: Spacing.two }} />
                <Text style={{ ...T.button, color: C.navy }}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : donations.length === 0 ? (
            <View style={styles.stateBlock}>
              <View style={styles.stateIcon}>
                <Ionicons name="happy-outline" size={26} color={C.teal} />
              </View>
              <Text style={{ ...T.h3, color: C.navy, fontSize: 18, textAlign: 'center' }}>
                Nothing matches that search yet
              </Text>
              <Text style={{ ...T.body, color: C.textMuted, textAlign: 'center', marginTop: Spacing.two }}>
                {filtersActive
                  ? 'Try a wider amount or turn off the distance filter — new donations appear the moment a donor posts them.'
                  : 'No donor has put food out right now. Post a request and nearby donors are shown what you need.'}
              </Text>
              <View style={styles.emptyActions}>
                {filtersActive && (
                  <TouchableOpacity
                    onPress={clearFilters}
                    activeOpacity={0.88}
                    style={styles.clearButton}
                    accessibilityLabel="Clear all filters"
                  >
                    <Ionicons name="close-circle-outline" size={18} color={C.teal} style={{ marginRight: Spacing.two }} />
                    <Text style={{ ...T.buttonSmall, color: C.teal }}>Clear filters</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => navigation.navigate('FoodRequest')}
                  activeOpacity={0.88}
                  style={styles.stateButton}
                  accessibilityLabel="Go to create a food request"
                >
                  <Ionicons name="add" size={18} color={C.navy} style={{ marginRight: Spacing.two }} />
                  <Text style={{ ...T.button, color: C.navy }}>Post a request</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.list}>
              {donations.map((donation) => (
                <DonationCard
                  key={donation.id}
                  donation={donation}
                  expanded={openId === donation.id}
                  onToggle={() => setOpenId((current) => (current === donation.id ? null : donation.id))}
                />
              ))}
            </View>
          )}

          <Text
            style={{
              ...T.bodySmall,
              fontSize: 12,
              color: C.textMuted,
              textAlign: 'center',
              marginTop: Spacing.three,
            }}
          >
            Donor contact numbers stay private — they are shared only when a donor
            accepts your request.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.offWhite,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.seven,
  },
  band: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 208,
    backgroundColor: C.navy,
    overflow: 'hidden',
  },
  bandGlowTeal: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: C.teal,
    opacity: 0.5,
    top: -120,
    right: -80,
  },
  bandGlowAmber: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: C.amber,
    opacity: 0.22,
    bottom: -78,
    left: 70,
  },
  page: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
  },
  // Cards stay close to full page width on a web view — a narrow column of
  // small cards is what made this page look like a wireframe.
  pageWide: {
    maxWidth: 980,
    paddingHorizontal: Spacing.five,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    marginBottom: Spacing.five,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  newRequestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 40,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    backgroundColor: C.amber,
  },
  filterCard: {
    backgroundColor: C.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.offWhite,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.four,
  },
  searchIcon: {
    marginRight: Spacing.two + 2,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    fontSize: 14,
    color: C.navy,
    paddingVertical: Spacing.three,
  },
  clearSearch: {
    paddingLeft: Spacing.two,
    paddingVertical: Spacing.two,
  },
  group: {
    marginBottom: Spacing.four,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: Spacing.two,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three + 2,
    paddingVertical: Spacing.two + 2,
    backgroundColor: C.white,
  },
  chipActive: {
    backgroundColor: C.teal,
    borderColor: C.teal,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: Radius.md,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    backgroundColor: C.offWhite,
  },
  resultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    paddingTop: Spacing.three,
  },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.errorSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: C.error,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  list: {
    marginTop: Spacing.three,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.seven,
  },
  stateBlock: {
    backgroundColor: C.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    marginTop: Spacing.three,
  },
  stateIcon: {
    width: 60,
    height: 60,
    borderRadius: Radius.pill,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  stateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.md,
    backgroundColor: C.amber,
    marginTop: Spacing.four,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.teal,
    backgroundColor: C.white,
    marginTop: Spacing.four,
    marginRight: Spacing.three,
  },
  emptyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
});
