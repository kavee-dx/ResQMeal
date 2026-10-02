import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing, Shadows, ComponentSizes } from '@/constants/theme';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';
import VolunteerBottomNav from '../components/dilshara-VolunteerBottomNav';
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

const STEPS: Assignment['status'][] = ['ASSIGNED', 'ACCEPTED', 'PICKING_UP', 'IN_TRANSIT', 'DELIVERED'];

function getErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message ?? fallback;
}

export default function AssignmentStatusScreen() {
  const theme = Colors.light;
  const T = useAppTypography();
  const insets = useSafeAreaInsets();

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
      Alert.alert('Error', getErrorMessage(err, 'Could not update status.'));
    } finally {
      setUpdating(false);
    }
  };

  const cardStyle = {
    backgroundColor: theme.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: theme.borderLight,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    ...Shadows.card,
  };

  const renderBody = () => {
    if (loading) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      );
    }

    if (!assignment) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: theme.secondarySoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: Spacing.three,
            }}
          >
            <Ionicons name="cube-outline" size={34} color={theme.secondary} />
          </View>
          <Text style={{ ...T.h1, fontSize: 18, lineHeight: 24, color: theme.text, marginBottom: Spacing.two }}>
            No active assignment
          </Text>
          <Text style={{ ...T.bodySmall, color: theme.textSecondary, textAlign: 'center' }}>
            You'll see your delivery here once one is allocated to you.
          </Text>
        </View>
      );
    }

    const donation = assignment.donationId;
    const step = NEXT_STATUS[assignment.status];
    const currentIndex = STEPS.indexOf(assignment.status);
    const pickupText = [donation?.pickupAddress, donation?.pickupDistrict].filter(Boolean).join(', ');

    return (
      <>
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.three }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.secondarySoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: Spacing.three,
              }}
            >
              <Ionicons name="restaurant-outline" size={20} color={theme.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...T.label, fontSize: 16, lineHeight: 22, color: theme.text }}>
                {donation?.foodType ?? 'Food donation'}
              </Text>
              <Text style={{ ...T.bodySmall, color: theme.textSecondary }}>
                {donation?.numberOfPortions ?? '-'} portions
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="location-outline" size={18} color={theme.textMuted} style={{ marginTop: 1 }} />
            <Text style={{ ...T.bodySmall, color: theme.textSecondary, flex: 1, marginLeft: Spacing.two }}>
              Pickup: {pickupText || 'N/A'}
            </Text>
          </View>
        </View>

        <View style={cardStyle}>
          <Text style={{ ...T.label, color: theme.textSecondary, marginBottom: Spacing.two }}>Status</Text>
          <Text
            style={{
              ...T.h1,
              fontSize: 20,
              lineHeight: 26,
              color: assignment.status === 'DELIVERED' ? theme.success : theme.primary,
            }}
          >
            {STATUS_LABEL[assignment.status]}
          </Text>

          <View style={{ flexDirection: 'row', marginTop: Spacing.three }}>
            {STEPS.map((s, i) => (
              <View
                key={s}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  marginRight: i < STEPS.length - 1 ? 4 : 0,
                  backgroundColor: i <= currentIndex ? theme.secondary : theme.border,
                }}
              />
            ))}
          </View>
          {currentIndex >= 0 && (
            <Text style={{ ...T.bodySmall, color: theme.textMuted, marginTop: Spacing.two }}>
              Step {currentIndex + 1} of {STEPS.length}
            </Text>
          )}
        </View>

        {step && (
          <TouchableOpacity
            onPress={handleAdvance}
            disabled={updating}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={step.label}
            style={{
              height: ComponentSizes.buttonHeight,
              borderRadius: Radius.md,
              backgroundColor: theme.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: updating ? 0.7 : 1,
              ...Shadows.button,
            }}
          >
            <Text style={{ ...T.button, color: theme.textOnPrimary }}>
              {updating ? 'Updating...' : step.label}
            </Text>
          </TouchableOpacity>
        )}
      </>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: Spacing.four,
          paddingTop: insets.top + Spacing.three,
          paddingBottom: Spacing.four,
        }}
      >
        <Text style={{ ...T.h1, fontSize: 22, lineHeight: 28, color: theme.text }}>My Current Delivery</Text>
        <Text style={{ ...T.bodySmall, color: theme.textSecondary, marginBottom: Spacing.four }}>
          Track and update your active delivery.
        </Text>

        {renderBody()}
      </ScrollView>

      <VolunteerBottomNav active="assignments" />
    </View>
  );
}