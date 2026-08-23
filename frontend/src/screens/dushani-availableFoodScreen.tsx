import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { Colors, Spacing, Radius, Typography, ComponentSizes } from '../constants/theme';
import FoodCard, { FoodItem } from '../components/dushani-foodCard';

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

  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const toggleFilter = (label: string) => {
    setActiveFilter((current) => (current === label ? null : label));
  };

  const matchesQuery = (item: FoodItem) => {
    const matchesType = !activeFilter || item.foodType === activeFilter;
    const matchesSearch =
      item.foodType.toLowerCase().includes(searchText.toLowerCase()) ||
      item.location.toLowerCase().includes(searchText.toLowerCase());
    return matchesType && matchesSearch;
  };

  const filteredFood = useMemo(() => MOCK_FOOD.filter(matchesQuery), [searchText, activeFilter]);

  // "Recommend for you" — simple stand-in: soonest-expiring matches, capped to 2.
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.seven }}>
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

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recommend for you</Text>
        {recommended.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>Nothing to recommend right now.</Text>
        ) : (
          <View style={styles.rowOfTwo}>
            {recommended.map((item) => (
              <View key={item.id} style={{ flex: 1 }}>
                <FoodCard food={item} onPress={handleSelectFood} />
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>All Donations</Text>
        {filteredFood.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>No matching food found.</Text>
        ) : (
          <FlatList
            data={filteredFood}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={{ gap: Spacing.three }}
            renderItem={({ item }) => (
              <View style={{ flex: 1 }}>
                <FoodCard food={item} onPress={handleSelectFood} />
              </View>
            )}
          />
        )}
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
  rowOfTwo: {
    flexDirection: 'row',
    marginHorizontal: Spacing.three,
    gap: Spacing.three,
    marginBottom: Spacing.four,
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
