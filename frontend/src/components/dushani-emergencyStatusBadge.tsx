import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';

// User-management palette (same constants as RegisterScreen).
const C = {
  navy: '#023047',
  teal: '#126782',
  error: '#D64545',
  errorSoft: '#FBEAEA',
  offWhite: '#F6F8FA',
  cardBorder: '#E4E9ED',
};

export type UrgencyLevel = 'URGENT' | 'NORMAL';

interface EmergencyStatusBadgeProps {
  urgency: UrgencyLevel;
}

/**
 * Sprint task — Emergency Food Requests: Emergency Request Status indicator.
 * URGENT renders as a red pill (with warning icon) so donors/recipients can
 * spot emergency requests at a glance; NORMAL renders as a quiet grey pill.
 */
export default function EmergencyStatusBadge({ urgency }: EmergencyStatusBadgeProps) {
  const T = useAppTypography();
  const isUrgent = urgency === 'URGENT';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isUrgent ? C.errorSoft : C.offWhite,
          borderColor: isUrgent ? C.error : C.cardBorder,
        },
      ]}
    >
      <Ionicons
        name={isUrgent ? 'warning' : 'time-outline'}
        size={12}
        color={isUrgent ? C.error : C.teal}
        style={{ marginRight: 4 }}
      />
      <Text
        style={{
          ...T.labelStrong,
          fontSize: 11,
          color: isUrgent ? C.error : C.navy,
        }}
      >
        {isUrgent ? 'URGENT' : 'NORMAL'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
