import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getCurrentAssignment, updateAssignmentStatus, Assignment } from '@/services/dilshara-assignmentService';

const NEXT_STATUS: Record<string, { next: Assignment['status']; label: string } | null> = {
  ASSIGNED: { next: 'ACCEPTED', label: 'Accept Assignment' },
  ACCEPTED: { next: 'PICKING_UP', label: 'Start Pickup' },
  PICKING_UP: { next: 'IN_TRANSIT', label: 'Mark In Transit' },
  IN_TRANSIT: { next: 'DELIVERED', label: 'Mark Delivered' },
  DELIVERED: null,
};

const STATUS_LABEL: Record<string, string> = {
  ASSIGNED: 'Assigned',
  ACCEPTED: 'Accepted',
  PICKING_UP: 'Picking Up',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export default function AssignmentStatusScreen() {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getCurrentAssignment();
      setAssignment(data);
    } catch (err) {
      Alert.alert('Error', 'Could not load your assignment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAdvance = async () => {
    if (!assignment) return;
    const step = NEXT_STATUS[assignment.status];
    if (!step) return;

    setUpdating(true);
    try {
      const updated = await updateAssignmentStatus(assignment._id, step.next);
      setAssignment(updated);
    } catch (err) {
      Alert.alert('Error', 'Could not update status.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No active assignment</Text>
        <Text style={styles.emptySubtitle}>
          You'll see your delivery here once one is allocated to you.
        </Text>
      </View>
    );
  }

  const donation = assignment.donationId;
  const step = NEXT_STATUS[assignment.status];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>My Current Delivery</Text>

      <View style={styles.card}>
        <Text style={styles.foodType}>{donation?.foodType ?? 'Food donation'}</Text>
        <Text style={styles.detail}>{donation?.numberOfPortions ?? '-'} portions</Text>
        <Text style={styles.detail}>Pickup: {donation?.pickupAddress || 'N/A'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Status</Text>
        <Text style={styles.statusValue}>{STATUS_LABEL[assignment.status]}</Text>
      </View>

      {step && (
        <TouchableOpacity
          style={[styles.actionButton, updating && styles.actionButtonDisabled]}
          onPress={handleAdvance}
          disabled={updating}
        >
          <Text style={styles.actionButtonText}>
            {updating ? 'Updating...' : step.label}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  foodType: { fontSize: 16, fontWeight: '600' },
  detail: { fontSize: 13, color: '#666', marginTop: 4 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  statusValue: { fontSize: 16, fontWeight: '700', color: '#2E7D32' },
  actionButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});