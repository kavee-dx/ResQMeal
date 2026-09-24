import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '../constants/theme';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';
import type { DonationMatch } from '../services/dushani-foodRequestApi';

// User-management palette (same constants as the Create Request screen).
const C = {
  navy: '#023047',
  teal: '#126782',
  tealSoft: '#E1EEF2',
  amber: '#FFB703',
  white: '#FFFFFF',
  offWhite: '#F6F8FA',
  cardBorder: '#E4E9ED',
  textMuted: '#6B7B85',
  error: '#D64545',
  errorSoft: '#FBEAEA',
};

const STRONG_MATCH = 70;

function timeLeft(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.round((diff % 3_600_000) / 60_000);
  return hours <= 0 ? `${Math.max(minutes, 1)} min left` : `${hours}h ${minutes}m left`;
}

type Props = {
  match: DonationMatch & { requestId: string; urgent: boolean };
  onPress?: () => void;
};

/**
 * One donation the matcher scored against one of the recipient's own requests —
 * the score, the reasons behind it, and where the pickup would be.
 */
export default function MatchCard({ match, onPress }: Props) {
  const T = useAppTypography();
  const strong = match.percent >= STRONG_MATCH;
  const left = timeLeft(match.expiryTime);
  const area = match.pickupDistrict || match.pickupAddress || 'Pickup details on request';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.88}
      style={[styles.card, match.urgent && styles.cardUrgent]}
      accessibilityLabel={`Suggested donation ${match.foodType}, ${match.percent} percent match`}
    >
      <View style={[styles.score, strong ? styles.scoreStrong : styles.scoreWeak]}>
        <Text style={{ ...T.labelStrong, fontSize: 15, color: strong ? C.white : C.teal }}>
          {match.percent}%
        </Text>
        <Text style={{ ...T.caption, fontSize: 9, color: strong ? '#EAF3F6' : C.textMuted }}>
          match
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={{ ...T.labelStrong, fontSize: 15, color: C.navy, flex: 1 }} numberOfLines={1}>
            {match.foodType}
          </Text>
          {match.urgent && (
            <View style={styles.urgentPill}>
              <Ionicons name="flash" size={10} color={C.error} style={{ marginRight: 3 }} />
              <Text style={{ ...T.labelStrong, fontSize: 9, color: C.error }}>URGENT NEED</Text>
            </View>
          )}
        </View>

        <Text style={{ ...T.bodySmall, color: C.textMuted, marginTop: 2 }} numberOfLines={1}>
          {match.numberOfPortions ? `${match.numberOfPortions} portions` : match.foodCategory} · {area}
        </Text>

        {match.reasons.slice(0, 2).map((reason) => (
          <View key={reason} style={styles.reasonRow}>
            <Ionicons name="checkmark-circle-outline" size={12} color={C.teal} />
            <Text style={{ ...T.caption, fontSize: 11, color: C.textMuted, flex: 1 }} numberOfLines={1}>
              {reason}
            </Text>
          </View>
        ))}

        {left && (
          <View style={styles.footRow}>
            <Ionicons name="time-outline" size={12} color={C.textMuted} />
            <Text style={{ ...T.caption, fontSize: 11, color: C.textMuted }}>
              Donated food {left.toLowerCase()}
            </Text>
          </View>
        )}
      </View>

      {onPress && (
        <View style={styles.tail}>
          <Ionicons name="open-outline" size={17} color={C.teal} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: C.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    padding: Spacing.three + 2,
    marginBottom: Spacing.three,
  },
  cardUrgent: {
    borderColor: C.error,
    borderLeftWidth: 4,
    backgroundColor: C.offWhite,
  },
  score: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  scoreStrong: {
    backgroundColor: C.teal,
    borderColor: C.teal,
  },
  scoreWeak: {
    backgroundColor: C.tealSoft,
    borderColor: C.cardBorder,
  },
  body: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  urgentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.errorSoft,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: C.error,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.two,
  },
  tail: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
