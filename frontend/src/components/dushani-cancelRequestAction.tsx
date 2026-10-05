import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '@/constants/theme';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';
import { cancelFoodRequest, type FoodRequestStatus } from '../services/dushani-foodRequestApi';

// User-management palette (same constants as the Create Request screen).
const C = {
  navy: '#023047',
  teal: '#126782',
  white: '#FFFFFF',
  offWhite: '#F6F8FA',
  cardBorder: '#E4E9ED',
  textMuted: '#6B7B85',
  error: '#D64545',
  errorSoft: '#FBEAEA',
};

// Only a request a donor is already working on can be cancelled. Before that a
// recipient deletes it, and once the food is delivered there is nothing left to
// call off.
export const CANCELABLE: FoodRequestStatus[] = ['MATCHED', 'DISPATCHED'];

type Props = {
  requestId: string;
  status: FoodRequestStatus;
  /** 'row' sits in a card's action strip; 'panel' reads as its own block. */
  layout?: 'row' | 'panel';
  /** Called after a successful cancellation so the screen can refresh. */
  onDone: () => void;
};

/**
 * Sprint 4 task 08 — Cancel Request Action. The recipient calls off a request a
 * donor has accepted, and the confirmation has to be answered before anything
 * is sent. Alert.alert() is a no-op on the web build, so the prompt is rendered
 * in place and a failure prints the server's message under the button.
 */
export default function CancelRequestAction({ requestId, status, layout = 'row', onDone }: Props) {
  const T = useAppTypography();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!CANCELABLE.includes(status)) return null;

  const panel = layout === 'panel';

  const abort = () => {
    setConfirming(false);
    setError(null);
  };

  const perform = async () => {
    setConfirming(false);
    setError(null);
    setBusy(true);
    try {
      await cancelFoodRequest(requestId);
      onDone();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not cancel this request. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const prompt =
    status === 'DISPATCHED'
      ? 'Cancel while the food is on the way? The donor will be told to stop.'
      : 'Cancel this request? A donor has already accepted it.';

  return (
    <View style={[styles.wrap, panel && styles.panel]}>
      {confirming ? (
        <View style={panel ? styles.confirmStack : styles.confirmRow}>
          <View style={styles.confirmHead}>
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color={C.error}
              style={{ marginRight: Spacing.two }}
            />
            <Text
              style={{
                ...T.bodySmall,
                fontSize: 12.5,
                color: C.error,
                flex: 1,
                ...(panel ? {} : { minWidth: 120 }),
              }}
            >
              {prompt}
            </Text>
          </View>
          <View style={styles.confirmActions}>
            <TouchableOpacity
              onPress={abort}
              disabled={busy}
              activeOpacity={0.85}
              style={styles.keepButton}
              accessibilityLabel="Keep this request running"
            >
              <Text style={{ ...T.labelStrong, fontSize: 12, color: C.teal }}>Keep it</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={perform}
              disabled={busy}
              activeOpacity={0.85}
              style={[styles.confirmButton, busy && styles.dimmed]}
              accessibilityLabel="Confirm that you want to cancel this request"
            >
              {busy ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <>
                  <Ionicons name="ban-outline" size={14} color={C.white} style={{ marginRight: Spacing.two }} />
                  <Text style={{ ...T.labelStrong, fontSize: 12, color: C.white }}>
                    Yes, cancel it
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setConfirming(true)}
          disabled={busy}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.85}
          style={[styles.trigger, panel && styles.triggerPanel]}
          accessibilityLabel="Cancel this request"
        >
          {busy ? (
            <ActivityIndicator size="small" color={C.error} />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={15} color={C.error} style={{ marginRight: Spacing.two }} />
              <Text style={{ ...T.labelStrong, fontSize: panel ? 13.5 : 12, color: C.error }}>
                {panel ? 'Cancel this request' : 'Cancel request'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {error && (
        <Text style={{ ...T.bodySmall, fontSize: 11.5, color: C.error, marginTop: Spacing.two }}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-end',
  },
  panel: {
    backgroundColor: C.offWhite,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: C.error,
    padding: Spacing.four,
    alignItems: 'stretch',
    marginTop: Spacing.four,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: C.error,
    backgroundColor: C.white,
  },
  triggerPanel: {
    minHeight: 46,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  confirmStack: {
    alignItems: 'stretch',
  },
  confirmHead: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 200,
  },
  confirmActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  keepButton: {
    minHeight: 30,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: C.cardBorder,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.sm,
    backgroundColor: C.error,
  },
  dimmed: {
    opacity: 0.7,
  },
});
