import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography, ComponentSizes } from '../constants/theme';
import FoodCard, { FoodItem } from '../components/dushani-foodCard';
import MatchCard from '../components/dushani-matchCard';
import { useIsWide } from '../hooks/dushani-useWideLayout';
import {
  getMatchSuggestions,
  type MatchSuggestions,
} from '../services/dushani-foodRequestApi';

/**
 * Sprint 2 keeps Donor Management and Recipient Management independent
 * (see "Sprint 2 does not include integration between components").
 * This mock list stands in for the real donation feed, which gets wired
 * to the Donor Management API in a later sprint.
 */
const MOCK_FOOD: FoodItem[] = [
  { id: '1', foodType: 'Rice', quantity: '10 kg', expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(), location: 'Colombo 05', donorName: 'Green Grocers' },
  { id: '2', foodType: 'Fruits', quantity: '8 kg', expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 20).toISOString(), location: 'Colombo 07', donorName: 'City Bakery' },
  { id: '3', foodType: 'Veg', quantity: '15 kg', expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(), location: 'Nugegoda', donorName: 'Fresh Farm' },
  { id: '4', foodType: 'Rice', quantity: '5 kg', expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), location: 'Dehiwala', donorName: 'Community Kitchen' },
  { id: '5', foodType: 'Water', quantity: '40 bottles', expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(), location: 'Colombo 03', donorName: 'Metro Mart' },
];

// The 3 quick-filter boxes shown under the search bar in the wireframe.
const QUICK_FILTERS: { label: string; icon: string }[] = [
  { label: 'Rice', icon: '🍚' },
  { label: 'Fruits', icon: '🍎' },
  { label: 'Veg', icon: '🥦' },
];

interface Props {
  navigation?: any;
}

/**
 * Task 08 — Build Available Food Screen
 * Task 10 — Add Basic Food Filtering (search bar + quick-filter boxes)
 * Matches Dash.png, variant A: Search → quick filters →
 * "Recommend for you" → "All Donations" → floating "+" to create a request.
 */
export default function AvailableFoodScreen({ navigation }: Props) {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const wide = useIsWide();

  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchSuggestions | null>(null);
  const [suggesting, setSuggesting] = useState(true);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMatchSuggestions()
      .then((data) => {
        if (active) setMatches(data);
      })
      .catch((err) => {
        if (active) {
          setSuggestError(
            err instanceof Error ? err.message : 'Could not load your suggestions.',
          );
        }
      })
      .finally(() => {
        if (active) setSuggesting(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const toggleFilter = (label: string) => {
    setActiveFilter((current) => (current === label ? null : label));
  };

  const query = searchText.trim().toLowerCase();
  // Typing "emergency" is the recipient asking for food needed within hours, so
  // the search keeps only the suggestions that answer an urgent request.
  const wantsEmergency = /(emerg|urgent|right now|today)/.test(query);

  const suggested = useMemo(() => {
    const all = matches?.suggestions ?? [];
    return all.filter((item) => {
      if (wantsEmergency) return item.urgent;
      if (!query) return true;
      return `${item.foodType} ${item.foodCategory} ${item.pickupDistrict} ${item.pickupAddress}`
        .toLowerCase()
        .includes(query);
    });
  }, [matches, query, wantsEmergency]);

  const matchesQuery = (item: FoodItem) => {
    const matchesType = !activeFilter || item.foodType === activeFilter;
    const matchesSearch =
      item.foodType.toLowerCase().includes(searchText.toLowerCase()) ||
      item.location.toLowerCase().includes(searchText.toLowerCase());
    return matchesType && matchesSearch;
  };

  const filteredFood = useMemo(() => MOCK_FOOD.filter(matchesQuery), [searchText, activeFilter]);

  // Fallback for a recipient with no open request: soonest-expiring matches,
  // capped to 2, from the local browse list.
  const recommended = useMemo(
    () =>
      [...filteredFood]
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
        .slice(0, 2),
    [filteredFood]
  );

  const handleSelectFood = (food: FoodItem) => {
    navigation?.navigate?.('DonationDetails', { food });
  };

  const handleCreateRequest = () => {
    navigation?.navigate?.('FoodRequest');
  };

  // Searching "emergency" means "what can I get right now", so the matched
  // donations jump to the top of the page instead of sitting under the filters.
  const suggestionsBlock = suggesting ? (
    <View style={styles.suggestLoading}>
      <ActivityIndicator size="small" color={theme.primary} />
    </View>
  ) : suggested.length > 0 ? (
    <View style={styles.suggestWrap}>
      <View style={styles.suggestHead}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>
            {wantsEmergency ? 'Suggested for your urgent requests' : 'Suggested for you'}
          </Text>
          <Text style={[styles.suggestHint, { color: theme.textMuted }]}>
            Matched on food type, quantity, how close the pickup is, and urgency.
          </Text>
        </View>
        {wantsEmergency && (
          <View style={[styles.urgentTag, { borderColor: theme.error, backgroundColor: theme.errorSoft }]}>
            <Ionicons name="flash" size={11} color={theme.error} />
            <Text style={[styles.urgentTagText, { color: theme.error }]}>URGENT</Text>
          </View>
        )}
      </View>
      {suggested.slice(0, 4).map((item) => (
        <MatchCard
          key={`${item.requestId}-${item.donationId}`}
          match={item}
          onPress={() =>
            navigation?.navigate?.('RequestProgress', { requestId: item.requestId })
          }
        />
      ))}
    </View>
  ) : (
    <View>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Recommend for you</Text>
      {recommended.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          {suggestError ??
            'Nothing to recommend yet — post a request and matched donations show up here.'}
        </Text>
      ) : (
        <View style={styles.foodGrid}>
          {recommended.map((item) => (
            <View key={item.id} style={wide ? styles.foodCellWide : styles.foodCell}>
              <FoodCard food={item} onPress={handleSelectFood} />
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.page, wide && styles.pageWide]}>
          <Text style={[styles.title, { color: theme.text }]}>Dashboard</Text>

          <TextInput
            style={[
              styles.searchInput,
              { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.border },
            ]}
            placeholder="Search"
            placeholderTextColor={theme.inputPlaceholder}
            value={searchText}
            onChangeText={setSearchText}
          />

          {wantsEmergency && suggestionsBlock}

          <View style={styles.quickFilterRow}>
            {QUICK_FILTERS.map((filter) => {
              const isActive = activeFilter === filter.label;
              return (
                <TouchableOpacity
                  key={filter.label}
                  onPress={() => toggleFilter(filter.label)}
                  style={[
                    styles.quickFilterBox,
                    {
                      backgroundColor: isActive ? theme.primary : theme.surfaceSoft,
                      borderColor: isActive ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text style={styles.quickFilterIcon}>{filter.icon}</Text>
                  <Text style={[styles.quickFilterLabel, { color: isActive ? theme.textOnPrimary : theme.textSecondary }]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!wantsEmergency && suggestionsBlock}

          <Text style={[styles.sectionTitle, { color: theme.text }]}>All Donations</Text>
          {filteredFood.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No matching food found.</Text>
          ) : (
            <View style={styles.foodGrid}>
              {filteredFood.map((item) => (
                <View key={item.id} style={wide ? styles.foodCellWide : styles.foodCell}>
                  <FoodCard food={item} onPress={handleSelectFood} />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating "+" — takes the recipient to Create Request, matching the
          flow chart's "no match found → create request" path. */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={handleCreateRequest}
        activeOpacity={0.85}
      >
        <Text style={[styles.fabIcon, { color: theme.textOnPrimary }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.seven,
  },
  page: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  pageWide: {
    maxWidth: 1160,
  },
  title: {
    ...Typography.h2,
    marginTop: Spacing.three,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
  searchInput: {
    height: ComponentSizes.inputHeight,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    ...Typography.input,
  },
  quickFilterRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  quickFilterBox: {
    flex: 1,
    height: 56,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickFilterIcon: {
    fontSize: 18,
  },
  quickFilterLabel: {
    ...Typography.caption,
    textTransform: 'none',
    marginTop: 2,
  },
  sectionTitle: {
    ...Typography.h3,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  suggestWrap: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.four,
  },
  suggestLoading: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  suggestHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  suggestHint: {
    ...Typography.bodySmall,
    fontSize: 12,
    marginTop: 2,
  },
  urgentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  urgentTagText: {
    ...Typography.label,
    fontSize: 9,
  },
  foodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: Spacing.three,
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  // One card across on a phone, two on a wide web view — either way the card
  // fills the page rather than sitting in a narrow column.
  foodCell: {
    flexBasis: '100%',
    flexGrow: 1,
  },
  foodCellWide: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 320,
  },
  emptyText: {
    ...Typography.body,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.four,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '600',
  },
});
