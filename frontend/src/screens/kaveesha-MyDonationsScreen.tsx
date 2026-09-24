// frontend/src/screens/kaveesha-MyDonationsScreen.tsx

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import type {
  Donation,
  DonationStatus,
} from '@/types/kaveesha-donation.types';

import { getDonations } from '@/services/kaveesha-donationApi';

import DonationStatusBadge from '@/components/kaveesha-DonationStatusBadge';

import {
  Colors,
  Radius,
  Shadows,
  Spacing,
  Typography,
  ComponentSizes,
} from '@/constants/theme';

import type { ThemeColor } from '@/constants/theme';

/* ========================================================= */
/* TYPES + CONSTANTS                                         */
/* ========================================================= */

type FilterValue = 'all' | DonationStatus;

type Palette = Record<ThemeColor, string>;

const FILTERS: {
  label: string;
  value: FilterValue;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    label: 'All',
    value: 'all',
    icon: 'apps-outline',
  },
  {
    label: 'Pending',
    value: 'pending',
    icon: 'time-outline',
  },
  {
    label: 'Active',
    value: 'active',
    icon: 'radio-button-on-outline',
  },
  {
    label: 'Expiring',
    value: 'expiring',
    icon: 'warning-outline',
  },
  {
    label: 'Completed',
    value: 'completed',
    icon: 'checkmark-circle-outline',
  },
  {
    label: 'Cancelled',
    value: 'cancelled',
    icon: 'close-circle-outline',
  },
  {
    label: 'Expired',
    value: 'expired',
    icon: 'calendar-outline',
  },
];

const CONTENT_MAX = 1600;
const GRID_GAP = 16;

/* ========================================================= */
/* HELPERS                                                    */
/* ========================================================= */

function formatExpiryFromHours(
  hours: number = 0,
): string {
  if (hours <= 0) {
    return 'Expired';
  }

  if (hours < 1) {
    return 'Expires soon';
  }

  const roundedHours = Math.floor(hours);

  if (roundedHours === 1) {
    return 'Expires in 1h';
  }

  return `Expires in ${roundedHours}h`;
}

/* ========================================================= */
/* LAYOUT + THEME HOOKS                                      */
/* ========================================================= */

function useLayout() {
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1024;
  const isTablet = width >= 700 && !isDesktop;
  const isMobile = !isDesktop && !isTablet;

  const pad = isDesktop
    ? Spacing.four
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

function makeStyles(
  c: Palette,
  accent: string,
) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.background,
      overflow: 'hidden',
    },

    scrollWrap: {
      flex: 1,
      alignItems: 'center',
    },

    container: {
      width: '100%',
      maxWidth: CONTENT_MAX,
    },

    /* ===================================================== */
    /* HEADER                                                  */
    /* ===================================================== */

    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    backButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    title: {
      ...Typography.h1,
      color: c.text,
      letterSpacing: -0.6,
    },

    subtitle: {
      ...Typography.body,
      color: c.textSecondary,
      marginTop: 2,
    },

    /* ===================================================== */
    /* HERO                                                     */
    /* ===================================================== */

    heroCard: {
      borderRadius: Radius.xl,
      overflow: 'hidden',
      padding: 32,
      flexDirection: 'row',
      alignItems: 'center',
      ...Shadows.card,
    },

    heroCircleOne: {
      position: 'absolute',
      width: 260,
      height: 260,
      borderRadius: 130,
      right: -90,
      top: -110,
      backgroundColor:
        'rgba(255,255,255,0.06)',
    },

    heroCircleTwo: {
      position: 'absolute',
      width: 190,
      height: 190,
      borderRadius: 95,
      right: 70,
      bottom: -120,
      backgroundColor:
        'rgba(255,255,255,0.05)',
    },

    heroTitle: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 28,
      letterSpacing: -0.6,
    },

    heroSubtitle: {
      color: 'rgba(255,255,255,0.85)',
      marginTop: 8,
      fontSize: 15,
      maxWidth: 480,
    },

    /* ===================================================== */
    /* STATS                                                    */
    /* ===================================================== */

    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
    },

    statCard: {
      flex: 1,
      minWidth: 150,
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: 18,
      shadowColor: '#023047',
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.06,
      shadowRadius: 14,
      elevation: 3,
    },

    statIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },

    statValue: {
      ...Typography.h2,
      color: c.text,
      fontSize: 24,
    },

    statLabel: {
      ...Typography.bodySmall,
      color: c.textSecondary,
      marginTop: 2,
    },

    /* ===================================================== */
    /* TOOLBAR                                                  */
    /* ===================================================== */

    toolbarDesktop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },

    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      height: ComponentSizes.inputHeight,
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

    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      height: 38,
      borderRadius: Radius.pill,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },

    filterChipActive: {
      backgroundColor: accent,
      borderColor: accent,
    },

    filterChipText: {
      ...Typography.label,
      color: c.textSecondary,
    },

    filterChipTextActive: {
      color: '#FFFFFF',
    },

    /* ===================================================== */
    /* CONTENT PANEL                                            */
    /* ===================================================== */

    panel: {
      backgroundColor: c.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: 24,
      ...Shadows.card,
    },

    /* ===================================================== */
    /* DONATION CARD                                            */
    /* ===================================================== */

    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: GRID_GAP,
    },

    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: 16,
      shadowColor: '#023047',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 3,
    },

    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    cardIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cardEmoji: {
      fontSize: 24,
    },

    cardTitle: {
      ...Typography.bodyMedium,
      fontSize: 16,
      color: c.text,
      fontWeight: '700',
    },

    cardMeta: {
      ...Typography.bodySmall,
      color: c.textSecondary,
      marginTop: 3,
    },

    cardBadgeWrap: {
      marginTop: 10,
    },

    cardChevron: {
      marginLeft: 'auto',
    },

    /* ===================================================== */
    /* EMPTY / LOADING                                          */
    /* ===================================================== */

    center: {
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },

    emptyTitle: {
      ...Typography.h3,
      color: c.text,
    },

    emptyText: {
      ...Typography.body,
      color: c.textMuted,
      marginTop: 6,
      textAlign: 'center',
    },
  });
}

const styleCache = {
  light: makeStyles(
    Colors.light as Palette,
    Colors.light.primary,
  ),
};

function useTheme() {
  const c = Colors.light as Palette;

  return {
    c,
    accent: c.primary,
    s: styleCache.light,
  };
}

/* ========================================================= */
/* DONATION CARD                                             */
/* ========================================================= */

function DonationCard({
  donation,
  width,
  onPress,
}: {
  donation: Donation;
  width?: number;
  onPress: () => void;
}) {
  const { c, s } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        width
          ? { width }
          : { width: '100%' },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={s.cardRow}>
        <View style={s.cardIconWrap}>
          <Text style={s.cardEmoji}>
            🍛
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={s.cardTitle}
            numberOfLines={1}
          >
            {donation.foodName ??
              donation.foodType}
          </Text>

          <Text
            style={s.cardMeta}
            numberOfLines={1}
          >
            {donation.portions ??
              donation.numberOfPortions}{' '}
            portions ·{' '}
            {formatExpiryFromHours(
              donation.expiresInHours ?? 0,
            )}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={c.textMuted}
          style={s.cardChevron}
        />
      </View>

      <View style={s.cardBadgeWrap}>
        <DonationStatusBadge
          status={donation.status}
        />
      </View>
    </Pressable>
  );
}

/* ========================================================= */
/* SCREEN                                                     */
/* ========================================================= */

export default function MyDonationsScreen() {
  const navigation =
    useNavigation<any>();

  const { c, accent, s } =
    useTheme();

  const L = useLayout();

  const [filter, setFilter] =
    useState<FilterValue>('all');

  const [search, setSearch] =
    useState('');

  const [donations, setDonations] =
    useState<Donation[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [boxWidth, setBoxWidth] =
    useState(0);

  /* ===================================================== */
  /* LOAD DONATIONS                                          */
  /* ===================================================== */

  const load = useCallback(
    async (status: FilterValue) => {
      try {
        const data =
          await getDonations(status);

        setDonations(data);
      } catch (error) {
        console.error(
          '[MyDonations] Failed to load:',
          error,
        );

        setDonations([]);
      }
    },
    [],
  );

  useEffect(() => {
    setLoading(true);

    load(filter).finally(() => {
      setLoading(false);
    });
  }, [filter, load]);

  /* ===================================================== */
  /* REFRESH                                                  */
  /* ===================================================== */

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await load(filter);
    } finally {
      setRefreshing(false);
    }
  };

  /* ===================================================== */
  /* SEARCH                                                   */
  /* ===================================================== */

  const query = search
    .trim()
    .toLowerCase();

  const visibleDonations =
    useMemo(
      () =>
        donations.filter(
          (d) => {
            const foodName =
              (
                d.foodName ??
                d.foodType ??
                ''
              ).toLowerCase();

            const category =
              (
                d.category ??
                d.foodCategory ??
                ''
              ).toLowerCase();

            return (
              !query ||
              foodName.includes(query) ||
              category.includes(query)
            );
          },
        ),
      [donations, query],
    );

  /* ===================================================== */
  /* COUNTS                                                   */
  /* ===================================================== */

  const counts = useMemo(() => {
    const active =
      donations.filter(
        (d) =>
          d.status === 'active',
      ).length;

    const pending =
      donations.filter(
        (d) =>
          d.status === 'pending',
      ).length;

    const completed =
      donations.filter(
        (d) =>
          d.status === 'completed',
      ).length;

    return {
      total: donations.length,
      active,
      pending,
      completed,
    };
  }, [donations]);

  /* ===================================================== */
  /* RESPONSIVE GRID                                          */
  /* ===================================================== */

  const innerWidth =
    boxWidth > 0
      ? boxWidth
      : Math.min(
          L.width,
          CONTENT_MAX,
        ) -
        L.pad * 2;

  const columns = L.isMobile
    ? 1
    : innerWidth >= 900
      ? 3
      : innerWidth >= 560
        ? 2
        : 1;

  const cardWidth =
    columns > 1
      ? Math.floor(
          (innerWidth -
            GRID_GAP *
              (columns - 1)) /
            columns,
        )
      : undefined;

  const onGridLayout = (
    e: LayoutChangeEvent,
  ) => {
    setBoxWidth(
      e.nativeEvent.layout.width,
    );
  };

  /* ===================================================== */
  /* STATS STRIP                                              */
  /* ===================================================== */

  const statsStrip = (
    <View style={s.statsRow}>
      {/* TOTAL */}

      <View style={s.statCard}>
        <View
          style={[
            s.statIcon,
            {
              backgroundColor:
                c.primarySoft,
            },
          ]}
        >
          <Ionicons
            name="fast-food-outline"
            size={19}
            color={accent}
          />
        </View>

        <Text style={s.statValue}>
          {counts.total}
        </Text>

        <Text style={s.statLabel}>
          Total donations
        </Text>
      </View>

      {/* ACTIVE */}

      <View style={s.statCard}>
        <View
          style={[
            s.statIcon,
            {
              backgroundColor:
                c.secondarySoft,
            },
          ]}
        >
          <Ionicons
            name="radio-button-on-outline"
            size={19}
            color={c.secondary}
          />
        </View>

        <Text style={s.statValue}>
          {counts.active}
        </Text>

        <Text style={s.statLabel}>
          Active
        </Text>
      </View>

      {/* PENDING */}

      <View style={s.statCard}>
        <View
          style={[
            s.statIcon,
            {
              backgroundColor:
                c.warningSoft,
            },
          ]}
        >
          <Ionicons
            name="time-outline"
            size={19}
            color={c.warning}
          />
        </View>

        <Text style={s.statValue}>
          {counts.pending}
        </Text>

        <Text style={s.statLabel}>
          Pending
        </Text>
      </View>

      {/* COMPLETED */}

      <View style={s.statCard}>
        <View
          style={[
            s.statIcon,
            {
              backgroundColor:
                c.successSoft,
            },
          ]}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={19}
            color={c.success}
          />
        </View>

        <Text style={s.statValue}>
          {counts.completed}
        </Text>

        <Text style={s.statLabel}>
          Completed
        </Text>
      </View>
    </View>
  );

  /* ===================================================== */
  /* SEARCH BAR                                               */
  /* ===================================================== */

  const searchBar = (
    <View
      style={[
        s.searchBar,
        L.isDesktop
          ? { flex: 1 }
          : undefined,
      ]}
    >
      <Ionicons
        name="search-outline"
        size={19}
        color={c.textMuted}
      />

      <TextInput
        placeholder="Search your donations..."
        placeholderTextColor={
          c.inputPlaceholder
        }
        value={search}
        onChangeText={setSearch}
        style={s.searchInput}
      />

      {search.length > 0 && (
        <Pressable
          onPress={() =>
            setSearch('')
          }
        >
          <Ionicons
            name="close-circle"
            size={18}
            color={c.textMuted}
          />
        </Pressable>
      )}
    </View>
  );

  /* ===================================================== */
  /* FILTER CHIPS                                             */
  /* ===================================================== */

  const filterChips = (
    <View style={s.filterRow}>
      {FILTERS.map((f) => {
        const isActive =
          filter === f.value;

        return (
          <Pressable
            key={String(f.value)}
            onPress={() =>
              setFilter(f.value)
            }
            style={[
              s.filterChip,
              isActive &&
                s.filterChipActive,
            ]}
          >
            <Ionicons
              name={f.icon}
              size={14}
              color={
                isActive
                  ? '#FFFFFF'
                  : c.textSecondary
              }
            />

            <Text
              style={[
                s.filterChipText,
                isActive &&
                  s.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  /* ===================================================== */
  /* RENDER                                                   */
  /* ===================================================== */

  return (
    <SafeAreaView
      style={s.safeArea}
      edges={['top']}
    >
      <FlatList
        data={
          loading
            ? []
            : visibleDonations
        }
        keyExtractor={(item) =>
          item.id ||
          item._id ||
          item.donationCode ||
          String(item.createdAt)
        }
        contentContainerStyle={{
          alignItems: 'center',
          paddingBottom:
            L.isDesktop
              ? 48
              : 100,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accent}
          />
        }
        ListHeaderComponent={
          <View
            style={[
              s.container,
              {
                paddingHorizontal:
                  L.pad,
              },
            ]}
          >
            {/* HEADER */}

            <View
              style={[
                s.headerRow,
                {
                  marginTop:
                    L.isDesktop
                      ? 32
                      : 12,
                  marginBottom: 20,
                },
              ]}
            >
              <Pressable
                style={s.backButton}
                onPress={() =>
                  navigation.goBack()
                }
              >
                <Ionicons
                  name="arrow-back"
                  size={20}
                  color={c.text}
                />
              </Pressable>

              <View>
                <Text style={s.title}>
                  My Donations
                </Text>

                <Text style={s.subtitle}>
                  Track every meal you've
                  shared
                </Text>
              </View>
            </View>

            {/* HERO */}

            <LinearGradient
              colors={[
                c.primaryDark,
                c.primary,
                c.info,
              ]}
              start={{
                x: 0,
                y: 0,
              }}
              end={{
                x: 1,
                y: 1,
              }}
              style={[
                s.heroCard,
                {
                  padding:
                    L.isDesktop
                      ? 32
                      : 20,
                  marginBottom:
                    L.isDesktop
                      ? 24
                      : 20,
                },
              ]}
            >
              <View
                style={s.heroCircleOne}
              />

              <View
                style={s.heroCircleTwo}
              />

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={[
                    s.heroTitle,
                    !L.isDesktop && {
                      fontSize: 20,
                    },
                  ]}
                >
                  Your donation history
                </Text>

                <Text
                  style={[
                    s.heroSubtitle,
                    !L.isDesktop && {
                      fontSize: 13,
                    },
                  ]}
                >
                  See what you've given,
                  what's still active, and
                  what's completed — all in
                  one place.
                </Text>
              </View>
            </LinearGradient>

            {/* STATS */}

            <View
              style={{
                marginBottom:
                  L.isDesktop
                    ? 24
                    : 20,
              }}
            >
              {statsStrip}
            </View>

            {/* TOOLBAR */}

            {L.isDesktop ? (
              <View
                style={[
                  s.toolbarDesktop,
                  {
                    marginBottom: 20,
                  },
                ]}
              >
                {searchBar}

                {filterChips}
              </View>
            ) : (
              <>
                <View
                  style={{
                    marginBottom: 16,
                  }}
                >
                  {searchBar}
                </View>

                <View
                  style={{
                    marginBottom: 20,
                  }}
                >
                  {filterChips}
                </View>
              </>
            )}

            {/* LOADING */}

            {loading && (
              <View
                style={[
                  s.center,
                  {
                    paddingVertical: 60,
                  },
                ]}
              >
                <ActivityIndicator
                  color={accent}
                />
              </View>
            )}

            {/* DONATION GRID */}

            {!loading &&
              visibleDonations.length >
                0 && (
                <View
                  style={
                    L.isDesktop
                      ? s.panel
                      : undefined
                  }
                  onLayout={
                    onGridLayout
                  }
                >
                  <View style={s.grid}>
                    {visibleDonations.map(
                      (item) => (
                        <DonationCard
                          key={
                            item.id ||
                            item._id ||
                            item.donationCode
                          }
                          donation={item}
                          width={
                            cardWidth
                          }
                          onPress={() =>
                            navigation.navigate(
                              'DonationDetail',
                              {
                                donationId:
                                  item.id ||
                                  item._id,
                              },
                            )
                          }
                        />
                      ),
                    )}
                  </View>
                </View>
              )}

            {/* EMPTY STATE */}

            {!loading &&
              visibleDonations.length ===
                0 && (
                <View
                  style={[
                    s.center,
                    {
                      paddingVertical: 60,
                    },
                  ]}
                >
                  <View
                    style={
                      s.emptyIconWrap
                    }
                  >
                    <Ionicons
                      name="restaurant-outline"
                      size={30}
                      color={c.textMuted}
                    />
                  </View>

                  <Text
                    style={s.emptyTitle}
                  >
                    No donations here
                  </Text>

                  <Text
                    style={s.emptyText}
                  >
                    {query
                      ? 'Nothing matches your search.'
                      : "You haven't added any donations in this category yet."}
                  </Text>
                </View>
              )}
          </View>
        }
        renderItem={() => null}
      />
    </SafeAreaView>
  );
}