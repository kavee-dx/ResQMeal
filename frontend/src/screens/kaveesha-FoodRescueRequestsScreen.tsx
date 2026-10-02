// frontend/src/screens/kaveesha-FoodRescueRequestsScreen.tsx
// Owner: Kavee — data layer + donor claim rewired to real recipient posts (Dushani)
//
// Donor-facing screen: browse the food requests real recipients have posted,
// search + filter them, claim one for delivery, or start a donation against it.
// Same responsive breakpoints and visual language as
// kaveesha-DonorHomeScreen.tsx (light theme, navy + amber brand colors).
//
//   phone / tablet (< 1024px) -> single column list, cards stack full width
//   desktop        (>= 1024px) -> centered content, 2-3 column card grid
//
// This screen intentionally does NOT duplicate the donor home's sidebar /
// bottom tab bar — it's reached via that nav and uses a simple back
// button + title banner instead.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  useWindowDimensions,
} from 'react-native';
import type {
  DimensionValue,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import {
  Colors,
  Radius,
  Shadows,
  Spacing,
  Typography,
  ComponentSizes,
} from '../constants/theme';
import type { ThemeColor } from '../constants/theme';
import { DonationUrgency } from '../types/kaveesha-donation.types';
import { getRole } from '../utils/kaveesha-authStorage';
import {
  acceptFoodRequest,
  getOpenFoodRequests,
  updateFoodRequestStatus,
  type AcceptedFoodRequest,
  type FoodRequestAdvance,
  type OpenFoodRequest,
} from '../services/dushani-foodRequestApi';

/* ========================================================= */
/* TYPES + MAPPING                                            */
/* ========================================================= */

type Props = NativeStackScreenProps<RootStackParamList, any>;

type Palette = Record<ThemeColor, string>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * One live recipient post, shaped for the card. Everything comes from
 * `GET /api/recipient/food-requests/open`; the recipient's phone number is not
 * part of that payload, so it only appears once a donor claims the request.
 */
type FoodRequest = {
  id: string;
  title: string;
  recipientName: string;
  quantity: string;
  location: string;
  neededBy: string;
  neededDay: NeededDay;
  urgency: DonationUrgency;
  description: string;
  closesIn: string;
  closingSoon: boolean;
  postedAt: string;
};

/** A request either names a day or is an emergency with no chosen slot. */
type NeededDay = 'TODAY' | 'TOMORROW' | 'LATER' | 'ASAP';

const HOUR_MS = 60 * 60 * 1000;
const NO_NOTES =
  'The recipient did not add anything else — the food and the address above are the full request.';

function neededDay(iso: string | null): NeededDay {
  if (!iso) return 'ASAP';

  const target = new Date(iso);
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const offset = Math.round(
    (startOfDay(target) - startOfDay(new Date())) / (24 * HOUR_MS),
  );

  if (offset <= 0) return 'TODAY';
  if (offset === 1) return 'TOMORROW';
  return 'LATER';
}

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatClock(iso: string | null): string {
  if (!iso) return 'ASAP';
  const day = neededDay(iso);
  const time = clockTime(iso);

  if (day === 'TODAY') return `Today, ${time}`;
  if (day === 'TOMORROW') return `Tomorrow, ${time}`;
  return `${new Date(iso).toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })}, ${time}`;
}

function formatPosted(iso: string): string {
  return `Posted ${new Date(iso).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
  })}`;
}

/** Live requests only ever close in the future, so a past date reads as closed. */
function formatCloses(expiresAt: string): { text: string; soon: boolean } {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { text: 'Closing now', soon: true };

  const hours = Math.floor(diff / HOUR_MS);
  const minutes = Math.round((diff % HOUR_MS) / 60_000);
  if (hours <= 0) {
    return { text: `Closes in ${Math.max(minutes, 1)} min`, soon: true };
  }
  return {
    text: `Closes in ${hours}h ${minutes}m`,
    soon: diff <= HOUR_MS,
  };
}

function toFoodRequest(request: OpenFoodRequest): FoodRequest {
  const closing = formatCloses(request.expiresAt);

  return {
    id: request.id,
    title: request.foodType,
    recipientName: request.recipientName,
    quantity: request.quantity,
    location: request.location,
    neededBy: formatClock(request.preferredAt),
    neededDay: neededDay(request.preferredAt),
    urgency: request.urgency === 'URGENT' ? 'HIGH' : 'NORMAL',
    description: request.details?.trim() ? request.details.trim() : NO_NOTES,
    closesIn: closing.text,
    closingSoon: closing.soon,
    postedAt: formatPosted(request.createdAt),
  };
}

// Real recipient posts name their own foods ("Cooked Rice, Carrot"), so the
// type chips are built from what people actually asked for — see `foodOptions`.
const ALL_TYPES = 'All types';

/* ========================================================= */
/* THEME + LAYOUT                                              */
/* ========================================================= */

const c = Colors.light as Palette;
const accent = c.primary;

function useLayout() {
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1024;
  const isTablet = width >= 700 && !isDesktop;
  const isMobile = !isDesktop && !isTablet;

  const pad = isDesktop
    ? Spacing.five
    : isTablet
      ? Spacing.four
      : Spacing.three;

  return {
    width,
    isDesktop,
    isTablet,
    isMobile,
    pad,
  };
}

const CONTENT_MAX = 1100;
const GRID_GAP = 16;

const urgencyBadge: Record<
  DonationUrgency,
  { label: string; bg: string; text: string }
> = {
  HIGH: {
    label: 'Urgent',
    bg: c.errorSoft,
    text: c.error,
  },
  MEDIUM: {
    label: 'Soon',
    bg: c.warningSoft,
    text: c.secondaryDark,
  },
  NORMAL: {
    label: 'Normal',
    bg: c.infoSoft,
    text: c.info,
  },
};

/* ========================================================= */
/* STYLES                                                      */
/* ========================================================= */

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.background,
  },

  scrollContent: {
    alignItems: 'center',
    paddingBottom: 48,
  },

  container: {
    width: '100%',
    maxWidth: CONTENT_MAX,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radius.xl,
    padding: 20,
    ...Shadows.card,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bannerTitle: {
    ...Typography.h2,
    fontSize: 22,
    color: '#FFFFFF',
  },

  bannerSubtitle: {
    ...Typography.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
  },

  bannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  searchBar: {
    flex: 1,
    height: ComponentSizes.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.inputBackground,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: c.border,
  },

  searchInput: {
    flex: 1,
    ...Typography.input,
    color: c.inputText,
    paddingVertical: 0,
  },

  filterLabel: {
    ...Typography.label,
    fontSize: 12,
    color: c.textMuted,
    marginBottom: 8,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },

  chipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },

  chipText: {
    ...Typography.label,
    fontSize: 13,
    color: c.textSecondary,
  },

  chipTextActive: {
    color: '#FFFFFF',
  },

  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  resultsText: {
    ...Typography.bodySmall,
    color: c.textSecondary,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },

  card: {
    backgroundColor: c.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    ...Shadows.card,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },

  badgeText: {
    ...Typography.label,
    fontSize: 12,
  },

  distanceText: {
    ...Typography.bodySmall,
    color: c.textMuted,
  },

  cardTitle: {
    ...Typography.h3,
    fontSize: 16,
    lineHeight: 22,
    color: c.text,
    marginTop: 10,
  },

  cardRecipient: {
    ...Typography.bodySmall,
    color: c.textSecondary,
    marginTop: 2,
  },

  metaGrid: {
    marginTop: 12,
    gap: 6,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  metaText: {
    ...Typography.bodySmall,
    color: c.textSecondary,
    flex: 1,
  },

  cardDivider: {
    height: 1,
    backgroundColor: c.borderLight,
    marginVertical: 12,
  },

  cardDescription: {
    ...Typography.bodySmall,
    color: c.textMuted,
    lineHeight: 19,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
  },

  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  viewDetailsText: {
    ...Typography.label,
    fontSize: 13,
    color: accent,
  },

  donateBtn: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    backgroundColor: c.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.button,
  },

  donateBtnText: {
    ...Typography.buttonSmall,
    color: c.textOnSecondary,
  },

  empty: {
    alignItems: 'center',
    padding: 32,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.border,
    backgroundColor: c.surfaceSoft,
    width: '100%',
  },

  emptyText: {
    ...Typography.body,
    color: c.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(1,19,31,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: c.surface,
    borderRadius: Radius.xl,
    padding: 24,
    ...Shadows.card,
  },

  modalTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: c.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalTitle: {
    ...Typography.h3,
    fontSize: 19,
    color: c.text,
    marginTop: 14,
  },

  modalRecipient: {
    ...Typography.body,
    color: c.textSecondary,
    marginTop: 2,
  },

  modalDescription: {
    ...Typography.body,
    color: c.textSecondary,
    marginTop: 14,
    lineHeight: 22,
  },

  modalDonateBtn: {
    height: 50,
    borderRadius: Radius.pill,
    backgroundColor: c.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...Shadows.button,
  },

  modalDonateBtnText: {
    ...Typography.button,
    color: c.textOnSecondary,
  },

  closesSoon: {
    color: c.error,
  },

  postedText: {
    ...Typography.bodySmall,
    color: c.textMuted,
  },

  stateBlock: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },

  stateText: {
    ...Typography.bodySmall,
    color: c.textMuted,
    textAlign: 'center',
  },

  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },

  claimPanel: {
    marginTop: 18,
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: c.success,
    backgroundColor: c.successSoft,
    gap: 6,
  },

  claimPanelTitle: {
    ...Typography.label,
    color: c.success,
  },

  claimPanelText: {
    ...Typography.bodySmall,
    color: c.textSecondary,
  },

  claimPhone: {
    ...Typography.h3,
    fontSize: 18,
    color: c.text,
  },

  claimBtn: {
    height: 50,
    borderRadius: Radius.pill,
    backgroundColor: c.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    ...Shadows.button,
  },

  claimBtnDisabled: {
    opacity: 0.6,
  },

  claimBtnText: {
    ...Typography.button,
    color: '#FFFFFF',
  },

  claimError: {
    ...Typography.bodySmall,
    color: c.error,
    marginTop: 10,
  },
});

/* ========================================================= */
/* SMALL COMPONENTS                                            */
/* ========================================================= */

function MetaRow({
  icon,
  text,
}: {
  icon: IconName;
  text: string;
}) {
  return (
    <View style={s.metaRow}>
      <Ionicons
        name={icon}
        size={15}
        color={c.textMuted}
      />

      <Text
        style={s.metaText}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

function RequestCard({
  item,
  width,
  onViewDetails,
  onDonate,
}: {
  item: FoodRequest;
  width: DimensionValue;
  onViewDetails: () => void;
  onDonate: () => void;
}) {
  const badge = urgencyBadge[item.urgency];

  return (
    <View style={[s.card, { width }]}>
      <View style={s.cardTop}>
        <View
          style={[
            s.badge,
            { backgroundColor: badge.bg },
          ]}
        >
          <Text
            style={[
              s.badgeText,
              { color: badge.text },
            ]}
          >
            {badge.label}
          </Text>
        </View>

        <Text
          style={[
            s.distanceText,
            item.closingSoon && s.closesSoon,
          ]}
        >
          {item.closesIn}
        </Text>
      </View>

      <Text
        style={s.cardTitle}
        numberOfLines={2}
      >
        {item.title}
      </Text>

      <Text
        style={s.cardRecipient}
        numberOfLines={1}
      >
        {item.recipientName}
      </Text>

      <View style={s.metaGrid}>
        <MetaRow
          icon="cube-outline"
          text={item.quantity}
        />

        <MetaRow
          icon="location-outline"
          text={item.location}
        />

        <MetaRow
          icon="time-outline"
          text={`Needed ${item.neededBy}`}
        />
      </View>

      <View style={s.cardDivider} />

      <Text
        style={s.cardDescription}
        numberOfLines={3}
      >
        {item.description}
      </Text>

      <View style={s.cardFooter}>
        <TouchableOpacity
          activeOpacity={0.75}
          style={s.viewDetailsBtn}
          onPress={onViewDetails}
        >
          <Text style={s.viewDetailsText}>
            View details
          </Text>

          <Ionicons
            name="chevron-forward"
            size={14}
            color={accent}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={s.donateBtn}
          onPress={onDonate}
        >
          <Text style={s.donateBtnText}>
            Donate
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * After a donor claims a request the server hands back the recipient's phone
 * number, which is the only place it appears. The claim then moves through the
 * same stages the recipient watches on her progress page.
 */
function ClaimedPanel({
  claimed,
  busy,
  error,
  onAdvance,
}: {
  claimed: AcceptedFoodRequest;
  busy: boolean;
  error: string | null;
  onAdvance: (status: FoodRequestAdvance) => void;
}) {
  const next: { label: string; status: FoodRequestAdvance } | null =
    claimed.status === 'MATCHED'
      ? { label: 'I am on the way', status: 'DISPATCHED' }
      : claimed.status === 'DISPATCHED'
        ? { label: 'Food delivered', status: 'FULFILLED' }
        : null;

  return (
    <View style={s.claimPanel}>
      <Text style={s.claimPanelTitle}>
        You accepted this request
      </Text>

      <Text style={s.claimPhone}>
        {claimed.contactNumber || 'No phone number on this request'}
      </Text>

      <Text style={s.claimPanelText}>
        {claimed.location} · {claimed.quantity}
      </Text>

      {!!claimed.details && (
        <Text style={s.claimPanelText}>
          {claimed.details}
        </Text>
      )}

      {next ? (
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            s.claimBtn,
            s.claimBtnDisabled,
            busy && s.claimBtnDisabled,
          ]}
          disabled={busy}
          onPress={() => onAdvance(next.status)}
        >
          <Text style={s.claimBtnText}>
            {busy ? 'Updating…' : next.label}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={s.claimPanelText}>
          This request is delivered. Thank you.
        </Text>
      )}

      {!!error && (
        <Text style={s.claimError}>{error}</Text>
      )}
    </View>
  );
}

function RequestDetailModal({
  item,
  isDonor,
  claimed,
  claiming,
  claimError,
  stageBusy,
  stageError,
  onClose,
  onDonate,
  onClaim,
  onAdvance,
}: {
  item: FoodRequest | null;
  isDonor: boolean;
  claimed: AcceptedFoodRequest | null;
  claiming: boolean;
  claimError: string | null;
  stageBusy: boolean;
  stageError: string | null;
  onClose: () => void;
  onDonate: (item: FoodRequest) => void;
  onClaim: (item: FoodRequest) => void;
  onAdvance: (status: FoodRequestAdvance) => void;
}) {
  if (!item) return null;

  const badge = urgencyBadge[item.urgency];

  return (
    <Modal
      visible={!!item}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.modalOverlay}>
        <View style={s.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={s.modalTop}>
              <View
                style={[
                  s.badge,
                  { backgroundColor: badge.bg },
                ]}
              >
                <Text
                  style={[
                    s.badgeText,
                    { color: badge.text },
                  ]}
                >
                  {badge.label}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.75}
                style={s.modalClose}
                onPress={onClose}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={c.text}
                />
              </TouchableOpacity>
            </View>

            <Text style={s.modalTitle}>
              {item.title}
            </Text>

            <Text style={s.modalRecipient}>
              {item.recipientName}
            </Text>

            <View
              style={[
                s.metaGrid,
                { marginTop: 16 },
              ]}
            >
              <MetaRow
                icon="cube-outline"
                text={item.quantity}
              />

              <MetaRow
                icon="location-outline"
                text={item.location}
              />

              <MetaRow
                icon="time-outline"
                text={`Needed ${item.neededBy}`}
              />

              <MetaRow
                icon="hourglass-outline"
                text={item.closesIn}
              />

              <MetaRow
                icon="notifications-outline"
                text={item.postedAt}
              />
            </View>

            <Text style={s.modalDescription}>
              {item.description}
            </Text>

            {claimed ? (
              <ClaimedPanel
                claimed={claimed}
                busy={stageBusy}
                error={stageError}
                onAdvance={onAdvance}
              />
            ) : (
              isDonor && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[
                    s.claimBtn,
                    claiming && s.claimBtnDisabled,
                  ]}
                  disabled={claiming}
                  onPress={() => onClaim(item)}
                >
                  <Text style={s.claimBtnText}>
                    {claiming
                      ? 'Accepting…'
                      : "I'll deliver this request"}
                  </Text>
                </TouchableOpacity>
              )
            )}

            {!!claimError && (
              <Text style={s.claimError}>{claimError}</Text>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              style={s.modalDonateBtn}
              onPress={() => onDonate(item)}
            >
              <Text style={s.modalDonateBtnText}>
                Donate to this request
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ========================================================= */
/* SCREEN                                                      */
/* ========================================================= */

type QuickFilter =
  | 'ALL'
  | 'URGENT'
  | 'TODAY'
  | 'TOMORROW';

export default function FoodRescueRequestsScreen({
  navigation,
}: Props) {
  const L = useLayout();

  const [requests, setRequests] =
    useState<FoodRequest[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  // Only a donor can claim a request, so the list is read-only for the
  // other roles that reach this page.
  const [isDonor, setIsDonor] =
    useState(false);

  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] =
    useState<QuickFilter>('ALL');

  const [foodType, setFoodType] =
    useState<string>(ALL_TYPES);

  const [containerWidth, setContainerWidth] =
    useState(0);

  const [selected, setSelected] =
    useState<FoodRequest | null>(null);

  // The claim the donor just made in this screen's modal — its response is
  // what carries the recipient's phone number.
  const [claimed, setClaimed] =
    useState<AcceptedFoodRequest | null>(null);

  const [claiming, setClaiming] =
    useState(false);

  const [claimError, setClaimError] =
    useState<string | null>(null);

  const [stageBusy, setStageBusy] =
    useState(false);

  const [stageError, setStageError] =
    useState<string | null>(null);

  useEffect(() => {
    getRole().then((role) => setIsDonor(role === 'DONOR'));
  }, []);

  const load = useCallback(
    async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      setError(null);

      try {
        const data = await getOpenFoodRequests();
        setRequests(data.map(toFoodRequest));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load recipient requests.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load(false);
  };

  const innerWidth =
    containerWidth > 0
      ? containerWidth - L.pad * 2
      : 0;

  const columns = L.isDesktop
    ? innerWidth >= 820
      ? 3
      : 2
    : L.isTablet
      ? 2
      : 1;

  // FIX: React Native expects DimensionValue for View width.
  const cardWidth: DimensionValue =
    columns === 1 || innerWidth === 0
      ? '100%'
      : Math.floor(
          (innerWidth - GRID_GAP * (columns - 1)) /
            columns
        );

  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchesQuery =
        !query ||
        r.title.toLowerCase().includes(query) ||
        r.recipientName
          .toLowerCase()
          .includes(query) ||
        r.quantity.toLowerCase().includes(query) ||
        r.location.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query);

      const matchesQuickFilter =
        quickFilter === 'ALL' ||
        (quickFilter === 'URGENT' &&
          r.urgency === 'HIGH') ||
        (quickFilter === 'TODAY' &&
          r.neededDay === 'TODAY') ||
        (quickFilter === 'TOMORROW' &&
          r.neededDay === 'TOMORROW');

      // A post lists several foods in one line, so a chip matches when the
      // request mentions that food at all.
      const matchesFoodType =
        foodType === ALL_TYPES ||
        r.title.toLowerCase().includes(
          foodType.toLowerCase(),
        );

      return (
        matchesQuery &&
        matchesQuickFilter &&
        matchesFoodType
      );
    });
  }, [requests, query, quickFilter, foodType]);

  // Chips come from the live list: a post for "Cooked Rice, Carrot" offers both
  // foods, most-requested first, so the filter can never name a food nobody
  // actually posted.
  const foodOptions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();

    requests.forEach((request) => {
      request.title
        .split(',')
        .forEach((name) => {
          const label = name.trim();
          if (!label) return;

          const key = label.toLowerCase();
          const seen = counts.get(key);
          counts.set(key, {
            label,
            count: (seen?.count ?? 0) + 1,
          });
        });
    });

    return [...counts.values()]
      .sort(
        (a, b) =>
          b.count - a.count || a.label.localeCompare(b.label),
      )
      .slice(0, 5)
      .map((entry) => entry.label);
  }, [requests]);

  const openDetails = (item: FoodRequest) => {
    setSelected(item);
    setClaimed(null);
    setClaimError(null);
    setStageError(null);
  };

  const closeDetails = () => {
    setSelected(null);
    setClaimed(null);
    setClaimError(null);
  };

  const handleDonate = (item: FoodRequest) => {
    setSelected(null);
    setClaimed(null);

    navigation.navigate(
      'CreateDonation' as any,
      { requestId: item.id } as any
    );
  };

  const handleClaim = async (item: FoodRequest) => {
    setClaimError(null);
    setStageError(null);
    setClaiming(true);

    try {
      const result = await acceptFoodRequest(item.id);
      setClaimed(result);
      setRequests((current) =>
        current.filter((r) => r.id !== item.id),
      );
    } catch (err) {
      setClaimError(
        err instanceof Error
          ? err.message
          : 'Could not accept this request.',
      );
      // Someone else may have claimed it a moment ago.
      load(false);
    } finally {
      setClaiming(false);
    }
  };

  const advanceClaim = async (status: FoodRequestAdvance) => {
    if (!claimed) return;
    setStageError(null);
    setStageBusy(true);

    try {
      const result = await updateFoodRequestStatus(
        claimed.id,
        status,
      );
      setClaimed({ ...claimed, status: result.status });
    } catch (err) {
      setStageError(
        err instanceof Error
          ? err.message
          : 'Could not update this request.',
      );
    } finally {
      setStageBusy(false);
    }
  };

  const quickChips: {
    key: QuickFilter;
    label: string;
    icon: IconName;
  }[] = [
    {
      key: 'ALL',
      label: 'All',
      icon: 'apps-outline',
    },
    {
      key: 'URGENT',
      label: 'Urgent',
      icon: 'alert-circle-outline',
    },
    {
      key: 'TODAY',
      label: 'Today',
      icon: 'today-outline',
    },
    {
      key: 'TOMORROW',
      label: 'Tomorrow',
      icon: 'calendar-outline',
    },
  ];

  return (
    <SafeAreaView
      style={s.safeArea}
      edges={['top']}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={c.textMuted}
          />
        }
      >
        <View
          style={[
            s.container,
            {
              paddingHorizontal: L.pad,
              paddingTop: L.pad,
            },
          ]}
          onLayout={(e: LayoutChangeEvent) =>
            setContainerWidth(
              e.nativeEvent.layout.width
            )
          }
        >
          {/* Banner */}
          <LinearGradient
            colors={[
              c.primaryDark,
              c.primary,
              c.info,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.banner}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={s.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>
                Food rescue requests
              </Text>

              <Text style={s.bannerSubtitle}>
                {loading
                  ? 'Loading recipient requests…'
                  : `${filtered.length} request${
                      filtered.length === 1 ? '' : 's'
                    } open right now`}
              </Text>
            </View>

            <View style={s.bannerIconWrap}>
              <Ionicons
                name="fast-food"
                size={24}
                color="#FFFFFF"
              />
            </View>
          </LinearGradient>

          {/* Search */}
          <View style={{ marginTop: 20 }}>
            <View style={s.searchRow}>
              <View style={s.searchBar}>
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={c.textMuted}
                />

                <TextInput
                  placeholder="Search food, recipient, area or notes..."
                  placeholderTextColor={
                    c.inputPlaceholder
                  }
                  value={search}
                  onChangeText={setSearch}
                  style={s.searchInput}
                />

                {search.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearch('')}
                  >
                    <Ionicons
                      name="close-circle"
                      size={19}
                      color={c.textMuted}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Quick filters */}
          <View style={{ marginTop: 18 }}>
            <Text style={s.filterLabel}>
              Filter
            </Text>

            <View style={s.chipRow}>
              {quickChips.map((chip) => {
                const isActive =
                  chip.key === quickFilter;

                return (
                  <TouchableOpacity
                    key={chip.key}
                    activeOpacity={0.8}
                    style={[
                      s.chip,
                      isActive &&
                        s.chipActive,
                    ]}
                    onPress={() =>
                      setQuickFilter(
                        chip.key
                      )
                    }
                  >
                    <Ionicons
                      name={chip.icon}
                      size={14}
                      color={
                        isActive
                          ? '#FFFFFF'
                          : c.textSecondary
                      }
                    />

                    <Text
                      style={[
                        s.chipText,
                        isActive &&
                          s.chipTextActive,
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Food type filter */}
          <View style={{ marginTop: 14 }}>
            <Text style={s.filterLabel}>
              Food type
            </Text>

            <View style={s.chipRow}>
              {[ALL_TYPES, ...foodOptions].map((type) => {
                const isActive =
                  type === foodType;

                return (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.8}
                    style={[
                      s.chip,
                      isActive &&
                        s.chipActive,
                    ]}
                    onPress={() =>
                      setFoodType(type)
                    }
                  >
                    <Text
                      style={[
                        s.chipText,
                        isActive &&
                          s.chipTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Results */}
          <View style={{ marginTop: 22 }}>
            {loading ? (
              <View style={s.stateBlock}>
                <ActivityIndicator size="small" color={accent} />

                <Text style={s.stateText}>
                  Loading what recipients need right now…
                </Text>
              </View>
            ) : error ? (
              <View style={s.stateBlock}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={26}
                  color={c.error}
                />

                <Text style={s.stateText}>{error}</Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={s.retryBtn}
                  onPress={() => load(true)}
                >
                  <Ionicons
                    name="refresh"
                    size={16}
                    color={c.text}
                  />

                  <Text
                    style={{
                      ...Typography.label,
                      fontSize: 13,
                      color: c.text,
                    }}
                  >
                    Try again
                  </Text>
                </TouchableOpacity>
              </View>
            ) : filtered.length === 0 ? (
              <View style={s.empty}>
                <Ionicons
                  name="fast-food-outline"
                  size={26}
                  color={c.textMuted}
                />

                <Text style={s.emptyText}>
                  {requests.length === 0
                    ? 'No recipient has an open request right now.'
                    : 'No requests match your filters.'}
                </Text>
              </View>
            ) : columns === 1 ? (
              <View
                style={{
                  gap: GRID_GAP,
                }}
              >
                {filtered.map((item) => (
                  <RequestCard
                    key={item.id}
                    item={item}
                    width="100%"
                    onViewDetails={() =>
                      openDetails(item)
                    }
                    onDonate={() =>
                      handleDonate(item)
                    }
                  />
                ))}
              </View>
            ) : (
              <View style={s.grid}>
                {filtered.map((item) => (
                  <RequestCard
                    key={item.id}
                    item={item}
                    width={cardWidth}
                    onViewDetails={() =>
                      openDetails(item)
                    }
                    onDonate={() =>
                      handleDonate(item)
                    }
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <RequestDetailModal
        item={selected}
        isDonor={isDonor}
        claimed={claimed}
        claiming={claiming}
        claimError={claimError}
        stageBusy={stageBusy}
        stageError={stageError}
        onClose={closeDetails}
        onDonate={handleDonate}
        onClaim={handleClaim}
        onAdvance={advanceClaim}
      />
    </SafeAreaView>
  );
}