import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Radius, Spacing } from '@/constants/theme';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';
import { useDisplayName } from '../hooks/dushani-useDisplayName';
import { useIsWide } from '../hooks/dushani-useWideLayout';
import type { RootStackParamList } from '../navigation/types';
import LogoutButton from '../components/kaveesha-LogoutButton';
import {
  getMyFoodRequests,
  getOpenFoodRequests,
} from '../services/dushani-foodRequestApi';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipientHome'>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

// User-management palette (same constants as the Create Request screen).
const C = {
  navy: '#023047',
  teal: '#126782',
  tealDeep: '#0B4B63',
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

/** Full-bleed navy masthead — the overview is deliberately not a card-on-band page. */
function MastheadGlow() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.mastGlowTeal} />
      <View style={styles.mastGlowAmber} />
    </View>
  );
}

function StatPill({
  icon,
  value,
  label,
  tone,
  loading,
}: {
  icon: IconName;
  value: number;
  label: string;
  tone: 'teal' | 'navy' | 'amber' | 'success';
  loading: boolean;
}) {
  const T = useAppTypography();
  const meta = {
    teal: { color: C.teal, background: C.tealSoft },
    navy: { color: C.navy, background: C.offWhite },
    amber: { color: C.orange, background: '#FFF4D6' },
    success: { color: C.success, background: C.successSoft },
  }[tone];

  return (
    <View style={[styles.statPill, { backgroundColor: meta.background }]}>
      <View style={styles.statBadge}>
        <Ionicons name={icon} size={18} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        {loading ? (
          <ActivityIndicator size="small" color={meta.color} />
        ) : (
          <Text style={{ ...T.h2, fontSize: 24, color: meta.color }}>{value}</Text>
        )}
        <Text style={{ ...T.bodySmall, fontSize: 11.5, color: C.textMuted, marginTop: 1 }}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function BigTile({
  icon,
  title,
  subtitle,
  action,
  onPress,
  variant = 'default',
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  action: string;
  onPress: () => void;
  variant?: 'default' | 'primary' | 'accent';
}) {
  const T = useAppTypography();
  const primary = variant === 'primary';
  const accent = variant === 'accent';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        styles.bigTile,
        primary && styles.bigTilePrimary,
        accent && styles.bigTileAccent,
      ]}
      accessibilityLabel={title}
    >
      <View
        style={[
          styles.bigTileIcon,
          primary && styles.bigTileIconPrimary,
          accent && styles.bigTileIconAccent,
        ]}
      >
        <Ionicons
          name={icon}
          size={24}
          color={primary ? C.navy : accent ? C.orange : C.teal}
        />
      </View>
      <Text
        style={{
          ...T.h3,
          fontSize: 18,
          color: primary ? C.white : C.navy,
          marginTop: Spacing.three,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          ...T.bodySmall,
          fontSize: 13,
          lineHeight: 19,
          color: primary ? '#D7E7EE' : accent ? C.textMuted : C.textMuted,
          marginTop: 4,
        }}
      >
        {subtitle}
      </Text>
      <View style={styles.bigTileFooter}>
        <Text
          style={{
            ...T.labelStrong,
            fontSize: 12.5,
            color: primary ? C.amber : accent ? C.orange : C.teal,
          }}
        >
          {action}
        </Text>
        <Ionicons
          name="arrow-forward"
          size={15}
          color={primary ? C.amber : accent ? C.orange : C.teal}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function RecipientHomeScreen({ navigation, route }: Props) {
  const T = useAppTypography();
  const wide = useIsWide();
  const displayName = useDisplayName(route.params?.fullName || 'there');

  const [counts, setCounts] = useState({
    open: 0,
    inProgress: 0,
    received: 0,
    onBoard: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [mine, board] = await Promise.all([
        getMyFoodRequests(),
        getOpenFoodRequests(),
      ]);
      setCounts({
        open: mine.filter((item) => item.status === 'PENDING').length,
        inProgress: mine.filter(
          (item) => item.status === 'MATCHED' || item.status === 'DISPATCHED',
        ).length,
        received: mine.filter((item) => item.status === 'FULFILLED').length,
        onBoard: board.length,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load your overview. Please try again.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOverview(true);
  }, [loadOverview]);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadOverview(false);
            }}
            tintColor={C.teal}
          />
        }
      >
        <View style={styles.masthead}>
          <MastheadGlow />
          <View style={[styles.page, wide && styles.pageWide]}>
            <View style={styles.heroRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.eyebrowRow}>
                  <View style={styles.eyebrowBar} />
                  <Text style={{ ...T.caption, color: C.amber }}>
                    RECIPIENT DASHBOARD
                  </Text>
                </View>
                <Text
                  style={{
                    ...T.h1,
                    color: C.white,
                    fontSize: wide ? 34 : 27,
                    marginTop: Spacing.two,
                  }}
                >
                  Hello, {displayName}
                </Text>
                <Text
                  style={{
                    ...T.bodySmall,
                    fontSize: 13.5,
                    color: '#BEDAE4',
                    marginTop: 6,
                    maxWidth: 460,
                  }}
                >
                  Everything you have asked for, and every meal still waiting for
                  a donor — in one place.
                </Text>
              </View>
              <LogoutButton navigation={navigation} compact />
            </View>
          </View>
        </View>

        <View style={[styles.page, wide && styles.pageWide]}>
          <View style={styles.strip}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={22}
                  color={C.error}
                  style={{ marginBottom: Spacing.two }}
                />
                <Text style={{ ...T.body, color: C.error, textAlign: 'center' }}>
                  {error}
                </Text>
                <TouchableOpacity
                  onPress={() => loadOverview(true)}
                  style={styles.retryButton}
                  accessibilityLabel="Try loading the overview again"
                >
                  <Ionicons
                    name="refresh"
                    size={17}
                    color={C.navy}
                    style={{ marginRight: Spacing.two }}
                  />
                  <Text style={{ ...T.button, color: C.navy }}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.stripRow}>
                <StatPill
                  icon="paper-plane-outline"
                  value={counts.open}
                  label="Waiting for a donor"
                  tone="teal"
                  loading={loading}
                />
                <StatPill
                  icon="car-outline"
                  value={counts.inProgress}
                  label="On the way"
                  tone="amber"
                  loading={loading}
                />
                <StatPill
                  icon="checkmark-done-outline"
                  value={counts.received}
                  label="Food received"
                  tone="success"
                  loading={loading}
                />
                <StatPill
                  icon="megaphone-outline"
                  value={counts.onBoard}
                  label="Open across ResQMeal"
                  tone="navy"
                  loading={loading}
                />
              </View>
            )}
          </View>

          <View style={wide ? styles.columns : undefined}>
            <View style={wide ? styles.column : undefined}>
              <Text
                style={{
                  ...T.caption,
                  color: C.textMuted,
                  marginTop: Spacing.five,
                  marginBottom: Spacing.three,
                }}
              >
                NEED FOOD
              </Text>
              <BigTile
                variant="primary"
                icon="add-circle"
                title="Make a food request"
                subtitle="Post what you need and when you need it. Requests placed within hours are treated as emergencies and shown to nearby donors first."
                action="Start a request"
                onPress={() => navigation.navigate('FoodRequest')}
              />
              <BigTile
                icon="restaurant-outline"
                title="Browse donations"
                subtitle="See the food donors have already put out, matched to your open requests by food type, quantity, distance and urgency."
                action="Browse available food"
                onPress={() => navigation.navigate('AvailableFood')}
              />
            </View>

            <View style={wide ? styles.column : undefined}>
              <Text
                style={{
                  ...T.caption,
                  color: C.textMuted,
                  marginTop: wide ? 0 : Spacing.five,
                  marginBottom: Spacing.three,
                }}
              >
                STAY UPDATED
              </Text>
              <BigTile
                icon="list-outline"
                title="Track my requests"
                subtitle="Follow each request through accepted, on the way and delivered — and confirm the food when it arrives."
                action="Open my requests"
                onPress={() => navigation.navigate('RequestStatus')}
              />
              <BigTile
                variant="accent"
                icon="megaphone-outline"
                title="Request board"
                subtitle="The live requests every recipient still needs help with, urgent ones at the top."
                action="View the board"
                onPress={() => navigation.navigate('RequestBoard')}
              />

              <View style={styles.footNote}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={C.teal}
                  style={{ marginRight: Spacing.two }}
                />
                <Text style={{ ...T.bodySmall, fontSize: 12, color: C.textMuted, flex: 1 }}>
                  A request stays open until a donor accepts it, and you can delete
                  it up to that moment.
                </Text>
              </View>
            </View>
          </View>
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
    paddingBottom: Spacing.seven,
  },
  masthead: {
    backgroundColor: C.navy,
    overflow: 'hidden',
    paddingTop: Spacing.seven,
    paddingBottom: Spacing.six,
  },
  mastGlowTeal: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: C.teal,
    opacity: 0.55,
    top: -170,
    right: -110,
  },
  mastGlowAmber: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: C.amber,
    opacity: 0.18,
    bottom: -120,
    left: 40,
  },
  page: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
  },
  pageWide: {
    maxWidth: 1160,
    paddingHorizontal: Spacing.five,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 1,
  },
  eyebrowBar: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.amber,
  },
  strip: {
    backgroundColor: C.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    marginTop: -Spacing.five,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 12,
  },
  stripRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: Spacing.three,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flexBasis: '23%',
    flexGrow: 1,
    minWidth: 210,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: Spacing.three,
  },
  statBadge: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.five,
  },
  column: {
    flex: 1,
    flexBasis: 0,
    minWidth: 320,
  },
  bigTile: {
    flexGrow: 1,
    flexBasis: '100%',
    minWidth: 280,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    backgroundColor: C.white,
    padding: Spacing.five,
    marginBottom: Spacing.four,
  },
  bigTilePrimary: {
    backgroundColor: C.tealDeep,
    borderColor: C.tealDeep,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 8,
  },
  bigTileAccent: {
    backgroundColor: '#FFF9EA',
    borderColor: '#F6DFA8',
  },
  bigTileIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigTileIconPrimary: {
    backgroundColor: C.amber,
  },
  bigTileIconAccent: {
    backgroundColor: '#FFE9BF',
  },
  bigTileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  errorBox: {
    backgroundColor: C.errorSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.error,
    padding: Spacing.four,
    alignItems: 'center',
    width: '100%',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.md,
    backgroundColor: C.amber,
    marginTop: Spacing.three,
  },
  footNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: C.teal,
    padding: Spacing.three + 2,
    marginTop: Spacing.two,
  },
});
