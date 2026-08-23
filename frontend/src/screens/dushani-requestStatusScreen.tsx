import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, useColorScheme, RefreshControl } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';

type RequestStatus = 'PENDING' | 'MATCHED' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';

interface FoodRequestSummary {
  id: string;
  foodType: string;
  quantity: string;
  urgency: 'URGENT' | 'NORMAL';
  status: RequestStatus;
  createdAt: string;
}

// Mock data standing in for the real API response until this screen is
// wired to GET /api/recipient/food-requests/mine
// (backend/src/routes/dushani-foodRequestRoutes.js).
const MOCK_REQUESTS: FoodRequestSummary[] = [
  { id: 'r1', foodType: 'Rice', quantity: '5 kg', urgency: 'URGENT', status: 'PENDING', createdAt: new Date().toISOString() },
  { id: 'r2', foodType: 'Veg', quantity: '3 kg', urgency: 'NORMAL', status: 'MATCHED', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'r3', foodType: 'Fruits', quantity: '10 pcs', urgency: 'NORMAL', status: 'EXPIRED', createdAt: new Date(Date.now() - 172800000).toISOString() },
];

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'Waiting for a donor',
  MATCHED: 'Matched with a donor',
  FULFILLED: 'Fulfilled',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

/**
 * Task 13 — Add Request Status Screen
 */
export default function RequestStatusScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [requests, setRequests] = useState<FoodRequestSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = useCallback(async () => {
    // Replace with: const res = await fetch('/api/recipient/food-requests/mine');
    setRequests(MOCK_REQUESTS);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const statusColor = (status: RequestStatus) => {
    switch (status) {
      case 'PENDING':
        return { bg: theme.warningSoft, text: theme.warning };
      case 'MATCHED':
        return { bg: theme.infoSoft, text: theme.info };
      case 'FULFILLED':
        return { bg: theme.successSoft, text: theme.success };
      case 'EXPIRED':
      case 'CANCELLED':
        return { bg: theme.errorSoft, text: theme.error };
      default:
        return { bg: theme.surfaceSoft, text: theme.textSecondary };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>My Requests</Text>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>You haven't submitted any requests yet.</Text>
        }
        renderItem={({ item }) => {
          const colors = statusColor(item.status);
          return (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.rowBetween}>
                <Text style={[styles.foodType, { color: theme.text }]}>{item.foodType}</Text>
                <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.badgeText, { color: colors.text }]}>{STATUS_LABELS[item.status]}</Text>
                </View>
              </View>
              <Text style={[styles.detail, { color: theme.textSecondary }]}>Quantity: {item.quantity}</Text>
              <Text style={[styles.detail, { color: theme.textSecondary }]}>
                Priority: {item.urgency === 'URGENT' ? 'Urgent' : 'Normal'}
              </Text>
              <Text style={[styles.detail, { color: theme.textMuted }]}>
                Submitted {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.three },
  title: { ...Typography.h2, marginBottom: Spacing.three },
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  foodType: { ...Typography.h3 },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  badgeText: { ...Typography.caption, textTransform: 'none' },
  detail: { ...Typography.bodySmall, marginBottom: 2 },
  emptyText: { ...Typography.body, textAlign: 'center', marginTop: Spacing.six },
});
