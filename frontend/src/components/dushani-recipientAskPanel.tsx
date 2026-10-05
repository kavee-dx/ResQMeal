import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { Radius, Spacing } from '../constants/theme';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';
import {
  getDonationAsks,
  type DonationAsk,
} from '../services/dushani-foodRequestApi';

// User-management palette (same constants as the recipient screens).
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
  success: '#3FA34D',
  successSoft: '#E2F2E5',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function askedAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

function neededBy(iso: string | null): string {
  // No chosen time means the recipient asked for an emergency — it is needed
  // as soon as a donor can move.
  if (!iso) return 'Needed right away';
  const date = new Date(iso);
  const day = `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  const meridiem = date.getHours() >= 12 ? 'PM' : 'AM';
  const hour = date.getHours() % 12 || 12;
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `Needed ${day}, ${hour}:${minute} ${meridiem}`;
}

/**
 * The recipient asks on a donor's own donation: who asked, what they need and
 * what they wrote. Nothing here is a chat — a recipient's contact number is
 * only ever released to the donor who accepts their request.
 */
export default function RecipientAskPanel({ donationId }: { donationId: string }) {
  const T = useAppTypography();
  const [asks, setAsks] = useState<DonationAsk[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  // This page belongs to the donor who posted the donation, so a refusal means
  // there is simply nothing to show rather than an error to shout about.
  const [hidden, setHidden] = useState(false);

  const load = useCallback(async () => {
    if (!donationId) {
      setHidden(true);
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const result = await getDonationAsks(donationId);
      setAsks(result.requests);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403 || status === 404) {
        setHidden(true);
        return;
      }
      setError('Could not load the recipient asks just now.');
    } finally {
      setChecking(false);
    }
  }, [donationId]);

  // Coming back to the page after posting or editing a donation checks again,
  // so a recipient who asked while the donor was away shows up.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (hidden) return null;

  if (asks === null) {
    return error ? (
      <StateRow
        icon="cloud-offline-outline"
        text={error}
        actionLabel="Try again"
        onPress={load}
      />
    ) : (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={C.teal} />
        <Text style={{ ...T.bodySmall, fontSize: 12, color: C.textMuted, marginLeft: Spacing.two }}>
          Checking for recipient asks…
        </Text>
      </View>
    );
  }

  if (asks.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="person-outline" size={15} color={C.textMuted} style={{ marginRight: Spacing.two }} />
        <Text style={{ ...T.bodySmall, fontSize: 12, color: C.textMuted, flex: 1 }}>
          No recipient has asked for this donation yet. When one does, their name
          and what they need appear here.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.head}>
        <Text style={{ ...T.labelStrong, fontSize: 13, color: C.navy, flex: 1 }} accessibilityLabel="Recipient asks">
          {asks.length === 1
            ? '1 recipient asked for this donation'
            : `${asks.length} recipients asked for this donation`}
        </Text>
        <TouchableOpacity
          onPress={() => void load()}
          activeOpacity={0.85}
          disabled={checking}
          accessibilityLabel="Check for new asks"
          style={styles.checkBtn}
        >
          <Ionicons name="refresh" size={14} color={C.teal} />
          <Text style={{ ...T.buttonSmall, color: C.teal }}>{checking ? 'Checking…' : 'Check'}</Text>
        </TouchableOpacity>
      </View>

      {asks.map((ask) => {
        const needLine =
          ask.quantity && ask.quantity !== ask.need ? `${ask.need} · ${ask.quantity}` : ask.need;
        return (
        <View
          key={ask.id}
          style={[styles.row, !ask.stillWaiting && styles.rowClosed]}
        >
          <View style={styles.rowHead}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={13} color={C.teal} />
            </View>
            <Text style={{ ...T.labelStrong, fontSize: 13, color: C.navy, flex: 1 }} numberOfLines={1}>
              {ask.recipientName}
            </Text>
            {ask.urgency === 'URGENT' && ask.stillWaiting && (
              <Text style={{ ...T.caption, fontSize: 10, color: C.error }}>URGENT</Text>
            )}
            <Text style={{ ...T.caption, fontSize: 10.5, color: C.textMuted }}>
              {askedAgo(ask.askedAt)}
            </Text>
          </View>

          {ask.need ? (
            <Text style={{ ...T.bodySmall, fontSize: 12, color: C.textMuted, marginTop: 5 }}>
              {needLine}
            </Text>
          ) : null}

          {ask.area ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={12} color={C.teal} />
              <Text style={{ ...T.caption, fontSize: 11.5, color: C.textMuted, flex: 1 }} numberOfLines={1}>
                {ask.area}
              </Text>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <Ionicons
              name={ask.stillWaiting ? 'time-outline' : 'close-circle-outline'}
              size={12}
              color={ask.stillWaiting ? C.teal : C.textMuted}
            />
            <Text
              style={{
                ...T.caption,
                fontSize: 11.5,
                color: C.textMuted,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {ask.stillWaiting
                ? neededBy(ask.neededBy)
                : 'That request has since closed — it no longer needs food'}
            </Text>
          </View>

          {ask.note ? (
            <Text style={{ ...T.bodySmall, fontSize: 12, color: C.navy, marginTop: 5 }}>
              {`“${ask.note}”`}
            </Text>
          ) : null}
        </View>
        );
      })}

      <View style={styles.footNote}>
        <Ionicons
          name="information-circle-outline"
          size={15}
          color={C.teal}
          style={{ marginRight: Spacing.two }}
        />
        <Text style={{ ...T.bodySmall, fontSize: 12, color: C.textMuted, flex: 1 }}>
          To answer one, open Food rescue requests and accept that recipient’s
          request — you then get their contact number to arrange the pickup.
          In-app chat is not built yet.
        </Text>
      </View>
    </View>
  );
}

function StateRow({
  icon,
  text,
  actionLabel,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
  actionLabel: string;
  onPress: () => void;
}) {
  const T = useAppTypography();
  return (
    <View style={styles.errorRow}>
      <Ionicons name={icon} size={15} color={C.textMuted} style={{ marginRight: Spacing.two }} />
      <Text style={{ ...T.bodySmall, fontSize: 12, color: C.textMuted, flex: 1 }}>{text}</Text>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} accessibilityLabel={actionLabel}>
        <Text style={{ ...T.buttonSmall, color: C.teal }}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  row: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: Radius.sm,
    padding: Spacing.three - 4,
    marginBottom: Spacing.two,
  },
  rowClosed: {
    opacity: 0.7,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.offWhite,
    borderRadius: Radius.sm,
    padding: Spacing.three - 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.errorSoft,
    borderRadius: Radius.sm,
    padding: Spacing.three - 4,
  },
  footNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.tealSoft,
    borderRadius: Radius.sm,
    padding: Spacing.three - 4,
    marginTop: Spacing.two,
  },
});
