import React, { useCallback, useEffect, useState } from 'react';
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
  getFoodRequestProgress,
  updateFoodRequestStatus,
  type FoodRequestProgress,
  type RequestTimelineEntry,
  type TimelineState,
} from '../services/dushani-foodRequestApi';

type Props = NativeStackScreenProps<RootStackParamList, 'RequestProgress'>;

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

const OUTCOME_META: Record<
  FoodRequestProgress['progress']['outcome'],
  { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; soft: string }
> = {
  active: { icon: 'compass-outline', color: C.teal, soft: C.tealSoft },
  complete: { icon: 'checkmark-circle', color: C.success, soft: C.successSoft },
  stopped: { icon: 'alert-circle', color: C.error, soft: C.errorSoft },
};

const STATE_META: Record<
  TimelineState,
  { icon: React.ComponentProps<typeof Ionicons>['name'] | null; color: string }
> = {
  done: { icon: 'checkmark', color: C.success },
  current: { icon: 'ellipsis-horizontal', color: C.teal },
  upcoming: { icon: null, color: C.textMuted },
  stopped: { icon: 'close', color: C.error },
};

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.round((ms % 3_600_000) / 60_000);
  if (hours <= 0) return `${minutes} min left`;
  return `${hours}h ${minutes}m left`;
}

function formatStamp(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleString();
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

export default function RequestProgressScreen({ navigation, route }: Props) {
  const T = useAppTypography();
  const wide = useIsWide();
  const displayName = useDisplayName();
  const requestId = route.params?.requestId;

  const [data, setData] = useState<FoodRequestProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const load = useCallback(
    async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      setError(null);
      try {
        setData(await getFoodRequestProgress(requestId));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load the progress of this request.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [requestId],
  );

  useEffect(() => {
    load(true);
  }, [load]);

  // The recipient closes their own loop: once the food is in hand they confirm
  // receipt, which moves the request to FULFILLED.
  const confirmReceived = async () => {
    setConfirmError(null);
    setConfirming(true);
    try {
      await updateFoodRequestStatus(requestId, 'FULFILLED');
      await load(false);
    } catch (err) {
      setConfirmError(
        err instanceof Error
          ? err.message
          : 'Could not confirm receipt. Please try again.',
      );
    } finally {
      setConfirming(false);
    }
  };

  const meta = data ? OUTCOME_META[data.progress.outcome] : OUTCOME_META.active;
  const request = data?.request;
  const progress = data?.progress;
  const stepNumber = progress?.stepsCompleted ?? 0;

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
              Request Progress
            </Text>
          </View>
        </View>

        <View style={[styles.page, wide && styles.pageWide]}>
          <View style={styles.card}>
            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={C.teal} />
              </View>
            ) : error ? (
              <View style={styles.centered}>
                <View style={styles.stateIcon}>
                  <Ionicons
                    name="cloud-offline-outline"
                    size={26}
                    color={C.error}
                  />
                </View>
                <Text style={{ ...T.h3, color: C.navy, fontSize: 18 }}>
                  Could not load progress
                </Text>
                <Text
                  style={{
                    ...T.body,
                    color: C.textMuted,
                    textAlign: 'center',
                    marginTop: Spacing.two,
                  }}
                >
                  {error}
                </Text>
                <TouchableOpacity
                  onPress={() => load(true)}
                  style={styles.primaryButton}
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
              data &&
              request && (
                <View style={wide ? styles.columns : undefined}>
                  <View style={wide ? styles.column : undefined}>
                  <View style={styles.summaryHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...T.h3, color: C.navy, fontSize: 20 }}>
                        {request.foodType}
                      </Text>
                      <Text
                        style={{
                          ...T.bodySmall,
                          color: C.textMuted,
                          marginTop: 3,
                        }}
                      >
                        {request.quantity}
                      </Text>
                    </View>
                    <EmergencyStatusBadge urgency={request.urgency} />
                  </View>

                  <View style={[styles.stageBanner, { backgroundColor: meta.soft }]}>
                    <Ionicons name={meta.icon} size={22} color={meta.color} style={{ marginRight: Spacing.three }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...T.labelStrong, fontSize: 14, color: meta.color }}>
                        {data.progress.stageLabel}
                      </Text>
                      <Text style={{ ...T.bodySmall, color: C.textMuted, marginTop: 2 }}>
                        Step {stepNumber} of {data.progress.stepsTotal}
                        {data.progress.expiresInMs !== null
                          ? ` · ${formatRemaining(data.progress.expiresInMs)}`
                          : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.track}>
                    <View style={styles.trackFill}>
                      <View
                        style={[
                          styles.trackFillBar,
                          {
                            width: `${data.progress.percent}%`,
                            backgroundColor: meta.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={{ ...T.caption, fontSize: 11, color: meta.color }}>
                      {data.progress.percent}%
                    </Text>
                  </View>

                  <Text style={{ ...T.caption, color: C.textMuted, marginTop: Spacing.five, marginBottom: Spacing.three }}>
                    PROGRESS TIMELINE
                  </Text>

                  {data.timeline.map((entry, index) => (
                    <TimelineRow
                      key={entry.key}
                      entry={entry}
                      isLast={index === data.timeline.length - 1}
                    />
                  ))}

                  {request.status === 'DISPATCHED' && (
                    <View style={styles.receiptBox}>
                      <Text style={{ ...T.body, color: C.navy }}>
                        Your food is on the way. Confirm once it reaches you so the
                        request closes as delivered.
                      </Text>
                      <TouchableOpacity
                        onPress={confirmReceived}
                        disabled={confirming}
                        activeOpacity={0.88}
                        style={[styles.receiptButton, confirming && { opacity: 0.7 }]}
                        accessibilityLabel="Confirm that you received the food"
                      >
                        {confirming ? (
                          <ActivityIndicator size="small" color={C.white} />
                        ) : (
                          <>
                            <Ionicons
                              name="checkmark-done"
                              size={17}
                              color={C.white}
                              style={{ marginRight: Spacing.two }}
                            />
                            <Text style={{ ...T.button, color: C.white }}>
                              I received the food
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                      {confirmError && (
                        <Text
                          style={{
                            ...T.bodySmall,
                            color: C.error,
                            marginTop: Spacing.two,
                          }}
                        >
                          {confirmError}
                        </Text>
                      )}
                    </View>
                  )}

                  </View>

                  <View style={wide ? styles.sideColumn : undefined}>
                  {!wide && <View style={styles.divider} />}

                  <DetailRow icon="location-outline" label="Delivery address" value={request.location} />
                  {request.preferredAt ? (
                    <DetailRow
                      icon="calendar-outline"
                      label="Needed by"
                      value={formatStamp(request.preferredAt) ?? '—'}
                    />
                  ) : null}
                  <DetailRow
                    icon="call-outline"
                    label="Contact number"
                    value={request.contactNumber || 'Not provided'}
                  />
                  {request.details ? (
                    <DetailRow icon="chatbox-ellipses-outline" label="Notes" value={request.details} />
                  ) : null}
                  <DetailRow
                    icon="time-outline"
                    label="Posted"
                    value={formatStamp(request.createdAt) ?? '—'}
                  />

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
                  </View>
                </View>
              )
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

function TimelineRow({ entry, isLast }: { entry: RequestTimelineEntry; isLast: boolean }) {
  const T = useAppTypography();
  const stateMeta = STATE_META[entry.state];
  const filled = entry.state === 'done' || entry.state === 'stopped';

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View
          style={[
            styles.timelineDot,
            {
              borderColor: stateMeta.color,
              backgroundColor: filled ? stateMeta.color : C.white,
            },
          ]}
        >
          {stateMeta.icon ? (
            <Ionicons
              name={stateMeta.icon}
              size={12}
              color={filled ? C.white : stateMeta.color}
            />
          ) : null}
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      <View style={styles.timelineBody}>
        <Text
          style={{
            ...T.labelStrong,
            fontSize: 14,
            color: entry.state === 'upcoming' ? C.textMuted : C.navy,
          }}
        >
          {entry.label}
        </Text>
        <Text style={{ ...T.bodySmall, color: C.textMuted, marginTop: 2 }}>
          {entry.description}
        </Text>
        {formatStamp(entry.at) && (
          <Text style={{ ...T.caption, fontSize: 11, color: C.teal, marginTop: Spacing.one }}>
            {formatStamp(entry.at)}
          </Text>
        )}
      </View>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  const T = useAppTypography();
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={16} color={C.teal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...T.caption, fontSize: 10, color: C.textMuted }}>{label}</Text>
        <Text style={{ ...T.body, color: C.navy, marginTop: 2 }}>{value}</Text>
      </View>
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
  // Near full width on a big screen, with the timeline and the request details
  // reading as two panels instead of one long strip.
  pageWide: {
    maxWidth: 1160,
    paddingHorizontal: Spacing.five,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.five,
  },
  column: {
    flex: 1,
    flexBasis: 0,
  },
  sideColumn: {
    flex: 0,
    flexBasis: '38%',
    minWidth: 300,
    paddingLeft: Spacing.five,
    borderLeftWidth: 1,
    borderLeftColor: C.cardBorder,
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
  summaryHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.four,
  },
  stageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    padding: Spacing.four,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  trackFill: {
    flex: 1,
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: C.offWhite,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: 'hidden',
  },
  trackFillBar: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineRail: {
    width: 30,
    alignItems: 'center',
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: Radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    minHeight: 24,
    backgroundColor: C.cardBorder,
    marginVertical: Spacing.one,
  },
  timelineBody: {
    flex: 1,
    paddingLeft: Spacing.three,
    paddingBottom: Spacing.four,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
  },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  divider: {
    height: 1,
    backgroundColor: C.cardBorder,
    marginTop: Spacing.four,
    marginBottom: Spacing.four,
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
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.teal,
    backgroundColor: C.white,
    marginTop: Spacing.four,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  receiptBox: {
    backgroundColor: C.tealSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.teal,
    borderLeftWidth: 4,
    padding: Spacing.four,
    marginTop: Spacing.four,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: Radius.md,
    backgroundColor: C.success,
    marginTop: Spacing.three,
    shadowColor: C.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  stateIcon: {
    width: 60,
    height: 60,
    borderRadius: Radius.pill,
    backgroundColor: C.errorSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
});
