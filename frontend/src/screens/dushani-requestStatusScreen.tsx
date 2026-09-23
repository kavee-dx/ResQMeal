import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
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

// User-management palette (same constants as RegisterScreen / LoginScreen).
const C = {
  navy: '#023047',
  teal: '#126782',
  white: '#FFFFFF',
  offWhite: '#F6F8FA',
  cardBorder: '#E4E9ED',
  textMuted: '#6B7B85',
  error: '#D64545',
  errorSoft: '#FBEAEA',
  amber: '#FFB703',
  amberSoft: '#FFF3D6',
  tealSoft: '#E1EEF2',
  success: '#3FA34D',
  successSoft: '#E2F2E5',
};

const STATUS_META: Record<
  FoodRequestStatus,
  { label: string; bg: string; text: string }
> = {
  PENDING: { label: 'Waiting for a donor', bg: C.amberSoft, text: '#8A6100' },
  MATCHED: { label: 'Matched with a donor', bg: C.tealSoft, text: C.teal },
  FULFILLED: { label: 'Fulfilled', bg: C.successSoft, text: C.success },
  EXPIRED: { label: 'Expired', bg: C.errorSoft, text: C.error },
  CANCELLED: { label: 'Cancelled', bg: C.errorSoft, text: C.error },
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

  const renderItem = ({ item }: { item: FoodRequest }) => {
    const meta = STATUS_META[item.status];
    const expiry = item.status === 'PENDING' ? formatExpiry(item.expiresAt) : null;
    const isUrgent = item.urgency === 'URGENT';

    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={{ ...T.h3, color: C.navy, flex: 1 }} numberOfLines={1}>
            {item.foodType}
          </Text>
          <EmergencyStatusBadge urgency={item.urgency} />
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="people-outline" size={14} color={C.textMuted} />
          <Text style={{ ...T.bodySmall, color: C.teal }}>{item.quantity}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={14} color={C.textMuted} />
          <Text
            style={{ ...T.bodySmall, color: C.textMuted, flex: 1 }}
            numberOfLines={1}
          >
            {item.location}
          </Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
          <Ionicons
            name={item.status === 'FULFILLED' ? 'checkmark-circle' : 'time-outline'}
            size={13}
            color={meta.text}
            style={{ marginRight: 5 }}
          />
          <Text style={{ ...T.labelStrong, fontSize: 12, color: meta.text }}>
            {meta.label}
          </Text>
        </View>

        <Text style={{ ...T.caption, color: C.textMuted, marginTop: Spacing.two }}>
          Submitted {new Date(item.createdAt).toLocaleString()}
        </Text>
        {expiry && isUrgent ? (
          <Text style={{ ...T.caption, color: C.error, marginTop: 2 }}>
            {expiry}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={C.navy} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ ...T.h2, color: C.navy }}>My Requests</Text>
          <Text style={{ ...T.bodySmall, color: C.textMuted }}>
            Track the progress of your food requests.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('FoodRequest')}
          style={styles.newRequestButton}
        >
          <Ionicons name="add" size={18} color={C.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.teal} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={36} color={C.textMuted} />
          <Text style={{ ...T.body, color: C.error, marginTop: Spacing.two, textAlign: 'center' }}>
            {error}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadRequests(true)}>
            <Text style={{ ...T.button, color: C.white }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.teal} />
          }
          contentContainerStyle={
            requests.length === 0 ? styles.emptyContainer : undefined
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="receipt-outline" size={40} color={C.textMuted} />
              <Text style={{ ...T.body, color: C.textMuted, marginTop: Spacing.two, textAlign: 'center' }}>
                You haven't submitted any requests yet.
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: C.teal }]}
                onPress={() => navigation.navigate('FoodRequest')}
              >
                <Ionicons
                  name="add"
                  size={16}
                  color={C.white}
                  style={{ marginRight: 6 }}
                />
                <Text style={{ ...T.button, color: C.white }}>Make a Request</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.offWhite, padding: Spacing.four },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  backButton: {
    marginRight: Spacing.three,
    padding: Spacing.one,
  },
  newRequestButton: {
    backgroundColor: C.teal,
    borderRadius: Radius.pill,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: C.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: Spacing.four,
    marginBottom: Spacing.three,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.one,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    marginTop: Spacing.two,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: { flexGrow: 1 },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.navy,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    marginTop: Spacing.four,
  },
});
