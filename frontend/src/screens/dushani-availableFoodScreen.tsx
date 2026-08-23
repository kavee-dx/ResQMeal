import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
} from 'react-native';
import {
  Colors,
  Spacing,
  Radius,
  Typography,
  ComponentSizes,
} from '../constants/theme';
import FoodCard, { FoodItem } from '../components/dushani-foodCard';

/**
 * Sprint 2 keeps Donor Management and Recipient Management independent
 * (see "Sprint 2 does not include integration between components").
 * This mock list stands in for the real donation feed, which gets wired
 * to the Donor Management API in a later sprint.
 */
const MOCK_FOOD: FoodItem[] = [
  {
    id: '1',
    foodType: 'Rice',
    quantity: '10 kg',
    expiryDate: new Date(
      Date.now() + 1000 * 60 * 60 * 3
    ).toISOString(),
    location: 'Colombo 05',
    donorName: 'Green Grocers',
  },
  {
    id: '2',
    foodType: 'Fruits',
    quantity: '8 kg',
    expiryDate: new Date(
      Date.now() + 1000 * 60 * 60 * 20
    ).toISOString(),
    location: 'Colombo 07',
    donorName: 'City Bakery',
  },
  {
    id: '3',
    foodType: 'Veg',
    quantity: '15 kg',
    expiryDate: new Date(
      Date.now() + 1000 * 60 * 60 * 8
    ).toISOString(),
    location: 'Nugegoda',
    donorName: 'Fresh Farm',
  },
  {
    id: '4',
    foodType: 'Rice',
    quantity: '5 kg',
    expiryDate: new Date(
      Date.now() + 1000 * 60 * 60 * 48
    ).toISOString(),
    location: 'Dehiwala',
    donorName: 'Community Kitchen',
  },
  {
    id: '5',
    foodType: 'Water',
    quantity: '40 bottles',
    expiryDate: new Date(
      Date.now() + 1000 * 60 * 60 * 72
    ).toISOString(),
    location: 'Colombo 03',
    donorName: 'Metro Mart',
  },
];

interface Props {
  navigation?: any;
}

export default function AvailableFoodScreen({ navigation }: Props) {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [searchText, setSearchText] = useState('');


  const filteredFood = useMemo(() => {
    const query = searchText.toLowerCase().trim();

    if (!query) {
      return MOCK_FOOD;
    }

    return MOCK_FOOD.filter(
      (item) =>
        item.foodType.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query)
    );
  }, [searchText]);

  /**
   * Recommend for you:
   * Shows the 2 donations that will expire soonest.
   */
  const recommended = useMemo(
    () =>
      [...filteredFood]
        .sort(
          (a, b) =>
            new Date(a.expiryDate).getTime() -
            new Date(b.expiryDate).getTime()
        )
        .slice(0, 2),
    [filteredFood]
  );

  /**
   * Navigate to donation details.
   */
  const handleSelectFood = (food: FoodItem) => {
    navigation?.navigate?.('DonationDetails', { food });
  };

  /**
   * Navigate to create food request.
   */
  const handleCreateRequest = () => {
    navigation?.navigate?.('FoodRequest');
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingBottom: Spacing.seven,
        }}
      >
        {/* Dashboard Title */}
        <Text
          style={[
            styles.title,
            { color: theme.text },
          ]}
        >
          Dashboard
        </Text>

        {/* Search Bar */}
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.inputBackground,
              color: theme.inputText,
              borderColor: theme.border,
            },
          ]}
          placeholder="Search"
          placeholderTextColor={theme.inputPlaceholder}
          value={searchText}
          onChangeText={setSearchText}
        />


        {/* Recommend for You */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text },
          ]}
        >
          Recommend for you
        </Text>

        {recommended.length === 0 ? (
          <Text
            style={[
              styles.emptyText,
              { color: theme.textMuted },
            ]}
          >
            Nothing to recommend right now.
          </Text>
        ) : (
          <View style={styles.rowOfTwo}>
            {recommended.map((item) => (
              <View
                key={item.id}
                style={{ flex: 1 }}
              >
                <FoodCard
                  food={item}
                  onPress={handleSelectFood}
                />
              </View>
            ))}
          </View>
        )}

        {/* All Donations */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text },
          ]}
        >
          All Donations
        </Text>

        {filteredFood.length === 0 ? (
          <Text
            style={[
              styles.emptyText,
              { color: theme.textMuted },
            ]}
          >
            No matching food found.
          </Text>
        ) : (
          <FlatList
            data={filteredFood}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={{
              gap: Spacing.three,
            }}
            renderItem={({ item }) => (
              <View style={{ flex: 1 }}>
                <FoodCard
                  food={item}
                  onPress={handleSelectFood}
                />
              </View>
            )}
          />
        )}
      </ScrollView>

      {/* 
       * Floating "+" button
       *
       * Takes the recipient to Create Request,
       * matching the flow:
       *
       * No Match Found → Create Request
       */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: theme.primary },
        ]}
        onPress={handleCreateRequest}
        activeOpacity={0.85}
      >
        <Text
          style={[
            styles.fabIcon,
            { color: theme.textOnPrimary },
          ]}
        >
          +
        </Text>
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

  /*
   * Quick filter styles are kept here in case the
   * quick-filter functionality is enabled again later.
   */
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

  /*
   * Floating Action Button
   */
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  fabIcon: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '600',
  },
});