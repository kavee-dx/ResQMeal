import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";

import {
  cancelDonation,
  deleteDonation,
  getDonationById,
} from "../services/kaveesha-donationApi";

import { colors } from "../styles/kaveesha-theme";
import { LinearGradient } from "expo-linear-gradient";

import RecipientAskPanel from "../components/dushani-recipientAskPanel";
import {
  acceptFoodRequest,
  type DonationAsk,
} from "../services/dushani-foodRequestApi";

/* =========================================================
   PREMIUM DESIGN TOKENS
   Surface, elevation and type scale shared by every block on
   this page. Text styles only declare a size and a weight:
   applyPremiumTypography() resolves the matching font below.
========================================================= */

const C = {
  navy: "#023047",
  navyDeep: "#011C2E",
  orange: "#FB8500",

  background: "#F6F8FA",
  white: "#FFFFFF",

  text: "#023047",
  secondary: "#4D6470",
  muted: "#8A9AA3",

  border: "#D7E3E7",
  hairline: "#EDF3F6",
  softBlue: "#EDF4F7",

  success: "#2FA35B",
  successSoft: "#EAF7EE",
  successBorder: "#CFEBDA",

  warning: "#D99100",
  warningSoft: "#FFF7DD",
  warningBorder: "#F5E3AE",

  danger: "#DC4C4C",
  dangerSoft: "#FBEBEB",
  dangerBorder: "#F3CCCC",

  onDark: "#DCEAF1",
  onDarkFaint: "#9DB6C4",

  glass: "rgba(255,255,255,0.10)",
  glassBorder: "rgba(255,255,255,0.20)",
} as const;

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
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 9 },
  elevation: 5,
};

const ELEV_SOFT = {
  shadowColor: "#023047",
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};

type Donation = {
  _id?: string;
  id?: string;

  foodType?: string;
  foodCategory?: string;

  quantity?: number;
  quantityUnit?: string;

  numberOfPortions?: number;

  preparationTime?: string;
  expiryTime?: string;

  availabilityStart?: string;
  availabilityEnd?: string;

  storageCondition?: string;
  allergenInfo?: string;
  packagingCondition?: string;
  additionalDetails?: string;

  photoUrl?: string;

  pickupAddress?: string;
  pickupDistrict?: string;
  pickupWindowStart?: string;
  pickupWindowEnd?: string;

  aiResult?: "PENDING" | "GOOD" | "REVIEW" | "CONCERN" | string;
  aiReason?: string;

  priority?: "low" | "medium" | "high" | string;
  donationType?: "NORMAL" | "URGENT" | string;
  status?: string;

  donationCode?: string;

  createdAt?: string;
  updatedAt?: string;

  safety?: {
    storage?: string;
    temperature?: string;
    handling?: string;
    packaging?: string;
    allergens?: string;
  };
};

type RouteParams = {
  donationId?: string;
  id?: string;
};

type DialogState = {
  visible: boolean;
  type: "confirm" | "success" | "error";
  action?: "cancel" | "delete";
  title: string;
  message: string;
};

/* =========================================================
   STATUS HELPERS
========================================================= */

function getStatusLabel(status?: string) {
  switch (status) {
    case "pending":
      return "Pending";

    case "active":
      return "Active";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    case "expired":
      return "Expired";

    default:
      return "Pending";
  }
}

function getStatusIcon(
  status?: string,
): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case "active":
      return "radio-button-on-outline";

    case "completed":
      return "checkmark-circle-outline";

    case "cancelled":
      return "close-circle-outline";

    case "expired":
      return "calendar-outline";

    default:
      return "time-outline";
  }
}

function getStatusColor(status?: string) {
  switch (status) {
    case "active":
      return colors.success;

    case "completed":
      return colors.info;

    case "cancelled":
      return colors.textMuted;

    case "expired":
      return colors.urgent;

    default:
      return colors.accent;
  }
}

function getStatusBackground(status?: string) {
  switch (status) {
    case "active":
      return "#EAF8F1";

    case "completed":
      return "#EAF5F8";

    case "cancelled":
      return "#F1F3F5";

    case "expired":
      return "#FDECEC";

    default:
      return "#FFF8E1";
  }
}

/* =========================================================
   EXPIRY COUNTDOWN
========================================================= */

function getExpiryDate(donation: Donation) {
  /*
   * Keep the same priority as My Donations:
   * availabilityEnd -> expiryTime
   */
  const value =
    donation.availabilityEnd || donation.expiryTime;

  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return timestamp;
}

function getExpiryCountdown(
  donation: Donation,
  currentTime = Date.now(),
) {
  const expiry = getExpiryDate(donation);

  if (expiry === null) {
    return {
      text: "Expiry unavailable",
      subtext: "No expiry time has been provided.",
      color: colors.textMuted,
      background: "#F1F3F5",
      icon: "calendar-outline" as const,
      expiringSoon: false,
      expired: false,
    };
  }

  /*
   * Calculate remaining time in minutes.
   *
   * Math.ceil prevents:
   * 31m 20s -> 31m
   * 31m 01s -> 32m
   *
   * This means the displayed value does not prematurely
   * show a lower minute while time is still remaining.
   */
  const totalMinutes = Math.max(
    0,
    Math.ceil(
      (expiry - currentTime) /
        (1000 * 60),
    ),
  );

  /* Already expired */
  if (totalMinutes <= 0) {
    return {
      text: "Expired",
      subtext:
        "This donation has passed its expiry time.",
      color: colors.urgent,
      background: "#FDECEC",
      icon: "alert-circle-outline" as const,
      expiringSoon: false,
      expired: true,
    };
  }

  /* More than 24 hours remaining */
  if (totalMinutes > 24 * 60) {
    const days = Math.floor(
      totalMinutes / (24 * 60),
    );

    return {
      text: `${days} ${
        days === 1 ? "day" : "days"
      } remaining`,
      subtext:
        "There is still time to rescue this donation.",
      color: colors.success,
      background: "#EAF8F1",
      icon: "calendar-outline" as const,
      expiringSoon: false,
      expired: false,
    };
  }

  const hours = Math.floor(
    totalMinutes / 60,
  );

  const minutes = totalMinutes % 60;

  /* Under 24 hours */
  if (hours > 0) {
    const danger = hours <= 6;

    return {
      text: `Expires in ${hours}h ${minutes}m`,
      subtext: danger
        ? "Rescue should be arranged as soon as possible."
        : "This donation is approaching its expiry time.",
      color: danger
        ? colors.urgent
        : colors.accent,
      background: danger
        ? "#FDECEC"
        : "#FFF5E8",
      icon: danger
        ? ("flame-outline" as const)
        : ("time-outline" as const),
      expiringSoon: true,
      expired: false,
    };
  }

  /* Under 1 hour */
  return {
    text: `Expires in ${totalMinutes}m`,
    subtext:
      "Rescue should be arranged as soon as possible.",
    color: colors.urgent,
    background: "#FDECEC",
    icon: "flame-outline" as const,
    expiringSoon: true,
    expired: false,
  };
}

/* =========================================================
   PRIORITY HELPERS
========================================================= */

function getPriorityColor(priority?: string) {
  switch (priority) {
    case "high":
      return colors.urgent;

    case "medium":
      return colors.accent;

    case "low":
      return colors.success;

    default:
      return colors.textMuted;
  }
}

function getPriorityBackground(priority?: string) {
  switch (priority) {
    case "high":
      return "#FDECEC";

    case "medium":
      return "#FFF5E8";

    case "low":
      return "#EAF8F1";

    default:
      return "#F1F3F5";
  }
}

function getPriorityLabel(priority?: string) {
  if (!priority) {
    return "Not set";
  }

  return (
    priority.charAt(0).toUpperCase() +
    priority.slice(1)
  );
}

/* =========================================================
   DATE / TIME HELPERS
========================================================= */

function formatDate(value?: string) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value?: string) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================================================
   GENERAL HELPERS
========================================================= */

function getDonationId(
  donation?: Donation,
) {
  return (
    donation?._id ||
    donation?.id ||
    ""
  );
}

function getSafetyStatus(
  donation: Donation,
) {
  const safety = donation.safety;

  const complete =
    !!safety &&
    !!safety.storage &&
    !!safety.temperature &&
    !!safety.handling &&
    !!safety.packaging &&
    !!safety.allergens;

  const blockingConcern =
    safety?.storage === "NO" ||
    safety?.handling === "NO" ||
    safety?.packaging === "NO";

  if (blockingConcern) {
    return "CONCERN";
  }

  if (complete) {
    return "PASSED";
  }

  return "INCOMPLETE";
}

/* =========================================================
   MAIN SCREEN
========================================================= */

export default function DonationDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();

  const { width } = useWindowDimensions();

  const isDesktop = width >= 1100;
  const isTablet =
    width >= 700 && width < 1100;

  const horizontalPadding = isDesktop
    ? 36
    : isTablet
      ? 24
      : 16;

  const contentMaxWidth =
    isDesktop ? 1180 : 900;

  const params =
    (route.params || {}) as RouteParams;

  const donationId =
    params.donationId ||
    params.id ||
    "";

  const [
    donation,
    setDonation,
  ] = useState<Donation | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [
    confirmingRecipient,
    setConfirmingRecipient,
  ] = useState(false);

  /*
   * Live clock used by the expiry countdown.
   *
   * It updates once per minute because the countdown
   * is displayed in minutes.
   */
  const [
    currentTime,
    setCurrentTime,
  ] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const [
    dialog,
    setDialog,
  ] = useState<DialogState>({
    visible: false,
    type: "confirm",
    title: "",
    message: "",
  });

  const loadDonation =
    useCallback(async () => {
      if (!donationId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const data =
          await getDonationById(
            donationId,
          );

        setDonation(
          data as Donation,
        );
      } catch (error) {
        console.error(
          "[DonationDetail] Failed to load donation:",
          error,
        );

        setDialog({
          visible: true,
          type: "error",
          title:
            "Unable to load donation",
          message:
            "We could not retrieve this donation. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    }, [donationId]);

  useFocusEffect(
    useCallback(() => {
      loadDonation();
    }, [loadDonation]),
  );

  const handleRefresh = async () => {
    if (!donationId) {
      return;
    }

    try {
      setRefreshing(true);

      const data =
        await getDonationById(
          donationId,
        );

      setDonation(
        data as Donation,
      );

      /*
       * Refresh the countdown immediately
       * after pulling to refresh.
       */
      setCurrentTime(Date.now());
    } catch (error) {
      console.error(
        "[DonationDetail] Refresh failed:",
        error,
      );
    } finally {
      setRefreshing(false);
    }
  };

  const closeDialog = () => {
    setDialog((previous) => ({
      ...previous,
      visible: false,
    }));
  };

  const handleDelete = () => {
    if (
      !donation ||
      actionLoading
    ) {
      return;
    }

    setDialog({
      visible: true,
      type: "confirm",
      action: "delete",
      title: "Delete Donation?",
      message:
        "This donation will be permanently removed. This action cannot be undone.",
    });
  };

  const handleCancel = () => {
    if (
      !donation ||
      actionLoading
    ) {
      return;
    }

    setDialog({
      visible: true,
      type: "confirm",
      action: "cancel",
      title: "Cancel Donation?",
      message:
        "This donation will remain in your history but will no longer be available for rescue.",
    });
  };

  const performAction =
    async () => {
      if (
        !donation ||
        !dialog.action ||
        actionLoading
      ) {
        return;
      }

      const id =
        getDonationId(donation);

      if (!id) {
        setDialog({
          visible: true,
          type: "error",
          title: "Action Failed",
          message:
            "The donation ID is missing.",
        });

        return;
      }

      try {
        setActionLoading(true);

        const action =
          dialog.action;

        closeDialog();

        if (
          action === "delete"
        ) {
          await deleteDonation(id);

          setDialog({
            visible: true,
            type: "success",
            title:
              "Donation Deleted",
            message:
              "Your donation has been permanently deleted.",
          });

          return;
        }

        await cancelDonation(id);

        const updated =
          await getDonationById(id);

        setDonation(
          updated as Donation,
        );

        setDialog({
          visible: true,
          type: "success",
          title:
            "Donation Cancelled",
          message:
            "Your donation has been cancelled successfully.",
        });
      } catch (error: any) {
        console.error(
          "[DonationDetail] Action failed:",
          error,
        );

        setDialog({
          visible: true,
          type: "error",
          title:
            dialog.action === "delete"
              ? "Delete Failed"
              : "Cancellation Failed",
          message:
            error?.response?.data
              ?.message ||
            "The requested action could not be completed.",
        });
      } finally {
        setActionLoading(false);
      }
    };

  const handleDialogDone = () => {
    const wasDelete =
      dialog.type === "success" &&
      dialog.title ===
        "Donation Deleted";

    closeDialog();

    if (wasDelete) {
      navigation.popTo(
        "MyDonations",
      );
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <LinearGradient
        colors={[C.navy, C.navyDeep]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={styles.loadingScreen}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor={
            colors.primaryDark
          }
        />

        <View
          style={styles.loadingHalo}
        >
          <View
            style={styles.loadingIcon}
          >
            <Ionicons
              name="restaurant-outline"
              size={30}
              color={colors.accent}
            />
          </View>
        </View>

        <ActivityIndicator
          size="large"
          color={colors.accent}
          style={
            styles.loadingSpinner
          }
        />

        <Text
          style={styles.loadingTitle}
        >
          Loading donation
        </Text>

        <Text
          style={styles.loadingText}
        >
          Getting your donation details...
        </Text>
      </LinearGradient>
    );
  }

  /* =========================================================
     EMPTY
  ========================================================= */

  if (!donation) {
    return (
      <View style={styles.emptyScreen}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={
            colors.primaryDark
          }
        />

        <View style={styles.emptyHalo}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="fast-food-outline"
              size={42}
              color={colors.primary}
            />
          </View>
        </View>

        <Text style={styles.emptyTitle}>
          Donation not found
        </Text>

        <Text style={styles.emptyText}>
          We could not find the donation
          you are looking for.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.popTo(
              "MyDonations",
            )
          }
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Ionicons
            name="arrow-back"
            size={18}
            color="#FFFFFF"
          />

          <Text
            style={styles.backButtonText}
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* =========================================================
     DISPLAY DATA
  ========================================================= */

  const statusColor =
    getStatusColor(
      donation.status,
    );

  const statusBackground =
    getStatusBackground(
      donation.status,
    );

  const priorityColor =
    getPriorityColor(
      donation.priority,
    );

  const priorityBackground =
    getPriorityBackground(
      donation.priority,
    );

  const safetyStatus =
    getSafetyStatus(donation);

  /*
   * Live countdown.
   */
  const expiryCountdown =
    getExpiryCountdown(
      donation,
      currentTime,
    );

  const canEdit =
    donation.status ===
      "pending" ||
    donation.status ===
      "active";

  /*
   * "Expiring Soon" is NOT a database status.
   * It is calculated from the expiry time.
   */
  const canCancel =
    donation.status ===
      "pending" ||
    donation.status ===
      "active";

  const canDelete =
    donation.status ===
      "pending" ||
    donation.status ===
      "cancelled" ||
    donation.status ===
      "expired";

  /*
   * Recipients can only be suggested while the donation is still
   * open and not past its expiry.
   */
  const canSuggestRecipients =
    (donation.status === "pending" ||
      donation.status === "active") &&
    !expiryCountdown.expired;

  const openRecipientSuggestions = () => {
    const id = getDonationId(donation);

    if (!id || !canSuggestRecipients) {
      return;
    }

    navigation.navigate(
      "RecipientSuggestions",
      {
        donationId: id,
      },
    );
  };

  const openEdit = () => {
    const id =
      getDonationId(donation);

    if (!id || !canEdit) {
      return;
    }

    navigation.navigate(
      "EditDonation",
      {
        donationId: id,
      },
    );
  };

  const openRescueChat = () => {
    // Navigate to the donor's full chat list — each recipient's conversation
    // is 1-on-1 and can be opened from "My chats" or the per-ask button below.
    navigation.navigate("ChatList");
  };

  const openDeliveryVolunteerSuggestions = () => {
    const id = getDonationId(donation);
    if (!id) return;

    navigation.navigate("VolunteerSuggestions", {
      donationId: id,
    });
  };

  const confirmRecipientForDelivery = async (ask: DonationAsk) => {
    const id = getDonationId(donation);
    if (!id || !ask.requestId || confirmingRecipient) return;

    setConfirmingRecipient(true);
    try {
      const accepted = await acceptFoodRequest(ask.requestId, id);
      if (!accepted.linkedDonation?.id) {
        throw new Error(
          "The recipient request was accepted, but it was not linked to this donation. Please contact support before assigning a volunteer.",
        );
      }
      navigation.navigate("VolunteerSuggestions", {
        donationId: accepted.linkedDonation.id,
      });
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (error instanceof Error ? error.message : "Please try again.");
      Alert.alert("Could not confirm recipient", message);
    } finally {
      setConfirmingRecipient(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={
          colors.primaryDark
        }
      />

      {/* =====================================================
          HEADER
      ===================================================== */}

      <LinearGradient
        colors={[C.navy, C.navyDeep]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={[
          styles.header,
          {
            paddingHorizontal:
              horizontalPadding,
          },
        ]}
      >
        <View style={styles.headerGlow} />

        <View
          style={[
            styles.headerInner,
            {
              maxWidth:
                contentMaxWidth,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.headerBack}
            onPress={() =>
              navigation.popTo(
                "MyDonations",
              )
            }
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Back to my donations"
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View
            style={
              styles.headerTitleContainer
            }
          >
            <Text
              style={
                styles.headerTitle
              }
            >
              Donation Details
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              {donation.donationCode
                ? `#${donation.donationCode}`
                : "Your donation"}
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.headerButton
            }
            onPress={handleRefresh}
            activeOpacity={0.8}
            disabled={refreshing}
            accessibilityRole="button"
            accessibilityLabel="Refresh donation details"
          >
            {refreshing ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Ionicons
                name="refresh"
                size={20}
                color="#FFFFFF"
              />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal:
              horizontalPadding,
            maxWidth:
              contentMaxWidth,
            width: "100%",
            alignSelf: "center",
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
            tintColor={
              colors.primary
            }
          />
        }
      >
        {/* =====================================================
            HERO
        ===================================================== */}

        <View
          style={[
            styles.heroCard,
            isDesktop &&
              styles.heroCardDesktop,
          ]}
        >
          {donation.photoUrl ? (
            <Image
              source={{
                uri: donation.photoUrl,
              }}
              style={
                styles.heroImage
              }
              resizeMode="cover"
            />
          ) : (
            <View
              style={styles.noImage}
            >
              <View
                style={
                  styles.noImageIcon
                }
              >
                <Ionicons
                  name="restaurant-outline"
                  size={40}
                  color={
                    colors.primary
                  }
                />
              </View>

              <Text
                style={
                  styles.noImageTitle
                }
              >
                No food photo
              </Text>

              <Text
                style={
                  styles.noImageText
                }
              >
                No image was added to
                this donation.
              </Text>
            </View>
          )}

          {donation.photoUrl && (
            <View
              style={
                styles.imageOverlay
              }
            />
          )}

          <View
            style={styles.heroTopRow}
          >
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    statusColor,
                },
              ]}
            >
              <Ionicons
                name={getStatusIcon(
                  donation.status,
                )}
                size={15}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.statusBadgeText
                }
              >
                {getStatusLabel(
                  donation.status,
                )}
              </Text>
            </View>

            {donation.donationType ===
              "URGENT" && (
              <View
                style={
                  styles.urgentBadge
                }
              >
                <Ionicons
                  name="flash"
                  size={14}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.urgentText
                  }
                >
                  URGENT
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* =====================================================
            TITLE
        ===================================================== */}

        <View
          style={styles.titleSection}
        >
          <View
            style={styles.titleRow}
          >
            <View
              style={
                styles.titleTextContainer
              }
            >
              <Text
                style={
                  styles.foodTitle
                }
              >
                {donation.foodType ||
                  "Food Donation"}
              </Text>

              {donation.foodCategory && (
                <View
                  style={
                    styles.categoryRow
                  }
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={15}
                    color={
                      colors.textSecondary
                    }
                  />

                  <Text
                    style={
                      styles.categoryText
                    }
                  >
                    {
                      donation.foodCategory
                    }
                  </Text>
                </View>
              )}
            </View>

            <View
              style={[
                styles.priorityBadge,
                {
                  backgroundColor:
                    priorityBackground,
                },
              ]}
            >
              <Ionicons
                name="flag-outline"
                size={15}
                color={
                  priorityColor
                }
              />

              <Text
                style={[
                  styles.priorityText,
                  {
                    color:
                      priorityColor,
                  },
                ]}
              >
                {getPriorityLabel(
                  donation.priority,
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* =====================================================
            QUICK STATS
        ===================================================== */}

        <View
          style={[
            styles.statsCard,
            isDesktop &&
              styles.statsCardDesktop,
          ]}
        >
          <StatItem
            icon="scale-outline"
            value={
              donation.quantity !==
              undefined
                ? `${donation.quantity} ${
                    donation.quantityUnit ||
                    ""
                  }`
                : "—"
            }
            label="Quantity"
          />

          <View
            style={
              styles.statDivider
            }
          />

          <StatItem
            icon="people-outline"
            value={
              donation.numberOfPortions !==
              undefined
                ? String(
                    donation.numberOfPortions,
                  )
                : "—"
            }
            label="Portions"
          />

          <View
            style={
              styles.statDivider
            }
          />

          <StatItem
            icon="flag-outline"
            value={getPriorityLabel(
              donation.priority,
            )}
            label="Priority"
            iconColor={
              priorityColor
            }
            valueColor={
              priorityColor
            }
          />
        </View>

        {/* =====================================================
            RESCUE & DELIVERY HUB
        ===================================================== */}

        <View
          style={styles.rescueHub}
        >
          <View
            style={
              styles.rescueHubHeader
            }
          >
            <View
              style={
                styles.rescueHubIcon
              }
            >
              <Ionicons
                name="git-network-outline"
                size={21}
                color={
                  colors.primary
                }
              />
            </View>

            <View
              style={
                styles.rescueHubHeaderText
              }
            >
              <Text
                style={
                  styles.rescueHubTitle
                }
              >
                Rescue & Delivery
              </Text>

              <Text
                style={
                  styles.rescueHubSubtitle
                }
              >
                Follow the recipient
                matching, communication
                and delivery journey.
              </Text>
            </View>

            <View
              style={
                styles.integrationBadge
              }
            >
              <View
                style={
                  styles.integrationDot
                }
              />

              <Text
                style={
                  styles.integrationBadgeText
                }
              >
                Rescue Hub
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.rescueFeatureGrid,
              isDesktop &&
                styles.rescueFeatureGridDesktop,
            ]}
          >
            {/* AI Recipient Matching */}

            <View
              style={[
                styles.rescueFeatureCard,
                isDesktop &&
                  styles.rescueFeatureCardDesktop,
              ]}
            >
              <View
                style={
                  styles.featureTopRow
                }
              >
                <View
                  style={[
                    styles.featureIcon,
                    {
                      backgroundColor:
                        "#EEF1FF",
                    },
                  ]}
                >
                  <Ionicons
                    name="sparkles-outline"
                    size={22}
                    color="#5B5BD6"
                  />
                </View>

                <View
                  style={
                    styles.featureStatusBadge
                  }
                >
                  <Text
                    style={
                      styles.featureStatusText
                    }
                  >
                    AI MATCHING
                  </Text>
                </View>
              </View>

              <Text
                style={
                  styles.featureTitle
                }
              >
                AI Recipient Matching
              </Text>

              <Text
                style={
                  styles.featureDescription
                }
              >
                Suitable recipients can
                be identified using the
                donation, location,
                quantity, urgency and
                recipient needs.
              </Text>

              <View
                style={
                  styles.featureInfoBox
                }
              >
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={
                    colors.primary
                  }
                />

                <Text
                  style={
                    styles.featureInfoText
                  }
                >
                  The matching service
                  will appear here once
                  connected.
                </Text>
              </View>

              <TouchableOpacity
                style={
                  canSuggestRecipients
                    ? styles.featureActiveButton
                    : styles.featureDisabledButton
                }
                onPress={
                  openRecipientSuggestions
                }
                disabled={
                  !canSuggestRecipients
                }
                activeOpacity={0.85}
              >
                <Ionicons
                  name="people-outline"
                  size={17}
                  color={
                    canSuggestRecipients
                      ? "#FFFFFF"
                      : colors.textMuted
                  }
                />

                <Text
                  style={
                    canSuggestRecipients
                      ? styles.featureActiveButtonText
                      : styles.featureDisabledButtonText
                  }
                >
                  View Recipients
                </Text>

                <Ionicons
                  name={
                    canSuggestRecipients
                      ? "chevron-forward"
                      : "lock-closed-outline"
                  }
                  size={14}
                  color={
                    canSuggestRecipients
                      ? "#FFFFFF"
                      : colors.textMuted
                  }
                />
              </TouchableOpacity>
            </View>

            {/* Recipient & Chat */}

            <View
              style={[
                styles.rescueFeatureCard,
                isDesktop &&
                  styles.rescueFeatureCardDesktop,
              ]}
            >
              <View
                style={
                  styles.featureTopRow
                }
              >
                <View
                  style={[
                    styles.featureIcon,
                    {
                      backgroundColor:
                        "#EAF8F1",
                    },
                  ]}
                >
                  <Ionicons
                    name="chatbubbles-outline"
                    size={22}
                    color={
                      colors.success
                    }
                  />
                </View>

                <View
                  style={[
                    styles.featureStatusBadge,
                    styles.featureStatusBadgeGreen,
                  ]}
                >
                  <Text
                    style={[
                      styles.featureStatusText,
                      {
                        color:
                          colors.success,
                      },
                    ]}
                  >
                    RECIPIENT
                  </Text>
                </View>
              </View>

              <Text
                style={
                  styles.featureTitle
                }
              >
                Recipient & In-App Chat
              </Text>

              <Text
                style={
                  styles.featureDescription
                }
              >
                Once a recipient accepts
                the donation, the donor
                can coordinate pickup and
                rescue details through
                in-app chat.
              </Text>

              {/* Sprint item 39 (Dushani): the real recipient asks for this
                  donation replace the old placeholder text. */}
              <RecipientAskPanel
                donationId={donationId}
                confirmingDelivery={confirmingRecipient}
                onConfirmDelivery={confirmRecipientForDelivery}
                onChatRecipient={(ask: DonationAsk) => {
                  const id = getDonationId(donation);
                  if (!id) return;
                  navigation.navigate("Chat", {
                    contextType: "donation",
                    contextId: id,
                    peerId: ask.recipientId,
                    title: donation.foodType || "Rescue Chat",
                    subtitle: `Chat · ${ask.recipientName}`,
                  });
                }}
              />

              <TouchableOpacity
                style={
                  styles.featureActiveButton
                }
                onPress={
                  openRescueChat
                }
                activeOpacity={
                  0.85
                }
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={17}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.featureActiveButtonText
                  }
                >
                  Open Rescue Chat
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.featureActiveButton}
                onPress={openDeliveryVolunteerSuggestions}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <Ionicons
                  name="bicycle-outline"
                  size={17}
                  color="#FFFFFF"
                />

                <Text style={styles.featureActiveButtonText}>
                  Suggest Delivery Volunteer
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Donation Tracking */}

          <View
            style={
              styles.trackingCard
            }
          >
            <View
              style={
                styles.trackingHeader
              }
            >
              <View
                style={[
                  styles.featureIcon,
                  {
                    backgroundColor:
                      "#FFF5E8",
                  },
                ]}
              >
                <Ionicons
                  name="navigate-outline"
                  size={22}
                  color={
                    colors.accent
                  }
                />
              </View>

              <View
                style={
                  styles.trackingHeaderText
                }
              >
                <Text
                  style={
                    styles.featureTitle
                  }
                >
                  Donation Tracking
                </Text>

                <Text
                  style={
                    styles.trackingSubtitle
                  }
                >
                  See where the donation
                  is in the rescue and
                  delivery journey.
                </Text>
              </View>

              <View
                style={[
                  styles.trackingStateBadge,
                  {
                    backgroundColor:
                      statusBackground,
                  },
                ]}
              >
                <View
                  style={[
                    styles.trackingStateDot,
                    {
                      backgroundColor:
                        statusColor,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.trackingStateText,
                    {
                      color:
                        statusColor,
                    },
                  ]}
                >
                  {getStatusLabel(
                    donation.status,
                  )}
                </Text>
              </View>
            </View>

            <DonationTrackingTimeline
              status={
                donation.status
              }
            />

            <View
              style={
                styles.trackingNote
              }
            >
              <Ionicons
                name="information-circle-outline"
                size={17}
                color={
                  colors.textMuted
                }
              />

              <Text
                style={
                  styles.trackingNoteText
                }
              >
                Recipient, volunteer and
                live delivery updates will
                be connected here by the
                rescue and volunteer
                modules.
              </Text>
            </View>
          </View>
        </View>

        {/* =====================================================
            MAIN INFORMATION GRID
        ===================================================== */}

        <View
          style={[
            styles.mainGrid,
            isDesktop &&
              styles.mainGridDesktop,
          ]}
        >
          <View
            style={[
              styles.mainColumn,
              isDesktop &&
                styles.mainColumnDesktop,
            ]}
          >
            {/* Food Safety */}

            <View
              style={
                styles.sectionCard
              }
            >
              <SectionHeader
                icon="shield-checkmark-outline"
                iconBackground="#EAF8F1"
                iconColor={
                  colors.success
                }
                title="Food Safety"
                subtitle="Safety information completed before posting"
              />

              {safetyStatus ===
              "PASSED" ? (
                <>
                  <View
                    style={
                      styles.safetyPassedCard
                    }
                  >
                    <View
                      style={
                        styles.safetyPassedIcon
                      }
                    >
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={
                          colors.success
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.safetyPassedContent
                      }
                    >
                      <Text
                        style={
                          styles.safetyPassedTitle
                        }
                      >
                        Safety Check Completed
                      </Text>

                      <Text
                        style={
                          styles.safetyPassedBadge
                        }
                      >
                        SAFETY CHECK PASSED
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={
                      styles.safetyDescription
                    }
                  >
                    Required food-safety
                    information was
                    completed before this
                    donation was posted.
                  </Text>
                </>
              ) : safetyStatus ===
                "CONCERN" ? (
                <View
                  style={
                    styles.safetyConcernCard
                  }
                >
                  <View
                    style={
                      styles.safetyConcernIcon
                    }
                  >
                    <Ionicons
                      name="warning-outline"
                      size={21}
                      color={
                        colors.urgent
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.safetyConcernContent
                    }
                  >
                    <Text
                      style={
                        styles.safetyConcernTitle
                      }
                    >
                      SAFETY CONCERN
                    </Text>

                    <Text
                      style={
                        styles.safetyConcernText
                      }
                    >
                      A reported safety
                      concern was recorded
                      for this donation.
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  style={
                    styles.safetyWarningCard
                  }
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color={
                      colors.accent
                    }
                  />

                  <Text
                    style={
                      styles.safetyWarningText
                    }
                  >
                    Safety information
                    is incomplete.
                  </Text>
                </View>
              )}
            </View>

            {/* =================================================
                FOOD TIMING
            ================================================= */}

            <View
              style={
                styles.sectionCard
              }
            >
              <SectionHeader
                icon="time-outline"
                iconBackground="#EAF4F8"
                iconColor={
                  colors.primary
                }
                title="Food Timing"
                subtitle="Preparation and availability"
              />

              <InfoRow
                icon="restaurant-outline"
                label="Prepared"
                value={formatDateTime(
                  donation.preparationTime,
                )}
              />

              <InfoRow
                icon="hourglass-outline"
                label="Expires"
                value={formatDateTime(
                  donation.expiryTime,
                )}
                valueColor={
                  expiryCountdown.expiringSoon ||
                  expiryCountdown.expired
                    ? expiryCountdown.color
                    : undefined
                }
              />

              {/* =================================================
                  LARGE LIVE EXPIRY COUNTDOWN
              ================================================= */}

              <View
                style={[
                  styles.expiryCountdownCard,
                  {
                    backgroundColor:
                      expiryCountdown.background,
                  },
                ]}
              >
                <View
                  style={[
                    styles.expiryCountdownIcon,
                    {
                      backgroundColor:
                        "#FFFFFF",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      expiryCountdown.icon
                    }
                    size={25}
                    color={
                      expiryCountdown.color
                    }
                  />
                </View>

                <View
                  style={
                    styles.expiryCountdownContent
                  }
                >
                  <View
                    style={
                      styles.expiryCountdownTopRow
                    }
                  >
                    <Text
                      style={
                        styles.expiryCountdownLabel
                      }
                    >
                      FOOD EXPIRY
                    </Text>

                    {expiryCountdown.expiringSoon &&
                      !expiryCountdown.expired && (
                        <View
                          style={
                            styles.expirySoonBadge
                          }
                        >
                          <View
                            style={[
                              styles.expirySoonDot,
                              {
                                backgroundColor:
                                  expiryCountdown.color,
                              },
                            ]}
                          />

                          <Text
                            style={[
                              styles.expirySoonText,
                              {
                                color:
                                  expiryCountdown.color,
                              },
                            ]}
                          >
                            EXPIRING SOON
                          </Text>
                        </View>
                      )}
                  </View>

                  <Text
                    style={[
                      styles.expiryCountdownText,
                      {
                        color:
                          expiryCountdown.color,
                      },
                    ]}
                  >
                    {
                      expiryCountdown.text
                    }
                  </Text>

                  <Text
                    style={
                      styles.expiryCountdownSubtext
                    }
                  >
                    {
                      expiryCountdown.subtext
                    }
                  </Text>
                </View>
              </View>

              <InfoRow
                icon="calendar-outline"
                label="Available from"
                value={formatDateTime(
                  donation.availabilityStart,
                )}
              />

              <InfoRow
                icon="calendar-clear-outline"
                label="Available until"
                value={formatDateTime(
                  donation.availabilityEnd,
                )}
                noBorder
              />
            </View>

            {/* Food Information */}

            <View
              style={
                styles.sectionCard
              }
            >
              <SectionHeader
                icon="cube-outline"
                iconBackground="#FFF5E8"
                iconColor={
                  colors.accent
                }
                title="Food Information"
                subtitle="Storage, packaging and allergens"
              />

              <InfoRow
                icon="snow-outline"
                label="Storage"
                value={
                  donation.storageCondition
                }
              />

              <InfoRow
                icon="cube-outline"
                label="Packaging"
                value={
                  donation.packagingCondition
                }
              />

              <InfoRow
                icon="alert-circle-outline"
                label="Allergens"
                value={
                  donation.allergenInfo ||
                  "None provided"
                }
                noBorder
              />
            </View>
          </View>

          {/* =====================================================
              RIGHT COLUMN
          ===================================================== */}

          <View
            style={[
              styles.mainColumn,
              isDesktop &&
                styles.mainColumnDesktop,
            ]}
          >
            {/* Pickup */}

            <View
              style={
                styles.sectionCard
              }
            >
              <SectionHeader
                icon="location-outline"
                iconBackground="#FFF5E8"
                iconColor={
                  colors.accent
                }
                title="Pickup Details"
                subtitle="Where the donation can be collected"
              />

              <InfoRow
                icon="map-outline"
                label="District"
                value={
                  donation.pickupDistrict
                }
              />

              <InfoRow
                icon="location-outline"
                label="Address"
                value={
                  donation.pickupAddress
                }
              />

              <InfoRow
                icon="time-outline"
                label="Pickup window"
                value={
                  donation.pickupWindowStart ||
                  donation.pickupWindowEnd
                    ? `${formatTime(
                        donation.pickupWindowStart,
                      )} – ${formatTime(
                        donation.pickupWindowEnd,
                      )}`
                    : "Not available"
                }
                noBorder
              />
            </View>

            {/* Additional Details */}

            {donation.additionalDetails ? (
              <View
                style={
                  styles.sectionCard
                }
              >
                <SectionHeader
                  icon="document-text-outline"
                  iconBackground="#EAF4F8"
                  iconColor={
                    colors.primary
                  }
                  title="Additional Details"
                  subtitle="Information provided by you"
                />

                <Text
                  style={
                    styles.additionalText
                  }
                >
                  {
                    donation.additionalDetails
                  }
                </Text>
              </View>
            ) : null}

            {/* Donation Information */}

            <View
              style={
                styles.sectionCard
              }
            >
              <SectionHeader
                icon="document-outline"
                iconBackground="#EAF4F8"
                iconColor={
                  colors.primary
                }
                title="Donation Information"
                subtitle="Record details"
              />

              <InfoRow
                icon="barcode-outline"
                label="Donation code"
                value={
                  donation.donationCode
                    ? `#${donation.donationCode}`
                    : "Not available"
                }
              />

              <InfoRow
                icon="calendar-outline"
                label="Created"
                value={formatDate(
                  donation.createdAt,
                )}
              />

              <InfoRow
                icon="refresh-outline"
                label="Last updated"
                value={formatDate(
                  donation.updatedAt,
                )}
                noBorder
              />
            </View>
          </View>
        </View>

        {/* =====================================================
            MANAGE DONATION
        ===================================================== */}

        {(canEdit ||
          canCancel ||
          canDelete) && (
          <View
            style={
              styles.actionsCard
            }
          >
            <View
              style={
                styles.actionsHeader
              }
            >
              <View
                style={
                  styles.actionsIcon
                }
              >
                <Ionicons
                  name="settings-outline"
                  size={21}
                  color={
                    colors.primary
                  }
                />
              </View>

              <View
                style={
                  styles.actionsHeaderText
                }
              >
                <Text
                  style={
                    styles.actionsTitle
                  }
                >
                  Manage Donation
                </Text>

                <Text
                  style={
                    styles.actionsSubtitle
                  }
                >
                  Available actions depend
                  on the current donation
                  status.
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.actionButtons,
                isDesktop &&
                  styles.actionButtonsDesktop,
              ]}
            >
              {canEdit && (
                <TouchableOpacity
                  style={
                    styles.editButton
                  }
                  onPress={
                    openEdit
                  }
                  disabled={
                    actionLoading
                  }
                  activeOpacity={
                    0.85
                  }
                >
                  <Ionicons
                    name="create-outline"
                    size={19}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.editButtonText
                    }
                  >
                    Edit Donation
                  </Text>
                </TouchableOpacity>
              )}

              {canCancel && (
                <TouchableOpacity
                  style={
                    styles.cancelButton
                  }
                  onPress={
                    handleCancel
                  }
                  disabled={
                    actionLoading
                  }
                  activeOpacity={
                    0.85
                  }
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={19}
                    color={
                      colors.urgent
                    }
                  />

                  <Text
                    style={
                      styles.cancelButtonText
                    }
                  >
                    Cancel Donation
                  </Text>
                </TouchableOpacity>
              )}

              {canDelete && (
                <TouchableOpacity
                  style={
                    styles.deleteButton
                  }
                  onPress={
                    handleDelete
                  }
                  disabled={
                    actionLoading
                  }
                  activeOpacity={
                    0.85
                  }
                >
                  <Ionicons
                    name="trash-outline"
                    size={19}
                    color={
                      colors.urgent
                    }
                  />

                  <Text
                    style={
                      styles.deleteButtonText
                    }
                  >
                    Delete Donation
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View
          style={styles.bottomSpace}
        />
      </ScrollView>

      {/* =====================================================
          CUSTOM DIALOG
      ===================================================== */}

      <Modal
        visible={
          dialog.visible
        }
        transparent
        animationType="fade"
        onRequestClose={
          closeDialog
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={styles.modalCard}
          >
            <View
              style={[
                styles.modalIcon,
                dialog.type ===
                "confirm"
                  ? styles.modalIconWarning
                  : dialog.type ===
                      "success"
                    ? styles.modalIconSuccess
                    : styles.modalIconError,
              ]}
            >
              <Ionicons
                name={
                  dialog.type ===
                  "confirm"
                    ? "help-circle-outline"
                    : dialog.type ===
                        "success"
                      ? "checkmark-circle-outline"
                      : "alert-circle-outline"
                }
                size={30}
                color={
                  dialog.type ===
                  "confirm"
                    ? colors.accent
                    : dialog.type ===
                        "success"
                      ? colors.success
                      : colors.urgent
                }
              />
            </View>

            <Text
              style={
                styles.modalTitle
              }
            >
              {dialog.title}
            </Text>

            <Text
              style={
                styles.modalMessage
              }
            >
              {dialog.message}
            </Text>

            {dialog.type ===
            "confirm" ? (
              <View
                style={
                  styles.modalButtons
                }
              >
                <TouchableOpacity
                  style={
                    styles.modalSecondaryButton
                  }
                  onPress={
                    closeDialog
                  }
                  activeOpacity={
                    0.85
                  }
                  disabled={
                    actionLoading
                  }
                >
                  <Text
                    style={
                      styles.modalSecondaryText
                    }
                  >
                    Keep Donation
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.modalDangerButton
                  }
                  onPress={
                    performAction
                  }
                  activeOpacity={
                    0.85
                  }
                  disabled={
                    actionLoading
                  }
                >
                  {actionLoading ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <Text
                      style={
                        styles.modalDangerText
                      }
                    >
                      {dialog.action ===
                      "delete"
                        ? "Delete"
                        : "Cancel Donation"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={
                  styles.modalPrimaryButton
                }
                onPress={
                  handleDialogDone
                }
                activeOpacity={
                  0.85
                }
              >
                <Text
                  style={
                    styles.modalPrimaryText
                  }
                >
                  {dialog.type ===
                  "success"
                    ? "Done"
                    : "Close"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =========================================================
   DONATION TRACKING TIMELINE
========================================================= */

function DonationTrackingTimeline({
  status,
}: {
  status?: string;
}) {
  const steps = [
    {
      key: "posted",
      title: "Donation Posted",
      description:
        "Your donation is available in ResQMeal.",
      icon: "checkmark-circle-outline" as const,

      complete:
        status === "pending" ||
        status === "active" ||
        status === "completed",

      active:
        status === "pending" ||
        status === "active",
    },

    {
      key: "recipient",
      title: "Recipient Confirmed",
      description:
        "Waiting for recipient rescue confirmation.",
      icon: "people-outline" as const,

      complete:
        status === "completed",

      active: false,
    },

    {
      key: "volunteer",
      title: "Volunteer Assigned",
      description:
        "A delivery volunteer will be assigned here.",
      icon: "bicycle-outline" as const,

      complete:
        status === "completed",

      active: false,
    },

    {
      key: "pickup",
      title: "Picked Up",
      description:
        "Donation collected for delivery.",
      icon: "cube-outline" as const,

      complete:
        status === "completed",

      active: false,
    },

    {
      key: "delivered",
      title: "Delivered",
      description:
        "Donation successfully reaches the recipient.",
      icon: "checkmark-done-outline" as const,

      complete:
        status === "completed",

      active:
        status === "completed",
    },
  ];

  return (
    <View style={styles.timeline}>
      {steps.map(
        (step, index) => {
          const isLast =
            index ===
            steps.length - 1;

          const isComplete =
            step.complete;

          const isActive =
            step.active &&
            !isComplete;

          return (
            <View
              key={step.key}
              style={
                styles.timelineRow
              }
            >
              <View
                style={
                  styles.timelineRail
                }
              >
                <View
                  style={[
                    styles.timelineNode,
                    isComplete &&
                      styles.timelineNodeComplete,
                    isActive &&
                      styles.timelineNodeActive,
                  ]}
                >
                  <Ionicons
                    name={
                      isComplete
                        ? "checkmark"
                        : step.icon
                    }
                    size={15}
                    color={
                      isComplete
                        ? "#FFFFFF"
                        : isActive
                          ? colors.primary
                          : colors.textMuted
                    }
                  />
                </View>

                {!isLast && (
                  <View
                    style={[
                      styles.timelineLine,
                      isComplete &&
                        styles.timelineLineComplete,
                    ]}
                  />
                )}
              </View>

              <View
                style={
                  styles.timelineContent
                }
              >
                <View
                  style={
                    styles.timelineTitleRow
                  }
                >
                  <Text
                    style={[
                      styles.timelineTitle,
                      !isComplete &&
                        !isActive &&
                        styles.timelineTitlePending,
                    ]}
                  >
                    {
                      step.title
                    }
                  </Text>

                  {isComplete && (
                    <View
                      style={
                        styles.timelineDoneBadge
                      }
                    >
                      <Text
                        style={
                          styles.timelineDoneText
                        }
                      >
                        DONE
                      </Text>
                    </View>
                  )}

                  {isActive && (
                    <View
                      style={
                        styles.timelineCurrentBadge
                      }
                    >
                      <Text
                        style={
                          styles.timelineCurrentText
                        }
                      >
                        CURRENT
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  style={
                    styles.timelineDescription
                  }
                >
                  {
                    step.description
                  }
                </Text>
              </View>
            </View>
          );
        },
      )}
    </View>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  icon,
  iconBackground,
  iconColor,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBackground: string;
  iconColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View
      style={
        styles.sectionHeader
      }
    >
      <View
        style={[
          styles.sectionIcon,
          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={iconColor}
        />
      </View>

      <View
        style={
          styles.sectionHeaderText
        }
      >
        <Text
          style={
            styles.sectionTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.sectionSubtitle
          }
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   STAT ITEM
========================================================= */

function StatItem({
  icon,
  value,
  label,
  iconColor,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  iconColor?: string;
  valueColor?: string;
}) {
  return (
    <View
      style={styles.statItem}
    >
      <View
        style={styles.statIcon}
      >
        <Ionicons
          name={icon}
          size={20}
          color={
            iconColor ||
            colors.primary
          }
        />
      </View>

      <Text
        style={[
          styles.statValue,
          valueColor
            ? {
                color:
                  valueColor,
              }
            : null,
        ]}
      >
        {value}
      </Text>

      <Text
        style={styles.statLabel}
      >
        {label}
      </Text>
    </View>
  );
}

/* =========================================================
   INFO ROW
========================================================= */

function InfoRow({
  icon,
  label,
  value,
  valueColor,
  noBorder = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  valueColor?: string;
  noBorder?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        !noBorder &&
          styles.infoRowBorder,
      ]}
    >
      <View
        style={styles.infoIcon}
      >
        <Ionicons
          name={icon}
          size={18}
          color={
            colors.textSecondary
          }
        />
      </View>

      <Text
        style={styles.infoLabel}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.infoValue,
          valueColor
            ? {
                color:
                  valueColor,
              }
            : null,
        ]}
      >
        {value ||
          "Not provided"}
      </Text>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const baseStyles: Record<string, any> = {
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },

  /* Header */

  header: {
    paddingTop: 52,
    paddingBottom: 26,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },

  headerGlow: {
    position: "absolute",
    top: -86,
    right: -46,
    width: 226,
    height: 226,
    borderRadius: 113,
    backgroundColor: "rgba(140,207,228,0.16)",
  },

  headerInner: {
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
  },

  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.glass,
    borderWidth: 1,
    borderColor: C.glassBorder,
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.glass,
    borderWidth: 1,
    borderColor: C.glassBorder,
  },

  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: C.white,
  },

  headerSubtitle: {
    marginTop: 4,
    fontSize: 11.5,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: C.onDarkFaint,
  },

  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },

  content: {
    paddingTop: 18,
  },

  /* Hero */

  heroCard: {
    height: 250,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: C.softBlue,
    position: "relative",
    borderWidth: 1,
    borderColor: C.hairline,
    marginBottom: 4,
    ...ELEV_SOFT,
  },

  heroCardDesktop: {
    height: 330,
  },

  heroImage: {
    width: "100%",
    height: "100%",
  },

  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 96,
    backgroundColor: "rgba(4,22,31,0.34)",
  },

  heroTopRow: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  statusBadge: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    ...ELEV_SOFT,
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    color: C.white,
  },

  urgentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.danger,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    ...ELEV_SOFT,
  },

  urgentText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: C.white,
  },

  noImage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  noImageIcon: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
    ...ELEV_SOFT,
  },

  noImageTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: C.text,
  },

  noImageText: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: "500",
    color: C.muted,
  },

  /* Title */

  titleSection: {
    paddingTop: 18,
    paddingBottom: 14,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  titleTextContainer: {
    flex: 1,
  },

  foodTitle: {
    fontSize: 26,
    lineHeight: 33,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: C.text,
  },

  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },

  categoryText: {
    fontSize: 13,
    fontWeight: "500",
    color: C.secondary,
  },

  priorityBadge: {
    minHeight: 34,
    paddingHorizontal: 13,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: C.hairline,
  },

  priorityText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  /* Stats */

  statsCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.hairline,
    ...ELEV_SOFT,
  },

  statsCardDesktop: {
    maxWidth: 760,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: C.softBlue,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  statValue: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: C.text,
    textAlign: "center",
  },

  statLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.3,
    color: C.muted,
  },

  statDivider: {
    width: 1,
    height: 58,
    backgroundColor: C.hairline,
  },

  /* Main Grid */

  mainGrid: {
    width: "100%",
  },

  mainGridDesktop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },

  mainColumn: {
    width: "100%",
  },

  mainColumnDesktop: {
    flex: 1,
  },

  sectionCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.hairline,
    ...ELEV_SOFT,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.hairline,
  },

  sectionHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  sectionTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: C.text,
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "500",
    color: C.muted,
  },

  /* Safety */

  safetyPassedCard: {
    backgroundColor: C.successSoft,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.successBorder,
  },

  safetyPassedIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.successBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  safetyPassedContent: {
    flex: 1,
    marginLeft: 12,
  },

  safetyPassedTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.1,
    color: C.text,
  },

  safetyPassedBadge: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: "800",
    color: C.success,
    letterSpacing: 0.9,
  },

  safetyDescription: {
    marginTop: 12,
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "400",
    color: C.secondary,
  },

  safetyConcernCard: {
    backgroundColor: C.dangerSoft,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: C.dangerBorder,
  },

  safetyConcernIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  safetyConcernContent: {
    flex: 1,
    marginLeft: 12,
  },

  safetyConcernTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: C.danger,
  },

  safetyConcernText: {
    marginTop: 5,
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "500",
    color: C.secondary,
  },

  safetyWarningCard: {
    backgroundColor: C.warningSoft,
    borderRadius: 16,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: C.warningBorder,
  },

  safetyWarningText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "500",
    color: C.secondary,
  },

  /* Info Rows */

  infoRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },

  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },

  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: C.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  infoLabel: {
    width: 104,
    fontSize: 12,
    fontWeight: "500",
    color: C.muted,
  },

  infoValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    color: C.text,
  },

  /* =========================================================
     LARGE EXPIRY COUNTDOWN CARD
  ========================================================= */

  expiryCountdownCard: {
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.hairline,
    ...ELEV_SOFT,
  },

  expiryCountdownIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.hairline,
  },

  expiryCountdownContent: {
    flex: 1,
    marginLeft: 14,
  },

  expiryCountdownTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  expiryCountdownLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: C.muted,
    letterSpacing: 1.1,
  },

  expirySoonBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.hairline,
  },

  expirySoonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },

  expirySoonText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  expiryCountdownText: {
    marginTop: 6,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: -0.4,
  },

  expiryCountdownSubtext: {
    marginTop: 4,
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "500",
    color: C.secondary,
  },

  /* Additional Details */

  additionalText: {
    fontSize: 13,
    lineHeight: 21,
    fontWeight: "400",
    color: C.secondary,
    backgroundColor: C.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.hairline,
    padding: 14,
  },

  /* Rescue Hub */

  rescueHub: {
    width: "100%",
    backgroundColor: C.white,
    borderRadius: 26,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.hairline,
    ...ELEV_SOFT,
  },

  rescueHubHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  rescueHubIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: C.softBlue,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
  },

  rescueHubHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  rescueHubTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: C.text,
  },

  rescueHubSubtitle: {
    marginTop: 4,
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "500",
    color: C.muted,
  },

  integrationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: C.successSoft,
    borderWidth: 1,
    borderColor: C.successBorder,
    marginLeft: 10,
  },

  integrationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.success,
    marginRight: 6,
  },

  integrationBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: C.success,
    letterSpacing: 0.8,
  },

  rescueFeatureGrid: {
    width: "100%",
  },

  rescueFeatureGridDesktop: {
    flexDirection: "row",
    gap: 12,
  },

  rescueFeatureCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: C.background,
    borderRadius: 20,
    width: "100%",
    backgroundColor:
      colors.background,
    borderRadius: 19,
    padding: 16,
    borderWidth: 1,
    borderColor: C.hairline,
    marginBottom: 12,
  },

  rescueFeatureCardDesktop: {
    flex: 1,
    minWidth: 0,
  },

  featureTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.hairline,
  },

  featureStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EDEDFB",
    borderWidth: 1,
    borderColor: "#DEDDF7",
  },

  featureStatusBadgeGreen: {
    backgroundColor: C.successSoft,
    borderColor: C.successBorder,
  },

  featureStatusText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#5B5BD6",
    letterSpacing: 0.9,
  },

  featureTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: C.text,
  },

  featureDescription: {
    marginTop: 7,
    fontSize: 11.5,
    lineHeight: 18,
    fontWeight: "400",
    color: C.secondary,
  },

  featureInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 14,
    padding: 11,
    borderRadius: 14,
    backgroundColor: "#F4F5FF",
    borderWidth: 1,
    borderColor: "#E7E7FB",
  },

  featureInfoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 10.5,
    lineHeight: 16,
    fontWeight: "500",
    color: C.secondary,
  },

  featureDisabledButton: {
    minHeight: 46,
    marginTop: 13,
    borderRadius: 999,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  featureDisabledButtonText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: C.muted,
  },

  featureActiveButton: {
    minHeight: 46,
    marginTop: 13,
    borderRadius: 999,
    backgroundColor: C.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    ...ELEV,
  },

  featureActiveButtonText: {
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 0.2,
    color: C.white,
  },

  /* Tracking */

  trackingCard: {
    marginTop: 2,
    backgroundColor: C.background,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.hairline,
  },

  trackingHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  trackingHeaderText: {
    flex: 1,
    marginLeft: 11,
  },

  trackingSubtitle: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    color: C.muted,
  },

  trackingStateBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: C.hairline,
  },

  trackingStateDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  trackingStateText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  trackingNote: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: C.softBlue,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  trackingNoteText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "400",
    color: C.muted,
  },

  /* Timeline */

  timeline: {
    marginTop: 18,
    paddingHorizontal: 2,
  },

  timelineRow: {
    flexDirection: "row",
    minHeight: 64,
  },

  timelineRail: {
    width: 36,
    alignItems: "center",
  },

  timelineNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },

  timelineNodeComplete: {
    backgroundColor: C.success,
    borderColor: C.success,
  },

  timelineNodeActive: {
    backgroundColor: C.white,
    borderColor: C.navy,
    borderWidth: 2,
  },

  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    borderRadius: 1,
    backgroundColor: C.border,
  },

  timelineLineComplete: {
    backgroundColor: C.success,
  },

  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },

  timelineTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },

  timelineTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.1,
    color: C.text,
  },

  timelineTitlePending: {
    color: C.muted,
  },

  timelineDescription: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16.5,
    fontWeight: "400",
    color: C.muted,
  },

  timelineDoneBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 999,
    backgroundColor: C.successSoft,
    borderWidth: 1,
    borderColor: C.successBorder,
  },

  timelineDoneText: {
    fontSize: 8,
    fontWeight: "800",
    color: C.success,
    letterSpacing: 0.7,
  },

  timelineCurrentBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 999,
    backgroundColor: C.softBlue,
    borderWidth: 1,
    borderColor: C.border,
  },

  timelineCurrentText: {
    fontSize: 8,
    fontWeight: "800",
    color: C.navy,
    letterSpacing: 0.7,
  },

  /* Actions */

  actionsCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 18,
    marginTop: 2,
    borderWidth: 1,
    borderColor: C.hairline,
    ...ELEV_SOFT,
  },

  actionsHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  actionsIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: C.softBlue,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
  },

  actionsHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  actionsTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: C.text,
  },

  actionsSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    color: C.muted,
  },

  actionButtons: {
    marginTop: 18,
    gap: 10,
  },

  actionButtonsDesktop: {
    flexDirection: "row",
  },

  editButton: {
    minHeight: 52,
    flex: 1,
    borderRadius: 999,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    ...ELEV,
  },

  editButtonText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
    color: C.white,
  },

  cancelButton: {
    minHeight: 52,
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    backgroundColor: C.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.danger,
  },

  deleteButton: {
    minHeight: 52,
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
  },

  deleteButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.danger,
  },

  bottomSpace: {
    height: 40,
  },

  /* Loading */

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  loadingHalo: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 22,
  },

  loadingIcon: {
    width: 74,
    height: 74,
    borderRadius: 26,
    backgroundColor: C.glass,
    borderWidth: 1,
    borderColor: C.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingSpinner: {
    marginBottom: 16,
  },

  loadingTitle: {
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: C.white,
  },

  loadingText: {
    marginTop: 7,
    fontSize: 13,
    fontWeight: "500",
    color: C.onDarkFaint,
  },

  /* Empty */

  emptyScreen: {
    flex: 1,
    backgroundColor: C.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  emptyHalo: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
    ...ELEV_SOFT,
  },

  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 30,
    backgroundColor: C.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 24,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: C.text,
  },

  emptyText: {
    marginTop: 9,
    maxWidth: 300,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
    color: C.secondary,
  },

  backButton: {
    marginTop: 26,
    height: 50,
    paddingHorizontal: 26,
    borderRadius: 999,
    backgroundColor: C.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...ELEV,
  },

  backButtonText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
    color: C.white,
  },

  /* Modal */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(4,22,31,0.62)",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },

  modalCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: C.white,
    borderRadius: 28,
    padding: 26,
    alignItems: "center",
    ...ELEV,
  },

  modalIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.hairline,
  },

  modalIconWarning: {
    backgroundColor: C.warningSoft,
  },

  modalIconSuccess: {
    backgroundColor: C.successSoft,
  },

  modalIconError: {
    backgroundColor: C.dangerSoft,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "center",
    color: C.text,
  },

  modalMessage: {
    marginTop: 10,
    fontSize: 13.5,
    lineHeight: 21,
    fontWeight: "500",
    textAlign: "center",
    color: C.secondary,
  },

  modalButtons: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },

  modalSecondaryButton: {
    flex: 1,
    height: 50,
    borderRadius: 999,
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  modalSecondaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.secondary,
  },

  modalDangerButton: {
    flex: 1,
    height: 50,
    borderRadius: 999,
    backgroundColor: C.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    ...ELEV,
  },

  modalDangerText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.white,
  },

  modalPrimaryButton: {
    width: "100%",
    height: 50,
    marginTop: 24,
    borderRadius: 999,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
    ...ELEV,
  },

  modalPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
    color: C.white,
  },
};

/* =========================================================
   TYPOGRAPHY PASS
   Every declaration that carries a font size gets the
   matching Poppins cut, so the page keeps one consistent
   type scale without repeating fontFamily everywhere.
========================================================= */

function applyPremiumTypography(
  defs: Record<string, any>,
): Record<string, any> {
  const enriched: Record<string, any> = {};

  for (const key of Object.keys(defs)) {
    const value = defs[key];

    const needsFont =
      value &&
      typeof value === "object" &&
      value.fontSize !== undefined &&
      value.fontFamily === undefined;

    enriched[key] = needsFont
      ? {
          ...value,
          fontFamily:
            FONT_BY_WEIGHT[String(value.fontWeight)] ??
            "Poppins_400Regular",
        }
      : value;
  }

  return enriched;
}

const styles = StyleSheet.create(
  applyPremiumTypography(baseStyles) as any,
);