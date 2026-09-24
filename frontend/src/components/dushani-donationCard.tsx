import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '../constants/theme';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';
import type { BrowseDonation } from '../services/dushani-foodRequestApi';

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

function timeLeft(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.round((diff % 3_600_000) / 60_000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
  return hours > 0 ? `${hours}h ${minutes}m left` : `${Math.max(minutes, 1)}m left`;
}

const GROUP_ICONS: Record<string, keyof typeof ICONS> = {
  Rice: 'rice',
  Bread: 'bread',
  Vegetables: 'leaf',
  Fruits: 'fruit',
  Water: 'water',
  'Dry Foods': 'restaurant',
  Other: 'nutrition',
};

// "apple-outline" is not in the bundled Ionicons set, so fruit shares the
// nutrition glyph.
const ICONS = {
  rice: 'restaurant-outline',
  bread: 'nutrition-outline',
  leaf: 'leaf-outline',
  fruit: 'nutrition-outline',
  water: 'water-outline',
  restaurant: 'restaurant-outline',
  nutrition: 'nutrition-outline',
} as const;

type Props = {
  donation: BrowseDonation;
  expanded: boolean;
  onToggle: () => void;
};

/**
 * One live donation a donor has posted: what it is, how much, how far the pickup
 * is, and which of the recipient's own requests it answers.
 */
export default function DonationCard({ donation, expanded, onToggle }: Props) {
  const T = useAppTypography();
  const left = timeLeft(donation.expiryTime);
  const urgent = donation.answering?.urgent;
  const portions = donation.numberOfPortions ?? donation.quantity;
  const icon = ICONS[GROUP_ICONS[donation.foodGroup] ?? 'nutrition'];

  return (
    <View
      style={[
        styles.card,
        urgent && styles.cardUrgent,
        donation.answering && !urgent && styles.cardAnswering,
      ]}
    >
      {donation.answering && (
        <View style={[styles.ribbon, urgent ? styles.ribbonUrgent : styles.ribbonTeal]}>
          <Ionicons
            name={urgent ? 'flash' : 'sparkles'}
            size={12}
            color={urgent ? C.error : C.teal}
          />
          <Text
            style={{
              ...T.labelStrong,
              fontSize: 10.5,
              color: urgent ? C.error : C.teal,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {urgent
              ? `Answers your urgent request for ${donation.answering.requestFood}`
              : `Matches your request for ${donation.answering.requestFood}`}
          </Text>
          <Text style={{ ...T.labelStrong, fontSize: 10.5, color: urgent ? C.error : C.teal }}>
            {donation.answering.percent}%
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.9}
        style={styles.head}
        accessibilityLabel={`${donation.foodType} from ${donation.donorName}`}
      >
        {donation.photoUrl ? (
          <Image source={{ uri: donation.photoUrl }} style={styles.thumb} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name={icon} size={22} color={C.teal} />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={{ ...T.labelStrong, fontSize: 16, color: C.navy }} numberOfLines={1}>
            {donation.foodType}
          </Text>
          <Text style={{ ...T.bodySmall, fontSize: 12.5, color: C.textMuted, marginTop: 2 }}>
            {portions ? `${portions} portions` : 'Quantity not stated'} · {donation.foodGroup}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={C.teal} />
            <Text style={{ ...T.caption, fontSize: 11.5, color: C.textMuted, flex: 1 }} numberOfLines={1}>
              {donation.pickupDistrict || 'Area not given'} — {donation.distanceLabel}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons
              name={urgent ? 'time-outline' : 'checkmark-circle-outline'}
              size={13}
              color={urgent ? C.error : C.success}
            />
            <Text style={{ ...T.caption, fontSize: 11.5, color: C.textMuted, flex: 1 }} numberOfLines={1}>
              {donation.readyWhen}
              {left ? ` · expires ${left.toLowerCase()}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.tail}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={C.textMuted}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.details}>
          <DetailRow
            icon="storefront-outline"
            label="Posted by"
            value={donation.donorName}
          />
          <DetailRow
            icon="location-outline"
            label="Pick up at"
            value={
              donation.pickupAddress
                ? `${donation.pickupAddress}${donation.pickupDistrict ? `, ${donation.pickupDistrict}` : ''}`
                : 'The donor shares the exact address when you reach them'
            }
          />
          {donation.storageCondition && (
            <DetailRow icon="snow-outline" label="Kept" value={donation.storageCondition} />
          )}
          {donation.donationCode && (
            <DetailRow icon="pricetag-outline" label="Donation code" value={donation.donationCode} />
          )}

          {donation.answering && (
            <View style={styles.reasons}>
              <Text style={{ ...T.caption, fontSize: 10.5, color: C.textMuted, marginBottom: 4 }}>
                WHY THIS WAS PUT FIRST
              </Text>
              {donation.answering.reasons.map((reason) => (
                <View key={reason} style={styles.reasonRow}>
                  <Ionicons name="checkmark-circle" size={12} color={C.teal} />
                  <Text style={{ ...T.caption, fontSize: 11.5, color: C.textMuted, flex: 1 }}>
                    {reason}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.contactNote}>
            <Ionicons
              name="chatbox-ellipses-outline"
              size={15}
              color={C.teal}
              style={{ marginRight: Spacing.two }}
            />
            <Text style={{ ...T.bodySmall, fontSize: 12, color: C.textMuted, flex: 1 }}>
              Donor messaging is not built yet, so arrange the pickup through your
              own request — a donor who accepts it gets your contact number.
            </Text>
          </View>
        </View>
      )}
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
      <Ionicons name={icon} size={14} color={C.textMuted} style={{ marginRight: Spacing.two }} />
      <Text style={{ ...T.caption, fontSize: 11, color: C.textMuted, width: 96 }}>{label}</Text>
      <Text style={{ ...T.bodySmall, fontSize: 12.5, color: C.navy, flex: 1 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    marginBottom: Spacing.three,
    overflow: 'hidden',
  },
  cardUrgent: {
    borderColor: C.error,
  },
  cardAnswering: {
    borderColor: C.teal,
  },
  ribbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three + 2,
    paddingVertical: Spacing.two,
  },
  ribbonUrgent: {
    backgroundColor: C.errorSoft,
  },
  ribbonTeal: {
    backgroundColor: C.tealSoft,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three + 2,
  },
  thumb: {
    width: 62,
    height: 62,
    borderRadius: Radius.sm,
    backgroundColor: C.offWhite,
  },
  thumbPlaceholder: {
    width: 62,
    height: 62,
    borderRadius: Radius.sm,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  tail: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    backgroundColor: C.offWhite,
    paddingHorizontal: Spacing.three + 2,
    paddingVertical: Spacing.three,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.two,
  },
  reasons: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  contactNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.tealSoft,
    borderRadius: Radius.sm,
    padding: Spacing.three - 4,
    marginTop: Spacing.two,
  },
});
