// frontend/src/screens/kaveesha-FoodRescueRequestsScreen.tsx
// >>> Register this in AppNavigator.tsx as the "FoodRescueRequests" route,
//     and add that route name (with whatever params you need) to
//     RootStackParamList in ../navigation/types. <<<
// Owner: Kaveesha
//
// Donor-facing screen: browse the food requests posted by recipients /
// community members, search + filter them, and start a donation against
// one. Same responsive breakpoints and visual language as
// kaveesha-DonorHomeScreen.tsx (light theme, navy + amber brand colors).
//
//   phone / tablet (< 1024px) -> single column list, cards stack full width
//   desktop        (>= 1024px) -> centered content, 2-3 column card grid
//
// This screen intentionally does NOT duplicate the donor home's sidebar /
// bottom tab bar — it's reached via that nav and uses a simple back
// button + title banner instead. Say the word if you'd like the sidebar
// wired in here too.

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
} from 'react-native';
import type {
  DimensionValue,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import {
  Colors,
  Radius,
  Shadows,
  Spacing,
  Typography,
  ComponentSizes,
} from '../constants/theme';
import type { ThemeColor } from '../constants/theme';
import { DonationUrgency } from '../types/kaveesha-donation.types';

/* ========================================================= */
/* TYPES + MOCK DATA                                          */
/* ========================================================= */

type Props = NativeStackScreenProps<RootStackParamList, any>;

type Palette = Record<ThemeColor, string>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

type FoodRequest = {
  id: string;
  title: string;
  recipientName: string;
  foodType: string;
  quantity: string;
  location: string;
  neededBy: string;
  urgency: DonationUrgency;
  description: string;
  distanceKm: number;
};

const FOOD_TYPES = [
  'All types',
  'Cooked meals',
  'Groceries',
  'Bakery',
  'Fruits & veg',
  'Dairy',
] as const;

const MOCK_FOOD_REQUESTS: FoodRequest[] = [
  {
    id: 'fr-1',
    title: 'Dinner for shelter residents',
    recipientName: 'Hope Haven Shelter',
    foodType: 'Cooked meals',
    quantity: '60 portions',
    location: 'Maradana, Colombo',
    neededBy: 'Today, 6:00 PM',
    urgency: 'HIGH',
    description:
      'We currently host 60 residents and our kitchen supply fell through. Any warm, ready-to-eat meals would help us cover dinner tonight.',
    distanceKm: 1.8,
  },
  {
    id: 'fr-2',
    title: 'Weekly grocery top-up',
    recipientName: 'Green Valley Community Center',
    foodType: 'Groceries',
    quantity: '25 family packs',
    location: 'Nugegoda',
    neededBy: 'Tomorrow, 10:00 AM',
    urgency: 'MEDIUM',
    description:
      'Looking for rice, lentils, and canned goods to restock our weekly family food packs before distribution day.',
    distanceKm: 4.2,
  },
  {
    id: 'fr-3',
    title: 'Bread and pastries for breakfast program',
    recipientName: "St. Anne's Children's Home",
    foodType: 'Bakery',
    quantity: '80 pieces',
    location: 'Wellawatte',
    neededBy: 'Today, 7:00 AM',
    urgency: 'HIGH',
    description:
      'Our breakfast program serves 40 children daily. We ran short on bread this week — any bakery surplus is very welcome.',
    distanceKm: 2.5,
  },
  {
    id: 'fr-4',
    title: 'Fresh produce for soup kitchen',
    recipientName: 'Riverside Soup Kitchen',
    foodType: 'Fruits & veg',
    quantity: '30 kg mixed',
    location: 'Dehiwala',
    neededBy: 'This week',
    urgency: 'NORMAL',
    description:
      'We prepare vegetable soups three times a week and could use fresh produce that might otherwise go to waste.',
    distanceKm: 6.1,
  },
  {
    id: 'fr-5',
    title: 'Milk and dairy for elderly home',
    recipientName: 'Golden Years Elderly Home',
    foodType: 'Dairy',
    quantity: '40 liters',
    location: 'Rajagiriya',
    neededBy: 'Today, 4:00 PM',
    urgency: 'MEDIUM',
    description:
      'Several of our residents need dairy with every meal. Our regular supplier is delayed this week.',
    distanceKm: 3.4,
  },
  {
    id: 'fr-6',
    title: 'Emergency flood relief meals',
    recipientName: 'Kelaniya Relief Committee',
    foodType: 'Cooked meals',
    quantity: '150 portions',
    location: 'Kelaniya',
    neededBy: 'Today, ASAP',
    urgency: 'HIGH',
    description:
      'Families displaced by flooding are sheltering at the community hall. We need ready-to-eat meals as soon as possible.',
    distanceKm: 8.7,
  },
];

/* ========================================================= */
/* THEME + LAYOUT                                              */
/* ========================================================= */

const c = Colors.light as Palette;
const accent = c.primary;

function useLayout() {
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1024;
  const isTablet = width >= 700 && !isDesktop;
  const isMobile = !isDesktop && !isTablet;

  const pad = isDesktop
    ? Spacing.five
    : isTablet
      ? Spacing.four
      : Spacing.three;

  return {
    width,
    isDesktop,
    isTablet,
    isMobile,
    pad,
  };
}

const CONTENT_MAX = 1100;
const GRID_GAP = 16;

const urgencyBadge: Record<
  DonationUrgency,
  { label: string; bg: string; text: string }
> = {
  HIGH: {
    label: 'Urgent',
    bg: c.errorSoft,
    text: c.error,
  },
  MEDIUM: {
    label: 'Soon',
    bg: c.warningSoft,
    text: c.secondaryDark,
  },
  NORMAL: {
    label: 'Normal',
    bg: c.infoSoft,
    text: c.info,
  },
};

/* ========================================================= */
/* STYLES                                                      */
/* ========================================================= */

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.background,
  },

  scrollContent: {
    alignItems: 'center',
    paddingBottom: 48,
  },

  container: {
    width: '100%',
    maxWidth: CONTENT_MAX,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radius.xl,
    padding: 20,
    ...Shadows.card,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bannerTitle: {
    ...Typography.h2,
    fontSize: 22,
    color: '#FFFFFF',
  },

  bannerSubtitle: {
    ...Typography.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
  },

  bannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  searchBar: {
    flex: 1,
    height: ComponentSizes.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.inputBackground,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: c.border,
  },

  searchInput: {
    flex: 1,
    ...Typography.input,
    color: c.inputText,
    paddingVertical: 0,
  },

  filterLabel: {
    ...Typography.label,
    fontSize: 12,
    color: c.textMuted,
    marginBottom: 8,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },

  chipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },

  chipText: {
    ...Typography.label,
    fontSize: 13,
    color: c.textSecondary,
  },

  chipTextActive: {
    color: '#FFFFFF',
  },

  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  resultsText: {
    ...Typography.bodySmall,
    color: c.textSecondary,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },

  card: {
    backgroundColor: c.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    ...Shadows.card,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },

  badgeText: {
    ...Typography.label,
    fontSize: 12,
  },

  distanceText: {
    ...Typography.bodySmall,
    color: c.textMuted,
  },

  cardTitle: {
    ...Typography.h3,
    fontSize: 16,
    lineHeight: 22,
    color: c.text,
    marginTop: 10,
  },

  cardRecipient: {
    ...Typography.bodySmall,
    color: c.textSecondary,
    marginTop: 2,
  },

  metaGrid: {
    marginTop: 12,
    gap: 6,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  metaText: {
    ...Typography.bodySmall,
    color: c.textSecondary,
    flex: 1,
  },

  cardDivider: {
    height: 1,
    backgroundColor: c.borderLight,
    marginVertical: 12,
  },

  cardDescription: {
    ...Typography.bodySmall,
    color: c.textMuted,
    lineHeight: 19,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
  },

  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  viewDetailsText: {
    ...Typography.label,
    fontSize: 13,
    color: accent,
  },

  donateBtn: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    backgroundColor: c.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.button,
  },

  donateBtnText: {
    ...Typography.buttonSmall,
    color: c.textOnSecondary,
  },

  empty: {
    alignItems: 'center',
    padding: 32,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.border,
    backgroundColor: c.surfaceSoft,
    width: '100%',
  },

  emptyText: {
    ...Typography.body,
    color: c.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(1,19,31,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: c.surface,
    borderRadius: Radius.xl,
    padding: 24,
    ...Shadows.card,
  },

  modalTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: c.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalTitle: {
    ...Typography.h3,
    fontSize: 19,
    color: c.text,
    marginTop: 14,
  },

  modalRecipient: {
    ...Typography.body,
    color: c.textSecondary,
    marginTop: 2,
  },

  modalDescription: {
    ...Typography.body,
    color: c.textSecondary,
    marginTop: 14,
    lineHeight: 22,
  },

  modalDonateBtn: {
    height: 50,
    borderRadius: Radius.pill,
    backgroundColor: c.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...Shadows.button,
  },

  modalDonateBtnText: {
    ...Typography.button,
    color: c.textOnSecondary,
  },
});

/* ========================================================= */
/* SMALL COMPONENTS                                            */
/* ========================================================= */

function MetaRow({
  icon,
  text,
}: {
  icon: IconName;
  text: string;
}) {
  return (
    <View style={s.metaRow}>
      <Ionicons
        name={icon}
        size={15}
        color={c.textMuted}
      />

      <Text
        style={s.metaText}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

function RequestCard({
  item,
  width,
  onViewDetails,
  onDonate,
}: {
  item: FoodRequest;
  width: DimensionValue;
  onViewDetails: () => void;
  onDonate: () => void;
}) {
  const badge = urgencyBadge[item.urgency];

  return (
    <View style={[s.card, { width }]}>
      <View style={s.cardTop}>
        <View
          style={[
            s.badge,
            { backgroundColor: badge.bg },
          ]}
        >
          <Text
            style={[
              s.badgeText,
              { color: badge.text },
            ]}
          >
            {badge.label}
          </Text>
        </View>

        <Text style={s.distanceText}>
          {item.distanceKm} km away
        </Text>
      </View>

      <Text
        style={s.cardTitle}
        numberOfLines={2}
      >
        {item.title}
      </Text>

      <Text
        style={s.cardRecipient}
        numberOfLines={1}
      >
        {item.recipientName}
      </Text>

      <View style={s.metaGrid}>
        <MetaRow
          icon="fast-food-outline"
          text={`${item.foodType} · ${item.quantity}`}
        />

        <MetaRow
          icon="location-outline"
          text={item.location}
        />

        <MetaRow
          icon="time-outline"
          text={`Needed ${item.neededBy}`}
        />
      </View>

      <View style={s.cardDivider} />

      <Text
        style={s.cardDescription}
        numberOfLines={3}
      >
        {item.description}
      </Text>

      <View style={s.cardFooter}>
        <TouchableOpacity
          activeOpacity={0.75}
          style={s.viewDetailsBtn}
          onPress={onViewDetails}
        >
          <Text style={s.viewDetailsText}>
            View details
          </Text>

          <Ionicons
            name="chevron-forward"
            size={14}
            color={accent}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={s.donateBtn}
          onPress={onDonate}
        >
          <Text style={s.donateBtnText}>
            Donate
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RequestDetailModal({
  item,
  onClose,
  onDonate,
}: {
  item: FoodRequest | null;
  onClose: () => void;
  onDonate: (item: FoodRequest) => void;
}) {
  if (!item) return null;

  const badge = urgencyBadge[item.urgency];

  return (
    <Modal
      visible={!!item}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.modalOverlay}>
        <View style={s.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={s.modalTop}>
              <View
                style={[
                  s.badge,
                  { backgroundColor: badge.bg },
                ]}
              >
                <Text
                  style={[
                    s.badgeText,
                    { color: badge.text },
                  ]}
                >
                  {badge.label}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.75}
                style={s.modalClose}
                onPress={onClose}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={c.text}
                />
              </TouchableOpacity>
            </View>

            <Text style={s.modalTitle}>
              {item.title}
            </Text>

            <Text style={s.modalRecipient}>
              {item.recipientName}
            </Text>

            <View
              style={[
                s.metaGrid,
                { marginTop: 16 },
              ]}
            >
              <MetaRow
                icon="fast-food-outline"
                text={`${item.foodType} · ${item.quantity}`}
              />

              <MetaRow
                icon="location-outline"
                text={item.location}
              />

              <MetaRow
                icon="time-outline"
                text={`Needed ${item.neededBy}`}
              />

              <MetaRow
                icon="navigate-outline"
                text={`${item.distanceKm} km from you`}
              />
            </View>

            <Text style={s.modalDescription}>
              {item.description}
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              style={s.modalDonateBtn}
              onPress={() => onDonate(item)}
            >
              <Text style={s.modalDonateBtnText}>
                Donate to this request
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ========================================================= */
/* SCREEN                                                      */
/* ========================================================= */

type QuickFilter =
  | 'ALL'
  | 'URGENT'
  | 'NEARBY'
  | 'TODAY';

export default function FoodRescueRequestsScreen({
  navigation,
}: Props) {
  const L = useLayout();

  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] =
    useState<QuickFilter>('ALL');

  const [foodType, setFoodType] =
    useState<(typeof FOOD_TYPES)[number]>(
      'All types'
    );

  const [containerWidth, setContainerWidth] =
    useState(0);

  const [selected, setSelected] =
    useState<FoodRequest | null>(null);

  const innerWidth =
    containerWidth > 0
      ? containerWidth - L.pad * 2
      : 0;

  const columns = L.isDesktop
    ? innerWidth >= 820
      ? 3
      : 2
    : L.isTablet
      ? 2
      : 1;

  // FIX: React Native expects DimensionValue for View width.
  const cardWidth: DimensionValue =
    columns === 1 || innerWidth === 0
      ? '100%'
      : Math.floor(
          (innerWidth - GRID_GAP * (columns - 1)) /
            columns
        );

  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    return MOCK_FOOD_REQUESTS.filter((r) => {
      const matchesQuery =
        !query ||
        r.title.toLowerCase().includes(query) ||
        r.recipientName
          .toLowerCase()
          .includes(query) ||
        r.foodType
          .toLowerCase()
          .includes(query);

      const matchesQuickFilter =
        quickFilter === 'ALL' ||
        (quickFilter === 'URGENT' &&
          r.urgency === 'HIGH') ||
        (quickFilter === 'NEARBY' &&
          r.distanceKm <= 3) ||
        (quickFilter === 'TODAY' &&
          r.neededBy
            .toLowerCase()
            .includes('today'));

      const matchesFoodType =
        foodType === 'All types' ||
        r.foodType === foodType;

      return (
        matchesQuery &&
        matchesQuickFilter &&
        matchesFoodType
      );
    });
  }, [query, quickFilter, foodType]);

  const handleDonate = (item: FoodRequest) => {
    setSelected(null);

    navigation.navigate(
      'CreateDonation' as any,
      { requestId: item.id } as any
    );
  };

  const quickChips: {
    key: QuickFilter;
    label: string;
    icon: IconName;
  }[] = [
    {
      key: 'ALL',
      label: 'All',
      icon: 'apps-outline',
    },
    {
      key: 'URGENT',
      label: 'Urgent',
      icon: 'alert-circle-outline',
    },
    {
      key: 'NEARBY',
      label: 'Nearby',
      icon: 'navigate-outline',
    },
    {
      key: 'TODAY',
      label: 'Today',
      icon: 'today-outline',
    },
  ];

  return (
    <SafeAreaView
      style={s.safeArea}
      edges={['top']}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            s.container,
            {
              paddingHorizontal: L.pad,
              paddingTop: L.pad,
            },
          ]}
          onLayout={(e: LayoutChangeEvent) =>
            setContainerWidth(
              e.nativeEvent.layout.width
            )
          }
        >
          {/* Banner */}
          <LinearGradient
            colors={[
              c.primaryDark,
              c.primary,
              c.info,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.banner}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={s.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>
                Food rescue requests
              </Text>

              <Text style={s.bannerSubtitle}>
                {filtered.length} open request
                {filtered.length === 1
                  ? ''
                  : 's'} near you
              </Text>
            </View>

            <View style={s.bannerIconWrap}>
              <Ionicons
                name="fast-food"
                size={24}
                color="#FFFFFF"
              />
            </View>
          </LinearGradient>

          {/* Search */}
          <View style={{ marginTop: 20 }}>
            <View style={s.searchRow}>
              <View style={s.searchBar}>
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={c.textMuted}
                />

                <TextInput
                  placeholder="Search requests, food type, community..."
                  placeholderTextColor={
                    c.inputPlaceholder
                  }
                  value={search}
                  onChangeText={setSearch}
                  style={s.searchInput}
                />

                {search.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearch('')}
                  >
                    <Ionicons
                      name="close-circle"
                      size={19}
                      color={c.textMuted}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Quick filters */}
          <View style={{ marginTop: 18 }}>
            <Text style={s.filterLabel}>
              Filter
            </Text>

            <View style={s.chipRow}>
              {quickChips.map((chip) => {
                const isActive =
                  chip.key === quickFilter;

                return (
                  <TouchableOpacity
                    key={chip.key}
                    activeOpacity={0.8}
                    style={[
                      s.chip,
                      isActive &&
                        s.chipActive,
                    ]}
                    onPress={() =>
                      setQuickFilter(
                        chip.key
                      )
                    }
                  >
                    <Ionicons
                      name={chip.icon}
                      size={14}
                      color={
                        isActive
                          ? '#FFFFFF'
                          : c.textSecondary
                      }
                    />

                    <Text
                      style={[
                        s.chipText,
                        isActive &&
                          s.chipTextActive,
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Food type filter */}
          <View style={{ marginTop: 14 }}>
            <Text style={s.filterLabel}>
              Food type
            </Text>

            <View style={s.chipRow}>
              {FOOD_TYPES.map((type) => {
                const isActive =
                  type === foodType;

                return (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.8}
                    style={[
                      s.chip,
                      isActive &&
                        s.chipActive,
                    ]}
                    onPress={() =>
                      setFoodType(type)
                    }
                  >
                    <Text
                      style={[
                        s.chipText,
                        isActive &&
                          s.chipTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Results */}
          <View style={{ marginTop: 22 }}>
            {filtered.length === 0 ? (
              <View style={s.empty}>
                <Ionicons
                  name="fast-food-outline"
                  size={26}
                  color={c.textMuted}
                />

                <Text style={s.emptyText}>
                  No requests match your filters.
                </Text>
              </View>
            ) : columns === 1 ? (
              <View
                style={{
                  gap: GRID_GAP,
                }}
              >
                {filtered.map((item) => (
                  <RequestCard
                    key={item.id}
                    item={item}
                    width="100%"
                    onViewDetails={() =>
                      setSelected(item)
                    }
                    onDonate={() =>
                      handleDonate(item)
                    }
                  />
                ))}
              </View>
            ) : (
              <View style={s.grid}>
                {filtered.map((item) => (
                  <RequestCard
                    key={item.id}
                    item={item}
                    width={cardWidth}
                    onViewDetails={() =>
                      setSelected(item)
                    }
                    onDonate={() =>
                      handleDonate(item)
                    }
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <RequestDetailModal
        item={selected}
        onClose={() => setSelected(null)}
        onDonate={handleDonate}
      />
    </SafeAreaView>
  );
}