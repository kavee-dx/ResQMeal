import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing, Shadows, ComponentSizes } from '@/constants/theme';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';
import VolunteerBottomNav from '../components/dilshara-VolunteerBottomNav';
import {
  getCurrentAssignmentDetail,
  updateAssignmentStatus,
  Assignment,
  AssignmentStatus,
  DeliveryView,
} from '@/services/dilshara-assignmentService';

// Mirrors the backend lifecycle map for which action to offer. The backend
// still enforces every transition — this only decides what the app shows.
const NEXT_STEP: Record<string, { next: AssignmentStatus; label: string } | null> = {
  ASSIGNED: { next: 'ACCEPTED', label: 'Accept Assignment' },
  ACCEPTED: { next: 'PICKING_UP', label: 'Start Pickup' },
  PICKING_UP: { next: 'IN_TRANSIT', label: 'Mark In Transit' },
  IN_TRANSIT: { next: 'DELIVERED', label: 'Mark Delivered' },
  DELIVERED: null,
};

const SUCCESS_MESSAGE: Record<string, string> = {
  ACCEPTED: 'Assignment accepted. Head to the pickup when you are ready.',
  PICKING_UP: 'Pickup started — collect the food from the donor.',
  IN_TRANSIT: 'On your way. The recipient can see that delivery has started.',
  DELIVERED: 'Delivery completed. Thank you for rescuing this food.',
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

const MATCH_FACTORS: { key: 'distance' | 'area' | 'time' | 'urgency'; label: string }[] = [
  { key: 'distance', label: 'Distance' },
  { key: 'area', label: 'Preferred area' },
  { key: 'time', label: 'Time availability' },
  { key: 'urgency', label: 'Urgency fit' },
];

type DestructiveAction = {
  label: string;
  title: string;
  message: string;
  confirmLabel: string;
  successText: string;
};

// Where the backend allows a cancellation, and what the volunteer should be
// told before it is sent. IN_TRANSIT and finished deliveries never cancel.
function destructiveAction(status: AssignmentStatus): DestructiveAction | null {
  if (status === 'ASSIGNED') {
    return {
      label: 'Decline',
      title: 'Decline this delivery?',
      message: 'It will be offered to another eligible volunteer.',
      confirmLabel: 'Decline',
      successText: 'Delivery declined — it goes back to matching.',
    };
  }
  if (status === 'ACCEPTED') {
    return {
      label: 'Cancel Assignment',
      title: 'Cancel this delivery?',
      message: 'Cancelling before pickup lets the system look for another volunteer.',
      confirmLabel: 'Cancel delivery',
      successText: 'Delivery cancelled.',
    };
  }
  if (status === 'PICKING_UP') {
    return {
      label: 'Cancel Assignment',
      title: 'Cancel this delivery?',
      message:
        'You may already have the food, so it will not be offered to anyone else automatically — the donor and recipient will be told to coordinate the handover.',
      confirmLabel: 'Cancel delivery',
      successText: 'Delivery cancelled — the donor and recipient have been told to coordinate.',
    };
  }
  return null;
}

function getErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message ?? fallback;
}

function formatRouteDistance(
  km: number | null | undefined,
  precision: string | null | undefined
): string | null {
  if (km == null) return null;
  // Approximate routes are estimates between district centres — do not dress
  // them up with decimal precision.
  return precision === 'APPROXIMATE' ? `~${Math.round(km)} km (approximate)` : `${km} km`;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// Joins a place label with its district, dropping the district when the label
// already names it — "Colombo 05" + "Colombo" must not print twice.
function areaText(label: string | null | undefined, district: string | null | undefined): string {
  const first = label?.trim();
  const rest = district?.trim();
  if (!first) return rest ?? '';
  if (!rest || first.toLowerCase().includes(rest.toLowerCase())) return first;
  return `${first}, ${rest}`;
}

function ActionButton(props: {
  label: string;
  tone: 'primary' | 'danger';
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = Colors.light;
  const T = useAppTypography();
  const { label, tone, loading, disabled, onPress } = props;
  const isPrimary = tone === 'primary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: '100%',
        height: ComponentSizes.buttonHeight,
        borderRadius: Radius.md,
        backgroundColor: isPrimary ? theme.primary : theme.errorSoft,
        borderWidth: isPrimary ? 0 : 1,
        borderColor: theme.error,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.7 : 1,
        ...(isPrimary ? Shadows.button : {}),
      }}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? theme.textOnPrimary : theme.error} />
      ) : (
        <Text style={{ ...T.button, color: isPrimary ? theme.textOnPrimary : theme.error }}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function AssignmentStatusScreen() {
  const theme = Colors.light;
  const T = useAppTypography();
  const insets = useSafeAreaInsets();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [delivery, setDelivery] = useState<DeliveryView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<AssignmentStatus | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'warning'; text: string } | null>(null);

  const load = useCallback(async (options?: { keepNotice?: boolean }) => {
    if (!options?.keepNotice) setNotice(null);
    try {
      const result = await getCurrentAssignmentDetail();
      setAssignment(result.assignment);
      setDelivery(result.assignment ? result.delivery : null);
      setLoadError(null);
    } catch (err) {
      setLoadError(getErrorMessage(err, 'Could not load your assignment.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const submit = async (nextStatus: AssignmentStatus, successText: string) => {
    if (!assignment) return;

    setPendingAction(nextStatus);
    setNotice(null);
    try {
      const { requestSync } = await updateAssignmentStatus(assignment._id, nextStatus);
      // Requirement: refresh from the server after every action — a decline
      // can hand the delivery to someone else, a completion empties the list.
      await load({ keepNotice: true });
      if (requestSync?.status === 'FAILED') {
        // The assignment change stands; the recipient's progress update needs
        // recovery and is logged server-side.
        setNotice({
          tone: 'warning',
          text: "Status saved, but the recipient's request could not be updated — it is logged for recovery.",
        });
      } else {
        setNotice({ tone: 'success', text: successText });
      }
    } catch (err) {
      Alert.alert('Could not update status', getErrorMessage(err, 'Check your connection and try again.'));
    } finally {
      setPendingAction(null);
    }
  };

  const confirmDestructive = (action: DestructiveAction) => {
    Alert.alert(action.title, action.message, [
      { text: 'Never mind', style: 'cancel' },
      {
        text: action.confirmLabel,
        style: 'destructive',
        onPress: () => submit('CANCELLED', action.successText),
      },
    ]);
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

  const renderNotice = () => {
    if (!notice) return null;
    const good = notice.tone === 'success';
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          backgroundColor: good ? theme.successSoft : theme.warningSoft,
          borderRadius: Radius.md,
          padding: Spacing.three,
          marginBottom: Spacing.three,
        }}
      >
        <Ionicons
          name={good ? 'checkmark-circle' : 'alert-circle'}
          size={18}
          color={good ? theme.success : theme.warning}
          style={{ marginTop: 1 }}
        />
        <Text style={{ ...T.bodySmall, color: theme.text, flex: 1, marginLeft: Spacing.two }}>
          {notice.text}
        </Text>
      </View>
    );
  };

  const renderActions = (status: AssignmentStatus) => {
    const step = NEXT_STEP[status];
    const destructive = destructiveAction(status);

    if (!step && !destructive) return null;

    const busy = pendingAction !== null;

    if (step && destructive) {
      return (
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <ActionButton
              label={destructive.label}
              tone="danger"
              loading={pendingAction === 'CANCELLED'}
              disabled={busy}
              onPress={() => confirmDestructive(destructive)}
            />
          </View>
          <View style={{ flex: 1, marginLeft: Spacing.two }}>
            <ActionButton
              label={step.label}
              tone="primary"
              loading={pendingAction === step.next}
              disabled={busy}
              onPress={() => submit(step.next, SUCCESS_MESSAGE[step.next] ?? 'Status updated.')}
            />
          </View>
        </View>
      );
    }

    const single = step
      ? { label: step.label, tone: 'primary' as const, loading: pendingAction === step.next, onPress: () => submit(step.next, SUCCESS_MESSAGE[step.next] ?? 'Status updated.') }
      : { label: destructive!.label, tone: 'danger' as const, loading: pendingAction === 'CANCELLED', onPress: () => confirmDestructive(destructive!) };

    return (
      <ActionButton label={single.label} tone={single.tone} loading={single.loading} disabled={busy} onPress={single.onPress} />
    );
  };

  const renderBody = () => {
    if (loading) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      );
    }

    if (loadError && !assignment) {
      return (
        <View style={cardStyle}>
          <View style={{ alignItems: 'center', paddingVertical: Spacing.three }}>
            <Ionicons name="cloud-offline-outline" size={30} color={theme.error} />
            <Text style={{ ...T.h1, fontSize: 18, lineHeight: 24, color: theme.text, marginTop: Spacing.two }}>
              Could not load your assignment
            </Text>
            <Text style={{ ...T.bodySmall, color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.one, marginBottom: Spacing.three }}>
              {loadError}
            </Text>
            <ActionButton
              label="Try again"
              tone="primary"
              loading={false}
              disabled={false}
              onPress={() => {
                setLoading(true);
                load();
              }}
            />
          </View>
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
    const currentIndex = STEPS.indexOf(assignment.status);
    const contact = delivery?.recipientContact ?? null;
    const dropoffText = delivery?.dropoff
      ? areaText(delivery.dropoff.label, delivery.dropoff.district)
      : '';
    const pickupText =
      areaText(delivery?.pickup?.label, delivery?.pickup?.district) ||
      areaText(donation?.pickupAddress, donation?.pickupDistrict);
    const routeText = formatRouteDistance(assignment.routeDistanceKm, assignment.locationPrecision);
    const breakdown = assignment.matchBreakdown;
    const hasMatchInfo =
      assignment.matchScore != null ||
      routeText != null ||
      (assignment.matchReasons?.length ?? 0) > 0 ||
      MATCH_FACTORS.some((factor) => breakdown?.[factor.key]);

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
              Pickup: {pickupText || 'Not available'}
            </Text>
          </View>

          {dropoffText.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: Spacing.two }}>
              <Ionicons name="navigate-outline" size={18} color={theme.textMuted} style={{ marginTop: 1 }} />
              <Text style={{ ...T.bodySmall, color: theme.textSecondary, flex: 1, marginLeft: Spacing.two }}>
                Drop-off: {dropoffText}
                {delivery?.dropoff && !delivery.dropoff.exact ? ' (approximate area)' : ''}
              </Text>
            </View>
          )}

          {assignment.status === 'ASSIGNED' && dropoffText.length > 0 && !contact && (
            <Text style={{ ...T.caption, color: theme.textMuted, marginTop: Spacing.two }}>
              Recipient contact details appear once you accept.
            </Text>
          )}
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

        {contact && (
          <View style={cardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.two }}>
              <Ionicons name="call-outline" size={16} color={theme.textSecondary} />
              <Text style={{ ...T.label, color: theme.textSecondary, marginLeft: Spacing.two }}>
                Recipient contact
              </Text>
            </View>
            <Text style={{ ...T.label, fontSize: 16, lineHeight: 22, color: theme.text }}>
              {contact.name ?? 'ResQMeal recipient'}
            </Text>
            <Text style={{ ...T.h1, fontSize: 18, lineHeight: 24, color: theme.primary, marginTop: Spacing.one }}>
              {contact.phone}
            </Text>
          </View>
        )}

        {hasMatchInfo && (
          <View style={cardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ ...T.label, color: theme.textSecondary }}>Why you matched</Text>
              {assignment.matchScore != null && (
                <View
                  style={{
                    backgroundColor: theme.secondarySoft,
                    borderRadius: Radius.pill,
                    paddingHorizontal: Spacing.two,
                    paddingVertical: Spacing.half,
                  }}
                >
                  <Text style={{ ...T.caption, color: theme.secondaryDark }}>
                    Match score {round1(assignment.matchScore)} / 100
                  </Text>
                </View>
              )}
            </View>

            {routeText && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.two }}>
                <Ionicons name="map-outline" size={16} color={theme.textMuted} />
                <Text style={{ ...T.bodySmall, color: theme.textSecondary, marginLeft: Spacing.two }}>
                  Route distance: {routeText}
                </Text>
              </View>
            )}

            {MATCH_FACTORS.some((factor) => breakdown?.[factor.key]) && (
              <View style={{ marginTop: Spacing.three }}>
                {MATCH_FACTORS.map((factor) => {
                  const factorData = breakdown?.[factor.key];
                  if (!factorData) return null;
                  const points = Math.max(0, Math.min(100, factorData.points ?? factorData.score ?? 0));
                  return (
                    <View key={factor.key} style={{ marginBottom: Spacing.two }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.half }}>
                        <Text style={{ ...T.caption, color: theme.textSecondary }}>{factor.label}</Text>
                        <Text style={{ ...T.caption, color: theme.textMuted }}>{round1(points)} pts</Text>
                      </View>
                      <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.border }}>
                        <View
                          style={{
                            width: `${points}%`,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: theme.secondary,
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
                <Text style={{ ...T.caption, color: theme.textMuted }}>
                  Bars show each factor's weighted contribution.
                </Text>
              </View>
            )}

            {(assignment.matchReasons?.length ?? 0) > 0 && (
              <View style={{ marginTop: Spacing.three }}>
                {assignment.matchReasons!.map((reason, index) => (
                  <View key={`${index}-${reason}`} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.one }}>
                    <Ionicons name="checkmark-circle" size={14} color={theme.success} style={{ marginTop: 2 }} />
                    <Text style={{ ...T.bodySmall, color: theme.textSecondary, flex: 1, marginLeft: Spacing.two }}>
                      {reason}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {renderActions(assignment.status)}
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

        {renderNotice()}
        {renderBody()}
      </ScrollView>

      <VolunteerBottomNav active="assignments" />
    </View>
  );
}
