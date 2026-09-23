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
import type { RootStackParamList } from '../navigation/types';
import EmergencyStatusBadge from '../components/dushani-emergencyStatusBadge';
import {
  getMyFoodRequests,
  type FoodRequest,
  type FoodRequestStatus,
} from '../services/dushani-foodRequestApi';

type Props = NativeStackScreenProps<RootStackParamList, 'RequestStatus'>;

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

const STATUS_META: Record<
  FoodRequestStatus,
  { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; bg: string; text: string }
> = {
  PENDING: {
    label: 'Waiting for a donor',
    icon: 'time-outline',
    bg: '#FFF3D6',
    text: '#8A6100',
  },
  MATCHED: { label: 'Matched with a donor', icon: 'hand-left-outline', bg: C.tealSoft, text: C.teal },
  FULFILLED: { label: 'Fulfilled', icon: 'checkmark-circle', bg: C.successSoft, text: C.success },
  EXPIRED: { label: 'Expired', icon: 'close-circle-outline', bg: C.errorSoft, text: C.error },
  CANCELLED: { label: 'Cancelled', icon: 'ban-outline', bg: C.errorSoft, text: C.error },
};

function formatExpiry(expiresAt?: string): string | null {
  if (!expiresAt) return null;
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Expiring now';
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.round((diffMs % 3_600_000) / 60_000);
  if (hours <= 0) return `Expires in ${minutes} min`;
  return `Expires in ${hours}h ${minutes}m`;
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

export default function RequestStatusScreen({ navigation }: Props) {
  const T = useAppTypography();

  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await getMyFoodRequests();
      setRequests(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load your requests. Please try again.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRequests(true);
  }, [loadRequests]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadRequests(false);
  };

  const emergencyCount = requests.filter((r) => r.urgency === 'URGENT').length;

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
          <Ionicons name="add" size={18} color={C.navy} style={{ marginRight: Spacing.two }} />
          <Text style={{ ...T.button, color: C.navy }}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderItem = (item: FoodRequest) => {
    const meta = STATUS_META[item.status];
    const expiry = item.status === 'PENDING' ? formatExpiry(item.expiresAt) : null;
    const isUrgent = item.urgency === 'URGENT';

    return (
      <View
        key={item._id}
        style={[styles.requestItem, isUrgent && styles.requestItemUrgent]}
        accessibilityLabel={isUrgent ? 'Emergency food request' : 'Standard food request'}
      >
        <View style={styles.itemHead}>
          <View style={styles.itemHeadText}>
            <Text style={{ ...T.h3, color: C.navy, fontSize: 17 }} numberOfLines={1}>
              {item.foodType}
            </Text>
            <Text
              style={{
                ...T.bodySmall,
                color: C.textMuted,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {item.quantity}
            </Text>
          </View>
          <EmergencyStatusBadge urgency={item.urgency} />
        </View>

        {isUrgent && (
          <View style={styles.urgentStrip}>
            <Text style={{ ...T.labelStrong, fontSize: 11, color: C.error, flex: 1 }}>
              {expiry ?? 'Emergency request'}
            </Text>
            <Ionicons
              name="notifications"
              size={15}
              color={C.error}
              accessibilityLabel="Donors are alerted about this request"
            />
          </View>
        )}

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={C.textMuted} />
          <Text style={{ ...T.bodySmall, color: C.textMuted, flex: 1 }} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="call-outline" size={14} color={C.textMuted} />
          <Text style={{ ...T.bodySmall, color: C.textMuted, flex: 1 }} numberOfLines={1}>
            {item.contactNumber || 'No phone number'}
          </Text>
        </View>

        <View style={styles.itemFoot}>
          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
            <Ionicons
              name={meta.icon}
              size={13}
              color={meta.text}
              style={{ marginRight: 5 }}
            />
            <Text style={{ ...T.labelStrong, fontSize: 12, color: meta.text }}>
              {meta.label}
            </Text>
          </View>
          <Text style={{ ...T.caption, fontSize: 10, color: C.textMuted }} numberOfLines={1}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>

        {expiry && !isUrgent ? (
          <Text style={{ ...T.caption, fontSize: 10, color: C.textMuted, marginTop: Spacing.one }}>
            {expiry}
          </Text>
        ) : null}

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
            <Text style={{ ...T.caption, color: C.amber }}>Recipient</Text>
            <Text style={{ ...T.h2, color: C.white, fontSize: 26 }}>My Requests</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('FoodRequest')}
            activeOpacity={0.9}
            style={styles.newRequestButton}
            accessibilityLabel="Create a new request"
          >
            <Ionicons name="add" size={18} color={C.navy} style={{ marginRight: Spacing.one }} />
            <Text style={{ ...T.buttonSmall, color: C.navy }}>New</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.page}>
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...T.labelStrong, fontSize: 13, color: C.navy }}>
                  {loading || error
                    ? 'Your requests'
                    : `${requests.length} ${requests.length === 1 ? 'request' : 'requests'}`}
                </Text>
                <Text style={{ ...T.bodySmall, fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                  Track the progress of every food request you post.
                </Text>
              </View>
              {!loading && !error && emergencyCount > 0 && (
                <View style={styles.emergencyCount}>
                  <Ionicons name="flash" size={13} color={C.error} style={{ marginRight: 4 }} />
                  <Text style={{ ...T.labelStrong, fontSize: 12, color: C.error }}>
                    {emergencyCount}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => loadRequests(false)}
                style={styles.refreshButton}
                accessibilityLabel="Refresh requests"
              >
                <Ionicons
                  name={loading || refreshing ? 'hourglass-outline' : 'refresh'}
                  size={17}
                  color={C.teal}
                />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={C.teal} />
              </View>
            ) : error ? (
              renderState('cloud-offline-outline', 'Could not load requests', error, {
                label: 'Try again',
                onPress: () => loadRequests(true),
              })
            ) : requests.length === 0 ? (
              renderState(
                'receipt-outline',
                'No requests yet',
                'When you post a food request it appears here so you can follow it through to delivery.',
                {
                  label: 'Make a Food Request',
                  onPress: () => navigation.navigate('FoodRequest'),
                },
              )
            ) : (
              <View>
                {requests.map((item) => renderItem(item))}
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
  newRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    backgroundColor: C.amber,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
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
    alignItems: 'center',
    backgroundColor: C.offWhite,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  emergencyCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.errorSoft,
    borderWidth: 1,
    borderColor: C.error,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    height: 26,
    marginRight: Spacing.two,
  },
  refreshButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
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
  urgentStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: C.error,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.three,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.one,
  },
  itemFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
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
