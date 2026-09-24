import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Radius, Spacing } from '@/constants/theme';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';
import { useDisplayName } from '../hooks/dushani-useDisplayName';
import { getRole } from '../utils/kaveesha-authStorage';
import type { RootStackParamList } from '../navigation/types';
import EmergencyStatusBadge from '../components/dushani-emergencyStatusBadge';
import {
  acceptFoodRequest,
  getOpenFoodRequests,
  type AcceptedFoodRequest,
  type OpenFoodRequest,
} from '../services/dushani-foodRequestApi';

type Props = NativeStackScreenProps<RootStackParamList, 'RequestBoard'>;

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

function timeLeft(expiresAt?: string | null): string | null {
  if (!expiresAt) return null;
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.round((diffMs % 3_600_000) / 60_000);
  if (hours <= 0) return `${minutes} min left`;
  return `${hours}h ${minutes}m left`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return 'Needed as soon as possible';
  return `Needed by ${new Date(iso).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
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

export default function RequestBoardScreen({ navigation }: Props) {
  const T = useAppTypography();
  const displayName = useDisplayName('Request Board');

  const [requests, setRequests] = useState<OpenFoodRequest[]>([]);
  const [isDonor, setIsDonor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<AcceptedFoodRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRole().then((role) => setIsDonor(role === 'DONOR'));
  }, []);

  const loadBoard = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await getOpenFoodRequests();
      setRequests(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load the request board. Please try again.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBoard(true);
  }, [loadBoard]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadBoard(false);
  };

  const handleAccept = async (item: OpenFoodRequest) => {
    setAcceptError(null);
    setAcceptingId(item.id);
    try {
      const result = await acceptFoodRequest(item.id);
      setClaimed(result);
      setRequests((current) => current.filter((r) => r.id !== item.id));
    } catch (err) {
      setAcceptError(
        err instanceof Error
          ? err.message
          : 'Could not accept this request. Please try again.',
      );
      // Someone else may have claimed it a moment ago.
      loadBoard(false);
    } finally {
      setAcceptingId(null);
    }
  };

  const emergencyCount = requests.filter(
    (item) => item.urgency === 'URGENT',
  ).length;

  const renderState = (
    icon: React.ComponentProps<typeof Ionicons>['name'],
    title: string,
    body: string,
    action?: { label: string; onPress: () => void },
  ) => (
    <View style={styles.stateBlock}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={26} color={C.teal} />
      </View>
      <Text style={{ ...T.h3, color: C.navy, fontSize: 18, textAlign: 'center' }}>
        {title}
      </Text>
      <Text
        style={{
          ...T.body,
          color: C.textMuted,
          textAlign: 'center',
          marginTop: Spacing.two,
        }}
      >
        {body}
      </Text>
      {action && (
        <TouchableOpacity
          onPress={action.onPress}
          activeOpacity={0.88}
          style={styles.stateButton}
        >
          <Ionicons name="refresh" size={18} color={C.navy} style={{ marginRight: Spacing.two }} />
          <Text style={{ ...T.button, color: C.navy }}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderItem = (item: OpenFoodRequest) => {
    const isUrgent = item.urgency === 'URGENT';
    const left = timeLeft(item.expiresAt);

    return (
      <View
        key={item.id}
        style={[styles.requestItem, isUrgent && styles.requestItemUrgent]}
      >
        <View style={styles.itemHead}>
          <View style={styles.itemHeadText}>
            <Text style={{ ...T.h3, color: C.navy, fontSize: 17 }} numberOfLines={1}>
              {item.foodType}
            </Text>
            <Text style={{ ...T.bodySmall, color: C.textMuted, marginTop: 2 }}>
              {item.quantity}
            </Text>
          </View>
          <EmergencyStatusBadge urgency={item.urgency} />
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={C.textMuted} />
          <Text style={{ ...T.bodySmall, color: C.textMuted, flex: 1 }} numberOfLines={2}>
            {item.location}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons
            name={isUrgent ? 'flash-outline' : 'calendar-outline'}
            size={14}
            color={isUrgent ? C.error : C.textMuted}
          />
          <Text
            style={{
              ...T.bodySmall,
              color: isUrgent ? C.error : C.textMuted,
              flex: 1,
            }}
          >
            {formatWhen(item.preferredAt)}
          </Text>
        </View>

        <View style={styles.itemFoot}>
          <Text style={{ ...T.caption, fontSize: 11, color: C.textMuted }}>
            {left ?? 'Closing'}
          </Text>
          {isDonor ? (
            <TouchableOpacity
              onPress={() => handleAccept(item)}
              disabled={acceptingId !== null}
              activeOpacity={0.88}
              style={[
                styles.acceptButton,
                isUrgent && { backgroundColor: C.error },
                acceptingId === item.id && { opacity: 0.7 },
              ]}
              accessibilityLabel={`Accept request for ${item.foodType}`}
            >
              {acceptingId === item.id ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <>
                  <Ionicons name="hand-left" size={15} color={C.white} style={{ marginRight: Spacing.two }} />
                  <Text style={{ ...T.labelStrong, fontSize: 13, color: C.white }}>
                    Accept
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.donorOnlyRow}>
              <Ionicons name="lock-closed-outline" size={13} color={C.textMuted} />
              <Text style={{ ...T.caption, fontSize: 11, color: C.textMuted }}>
                Donors can accept this
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

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
            onRefresh={handleRefresh}
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
              Request Board
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => loadBoard(false)}
            style={styles.refreshButton}
            accessibilityLabel="Refresh the board"
          >
            <Ionicons
              name={loading || refreshing ? 'hourglass-outline' : 'refresh'}
              size={17}
              color={C.teal}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.page}>
          <View style={styles.card}>
            <View style={styles.cardIntro}>
              <View style={styles.heroIcon}>
                <Ionicons name="megaphone-outline" size={24} color={C.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...T.h3, color: C.navy, fontSize: 20 }}>
                  Requests waiting for help
                </Text>
                <Text style={{ ...T.body, color: C.textMuted, marginTop: 3 }}>
                  {isDonor
                    ? 'Accept a request to claim it — the recipient’s contact details open for you.'
                    : 'Every live request a recipient has posted. Only donors can accept them.'}
                </Text>
              </View>
            </View>

            {!loading && !error && emergencyCount > 0 && (
              <View style={styles.emergencyCount}>
                <Ionicons name="flash" size={13} color={C.error} style={{ marginRight: 4 }} />
                <Text style={{ ...T.labelStrong, fontSize: 12, color: C.error }}>
                  {emergencyCount} {emergencyCount === 1 ? 'emergency' : 'emergencies'}{' '}
                  waiting
                </Text>
              </View>
            )}

            {!!claimed && (
              <View style={styles.claimedBox}>
                <View style={styles.claimedHead}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={C.success}
                    style={{ marginRight: Spacing.two }}
                  />
                  <Text style={{ ...T.labelStrong, fontSize: 13, color: C.success, flex: 1 }}>
                    You accepted “{claimed.foodType}”
                  </Text>
                  <TouchableOpacity onPress={() => setClaimed(null)}>
                    <Ionicons name="close" size={16} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
                <Text style={{ ...T.bodySmall, color: C.navy, marginTop: Spacing.two }}>
                  {claimed.quantity} · {claimed.location}
                </Text>
                <Text style={{ ...T.bodySmall, color: C.navy, marginTop: 2 }}>
                  {formatWhen(claimed.preferredAt)}
                </Text>
                {!!claimed.details && (
                  <Text
                    style={{ ...T.bodySmall, color: C.textMuted, marginTop: 2 }}
                  >
                    Note: {claimed.details}
                  </Text>
                )}
                <View style={styles.phoneRow}>
                  <Ionicons name="call" size={15} color={C.teal} style={{ marginRight: Spacing.two }} />
                  <Text style={{ ...T.labelStrong, fontSize: 14, color: C.teal }}>
                    {claimed.contactNumber}
                  </Text>
                </View>
              </View>
            )}

            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={C.teal} />
              </View>
            ) : error ? (
              renderState('cloud-offline-outline', 'Could not load the board', error, {
                label: 'Try again',
                onPress: () => loadBoard(true),
              })
            ) : (
              <View>
                {acceptError && (
                  <View style={styles.acceptError}>
                    <Ionicons
                      name="alert-circle"
                      size={16}
                      color={C.error}
                      style={{ marginRight: Spacing.two + 2 }}
                    />
                    <Text style={{ ...T.bodySmall, color: C.error, flex: 1 }}>
                      {acceptError}
                    </Text>
                  </View>
                )}
                {requests.length === 0 ? (
                  renderState(
                    'happy-outline',
                    'Every request is covered',
                    'No recipient is waiting right now. New requests appear here the moment they are posted.',
                  )
                ) : (
                  requests.map((item) => renderItem(item))
                )}
              </View>
            )}
          </View>

          <Text style={{ ...T.bodySmall, fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: Spacing.three }}>
            Pull down to refresh
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
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
  cardIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.tealSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: C.teal,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: C.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.four,
  },
  emergencyCount: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: C.errorSoft,
    borderWidth: 1,
    borderColor: C.error,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    minHeight: 28,
    marginBottom: Spacing.four,
  },
  claimedBox: {
    backgroundColor: C.successSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.success,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  claimedHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  acceptError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.errorSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.error,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  requestItem: {
    backgroundColor: C.offWhite,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    padding: Spacing.four,
    marginBottom: Spacing.three,
  },
  requestItemUrgent: {
    borderLeftWidth: 4,
    borderLeftColor: C.error,
    backgroundColor: C.errorSoft,
  },
  itemHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
  },
  itemHeadText: {
    flex: 1,
    marginRight: Spacing.three,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: Spacing.two,
  },
  itemFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  donorOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    backgroundColor: C.teal,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.seven,
  },
  stateBlock: {
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.five,
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
});
