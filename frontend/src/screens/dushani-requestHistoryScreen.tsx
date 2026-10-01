import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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
import EmergencyStatusBadge from '../components/dushani-emergencyStatusBadge';
import {
  getMyRequestHistory,
  type FoodRequestHistoryRow,
  type FoodRequestStatus,
} from '../services/dushani-foodRequestApi';

type Props = NativeStackScreenProps<RootStackParamList, 'RequestHistory'>;

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

// The history is what a request ended up being: delivered, never claimed, or
// called off. Anything still live belongs on My Requests instead.
type Outcome = Extract<FoodRequestStatus, 'FULFILLED' | 'EXPIRED' | 'CANCELLED'>;

const OUTCOME_META: Record<
  Outcome,
  { label: string; ending: string; icon: React.ComponentProps<typeof Ionicons>['name']; bg: string; text: string }
> = {
  FULFILLED: {
    label: 'Food received',
    ending: 'The donation reached you.',
    icon: 'checkmark-circle',
    bg: C.successSoft,
    text: C.success,
  },
  EXPIRED: {
    label: 'Never claimed',
    ending: 'No donor accepted it before it closed.',
    icon: 'close-circle-outline',
    bg: '#FFF3D6',
    text: '#8A6100',
  },
  CANCELLED: {
    label: 'Cancelled',
    ending: 'You withdrew this request.',
    icon: 'ban-outline',
    bg: C.errorSoft,
    text: C.error,
  },
};

const FILTERS: { key: string; label: string; outcomes: Outcome[] }[] = [
  { key: 'ALL', label: 'All', outcomes: ['FULFILLED', 'EXPIRED', 'CANCELLED'] },
  { key: 'FULFILLED', label: 'Received', outcomes: ['FULFILLED'] },
  { key: 'EXPIRED', label: 'Never claimed', outcomes: ['EXPIRED'] },
  { key: 'CANCELLED', label: 'Cancelled', outcomes: ['CANCELLED'] },
];

// The server sends the list newest-closure-first. Reading a history backwards
// — the way it actually happened — is just the same list turned around.
const ORDERS: { key: string; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'NEWEST', label: 'Newest first', icon: 'arrow-down' },
  { key: 'OLDEST', label: 'Oldest first', icon: 'arrow-up' },
];

function formatDay(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Two requests can close on the same day, so a row names the hour as well.
function formatTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function monthOf(value: string | null): string {  if (!value) return 'Earlier';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

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

export default function RequestHistoryScreen({ navigation }: Props) {
  const T = useAppTypography();
  const wide = useIsWide();
  const displayName = useDisplayName();

  const [past, setPast] = useState<FoodRequestHistoryRow[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [order, setOrder] = useState('NEWEST');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      setPast(await getMyRequestHistory());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load your past requests. Please try again.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  const counts = useMemo(() => {
    const tally: Record<Outcome, number> = { FULFILLED: 0, EXPIRED: 0, CANCELLED: 0 };
    past.forEach((request) => {
      tally[request.status as Outcome] += 1;
    });
    return tally;
  }, [past]);

  const activeFilter = FILTERS.find((entry) => entry.key === filter) ?? FILTERS[0];
  const visible = past.filter((request) =>
    activeFilter.outcomes.includes(request.status as Outcome),
  );

  const ordered = order === 'OLDEST' ? [...visible].reverse() : visible;

  // Ordered by when each request ended, so the month headings fall out of that
  // order instead of being worked out again.
  const groups = useMemo(() => {
    const byMonth = new Map<string, FoodRequestHistoryRow[]>();
    ordered.forEach((request) => {
      const key = monthOf(request.closedAt);
      byMonth.set(key, [...(byMonth.get(key) ?? []), request]);
    });
    return Array.from(byMonth, ([month, items]) => ({ month, items }));
  }, [ordered]);

  const renderState = (
    icon: React.ComponentProps<typeof Ionicons>['name'],
    title: string,
    body: string,
    action?: { label: string; onPress: () => void },
  ) => (
    <View style={styles.centered}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={26} color={C.teal} />
      </View>
      <Text style={{ ...T.h3, color: C.navy, fontSize: 18, textAlign: 'center' }}>
        {title}
      </Text>
      <Text
        style={{ ...T.body, color: C.textMuted, textAlign: 'center', marginTop: Spacing.two }}
      >
        {body}
      </Text>
      {action && (
        <TouchableOpacity onPress={action.onPress} style={styles.primaryButton}>
          <Text style={{ ...T.button, color: C.navy }}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

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
            onRefresh={() => load(false)}
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
            <Text style={{ ...T.h2, color: C.white, fontSize: 26 }}>
              Request History
            </Text>
          </View>
        </View>

        <View style={[styles.page, wide && styles.pageWide]}>
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...T.labelStrong, fontSize: 13, color: C.navy }}>
                  {loading || error
                    ? 'Past requests'
                    : `${past.length} ${past.length === 1 ? 'request' : 'requests'} closed`}
                </Text>
                <Text
                  style={{
                    ...T.bodySmall,
                    fontSize: 12,
                    color: C.textMuted,
                    marginTop: 2,
                  }}
                >
                  Everything you asked for that is no longer running — received,
                  never claimed or called off.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => load(false)}
                style={styles.refreshButton}
                accessibilityLabel="Refresh history"
              >
                <Ionicons
                  name={loading || refreshing ? 'hourglass-outline' : 'refresh'}
                  size={17}
                  color={C.teal}
                />
              </TouchableOpacity>
            </View>

            {!loading && !error && past.length > 0 && (
              <View style={styles.stats}>
                {FILTERS.filter((entry) => entry.key !== 'ALL').map((entry) => {
                  const outcome = entry.outcomes[0];
                  const meta = OUTCOME_META[outcome];
                  return (
                    <View key={entry.key} style={[styles.stat, { borderColor: meta.bg }]}>
                      <Text
                        style={{
                          ...T.h3,
                          fontSize: 20,
                          color: meta.text,
                        }}
                      >
                        {counts[outcome]}
                      </Text>
                      <Text
                        style={{ ...T.caption, fontSize: 11, color: C.textMuted, marginTop: 2 }}
                      >
                        {entry.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {!loading && !error && past.length > 0 && (
              <View style={styles.tabs}>
                {FILTERS.map((entry) => {
                  const active = entry.key === filter;
                  const count =
                    entry.key === 'ALL'
                      ? past.length
                      : counts[entry.outcomes[0]];
                  return (
                    <TouchableOpacity
                      key={entry.key}
                      onPress={() => setFilter(entry.key)}
                      activeOpacity={0.85}
                      style={[styles.tab, active && styles.tabActive]}
                      accessibilityRole="tab"
                      accessibilityLabel={`${entry.label} requests`}
                      accessibilityState={{ selected: active }}
                    >
                      <Text
                        style={{
                          ...T.labelStrong,
                          fontSize: 12,
                          color: active ? C.white : C.navy,
                        }}
                      >
                        {entry.label}
                      </Text>
                      <View style={[styles.tabCount, active && styles.tabCountActive]}>
                        <Text
                          style={{
                            ...T.caption,
                            fontSize: 10,
                            color: active ? C.navy : C.textMuted,
                          }}
                        >
                          {count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {!loading && !error && past.length > 0 && (
              <View style={styles.orderRow}>
                <Text style={{ ...T.caption, fontSize: 11, color: C.textMuted, flexShrink: 1 }}>
                  {visible.length === past.length
                    ? `Showing all ${past.length} closed requests`
                    : `Showing ${visible.length} of ${past.length}`}
                </Text>
                <View style={styles.orderButtons}>
                  {ORDERS.map((entry) => {
                    const active = entry.key === order;
                    return (
                      <TouchableOpacity
                        key={entry.key}
                        onPress={() => setOrder(entry.key)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`Order the history ${entry.label.toLowerCase()}`}
                        style={[styles.orderButton, active && styles.orderButtonActive]}
                      >
                        <Ionicons
                          name={entry.icon}
                          size={12}
                          color={active ? C.white : C.teal}
                        />
                        <Text
                          style={{
                            ...T.labelStrong,
                            fontSize: 11,
                            color: active ? C.white : C.teal,
                          }}
                        >
                          {entry.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={C.teal} />
              </View>
            ) : error ? (
              renderState(
                'cloud-offline-outline',
                'Could not load your history',
                error,
                { label: 'Try again', onPress: () => load(true) },
              )
            ) : past.length === 0 ? (
              renderState(
                'file-tray-full-outline',
                'No past requests yet',
                'Requests move here once they are delivered, close unmatched, or you cancel them.',
                {
                  label: 'Make a food request',
                  onPress: () => navigation.navigate('FoodRequest'),
                },
              )
            ) : groups.length === 0 ? (
              renderState(
                'funnel-outline',
                'Nothing in this group',
                `None of your past requests were ${activeFilter.label.toLowerCase()}.`,
                { label: 'Show all', onPress: () => setFilter('ALL') },
              )
            ) : (
              groups.map((group) => (
                <View key={group.month} style={styles.group}>
                  <View style={styles.groupHead}>
                    <Text style={{ ...T.labelStrong, fontSize: 12, color: C.teal }}>
                      {group.month.toUpperCase()}
                    </Text>
                    <View style={styles.groupLine} />
                    <Text style={{ ...T.caption, fontSize: 11, color: C.textMuted }}>
                      {group.items.length}
                    </Text>
                  </View>

                  {group.items.map((request) => (
                    <HistoryRow
                      key={request._id}
                      request={request}
                      wide={wide}
                      onOpen={() =>
                        navigation.navigate('RequestProgress', {
                          requestId: request._id,
                        })
                      }
                    />
                  ))}
                </View>
              ))
            )}

            {!loading && !error && past.length > 0 && (
              <TouchableOpacity
                onPress={() => navigation.navigate('RequestStatus')}
                style={styles.secondaryButton}
              >
                <Ionicons
                  name="list-outline"
                  size={18}
                  color={C.teal}
                  style={{ marginRight: Spacing.two }}
                />
                <Text style={{ ...T.button, color: C.teal }}>Back to my requests</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text
            style={{
              ...T.bodySmall,
              fontSize: 12,
              color: C.textMuted,
              textAlign: 'center',
              marginTop: Spacing.three,
            }}
          >
            Pull down to refresh
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function HistoryRow({
  request,
  wide,
  onOpen,
}: {
  request: FoodRequestHistoryRow;
  wide: boolean;
  onOpen: () => void;
}) {
  const T = useAppTypography();
  const meta = OUTCOME_META[request.status as Outcome];
  const closed = request.closedAt;
  // A request called off after a donor had taken it reads differently from one
  // cancelled while still waiting, and the timestamps say which was which.
  const cancelledAfterAccept =
    request.status === 'CANCELLED' && Boolean(request.acceptedAt);

  return (
    <TouchableOpacity
      onPress={onOpen}
      activeOpacity={0.85}
      style={[styles.row, wide && styles.rowWide]}
      accessibilityLabel={`Past request for ${request.foodType}, ${meta.label}`}
    >
      <View style={styles.rowMark}>
        <Ionicons name={meta.icon} size={16} color={meta.text} />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={{ ...T.labelStrong, fontSize: 14, color: C.navy, flex: 1 }} numberOfLines={1}>
            {request.foodType}
          </Text>
          <View style={styles.rowWhen}>
            <Text style={{ ...T.caption, fontSize: 11, color: C.textMuted }}>
              {formatDay(closed)}
            </Text>
            <Text
              style={{
                ...T.caption,
                fontSize: 10,
                color: C.textMuted,
                marginTop: 1,
              }}
            >
              {formatTime(closed)}
            </Text>
          </View>
        </View>

        <Text style={{ ...T.bodySmall, color: C.textMuted, marginTop: 2 }} numberOfLines={1}>
          {request.quantity}
        </Text>
        <Text style={{ ...T.bodySmall, color: C.textMuted, marginTop: 1 }} numberOfLines={1}>
          {request.location}
        </Text>

        <Text
          style={{
            ...T.bodySmall,
            fontSize: 12,
            color: meta.text,
            marginTop: Spacing.two,
          }}
        >
          {cancelledAfterAccept
            ? 'You cancelled after a donor had accepted.'
            : meta.ending}
        </Text>
        <Text style={{ ...T.caption, fontSize: 11, color: C.textMuted, marginTop: Spacing.two }}>
          Requested {formatDay(request.createdAt)}
        </Text>
      </View>

      <View style={styles.rowEnd}>
        {request.urgency === 'URGENT' && (
          <EmergencyStatusBadge urgency={request.urgency} />
        )}
        <View style={[styles.pill, { backgroundColor: meta.bg }]}>
          <Text style={{ ...T.labelStrong, fontSize: 11, color: meta.text }}>
            {meta.label}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={C.textMuted}
          style={{ marginTop: 4 }}
        />
      </View>
    </TouchableOpacity>
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
    height: 248,
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
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
  },
  pageWide: {
    maxWidth: 1160,
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
  card: {
    backgroundColor: C.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: Spacing.five,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
    elevation: 10,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: C.cardBorder,
    backgroundColor: C.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.three,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  stat: {
    flex: 1,
    minWidth: 96,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: C.cardBorder,
    backgroundColor: C.offWhite,
  },
  tabActive: {
    borderColor: C.navy,
    backgroundColor: C.navy,
  },
  tabCount: {
    marginLeft: Spacing.two,
    minWidth: 20,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: 'center',
  },
  tabCountActive: {
    borderColor: C.amber,
    backgroundColor: C.amber,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  orderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 30,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: C.cardBorder,
    backgroundColor: C.offWhite,
  },
  orderButtonActive: {
    borderColor: C.teal,
    backgroundColor: C.teal,
  },
  group: {
    marginTop: Spacing.four,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  groupLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.cardBorder,
    marginHorizontal: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderLeftWidth: 4,
    borderRadius: Radius.md,
    backgroundColor: C.offWhite,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  // On a wide screen the outcome and the date read as their own column instead
  // of wrapping under the food name.
  rowWide: {
    padding: Spacing.four,
  },
  rowMark: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  rowBody: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  // Kept off the food name's line so a narrow phone screen never squeezes the
  // name into ellipses to fit the date.
  rowWhen: {
    alignItems: 'flex-end',
    marginLeft: Spacing.three,
    flexShrink: 0,
  },
  rowEnd: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: Spacing.three,
  },
  pill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    marginTop: Spacing.two,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  stateIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.md,
    backgroundColor: C.amber,
    marginTop: Spacing.four,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.teal,
    backgroundColor: C.white,
    marginTop: Spacing.four,
  },
});
