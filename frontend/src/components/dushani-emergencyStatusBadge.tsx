import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';

// User-management palette (same constants as RegisterScreen).
const C = {
  teal: '#126782',
  tealSoft: '#E1EEF2',
  white: '#FFFFFF',
  error: '#D64545',
};

export type UrgencyLevel = 'URGENT' | 'NORMAL';

interface EmergencyStatusBadgeProps {
  urgency: UrgencyLevel;
}

/**
 * Sprint task — Emergency Food Requests: Emergency Request Status indicator.
 * URGENT renders as a solid red pill (white flash icon/label) so emergency
 * requests stand out on any card tint; NORMAL is a quiet teal pill.
 */
export default function EmergencyStatusBadge({ urgency }: EmergencyStatusBadgeProps) {
  const T = useAppTypography();
  const isUrgent = urgency === 'URGENT';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isUrgent ? C.error : C.tealSoft,
          borderColor: isUrgent ? C.error : C.teal,
        },
      ]}
    >
      <Ionicons
        name={isUrgent ? 'flash' : 'time-outline'}
        size={13}
        color={isUrgent ? C.white : C.teal}
        style={{ marginRight: 5 }}
      />
      <Text
        style={{
          ...T.labelStrong,
          fontSize: 11,
          letterSpacing: 0.4,
          color: isUrgent ? C.white : C.teal,
        }}
      >
        {isUrgent ? 'EMERGENCY' : 'STANDARD'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
});
