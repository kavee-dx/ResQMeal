import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Platform,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

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

  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

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
  */

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      const result = await getDonations(selectedFilter);

      setDonations(result);
    } catch (err: any) {
      console.error("Refresh donations error:", err);

      setError(err?.response?.data?.message || "Unable to refresh donations.");
    } finally {
      setRefreshing(false);
    }
  }, [selectedFilter]);

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
  | Statistics
  |--------------------------------------------------------------------------
  */

  const stats = useMemo(() => {
    const pendingDonations = donations.filter(
      (item) => item.status === "pending",
    );

    const expiringPending = pendingDonations.filter((item) =>
      isExpiringSoon(item, currentTime),
    );

    return {
      total: donations.length,

      active: donations.filter((item) => item.status === "active").length,

      pending: pendingDonations.length,

      completed: donations.filter((item) => item.status === "completed").length,

      expiringPending: expiringPending.length,
    };
  }, [donations, currentTime]);

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
  | Render status badge
  |--------------------------------------------------------------------------
  */

  const renderStatusBadge = (status: DonationStatus) => {
    const config = getStatusConfig(status);

    return (
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor: config.background,
          },
        ]}
      >
        <Ionicons name={config.icon} size={14} color={config.color} />

        <Text
          style={[
            styles.statusBadgeText,
            {
              color: config.color,
            },
          ]}
        >
          {config.label}
        </Text>
      </View>
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Render Expiring Soon badge
  |--------------------------------------------------------------------------
  */

  const renderExpiringBadge = (donation: Donation) => {
    if (!isExpiringSoon(donation, currentTime)) {
      return null;
    }

    /*
    | Only show the warning for active
    | lifecycle states.
    |
    | Expired donations are handled by
    | their actual expired status.
    */

    if (donation.status !== "pending" && donation.status !== "active") {
      return null;
    }

    return (
      <View style={styles.expiringBadge}>
        <Ionicons name="time-outline" size={13} color={COLORS.orange} />

        <Text style={styles.expiringBadgeText}>EXPIRING SOON</Text>
      </View>
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Render priority badge
  |--------------------------------------------------------------------------
  */

  const renderPriorityBadge = (priority?: DonationPriority) => {
    const config = getPriorityConfig(priority);

    return (
      <View
        style={[
          styles.priorityBadge,
          {
            backgroundColor: config.background,
          },
        ]}
      >
        <Ionicons name={config.icon} size={13} color={config.color} />

        <Text
          style={[
            styles.priorityBadgeText,
            {
              color: config.color,
            },
          ]}
        >
          {config.label}
        </Text>
      </View>
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Donation card
  |--------------------------------------------------------------------------
  */

  const renderDonationCard = ({ item }: { item: Donation }) => {
    const expiry = getExpiryInfo(item, currentTime);

    const statusConfig = getStatusConfig(item.status);

    const expiring = isExpiringSoon(item, currentTime);

    const expiryDate = item.availabilityEnd || item.expiryTime;

    return (
      <Pressable
        onPress={() => openDonation(item)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        {/* Top accent */}
        <View
          style={[
            styles.cardAccent,
            {
              backgroundColor: expiring ? COLORS.orange : statusConfig.color,
            },
          ]}
        />

        {/* Food image */}
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
              size={42}
              color={COLORS.orange}
            />
          </View>
        )}

        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.titleContainer}>
                <Text style={styles.foodTitle} numberOfLines={1}>
                  {item.foodType || item.foodName || "Food Donation"}
                </Text>

                <Text style={styles.categoryText} numberOfLines={1}>
                  {item.foodCategory || item.category || "Food donation"}
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
          </View>

          {/* Badges */}
          <View style={styles.badgeRow}>
            {renderStatusBadge(item.status)}

            {renderExpiringBadge(item)}

            {renderPriorityBadge(item.priority)}

            {item.donationType === "URGENT" && (
              <View style={styles.urgentBadge}>
                <Ionicons name="flash" size={13} color={COLORS.white} />

                <Text style={styles.urgentBadgeText}>URGENT</Text>
              </View>
            )}
          </View>

          {/* Expiring notice */}
          {expiring &&
            (item.status === "pending" || item.status === "active") && (
              <View style={styles.expiringNotice}>
                <View style={styles.expiringNoticeIcon}>
                  <Ionicons
                    name="notifications-outline"
                    size={16}
                    color={COLORS.orange}
                  />
                </View>

                <View style={styles.expiringNoticeContent}>
                  <Text style={styles.expiringNoticeTitle}>
                    Donation is expiring soon
                  </Text>

                  <Text style={styles.expiringNoticeText}>
                    {item.status === "pending"
                      ? "Recipient matching should be completed before the availability period ends."
                      : "Rescue should be completed before the availability period ends."}
                  </Text>
                </View>
              </View>
            )}

          {/* Main information */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <View style={styles.infoIconBox}>
                <Ionicons name="scale-outline" size={17} color={COLORS.teal} />
              </View>

              <View>
                <Text style={styles.infoLabel}>Quantity</Text>

                <Text style={styles.infoValue} numberOfLines={1}>
                  {item.quantity} {item.quantityUnit || "units"}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoIconBox}>
                <Ionicons name="people-outline" size={17} color={COLORS.teal} />
              </View>

              <View>
                <Text style={styles.infoLabel}>Portions</Text>

                <Text style={styles.infoValue}>
                  {item.numberOfPortions ?? item.portions ?? 0}
                </Text>
              </View>
            </View>
          </View>

          {/* Availability / expiry */}
          <View
            style={[
              styles.expiryRow,
              {
                backgroundColor: expiry.background,
              },
            ]}
          >
            <View style={styles.expiryLeft}>
              <Ionicons name={expiry.icon} size={17} color={expiry.color} />

              <View style={styles.expiryDetails}>
                <Text
                  style={[
                    styles.expiryLabel,
                    {
                      color: expiry.color,
                    },
                  ]}
                >
                  Available Until
                </Text>

                <Text style={styles.expiryDate}>
                  {formatDateTime(expiryDate)}
                </Text>
              </View>
            </View>

            <View style={styles.expiryRight}>
              {expiring && (
                <Text style={styles.expiringSmallLabel}>EXPIRING</Text>
              )}

              <Text
                style={[
                  styles.expiryRemaining,
                  {
                    color: expiry.color,
                  },
                ]}
              >
                {expiry.text}
              </Text>
            </View>
          </View>

          {/* Pickup */}
          {(item.pickupLocation ||
            item.pickupAddress ||
            item.pickupDistrict) && (
            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={17}
                color={COLORS.muted}
              />

              <Text style={styles.locationText} numberOfLines={1}>
                {item.pickupLocation ||
                  item.pickupAddress ||
                  item.pickupDistrict}
              </Text>
            </View>
          )}

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.codeLabel}>Donation Code</Text>

              <Text style={styles.codeValue}>{item.donationCode || "—"}</Text>
            </View>

            <View style={styles.viewDetails}>
              <Text style={styles.viewDetailsText}>View details</Text>

              <Ionicons name="arrow-forward" size={16} color={COLORS.navy} />
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Header
  |--------------------------------------------------------------------------
  */

  const renderHeader = () => (
    <View
      style={[
        styles.headerWrapper,
        {
          paddingHorizontal: horizontalPadding,
        },
      ]}
    >
      <View style={styles.headerInner}>
        <View>
          <View style={styles.titleRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
            </Pressable>

            <Text style={styles.pageTitle}>My Donations</Text>
          </View>

          <Text style={styles.pageSubtitle}>
            Manage and track the food you've shared.
          </Text>
        </View>

        <Pressable
          onPress={() => navigation.navigate("CreateDonation")}
          style={({ pressed }) => [
            styles.createButton,
            pressed && styles.createButtonPressed,
          ]}
        >
          <Ionicons name="add" size={20} color={COLORS.white} />

          {isDesktop && (
            <Text style={styles.createButtonText}>New Donation</Text>
          )}
        </Pressable>
      </View>
    </View>
  );

  /*
  |--------------------------------------------------------------------------
  | Statistics
  |--------------------------------------------------------------------------
  */

  const renderStats = () => (
    <View
      style={[
        styles.statsGrid,
        {
          paddingHorizontal: horizontalPadding,
        },
      ]}
    >
      <StatCard
        icon="layers-outline"
        label="Total"
        value={stats.total}
        color={COLORS.navy}
        background={COLORS.softBlue}
      />

      <StatCard
        icon="radio-button-on-outline"
        label="Active"
        value={stats.active}
        color={COLORS.success}
        background={COLORS.softSuccess}
      />

      <StatCard
        icon="time-outline"
        label="Pending"
        value={stats.pending}
        color={COLORS.warning}
        background={COLORS.softWarning}
      />

      <StatCard
        icon="checkmark-circle-outline"
        label="Completed"
        value={stats.completed}
        color={COLORS.teal}
        background={COLORS.softBlue}
      />
    </View>
  );

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

          return (
            <Pressable
              key={filter.key}
              onPress={() => {
                setSelectedFilter(filter.key);
              }}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text
                style={[styles.filterText, active && styles.filterTextActive]}
              >
                {filter.label}
              </Text>
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

    const filterLabel =
      FILTERS.find((filter) => filter.key === selectedFilter)?.label || "All";

    return (
      <View
        style={[
          styles.emptyCard,
          {
            marginHorizontal: horizontalPadding,
          },
        ]}
      >
        <View style={styles.emptyIcon}>
          <Ionicons
            name={hasSearch ? "search-outline" : "restaurant-outline"}
            size={32}
            color={COLORS.orange}
          />
        </View>

        <Text style={styles.emptyTitle}>
          {hasSearch
            ? "No donations found"
            : selectedFilter === "all"
              ? "No donations yet"
              : `No ${filterLabel.toLowerCase()} donations`}
        </Text>

        <Text style={styles.emptyDescription}>
          {hasSearch
            ? "Try a different food name, category, or donation code."
            : selectedFilter === "all"
              ? "Your posted food donations will appear here."
              : `There are currently no donations in the ${filterLabel.toLowerCase()} category.`}
        </Text>

        {!hasSearch && selectedFilter === "all" && (
          <Pressable
            onPress={() => navigation.navigate("CreateDonation")}
            style={styles.emptyButton}
          >
            <Ionicons name="add" size={18} color={COLORS.white} />

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
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.background}
        />

        {renderHeader()}

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
            color={COLORS.navy}
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <FlatList
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
            paddingBottom: 40,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.navy}
          />
        }
        ListHeaderComponent={
          <View>
            {renderHeader()}
            {renderStats()}
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
                  {FILTERS.find((filter) => filter.key === selectedFilter)
                    ?.label || "Donations"}
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
  color,
  background,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
  background: string;
}) {
  return (
    <View style={styles.statCard}>
      <View
        style={[
          styles.statIcon,
          {
            backgroundColor: background,
          },
        ]}
      >
        <Ionicons name={icon} size={21} color={color} />
      </View>

      <View style={styles.statTextContainer}>
        <Text style={styles.statValue}>{value}</Text>

        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| Styles
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /*
  |--------------------------------------------------------------------------
  | Header
  |--------------------------------------------------------------------------
  */

  headerWrapper: {
    width: "100%",
    paddingTop: 18,
    paddingBottom: 8,
  },

  headerInner: {
    width: "100%",
    maxWidth: 1380,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 12,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.navyDeep,
    letterSpacing: -0.5,
  },

  pageSubtitle: {
    marginTop: 7,
    marginLeft: 52,
    color: COLORS.secondary,
    fontSize: 14,
    lineHeight: 20,
  },

  createButton: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 13,
    backgroundColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,

    ...Platform.select({
      web: {
        cursor: "pointer",
      },
    }),
  },

  createButtonPressed: {
    opacity: 0.85,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  createButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
  },

  /*
  |--------------------------------------------------------------------------
  | Statistics
  |--------------------------------------------------------------------------
  */

  statsGrid: {
    width: "100%",
    maxWidth: 1380,
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 18,
  },

  statCard: {
    flexGrow: 1,
    flexBasis: 180,
    minHeight: 82,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  statIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  statTextContainer: {
    marginLeft: 12,
  },

  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.navyDeep,
  },

  statLabel: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "600",
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
    marginTop: 22,
  },

  filterScrollContent: {
    gap: 8,
    paddingBottom: 2,
  },

  filterChip: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  filterChipActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },

  filterText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.secondary,
  },

  filterTextActive: {
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
    marginTop: 14,
  },

  searchBox: {
    height: 48,
    backgroundColor: COLORS.white,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  searchInput: {
    flex: 1,
    height: "100%",
    marginLeft: 9,
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
    marginTop: 24,
    marginBottom: 13,
  },

  resultsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.navyDeep,
  },

  resultsSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.muted,
  },

  sortHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",

    ...Platform.select({
      web: {
        cursor: "pointer",
      },
    }),
  },

  cardPressed: {
    opacity: 0.92,
    transform: [
      {
        scale: 0.995,
      },
    ],
  },

  cardAccent: {
    height: 4,
    width: "100%",
  },

  foodImage: {
    width: "100%",
    height: 250,
    backgroundColor: COLORS.softOrange,
  },

  foodImageFallback: {
    width: "100%",
    height: 250,
    backgroundColor: COLORS.softOrange,
    alignItems: "center",
    justifyContent: "center",
  },

  cardContent: {
    padding: 17,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardHeaderLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },

  titleContainer: {
    flex: 1,
    minWidth: 0,
    marginLeft: 0,
  },

  foodTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.navyDeep,
  },

  categoryText: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.muted,
  },

  /*
  |--------------------------------------------------------------------------
  | Badges
  |--------------------------------------------------------------------------
  */

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 13,
  },

  statusBadge: {
    minHeight: 27,
    paddingHorizontal: 9,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },

  /*
  |--------------------------------------------------------------------------
  | Expiring badge
  |--------------------------------------------------------------------------
  */

  expiringBadge: {
    minHeight: 27,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: COLORS.softOrange,
    borderWidth: 1,
    borderColor: "#FFD7AD",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  expiringBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.orange,
  },

  priorityBadge: {
    minHeight: 27,
    paddingHorizontal: 9,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  priorityBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },

  urgentBadge: {
    minHeight: 27,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: COLORS.orange,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  urgentBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "800",
  },

  /*
  |--------------------------------------------------------------------------
  | Expiring notice
  |--------------------------------------------------------------------------
  */

  expiringNotice: {
    marginTop: 14,
    padding: 11,
    borderRadius: 12,
    backgroundColor: "#FFF8ED",
    borderWidth: 1,
    borderColor: "#FFE0B8",
    flexDirection: "row",
    alignItems: "center",
  },

  expiringNoticeIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.softOrange,
    alignItems: "center",
    justifyContent: "center",
  },

  expiringNoticeContent: {
    flex: 1,
    marginLeft: 9,
  },

  expiringNoticeTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.orange,
  },

  expiringNoticeText: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.secondary,
  },

  /*
  |--------------------------------------------------------------------------
  | Information
  |--------------------------------------------------------------------------
  */

  infoGrid: {
    flexDirection: "row",
    marginTop: 17,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 20,
  },

  infoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  infoIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  infoLabel: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "600",
  },

  infoValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  /*
  |--------------------------------------------------------------------------
  | Expiry
  |--------------------------------------------------------------------------
  */

  expiryRow: {
    marginTop: 14,
    minHeight: 55,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  },

  expiryLabel: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginLeft: 8,
  },

  expiryDate: {
    marginLeft: 8,
    marginTop: 2,
    fontSize: 11,
    color: COLORS.text,
    fontWeight: "600",
  },

  expiryRight: {
    alignItems: "flex-end",
    marginLeft: 8,
  },

  expiringSmallLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: COLORS.orange,
    marginBottom: 2,
  },

  expiryRemaining: {
    fontSize: 11,
    fontWeight: "800",
  },

  /*
  |--------------------------------------------------------------------------
  | Location
  |--------------------------------------------------------------------------
  */

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
    paddingHorizontal: 2,
  },

  locationText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 11,
    color: COLORS.secondary,
  },

  /*
  |--------------------------------------------------------------------------
  | Footer
  |--------------------------------------------------------------------------
  */

  cardFooter: {
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  codeLabel: {
    fontSize: 9,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "700",
  },

  codeValue: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.text,
    fontWeight: "800",
  },

  viewDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  viewDetailsText: {
    fontSize: 11,
    color: COLORS.navy,
    fontWeight: "800",
  },

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
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
    paddingVertical: 38,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: COLORS.softOrange,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 17,
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
    marginTop: 19,
    minHeight: 44,
    paddingHorizontal: 17,
    borderRadius: 12,
    backgroundColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  emptyButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "800",
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
    marginTop: 15,
    padding: 13,
    borderRadius: 14,
    backgroundColor: COLORS.softDanger,
    borderWidth: 1,
    borderColor: "#F3C7C7",
    flexDirection: "row",
    alignItems: "center",
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
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: COLORS.white,
  },

  retryButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.danger,
  },
});
