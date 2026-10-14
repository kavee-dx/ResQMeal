import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Platform,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { getDonations } from "../services/kaveesha-donationApi";

import type {
  Donation,
  DonationPriority,
  DonationStatus,
} from "../types/kaveesha-donation.types";

/*
|--------------------------------------------------------------------------
| Theme
|--------------------------------------------------------------------------
|
| Same navy/amber brand the donor home page uses, extended with the soft
| tints, on-dark tokens and elevations the create-donation steps use, so the
| whole donor journey reads as one product.
|
*/

const COLORS = {
  navy: "#023047",
  navyDeep: "#011C2E",
  teal: "#126782",
  orange: "#FB8500",
  amber: "#FFB703",

  background: "#F6F8FA",
  white: "#FFFFFF",

  text: "#102A43",
  secondary: "#52606D",
  muted: "#7B8794",

  border: "#E3E8ED",
  hairline: "#EDF3F6",
  softBlue: "#EAF4F8",
  softOrange: "#FFF3E6",

  success: "#168A5B",
  softSuccess: "#EAF8F1",

  warning: "#B77900",
  softWarning: "#FFF8E1",

  danger: "#C62828",
  softDanger: "#FDECEC",

  purple: "#6B4EFF",
  softPurple: "#F0EDFF",

  // on dark (the navy hero)
  onDark: "#DCEAF1",
  onDarkFaint: "#9DB6C4",
  glass: "rgba(255,255,255,0.10)",
  glassBorder: "rgba(255,255,255,0.18)",

  // bright tints that stay legible on the navy hero
  mint: "#79E0A9",
  sky: "#8CCFE4",
  butter: "#FFD166",

  // chips floating on top of a food photo
  chipScrim: "rgba(6,26,38,0.72)",
};

/*
|--------------------------------------------------------------------------
| Premium type + elevation
|--------------------------------------------------------------------------
*/

const FONT_BY_WEIGHT: Record<string, string> = {
  "400": "Poppins_400Regular",
  "500": "Poppins_500Medium",
  "600": "Poppins_600SemiBold",
  "700": "Poppins_700Bold",
  "800": "Poppins_700Bold",
  "900": "Poppins_700Bold",
};

const ELEV = {
  shadowColor: "#023047",
  shadowOpacity: 0.1,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};

const ELEV_SOFT = {
  shadowColor: "#023047",
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};

const ELEV_GLOW = {
  shadowColor: "#FB8500",
  shadowOpacity: 0.32,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 8,
};

/*
|--------------------------------------------------------------------------
| Filters
|--------------------------------------------------------------------------
|
| "Expiring" is no longer a database status.
| Expiring Soon is displayed as a warning inside Pending/Active.
|
*/

/* Handed over by the Review step when a donation is published. */
type PublishedInfo = {
  code?: string;
  foodType?: string;
};

const FILTERS: {
  key: "all" | DonationStatus;
  label: string;
}[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "expired", label: "Expired" },
];

/*
|--------------------------------------------------------------------------
| Status helpers
|--------------------------------------------------------------------------
*/

function getStatusConfig(status: DonationStatus) {
  switch (status) {
    case "pending":
      return {
        label: "Pending",
        icon: "time-outline" as const,
        color: COLORS.warning,
        background: COLORS.softWarning,
      };

    case "active":
      return {
        label: "Active",
        icon: "radio-button-on-outline" as const,
        color: COLORS.success,
        background: COLORS.softSuccess,
      };

    case "completed":
      return {
        label: "Completed",
        icon: "checkmark-circle-outline" as const,
        color: COLORS.teal,
        background: COLORS.softBlue,
      };

    case "cancelled":
      return {
        label: "Cancelled",
        icon: "close-circle-outline" as const,
        color: COLORS.secondary,
        background: "#EEF1F4",
      };

    case "expired":
      return {
        label: "Expired",
        icon: "calendar-outline" as const,
        color: COLORS.danger,
        background: COLORS.softDanger,
      };

    default:
      return {
        label: "Unknown",
        icon: "help-circle-outline" as const,
        color: COLORS.secondary,
        background: "#EEF1F4",
      };
  }
}

/*
|--------------------------------------------------------------------------
| Priority helpers
|--------------------------------------------------------------------------
*/

function getPriorityConfig(priority?: DonationPriority) {
  switch (priority) {
    case "high":
      return {
        label: "High Priority",
        shortLabel: "HIGH",
        icon: "flash" as const,
        color: COLORS.danger,
        background: COLORS.softDanger,
      };

    case "medium":
      return {
        label: "Medium Priority",
        shortLabel: "MEDIUM",
        icon: "alert-circle-outline" as const,
        color: COLORS.warning,
        background: COLORS.softWarning,
      };

    case "low":
    default:
      return {
        label: "Low Priority",
        shortLabel: "LOW",
        icon: "arrow-down-circle-outline" as const,
        color: COLORS.teal,
        background: COLORS.softBlue,
      };
  }
}

/*
|--------------------------------------------------------------------------
| Date helpers
|--------------------------------------------------------------------------
*/

function formatDate(date?: string) {
  if (!date) {
    return "—";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date?: string) {
  if (!date) {
    return "";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(date?: string) {
  if (!date) {
    return "—";
  }

  const dateText = formatDate(date);
  const timeText = formatTime(date);

  return timeText ? `${dateText} • ${timeText}` : dateText;
}

/*
|--------------------------------------------------------------------------
| Expiry helpers
|--------------------------------------------------------------------------
|
| IMPORTANT:
| We use availabilityEnd as the rescue availability deadline.
| expiryTime is used only as a fallback.
|
*/

function getExpiryDate(donation: Donation) {
  const value = donation.availabilityEnd || donation.expiryTime;

  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return timestamp;
}

function getHoursUntilExpiry(donation: Donation, currentTime = Date.now()) {
  const expiry = getExpiryDate(donation);

  if (expiry === null) {
    return null;
  }

  return (expiry - currentTime) / (1000 * 60 * 60);
}

/*
|--------------------------------------------------------------------------
| Is Expiring Soon?
|--------------------------------------------------------------------------
|
| Expiring Soon is NOT a database status.
|
| It is a UI state calculated from the remaining availability time.
|
*/

function isExpiringSoon(donation: Donation, currentTime = Date.now()) {
  const hours = getHoursUntilExpiry(donation, currentTime);

  if (hours === null) {
    return false;
  }

  return hours > 0 && hours <= 24;
}

/*
|--------------------------------------------------------------------------
| Expiry information
|--------------------------------------------------------------------------
|
| LIVE COUNTDOWN:
|
| > 24h  → "2 days remaining"
| <= 24h → "Expires in 23h 45m"
| < 1h   → "Expires in 32m"
| <= 0   → "Expired"
|
*/

function getExpiryInfo(donation: Donation, currentTime = Date.now()) {
  const expiry = getExpiryDate(donation);

  if (expiry === null) {
    return {
      text: "Expiry unavailable",
      color: COLORS.muted,
      background: "#F0F2F4",
      icon: "calendar-outline" as const,
    };
  }

  const remainingMs = expiry - currentTime;

  if (remainingMs <= 0) {
    return {
      text: "Expired",
      color: COLORS.danger,
      background: COLORS.softDanger,
      icon: "alert-circle-outline" as const,
    };
  }

  const totalMinutes = Math.ceil(remainingMs / (1000 * 60));

  const totalHours = Math.floor(totalMinutes / 60);

  const minutes = totalMinutes % 60;

  /*
  |--------------------------------------------------------------------------
  | More than 24 hours
  |--------------------------------------------------------------------------
  */

  if (totalMinutes > 24 * 60) {
    const days = Math.floor(totalMinutes / (24 * 60));

    return {
      text: days === 1 ? "1 day remaining" : `${days} days remaining`,
      color: COLORS.teal,
      background: COLORS.softBlue,
      icon: "calendar-outline" as const,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | 24 hours or less
  |--------------------------------------------------------------------------
  |
  | Show exact hours + minutes.
  |
  | Example:
  | 23h 45m
  | 11h 24m
  | 5h 18m
  |
  */

  if (totalHours > 0) {
    return {
      text: `Expires in ${totalHours}h ${minutes.toString().padStart(2, "0")}m`,
      color: totalHours <= 6 ? COLORS.danger : COLORS.orange,
      background: totalHours <= 6 ? COLORS.softDanger : COLORS.softOrange,
      icon:
        totalHours <= 6
          ? ("flame-outline" as const)
          : ("time-outline" as const),
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Less than 1 hour
  |--------------------------------------------------------------------------
  */

  return {
    text: `Expires in ${totalMinutes}m`,
    color: COLORS.danger,
    background: COLORS.softDanger,
    icon: "flame-outline" as const,
  };
}

/*
|--------------------------------------------------------------------------
| Sorting
|--------------------------------------------------------------------------
*/

const PRIORITY_ORDER: Record<DonationPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function getTimestamp(value?: string) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function sortDonations(
  donations: Donation[],
  status: "all" | DonationStatus,
  currentTime = Date.now(),
) {
  const copy = [...donations];

  /*
  |--------------------------------------------------------------------------
  | Pending
  |--------------------------------------------------------------------------
  |
  | Expiring Soon pending donations appear first.
  | Then priority.
  | Then newest.
  |
  */

  if (status === "pending") {
    return copy.sort((a, b) => {
      const expiringA = isExpiringSoon(a, currentTime) ? 1 : 0;

      const expiringB = isExpiringSoon(b, currentTime) ? 1 : 0;

      if (expiringA !== expiringB) {
        return expiringB - expiringA;
      }

      const priorityA = PRIORITY_ORDER[a.priority || "low"];

      const priorityB = PRIORITY_ORDER[b.priority || "low"];

      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Active
  |--------------------------------------------------------------------------
  |
  | Expiring Soon active donations first.
  | Then priority.
  |
  */

  if (status === "active") {
    return copy.sort((a, b) => {
      const expiringA = isExpiringSoon(a, currentTime) ? 1 : 0;

      const expiringB = isExpiringSoon(b, currentTime) ? 1 : 0;

      if (expiringA !== expiringB) {
        return expiringB - expiringA;
      }

      const priorityA = PRIORITY_ORDER[a.priority || "low"];

      const priorityB = PRIORITY_ORDER[b.priority || "low"];

      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
    });
  }

  /*
  |--------------------------------------------------------------------------
  | All
  |--------------------------------------------------------------------------
  |
  | Expiring Soon donations first.
  | Then priority.
  |
  */

  if (status === "all") {
    return copy.sort((a, b) => {
      const expiringA = isExpiringSoon(a, currentTime) ? 1 : 0;

      const expiringB = isExpiringSoon(b, currentTime) ? 1 : 0;

      if (expiringA !== expiringB) {
        return expiringB - expiringA;
      }

      const priorityA = PRIORITY_ORDER[a.priority || "low"];

      const priorityB = PRIORITY_ORDER[b.priority || "low"];

      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Historical statuses
  |--------------------------------------------------------------------------
  */

  return copy.sort(
    (a, b) => getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt),
  );
}

/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

export default function MyDonationsScreen() {
  const navigation = useNavigation<any>();

  const { width } = useWindowDimensions();

  const isDesktop = width >= 1100;

  const isTablet = width >= 700 && width < 1100;

  const horizontalPadding = isDesktop ? 36 : isTablet ? 24 : 16;

  const [selectedFilter, setSelectedFilter] = useState<"all" | DonationStatus>(
    "all",
  );

  const [donations, setDonations] = useState<Donation[]>([]);

  /*
  | Unfiltered copy of the donor's posts. The hero numbers and the filter pill
  | counts describe the whole collection, so they must not shrink every time a
  | single status filter is selected.
  */
  const [summary, setSummary] = useState<Donation[]>([]);

  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  /*
  |--------------------------------------------------------------------------
  | Just published?
  |--------------------------------------------------------------------------
  |
  | The Review step replaces itself with this screen and hands over the new
  | post, so the confirmation lives where the donor can act on it instead of
  | in a dialog they have to dismiss.
  |
  | Read from navigation state rather than useRoute() so the screen still
  | renders when it is mounted outside a navigator (isolated tests).
  |
  */

  const published = useMemo<PublishedInfo | undefined>(() => {
    const state = navigation.getState?.();

    if (!state) {
      return undefined;
    }

    const active = state.routes[Math.max(state.index ?? 0, 0)];

    if (active?.name !== "MyDonations") {
      return undefined;
    }

    return (active.params as { justPublished?: PublishedInfo } | undefined)
      ?.justPublished;
  }, [navigation]);

  const [bannerVisible, setBannerVisible] = useState<boolean>(
    Boolean(published),
  );

  /* The banner is an acknowledgement, not a permanent fixture. */
  useEffect(() => {
    if (!published) {
      return;
    }

    const timer = setTimeout(() => {
      setBannerVisible(false);
    }, 14000);

    return () => clearTimeout(timer);
  }, [published]);

  /*
  |--------------------------------------------------------------------------
  | Back = donor home
  |--------------------------------------------------------------------------
  |
  | This screen can be reached from the home page or straight from publishing.
  | Either way “back” means the donor home page, never a finished wizard step.
  |
  */

  const goHome = useCallback(() => {
    const state = navigation.getState?.();

    const routes = state?.routes ?? [];

    const previous = routes.length > 1 ? routes[routes.length - 2]?.name : null;

    if (previous === "DonorHome") {
      navigation.goBack();

      return;
    }

    navigation.navigate("DonorHome");
  }, [navigation]);

  /*
  |--------------------------------------------------------------------------
  | LIVE EXPIRY CLOCK
  |--------------------------------------------------------------------------
  |
  | Update every second so the remaining minutes stay accurate.
  |
  | Example:
  |
  | 12h 37m
  | ↓
  | 12h 36m
  | ↓
  | 12h 35m
  |
  */

  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Load donations
  |--------------------------------------------------------------------------
  */

  const loadDonations = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setError(null);

        const result = await getDonations(selectedFilter);

        setDonations(result);

        if (selectedFilter === "all") {
          setSummary(result);
        } else {
          try {
            setSummary(await getDonations("all"));
          } catch (summaryError: any) {
            /* Non-blocking: the hero simply keeps its previous numbers and the
               next refresh picks them up again. */
            console.warn(
              "Failed to refresh donation summary:",
              summaryError?.message,
            );
          }
        }
      } catch (err: any) {
        console.error("Failed to load donations:", err);

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to load your donations.",
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [selectedFilter],
  );

  /*
  |--------------------------------------------------------------------------
  | Refresh whenever screen becomes active
  |--------------------------------------------------------------------------
  */

  useFocusEffect(
    useCallback(() => {
      loadDonations();
    }, [loadDonations]),
  );

  /*
  |--------------------------------------------------------------------------
  | Pull to refresh
  |--------------------------------------------------------------------------
  |
  | Same path as the normal load so the list, the summary and the error state
  | stay in step with each other.
  |
  */

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    await loadDonations(false);

    setRefreshing(false);
  }, [loadDonations]);

  /*
  |--------------------------------------------------------------------------
  | Search
  |--------------------------------------------------------------------------
  */

  const filteredDonations = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    const searched =
      query.length === 0
        ? donations
        : donations.filter((donation) => {
            const values = [
              donation.foodType,
              donation.foodName,
              donation.foodCategory,
              donation.category,
              donation.donationCode,
              donation.pickupAddress,
              donation.pickupDistrict,
            ];

            return values.some((value) =>
              String(value || "")
                .toLowerCase()
                .includes(query),
            );
          });

    return sortDonations(searched, selectedFilter, currentTime);
  }, [donations, searchText, selectedFilter, currentTime]);

  /*
  |--------------------------------------------------------------------------
  | Statistics + filter counts
  |--------------------------------------------------------------------------
  |
  | Both read from the unfiltered list, so switching a filter never makes the
  | headline numbers collapse to zero mid-view.
  |
  */

  const stats = useMemo(() => {
    const pendingDonations = summary.filter(
      (item) => item.status === "pending",
    );

    const expiringPending = pendingDonations.filter((item) =>
      isExpiringSoon(item, currentTime),
    );

    return {
      total: summary.length,

      active: summary.filter((item) => item.status === "active").length,

      pending: pendingDonations.length,

      completed: summary.filter((item) => item.status === "completed").length,

      expiringPending: expiringPending.length,
    };
  }, [summary, currentTime]);

  /* Small count badges on the filter pills. */
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: summary.length,
    };

    for (const item of summary) {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
    }

    return counts;
  }, [summary]);

  /*
  |--------------------------------------------------------------------------
  | Navigate to detail
  |--------------------------------------------------------------------------
  */

  const openDonation = (donation: Donation) => {
    navigation.navigate("DonationDetail", {
      donationId: donation.id || donation._id,
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Donation card
  |--------------------------------------------------------------------------
  */

  const renderDonationCard = ({ item }: { item: Donation }) => {
    const expiry = getExpiryInfo(item, currentTime);

    const statusConfig = getStatusConfig(item.status);

    const priorityConfig = getPriorityConfig(item.priority);

    const expiryDate = item.availabilityEnd || item.expiryTime;

    const isUrgent = item.donationType === "URGENT";

    const showPriority =
      !isUrgent &&
      (item.priority === "high" || item.priority === "medium");

    const locationLabel =
      item.pickupLocation || item.pickupAddress || item.pickupDistrict;

    const isNewPost = Boolean(
      published?.code && item.donationCode === published.code,
    );

    return (
      <Pressable
        onPress={() => openDonation(item)}
        style={({ pressed }) => [
          styles.card,
          /* Single column rows carry their own inset; the multi column grid
             gets it from the row wrapper instead. */
          !isDesktop && !isTablet && styles.cardMobile,
          pressed && styles.cardPressed,
          isNewPost && styles.cardNew,
        ]}
      >
        {/*
        | The photo carries the at-a-glance state (status, urgency, "just
        | posted"), so the text below only has to answer "what, how much,
        | until when, where".
        */}
        <View style={styles.photoFrame}>
          {item.photoUrl ? (
            <Image
              source={{
                uri: item.photoUrl,
              }}
              style={styles.foodImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.foodImageFallback}>
              <Ionicons
                name="restaurant-outline"
                size={28}
                color={COLORS.orange}
              />

              <Text style={styles.foodFallbackText}>No photo yet</Text>
            </View>
          )}

          <View style={styles.photoChips}>
            <View style={styles.photoChip}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: statusConfig.color,
                  },
                ]}
              />

              <Text style={styles.photoChipText}>{statusConfig.label}</Text>
            </View>

            {isUrgent ? (
              <View style={styles.photoChipWarn}>
                <Ionicons name="flash" size={11} color={COLORS.navyDeep} />

                <Text style={styles.photoChipWarnText}>URGENT</Text>
              </View>
            ) : null}

            {showPriority ? (
              <View style={styles.photoChipWarn}>
                <Ionicons
                  name={priorityConfig.icon}
                  size={11}
                  color={COLORS.navyDeep}
                />

                <Text style={styles.photoChipWarnText}>
                  {priorityConfig.shortLabel}
                </Text>
              </View>
            ) : null}

            {isNewPost ? (
              <View style={styles.photoChipNew}>
                <Text style={styles.photoChipNewText}>JUST POSTED</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.foodTitle} numberOfLines={1}>
            {item.foodType || item.foodName || "Food Donation"}
          </Text>

          <Text style={styles.categoryText} numberOfLines={1}>
            {`${item.foodCategory || item.category || "Food donation"}${
              locationLabel ? `  ·  ${locationLabel}` : ""
            }`}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="scale-outline" size={13} color={COLORS.teal} />

              <Text style={styles.metaPillText} numberOfLines={1}>
                {item.quantity} {item.quantityUnit || "units"}
              </Text>
            </View>

            <View style={styles.metaPill}>
              <Ionicons name="people-outline" size={13} color={COLORS.teal} />

              <Text style={styles.metaPillText} numberOfLines={1}>
                {item.numberOfPortions ?? item.portions ?? 0} portions
              </Text>
            </View>
          </View>

          {/* Live availability: the deadline and the countdown together */}
          <View
            style={[
              styles.expiryRow,
              {
                backgroundColor: expiry.background,
              },
            ]}
          >
            <View style={styles.expiryLeft}>
              <Ionicons name={expiry.icon} size={15} color={expiry.color} />

              <View style={styles.expiryDetails}>
                <Text
                  style={[
                    styles.expiryLabel,
                    {
                      color: expiry.color,
                    },
                  ]}
                >
                  Available until
                </Text>

                <Text style={styles.expiryDate} numberOfLines={1}>
                  {formatDateTime(expiryDate)}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.expiryRemaining,
                {
                  color: expiry.color,
                },
              ]}
              numberOfLines={1}
            >
              {expiry.text}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.codeLabel}>Donation code</Text>

              <Text style={styles.codeValue}>{item.donationCode || "—"}</Text>
            </View>

            <View style={styles.viewDetails}>
              <Text style={styles.viewDetailsText}>View details</Text>

              <Ionicons name="arrow-forward" size={15} color={COLORS.teal} />
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Hero
  |--------------------------------------------------------------------------
  |
  | One navy panel holds the title, the back action, the new-post action and
  | the four numbers, so the page opens with a summary instead of a strip of
  | boxes the size of the list itself.
  |
  */

  const renderHero = () => (
    <LinearGradient
      colors={[COLORS.navy, COLORS.navyDeep]}
      start={{ x: 0.05, y: 0 }}
      end={{ x: 0.95, y: 1 }}
      style={[
        styles.hero,
        {
          paddingHorizontal: horizontalPadding,
        },
      ]}
    >
      <View style={styles.heroGlow} />

      <View style={styles.heroInner}>
        <View style={styles.heroTop}>
          <Pressable
            onPress={goHome}
            style={styles.heroBack}
            accessibilityRole="button"
            accessibilityLabel="Back to home"
          >
            <Ionicons
              name="chevron-back"
              size={21}
              color={COLORS.onDark}
            />
          </Pressable>

          <View style={styles.heroHeading}>
            <Text style={styles.heroEyebrow}>DONOR · FOOD RESCUE</Text>

            <Text style={styles.heroTitle}>My Donations</Text>
          </View>

          <Pressable
            onPress={() => navigation.navigate("CreateDonation")}
            style={({ pressed }) => [
              styles.heroCreate,
              pressed && styles.heroCreatePressed,
            ]}
          >
            <Ionicons name="add" size={19} color={COLORS.navyDeep} />

            {isDesktop && (
              <Text style={styles.heroCreateText}>New Donation</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.heroSubtitle}>
          Every post you've made, where it stands and how long it has left.
        </Text>

        {/*
        | The counters answer "what is happening" in donor language, so they
        | never compete with the status words used by the pills and the cards.
        */}
        <View style={styles.heroStats}>
          <StatCard
            icon="layers-outline"
            label="Total posts"
            value={stats.total}
            tint={COLORS.onDark}
          />

          <StatCard
            icon="radio-button-on-outline"
            label="Live now"
            value={stats.active}
            tint={COLORS.mint}
          />

          <StatCard
            icon="time-outline"
            label="Awaiting match"
            value={stats.pending}
            tint={COLORS.butter}
          />

          <StatCard
            icon="checkmark-circle-outline"
            label="Rescued"
            value={stats.completed}
            tint={COLORS.sky}
          />
        </View>
      </View>
    </LinearGradient>
  );

  /*
  |--------------------------------------------------------------------------
  | Published confirmation
  |--------------------------------------------------------------------------
  |
  | Shown here instead of on the Review step, because this is where the donor
  | needs the code and the next action.
  |
  */

  const renderPublishedBanner = () => {
    if (!published || !bannerVisible) {
      return null;
    }

    return (
      <LinearGradient
        colors={["#1B8A5B", "#15704A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.publishedBanner,
          {
            marginHorizontal: horizontalPadding,
          },
        ]}
      >
        <View style={styles.publishedHalo}>
          <Ionicons name="checkmark" size={17} color={COLORS.white} />
        </View>

        <View style={styles.publishedBody}>
          <Text style={styles.publishedKicker}>LIVE NOW</Text>

          <Text style={styles.publishedTitle} numberOfLines={1}>
            {published.foodType || "Your donation is posted"}
          </Text>

          <Text style={styles.publishedText}>
            {published.code
              ? `Code ${published.code} · recipients and volunteers nearby can see it.`
              : "Recipients and volunteers nearby can see it."}
          </Text>
        </View>

        <Pressable
          onPress={() => setBannerVisible(false)}
          style={styles.publishedClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Ionicons name="close" size={16} color="rgba(255,255,255,0.86)" />
        </Pressable>
      </LinearGradient>
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Filter tabs
  |--------------------------------------------------------------------------
  */

  const renderFilters = () => (
    <View
      style={[
        styles.filterWrapper,
        {
          paddingHorizontal: horizontalPadding,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
      >
        {FILTERS.map((filter) => {
          const active = selectedFilter === filter.key;

          const count = filterCounts[filter.key] ?? 0;

          return (
            <Pressable
              key={filter.key}
              onPress={() => {
                setSelectedFilter(filter.key);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Show ${filter.label.toLowerCase()} donations`}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text
                style={[styles.filterText, active && styles.filterTextActive]}
              >
                {filter.label}
              </Text>

              {count > 0 ? (
                <Text
                  style={[
                    styles.filterCount,
                    active && styles.filterCountActive,
                  ]}
                >
                  {count}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  /*
  |--------------------------------------------------------------------------
  | Search
  |--------------------------------------------------------------------------
  */

  const renderSearch = () => (
    <View
      style={[
        styles.searchWrapper,
        {
          paddingHorizontal: horizontalPadding,
        },
      ]}
    >
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={COLORS.muted} />

        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search food, category or donation code..."
          placeholderTextColor={COLORS.muted}
          style={styles.searchInput}
          returnKeyType="search"
        />

        {searchText.length > 0 && (
          <Pressable
            onPress={() => setSearchText("")}
            style={styles.clearSearch}
          >
            <Ionicons name="close-circle" size={19} color={COLORS.muted} />
          </Pressable>
        )}
      </View>
    </View>
  );

  /*
  |--------------------------------------------------------------------------
  | Empty state
  |--------------------------------------------------------------------------
  */

  const renderEmpty = () => {
    const hasSearch = searchText.trim().length > 0;

    const isFiltered = selectedFilter !== "all";

    const filterLabel =
      FILTERS.find((filter) => filter.key === selectedFilter)?.label || "All";

    const title = hasSearch
      ? "No matches"
      : isFiltered
        ? `Nothing ${filterLabel.toLowerCase()} right now`
        : "No donations yet";

    const description = hasSearch
      ? "Try another food name, category or donation code."
      : isFiltered
        ? `None of your posts are ${filterLabel.toLowerCase()} at the moment.`
        : "Share what you've cooked and it appears here for recipients and volunteers to rescue.";

    return (
      <View
        style={[
          styles.emptyCard,
          {
            marginHorizontal: horizontalPadding,
          },
        ]}
      >
        <View style={styles.emptyIconHalo}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name={hasSearch ? "search-outline" : "restaurant-outline"}
              size={26}
              color={COLORS.orange}
            />
          </View>
        </View>

        <Text style={styles.emptyTitle}>{title}</Text>

        <Text style={styles.emptyDescription}>{description}</Text>

        {hasSearch ? (
          <Pressable
            onPress={() => setSearchText("")}
            style={styles.emptySecondary}
          >
            <Ionicons
              name="close-circle-outline"
              size={16}
              color={COLORS.secondary}
            />

            <Text style={styles.emptySecondaryText}>Clear search</Text>
          </Pressable>
        ) : isFiltered ? (
          <Pressable
            onPress={() => setSelectedFilter("all")}
            style={styles.emptySecondary}
          >
            <Ionicons name="layers-outline" size={16} color={COLORS.secondary} />

            <Text style={styles.emptySecondaryText}>Show all donations</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => navigation.navigate("CreateDonation")}
            style={styles.emptyButton}
          >
            <Ionicons name="add" size={18} color={COLORS.navyDeep} />

            <Text style={styles.emptyButtonText}>Create Donation</Text>
          </Pressable>
        )}
      </View>
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Error state
  |--------------------------------------------------------------------------
  */

  const renderError = () => (
    <View
      style={[
        styles.errorCard,
        {
          marginHorizontal: horizontalPadding,
        },
      ]}
    >
      <View style={styles.errorIcon}>
        <Ionicons
          name="cloud-offline-outline"
          size={25}
          color={COLORS.danger}
        />
      </View>

      <View style={styles.errorContent}>
        <Text style={styles.errorTitle}>Couldn't load donations</Text>

        <Text style={styles.errorText}>{error}</Text>
      </View>

      <Pressable onPress={() => loadDonations()} style={styles.retryButton}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </Pressable>
    </View>
  );

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading && donations.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

        {renderHero()}

        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons
              name="restaurant-outline"
              size={28}
              color={COLORS.orange}
            />
          </View>

          <ActivityIndicator
            size="small"
            color={COLORS.orange}
            style={styles.loadingSpinner}
          />

          <Text style={styles.loadingTitle}>Loading your donations</Text>

          <Text style={styles.loadingText}>Please wait a moment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Main
  |--------------------------------------------------------------------------
  */

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

      <FlatList
        style={styles.list}
        key={isDesktop ? "desktop" : isTablet ? "tablet" : "mobile"}
        data={filteredDonations}
        renderItem={renderDonationCard}
        extraData={currentTime}
        keyExtractor={(item, index) =>
          String(
            item.id || item._id || item.donationCode || `donation-${index}`,
          )
        }
        numColumns={isDesktop ? 3 : isTablet ? 2 : 1}
        columnWrapperStyle={
          isDesktop || isTablet ? styles.columnWrapper : undefined
        }
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: 34,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.navy}
            colors={[COLORS.orange, COLORS.navy]}
          />
        }
        ListHeaderComponent={
          <View>
            {renderHero()}

            {renderPublishedBanner()}

            {renderFilters()}
            {renderSearch()}

            {error && renderError()}

            <View
              style={[
                styles.resultsHeader,
                {
                  paddingHorizontal: horizontalPadding,
                },
              ]}
            >
              <View>
                <Text style={styles.resultsTitle}>
                  {selectedFilter === "all"
                    ? "All donations"
                    : `${
                        FILTERS.find((filter) => filter.key === selectedFilter)
                          ?.label || "Donations"
                      } donations`}
                </Text>

                <Text style={styles.resultsSubtitle}>
                  {filteredDonations.length}{" "}
                  {filteredDonations.length === 1 ? "donation" : "donations"}
                </Text>
              </View>

              {(selectedFilter === "all" ||
                selectedFilter === "pending" ||
                selectedFilter === "active") && (
                <View style={styles.sortHint}>
                  <Ionicons
                    name="flash-outline"
                    size={15}
                    color={COLORS.orange}
                  />

                  <Text style={styles.sortHintText}>
                    Expiring & priority first
                  </Text>
                </View>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={renderEmpty()}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

/*
|--------------------------------------------------------------------------
| Stat Card
|--------------------------------------------------------------------------
*/

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={17} color={tint} />
      </View>

      <View style={styles.statTextContainer}>
        <Text style={styles.statValue}>{value}</Text>

        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| Styles
|--------------------------------------------------------------------------
*/

const baseStyles: Record<string, any> = {
  /*
  | The navy hero paints behind the status bar area, so the top safe-area
  | edge and the StatusBar colour read as one surface.
  */
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },

  list: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /*
  |--------------------------------------------------------------------------
  | Hero
  |--------------------------------------------------------------------------
  */

  hero: {
    position: "relative",
    width: "100%",
    paddingTop: 12,
    paddingBottom: 26,
    overflow: "hidden",
  },

  heroGlow: {
    position: "absolute",
    top: -78,
    right: -56,
    width: 232,
    height: 232,
    borderRadius: 116,
    backgroundColor: "rgba(18,103,130,0.55)",
  },

  heroInner: {
    width: "100%",
    maxWidth: 1380,
    alignSelf: "center",
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  heroBack: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,

    ...Platform.select({
      web: {
        cursor: "pointer",
      },
    }),
  },

  heroHeading: {
    flex: 1,
    minWidth: 0,
  },

  heroEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: COLORS.butter,
  },

  heroTitle: {
    marginTop: 2,
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: -0.6,
  },

  heroCreate: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: COLORS.orange,

    ...ELEV_GLOW,

    ...Platform.select({
      web: {
        cursor: "pointer",
      },
    }),
  },

  heroCreatePressed: {
    opacity: 0.9,
    transform: [
      {
        scale: 0.97,
      },
    ],
  },

  heroCreateText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.navyDeep,
  },

  heroSubtitle: {
    marginTop: 10,
    maxWidth: 520,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.onDarkFaint,
  },

  heroStats: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  /*
  |--------------------------------------------------------------------------
  | Hero statistics
  |--------------------------------------------------------------------------
  |
  | Frosted panels rather than solid tiles, so the numbers read as part of the
  | hero instead of a second card grid stacked under it.
  |
  */

  statCard: {
    flexGrow: 1,
    flexBasis: 150,
    minWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },

  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  statTextContainer: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },

  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.white,
  },

  statLabel: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.onDarkFaint,
  },

  /*
  |--------------------------------------------------------------------------
  | Published confirmation
  |--------------------------------------------------------------------------
  */

  publishedBanner: {
    marginTop: 16,
    marginHorizontal: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,

    ...ELEV_SOFT,
  },

  publishedHalo: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.20)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
  },

  publishedBody: {
    flex: 1,
    minWidth: 0,
  },

  publishedKicker: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.82)",
  },

  publishedTitle: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.white,
  },

  publishedText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(255,255,255,0.86)",
  },

  publishedClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  /*
  |--------------------------------------------------------------------------
  | Filters
  |--------------------------------------------------------------------------
  */

  filterWrapper: {
    width: "100%",
    maxWidth: 1380,
    alignSelf: "center",
    marginTop: 16,
  },

  filterScrollContent: {
    gap: 8,
    paddingHorizontal: 2,
    paddingBottom: 2,
  },

  filterChip: {
    minHeight: 38,
    paddingHorizontal: 15,
    borderRadius: 19,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,

    ...Platform.select({
      web: {
        cursor: "pointer",
      },
    }),
  },

  filterChipActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,

    ...ELEV_SOFT,
  },

  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.secondary,
  },

  filterTextActive: {
    color: COLORS.white,
    fontWeight: "700",
  },

  /* Live counts on the pills, so a donor can see where the posts are. */

  filterCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.softBlue,
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.teal,
    textAlign: "center",
  },

  filterCountActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
    color: COLORS.white,
  },

  /*
  |--------------------------------------------------------------------------
  | Search
  |--------------------------------------------------------------------------
  */

  searchWrapper: {
    width: "100%",
    maxWidth: 1380,
    alignSelf: "center",
    marginTop: 12,
  },

  searchBox: {
    height: 50,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 9,
  },

  searchInput: {
    flex: 1,
    height: "100%",
    marginLeft: 0,
    color: COLORS.text,
    fontSize: 14,
    outlineStyle: "none" as any,
  } as any,

  clearSearch: {
    padding: 5,
  },

  /*
  |--------------------------------------------------------------------------
  | Results header
  |--------------------------------------------------------------------------
  */

  resultsHeader: {
    width: "100%",
    maxWidth: 1380,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 12,
  },

  resultsTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.navyDeep,
    letterSpacing: -0.3,
  },

  resultsSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "600",
  },

  sortHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: COLORS.softOrange,
  },

  sortHintText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.orange,
  },

  /*
  |--------------------------------------------------------------------------
  | List
  |--------------------------------------------------------------------------
  */

  listContent: {
    width: "100%",
    alignSelf: "center",
  },

  columnWrapper: {
    width: "100%",
    maxWidth: 1380,
    alignSelf: "center",
    paddingHorizontal: 16,
    gap: 16,
  },

  /*
  |--------------------------------------------------------------------------
  | Card
  |--------------------------------------------------------------------------
  */

  card: {
    flex: 1,
    minWidth: 0,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    overflow: "hidden",

    ...ELEV_SOFT,

    ...Platform.select({
      web: {
        cursor: "pointer",
      },
    }),
  },

  cardPressed: {
    opacity: 0.94,
    transform: [
      {
        scale: 0.995,
      },
    ],
  },

  cardMobile: {
    marginLeft: 16,
    marginRight: 16,
  },

  /* The post the donor just published is ringed in brand orange. */

  cardNew: {
    borderColor: COLORS.orange,
    borderWidth: 1.5,

    ...ELEV_GLOW,
  },

  /*
  |--------------------------------------------------------------------------
  | Photo + overlay state chips
  |--------------------------------------------------------------------------
  */

  photoFrame: {
    position: "relative",
    width: "100%",
    height: 190,
    backgroundColor: COLORS.softOrange,
  },

  foodImage: {
    width: "100%",
    height: 190,
  },

  foodImageFallback: {
    width: "100%",
    height: 190,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.softOrange,
  },

  foodFallbackText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.orange,
  },

  photoChips: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },

  photoChip: {
    minHeight: 25,
    paddingHorizontal: 9,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.chipScrim,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },

  photoChipText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
    color: COLORS.white,
  },

  photoChipWarn: {
    minHeight: 25,
    paddingHorizontal: 9,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.butter,
  },

  photoChipWarnText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: COLORS.navyDeep,
  },

  photoChipNew: {
    minHeight: 25,
    paddingHorizontal: 9,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.orange,
  },

  photoChipNewText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: COLORS.navyDeep,
  },

  /*
  |--------------------------------------------------------------------------
  | Card body
  |--------------------------------------------------------------------------
  */

  cardContent: {
    padding: 16,
  },

  foodTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.navyDeep,
    letterSpacing: -0.3,
  },

  categoryText: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.muted,
  },

  metaRow: {
    marginTop: 11,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  metaPill: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },

  metaPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },

  /*
  |--------------------------------------------------------------------------
  | Expiry
  |--------------------------------------------------------------------------
  */

  expiryRow: {
    marginTop: 13,
    minHeight: 54,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  expiryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },

  expiryDetails: {
    flex: 1,
    minWidth: 0,
    marginLeft: 8,
  },

  expiryLabel: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  expiryDate: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },

  expiryRemaining: {
    maxWidth: "45%",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
  },

  /*
  |--------------------------------------------------------------------------
  | Footer
  |--------------------------------------------------------------------------
  */

  cardFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  codeLabel: {
    fontSize: 9,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "700",
  },

  codeValue: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.navyDeep,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  viewDetails: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.softBlue,
  },

  viewDetailsText: {
    fontSize: 12,
    color: COLORS.teal,
    fontWeight: "800",
  },

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingTop: 44,
  },

  loadingIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: COLORS.softOrange,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingSpinner: {
    marginTop: 18,
  },

  loadingTitle: {
    marginTop: 13,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.navyDeep,
  },

  loadingText: {
    marginTop: 5,
    fontSize: 13,
    color: COLORS.muted,
  },

  /*
  |--------------------------------------------------------------------------
  | Empty
  |--------------------------------------------------------------------------
  */

  emptyCard: {
    width: "auto",
    maxWidth: 600,
    alignSelf: "center",
    marginTop: 12,
    paddingHorizontal: 25,
    paddingVertical: 40,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    alignItems: "center",

    ...ELEV_SOFT,
  },

  /* A soft ring behind the icon gives the empty page a focal point. */

  emptyIconHalo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.softOrange,
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.navyDeep,
    textAlign: "center",
  },

  emptyDescription: {
    maxWidth: 430,
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.secondary,
    textAlign: "center",
  },

  emptyButton: {
    marginTop: 20,
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: 23,
    backgroundColor: COLORS.orange,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,

    ...ELEV_GLOW,

    ...Platform.select({
      web: {
        cursor: "pointer",
      },
    }),
  },

  emptyButtonText: {
    color: COLORS.navyDeep,
    fontSize: 13.5,
    fontWeight: "800",
  },

  /* Secondary action for "clear search" / "show all donations". */

  emptySecondary: {
    marginTop: 20,
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,

    ...Platform.select({
      web: {
        cursor: "pointer",
      },
    }),
  },

  emptySecondaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.secondary,
  },

  /*
  |--------------------------------------------------------------------------
  | Error
  |--------------------------------------------------------------------------
  */

  errorCard: {
    width: "auto",
    maxWidth: 1380,
    alignSelf: "center",
    marginTop: 16,
    padding: 13,
    borderRadius: 16,
    backgroundColor: COLORS.softDanger,
    borderWidth: 1,
    borderColor: "#F3C7C7",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  errorIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },

  errorContent: {
    flex: 1,
    marginLeft: 11,
  },

  errorTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.danger,
  },

  errorText: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.secondary,
  },

  retryButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: COLORS.white,

    ...Platform.select({
      web: {
        cursor: "pointer",
      },
    }),
  },

  retryButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.danger,
  },
};

/*
|--------------------------------------------------------------------------
| Premium typography
|--------------------------------------------------------------------------
|
| Every rule that carries a size gets the matching Poppins cut, so the list
| shares the donor journey's typeface without touching the markup.
|
*/

function applyPremiumTypography(defs: Record<string, any>): Record<string, any> {
  const enriched: Record<string, any> = {};

  for (const key of Object.keys(defs)) {
    const value = defs[key];

    const needsFont =
      value &&
      typeof value === "object" &&
      value.fontSize !== undefined &&
      (value.fontFamily === undefined || value.fontFamily === "System");

    enriched[key] = needsFont
      ? {
          ...value,
          fontFamily:
            FONT_BY_WEIGHT[String(value.fontWeight)] ?? "Poppins_400Regular",
        }
      : value;
  }

  return enriched;
}

const styles = StyleSheet.create(applyPremiumTypography(baseStyles) as any);
