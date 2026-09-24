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

function StatTile({
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
    <View style={[styles.statTile, { backgroundColor: meta.background }]}>
      <View style={styles.statHead}>
        <Ionicons name={icon} size={17} color={meta.color} />
        <Text style={{ ...T.caption, fontSize: 11, color: C.textMuted, flex: 1 }}>
          {label}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={meta.color} style={{ marginTop: Spacing.two }} />
      ) : (
        <Text style={{ ...T.h2, fontSize: 26, color: meta.color, marginTop: 2 }}>
          {value}
        </Text>
      )}
    </View>
  );
}

function ActionTile({
  icon,
  title,
  subtitle,
  onPress,
  primary,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const T = useAppTypography();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[styles.actionTile, primary && styles.actionTilePrimary]}
      accessibilityLabel={title}
    >
      <View style={[styles.actionIcon, primary && styles.actionIconPrimary]}>
        <Ionicons name={icon} size={20} color={primary ? C.navy : C.teal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            ...T.labelStrong,
            fontSize: 15,
            color: primary ? C.white : C.navy,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={{
            ...T.bodySmall,
            fontSize: 12,
            color: primary ? '#DCE9EF' : C.textMuted,
            marginTop: 2,
          }}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={primary ? C.white : C.textMuted}
      />
    </TouchableOpacity>
  );
}

export default function RecipientHomeScreen({ navigation, route }: Props) {
  const T = useAppTypography();
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
      <Backdrop />

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
        <View style={styles.page}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...T.caption, color: C.amber }}>{displayName}</Text>
              <Text style={{ ...T.h1, color: C.white, fontSize: 28, marginTop: 2 }}>
                Overview
              </Text>
              <Text style={{ ...T.bodySmall, color: '#CFE3EA', marginTop: 4 }}>
                Track your requests and see what the community needs.
              </Text>
            </View>
            <LogoutButton navigation={navigation} compact />
          </View>

          <View style={styles.body}>
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
              <View style={styles.statGrid}>
                <StatTile
                  icon="paper-plane-outline"
                  value={counts.open}
                  label="Waiting for a donor"
                  tone="teal"
                  loading={loading}
                />
                <StatTile
                  icon="car-outline"
                  value={counts.inProgress}
                  label="On the way"
                  tone="amber"
                  loading={loading}
                />
                <StatTile
                  icon="checkmark-done-outline"
                  value={counts.received}
                  label="Food received"
                  tone="success"
                  loading={loading}
                />
                <StatTile
                  icon="megaphone-outline"
                  value={counts.onBoard}
                  label="Open across ResQMeal"
                  tone="navy"
                  loading={loading}
                />
              </View>
            )}

            <Text style={{ ...T.caption, color: C.textMuted, marginTop: Spacing.five, marginBottom: Spacing.three }}>
              NEED FOOD?
            </Text>

            <ActionTile
              primary
              icon="add-circle"
              title="Make a food request"
              subtitle="Post what you need and when — nearby donors see it instantly."
              onPress={() => navigation.navigate('FoodRequest')}
            />
            <ActionTile
              icon="restaurant-outline"
              title="Browse donations"
              subtitle="Look through food donors have already made available."
              onPress={() => navigation.navigate('AvailableFood')}
            />

            <Text style={{ ...T.caption, color: C.textMuted, marginTop: Spacing.five, marginBottom: Spacing.three }}>
              STAY UPDATED
            </Text>

            <ActionTile
              icon="list-outline"
              title="Track my requests"
              subtitle="Follow every request from posting to delivery."
              onPress={() => navigation.navigate('RequestStatus')}
            />
            <ActionTile
              icon="megaphone-outline"
              title="Request board"
              subtitle="See the live requests other recipients still need help with."
              onPress={() => navigation.navigate('RequestBoard')}
            />

            <View style={styles.footNote}>
              <Ionicons
                name="information-circle-outline"
                size={15}
                color={C.teal}
                style={{ marginRight: Spacing.two }}
              />
              <Text style={{ ...T.bodySmall, fontSize: 12, color: C.textMuted, flex: 1 }}>
                A request stays open until a donor accepts it, and you can delete it
                up to that moment.
              </Text>
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
  band: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 236,
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
    top: -130,
    right: -90,
  },
  bandGlowAmber: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: C.amber,
    opacity: 0.22,
    bottom: -86,
    left: 60,
  },
  page: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.seven,
  },
  body: {
    backgroundColor: C.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    marginHorizontal: Spacing.four,
    padding: Spacing.five,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
    elevation: 10,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  statTile: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 150,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: Spacing.three + 2,
  },
  statHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  errorBox: {
    backgroundColor: C.errorSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.error,
    padding: Spacing.four,
    alignItems: 'center',
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
  actionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    backgroundColor: C.offWhite,
    padding: Spacing.four,
    marginBottom: Spacing.three,
  },
  actionTilePrimary: {
    backgroundColor: C.navy,
    borderColor: C.navy,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconPrimary: {
    backgroundColor: C.amber,
  },
  footNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.tealSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: C.teal,
    padding: Spacing.three,
    marginTop: Spacing.four,
  },
});
