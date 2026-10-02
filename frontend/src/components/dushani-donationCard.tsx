import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput } from 'react-native';
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
  /** Sends the ask for this donation; resolves once the donor has it. */
  onAsk: (note: string) => Promise<void>;
};

/**
 * One live donation a donor has posted: what it is, how much, how far the pickup
 * is, which of the recipient's own requests it answers, and whether they have
 * already asked this donor for it.
 */
export default function DonationCard({ donation, expanded, onToggle, onAsk }: Props) {
  const T = useAppTypography();
  const [composing, setComposing] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
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

          <View style={styles.askBlock}>
            {donation.asked && !composing && (
              <View style={styles.askSent}>
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color={C.success}
                  style={{ marginRight: Spacing.two }}
                />
                <Text style={{ ...T.bodySmall, fontSize: 12, color: C.navy, flex: 1 }} accessibilityLabel="Ask already sent">
                  You have asked {donation.donorName} for this. They see your name
                  and your request on their donation page.
                </Text>
              </View>
            )}

            {composing ? (
              <View style={styles.askComposer}>
                <Text style={{ ...T.caption, fontSize: 10.5, color: C.textMuted, marginBottom: 4 }}>
                  YOUR NOTE TO {donation.donorName.toUpperCase()} (OPTIONAL)
                </Text>
                <TextInput
                  value={note}
                  onChangeText={(text) => {
                    setNote(text);
                    setAskError(null);
                  }}
                  placeholder="Who you feed and when you can collect it."
                  placeholderTextColor={C.textMuted}
                  multiline
                  maxLength={300}
                  style={styles.askInput}
                  accessibilityLabel="Note to the donor"
                  editable={!sending}
                />
                {donation.answering && (
                  <Text style={{ ...T.caption, fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                    Sent with your request for {donation.answering.requestFood}.
                  </Text>
                )}

                {askError && (
                  <Text style={{ ...T.bodySmall, fontSize: 12, color: C.error, marginTop: Spacing.two }}>
                    {askError}
                  </Text>
                )}

                <View style={styles.askActions}>
                  <TouchableOpacity
                    onPress={async () => {
                      setSending(true);
                      setAskError(null);
                      try {
                        await onAsk(note.trim());
                        setNote('');
                        setComposing(false);
                      } catch (error: any) {
                        setAskError(
                          error?.response?.data?.message ??
                            'Could not send your ask — try again.',
                        );
                      } finally {
                        setSending(false);
                      }
                    }}
                    activeOpacity={0.88}
                    disabled={sending}
                    style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                    accessibilityLabel="Send ask"
                  >
                    <Text style={{ ...T.buttonSmall, color: C.white }}>
                      {sending ? 'Sending…' : donation.asked ? 'Update ask' : 'Send ask'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setComposing(false);
                      setNote('');
                      setAskError(null);
                    }}
                    activeOpacity={0.88}
                    disabled={sending}
                    style={styles.cancelBtn}
                    accessibilityLabel="Cancel asking"
                  >
                    <Text style={{ ...T.buttonSmall, color: C.textMuted }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setComposing(true)}
                activeOpacity={0.88}
                style={styles.askButton}
                accessibilityLabel={donation.asked ? 'Change your ask' : 'Ask this donor for the donation'}
              >
                <Ionicons
                  name={donation.asked ? 'create-outline' : 'hand-left-outline'}
                  size={15}
                  color={C.teal}
                  style={{ marginRight: Spacing.two }}
                />
                <Text style={{ ...T.buttonSmall, color: C.teal }}>
                  {donation.asked ? 'Add a note for the donor' : `Ask ${donation.donorName} for this`}
                </Text>
              </TouchableOpacity>
            )}
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
  askBlock: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  askSent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.successSoft,
    borderRadius: Radius.sm,
    padding: Spacing.three - 4,
  },
  askComposer: {
    backgroundColor: C.white,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: Spacing.three - 4,
  },
  askInput: {
    minHeight: 62,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.two,
    color: C.navy,
    backgroundColor: C.offWhite,
  },
  askActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.two + 2,
  },
  sendBtn: {
    backgroundColor: C.teal,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  cancelBtn: {
    paddingVertical: Spacing.two,
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
});
