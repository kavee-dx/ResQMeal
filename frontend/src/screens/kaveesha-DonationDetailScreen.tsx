import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
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

import { colors, fonts } from "../styles/kaveesha-theme";

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
      <View style={styles.loadingScreen}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={
            colors.primaryDark
          }
        />

        <View
          style={styles.loadingIcon}
        >
          <Ionicons
            name="restaurant-outline"
            size={30}
            color={colors.accent}
          />
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
      </View>
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

        <View style={styles.emptyIcon}>
          <Ionicons
            name="fast-food-outline"
            size={42}
            color={colors.primary}
          />
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

      <View style={styles.header}>
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
            style={styles.backButton}
            onPress={() =>
              navigation.popTo(
                "MyDonations",
              )
            }
            activeOpacity={0.85}
          >
            <Ionicons
              name="arrow-back"
              size={22}
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
      </View>

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

          {donation.photoUrl && (
            <View
              style={
                styles.heroBottomInfo
              }
            >
              <Text
                style={
                  styles.heroFoodName
                }
              >
                {donation.foodType ||
                  "Food Donation"}
              </Text>

              {donation.foodCategory && (
                <Text
                  style={
                    styles.heroCategory
                  }
                >
                  {
                    donation.foodCategory
                  }
                </Text>
              )}
            </View>
          )}
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
              style={
                styles.rescueFeatureCard
              }
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
              style={
                styles.rescueFeatureCard
              }
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

              <View
                style={
                  styles.featureInfoBoxGreen
                }
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color={
                    colors.success
                  }
                />

                <Text
                  style={
                    styles.featureInfoText
                  }
                >
                  Recipient request and
                  chat functionality will
                  connect here.
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.featureDisabledButton
                }
                disabled
                activeOpacity={1}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={17}
                  color={
                    colors.textMuted
                  }
                />

                <Text
                  style={
                    styles.featureDisabledButtonText
                  }
                >
                  Open Rescue Chat
                </Text>

                <Ionicons
                  name="lock-closed-outline"
                  size={14}
                  color={
                    colors.textMuted
                  }
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor:
      colors.background,
  },

  /* Header */

  header: {
    backgroundColor:
      colors.primaryDark,
    paddingTop: 48,
    paddingBottom: 18,
    paddingHorizontal: 18,
  },

  headerInner: {
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(255,255,255,0.10)",
  },

  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 14,
  },

  headerTitle: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 20,
    color: "#FFFFFF",
  },

  headerSubtitle: {
    marginTop: 3,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 12,
    color:
      "rgba(255,255,255,0.68)",
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingTop: 22,
  },

  /* Hero */

  heroCard: {
    height: 270,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor:
      colors.primaryLight,
    position: "relative",
    borderWidth: 1,
    borderColor:
      colors.border,
    marginBottom: 4,
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
    bottom: 0,
    height: 145,
    backgroundColor:
      "rgba(0,0,0,0.42)",
  },

  heroTopRow: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  statusBadgeText: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 12,
    color: "#FFFFFF",
  },

  urgentBadge: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor:
      colors.urgent,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  urgentText: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 11,
    color: "#FFFFFF",
  },

  heroBottomInfo: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 18,
  },

  heroFoodName: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 27,
    lineHeight: 34,
    color: "#FFFFFF",
  },

  heroCategory: {
    marginTop: 4,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 13,
    color:
      "rgba(255,255,255,0.82)",
  },

  noImage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  noImageIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor:
      "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  noImageTitle: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 16,
    color:
      colors.textPrimary,
  },

  noImageText: {
    marginTop: 4,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 12,
    color:
      colors.textMuted,
  },

  /* Title */

  titleSection: {
    paddingTop: 20,
    paddingBottom: 16,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },

  titleTextContainer: {
    flex: 1,
  },

  foodTitle: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 28,
    lineHeight: 35,
    color:
      colors.textPrimary,
  },

  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
    gap: 6,
  },

  categoryText: {
    fontFamily:
      fonts.bodyMedium,
    fontSize: 13,
    color:
      colors.textSecondary,
  },

  priorityBadge: {
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  priorityText: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 11,
  },

  /* Stats */

  statsCard: {
    backgroundColor:
      colors.surface,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor:
      colors.border,
  },

  statsCardDesktop: {
    maxWidth: 720,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },

  statValue: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 15,
    color:
      colors.textPrimary,
    textAlign: "center",
  },

  statLabel: {
    marginTop: 3,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 11,
    color:
      colors.textMuted,
  },

  statDivider: {
    width: 1,
    height: 55,
    backgroundColor:
      colors.border,
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
    backgroundColor:
      colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor:
      colors.border,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeaderText: {
    flex: 1,
    marginLeft: 11,
  },

  sectionTitle: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 16,
    color:
      colors.textPrimary,
  },

  sectionSubtitle: {
    marginTop: 3,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 16,
    color:
      colors.textMuted,
  },

  /* Safety */

  safetyPassedCard: {
    backgroundColor:
      "#EAF8F1",
    borderRadius: 15,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor:
      "#CDEEDD",
  },

  safetyPassedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  safetyPassedContent: {
    flex: 1,
    marginLeft: 11,
  },

  safetyPassedTitle: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 13,
    color:
      colors.textPrimary,
  },

  safetyPassedBadge: {
    marginTop: 4,
    fontFamily:
      fonts.bodyBold,
    fontSize: 10,
    color:
      colors.success,
    letterSpacing: 0.5,
  },

  safetyDescription: {
    marginTop: 12,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
    color:
      colors.textSecondary,
  },

  safetyConcernCard: {
    backgroundColor:
      "#FDECEC",
    borderRadius: 15,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor:
      "#F3CCCC",
  },

  safetyConcernIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  safetyConcernContent: {
    flex: 1,
    marginLeft: 11,
  },

  safetyConcernTitle: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 12,
    color:
      colors.urgent,
  },

  safetyConcernText: {
    marginTop: 4,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
    color:
      colors.textSecondary,
  },

  safetyWarningCard: {
    backgroundColor:
      "#FFF8E1",
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  safetyWarningText: {
    flex: 1,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
    color:
      colors.textSecondary,
  },

  /* Info Rows */

  infoRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
  },

  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor:
      colors.border,
  },

  infoIcon: {
    width: 32,
    alignItems: "flex-start",
  },

  infoLabel: {
    width: 105,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 12,
    color:
      colors.textSecondary,
  },

  infoValue: {
    flex: 1,
    textAlign: "right",
    fontFamily:
      fonts.bodyBold,
    fontSize: 12,
    lineHeight: 18,
    color:
      colors.textPrimary,
  },

  /* =========================================================
     LARGE EXPIRY COUNTDOWN CARD
  ========================================================= */

  expiryCountdownCard: {
    marginTop: 6,
    marginBottom: 8,
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor:
      colors.border,
  },

  expiryCountdownIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  expiryCountdownContent: {
    flex: 1,
    marginLeft: 13,
  },

  expiryCountdownTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  expiryCountdownLabel: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 9,
    color:
      colors.textMuted,
    letterSpacing: 0.7,
  },

  expirySoonBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor:
      "#FFFFFF",
  },

  expirySoonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  expirySoonText: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 8,
    letterSpacing: 0.4,
  },

  expiryCountdownText: {
    marginTop: 5,
    fontFamily:
      fonts.bodyBold,
    fontSize: 21,
    lineHeight: 27,
  },

  expiryCountdownSubtext: {
    marginTop: 3,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 10.5,
    lineHeight: 16,
    color:
      colors.textSecondary,
  },

  /* Additional Details */

  additionalText: {
    fontFamily:
      fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 21,
    color:
      colors.textSecondary,
    backgroundColor:
      colors.background,
    borderRadius: 13,
    padding: 13,
  },

  /* Rescue Hub */

  rescueHub: {
    width: "100%",
    backgroundColor:
      colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor:
      colors.border,
  },

  rescueHubHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  rescueHubIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor:
      colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  rescueHubHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  rescueHubTitle: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 17,
    color:
      colors.textPrimary,
  },

  rescueHubSubtitle: {
    marginTop: 3,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 17,
    color:
      colors.textMuted,
  },

  integrationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor:
      colors.background,
    borderWidth: 1,
    borderColor:
      colors.border,
    marginLeft: 10,
  },

  integrationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor:
      colors.success,
    marginRight: 6,
  },

  integrationBadgeText: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 9,
    color:
      colors.textSecondary,
    letterSpacing: 0.3,
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
    backgroundColor:
      colors.background,
    borderRadius: 19,
    padding: 16,
    borderWidth: 1,
    borderColor:
      colors.border,
    marginBottom: 12,
  },

  featureTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  featureIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  featureStatusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor:
      "#EDEDFB",
  },

  featureStatusBadgeGreen: {
    backgroundColor:
      "#EAF8F1",
  },

  featureStatusText: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 9,
    color: "#5B5BD6",
    letterSpacing: 0.4,
  },

  featureTitle: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 15,
    color:
      colors.textPrimary,
  },

  featureDescription: {
    marginTop: 6,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 18,
    color:
      colors.textSecondary,
  },

  featureInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 13,
    padding: 10,
    borderRadius: 12,
    backgroundColor:
      "#F4F5FF",
  },

  featureInfoBoxGreen: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 13,
    padding: 10,
    borderRadius: 12,
    backgroundColor:
      "#F0FAF5",
  },

  featureInfoText: {
    flex: 1,
    marginLeft: 8,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 10,
    lineHeight: 16,
    color:
      colors.textSecondary,
  },

  featureDisabledButton: {
    minHeight: 44,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  featureDisabledButtonText: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 11,
    color:
      colors.textMuted,
  },

  featureActiveButton: {
    minHeight: 44,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor:
      colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  featureActiveButtonText: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 11,
    color: "#FFFFFF",
  },

  /* Tracking */

  trackingCard: {
    marginTop: 2,
    backgroundColor:
      colors.background,
    borderRadius: 19,
    padding: 16,
    borderWidth: 1,
    borderColor:
      colors.border,
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
    marginTop: 4,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 10.5,
    lineHeight: 16,
    color:
      colors.textMuted,
  },

  trackingStateBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 20,
    marginLeft: 8,
  },

  trackingStateDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  trackingStateText: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 9,
  },

  trackingNote: {
    marginTop: 8,
    padding: 11,
    borderRadius: 12,
    backgroundColor:
      "#F1F3F5",
    flexDirection: "row",
    alignItems: "flex-start",
  },

  trackingNoteText: {
    flex: 1,
    marginLeft: 8,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 10.5,
    lineHeight: 16,
    color:
      colors.textMuted,
  },

  /* Timeline */

  timeline: {
    marginTop: 18,
    paddingHorizontal: 3,
  },

  timelineRow: {
    flexDirection: "row",
    minHeight: 62,
  },

  timelineRail: {
    width: 34,
    alignItems: "center",
  },

  timelineNode: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor:
      "#EEF0F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor:
      colors.border,
  },

  timelineNodeComplete: {
    backgroundColor:
      colors.success,
    borderColor:
      colors.success,
  },

  timelineNodeActive: {
    backgroundColor:
      colors.surface,
    borderColor:
      colors.primary,
    borderWidth: 2,
  },

  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 27,
    backgroundColor:
      colors.border,
  },

  timelineLineComplete: {
    backgroundColor:
      colors.success,
  },

  timelineContent: {
    flex: 1,
    paddingLeft: 11,
    paddingBottom: 15,
  },

  timelineTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },

  timelineTitle: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 12.5,
    color:
      colors.textPrimary,
  },

  timelineTitlePending: {
    color:
      colors.textMuted,
  },

  timelineDescription: {
    marginTop: 3,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 10.5,
    lineHeight: 16,
    color:
      colors.textMuted,
  },

  timelineDoneBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor:
      "#EAF8F1",
  },

  timelineDoneText: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 7.5,
    color:
      colors.success,
    letterSpacing: 0.3,
  },

  timelineCurrentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor:
      colors.primaryLight,
  },

  timelineCurrentText: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 7.5,
    color:
      colors.primary,
    letterSpacing: 0.3,
  },

  /* Actions */

  actionsCard: {
    backgroundColor:
      colors.surface,
    borderRadius: 20,
    padding: 18,
    marginTop: 2,
    borderWidth: 1,
    borderColor:
      colors.border,
  },

  actionsHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  actionsIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor:
      colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  actionsHeaderText: {
    flex: 1,
    marginLeft: 11,
  },

  actionsTitle: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 16,
    color:
      colors.textPrimary,
  },

  actionsSubtitle: {
    marginTop: 4,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
    color:
      colors.textMuted,
  },

  actionButtons: {
    marginTop: 16,
    gap: 10,
  },

  actionButtonsDesktop: {
    flexDirection: "row",
  },

  editButton: {
    minHeight: 50,
    flex: 1,
    borderRadius: 14,
    backgroundColor:
      colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },

  editButtonText: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 14,
    color: "#FFFFFF",
  },

  cancelButton: {
    minHeight: 50,
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor:
      "#F0B5B5",
    backgroundColor:
      "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },

  cancelButtonText: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 14,
    color:
      colors.urgent,
  },

  deleteButton: {
    minHeight: 50,
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor:
      "#F0B5B5",
    backgroundColor:
      "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },

  deleteButtonText: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 14,
    color:
      colors.urgent,
  },

  bottomSpace: {
    height: 36,
  },

  /* Loading */

  loadingScreen: {
    flex: 1,
    backgroundColor:
      colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor:
      colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  loadingSpinner: {
    marginBottom: 14,
  },

  loadingTitle: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 19,
    color:
      colors.textPrimary,
  },

  loadingText: {
    marginTop: 6,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 13,
    color:
      colors.textMuted,
  },

  /* Empty */

  emptyScreen: {
    flex: 1,
    backgroundColor:
      colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor:
      colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  emptyTitle: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 21,
    color:
      colors.textPrimary,
  },

  emptyText: {
    marginTop: 8,
    maxWidth: 290,
    textAlign: "center",
    fontFamily:
      fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
    color:
      colors.textSecondary,
  },

  backButton: {
    marginTop: 22,
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor:
      colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  backButtonText: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 14,
    color: "#FFFFFF",
  },

  /* Modal */

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(1,28,46,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },

  modalCard: {
    width: "100%",
    maxWidth: 430,
    backgroundColor:
      colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },

  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  modalIconWarning: {
    backgroundColor:
      "#FFF5E8",
  },

  modalIconSuccess: {
    backgroundColor:
      "#EAF8F1",
  },

  modalIconError: {
    backgroundColor:
      "#FDECEC",
  },

  modalTitle: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 19,
    textAlign: "center",
    color:
      colors.textPrimary,
  },

  modalMessage: {
    marginTop: 8,
    fontFamily:
      fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color:
      colors.textSecondary,
  },

  modalButtons: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },

  modalSecondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    backgroundColor:
      colors.background,
    borderWidth: 1,
    borderColor:
      colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  modalSecondaryText: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 12,
    color:
      colors.textSecondary,
  },

  modalDangerButton: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    backgroundColor:
      colors.urgent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  modalDangerText: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 12,
    color: "#FFFFFF",
  },

  modalPrimaryButton: {
    width: "100%",
    height: 48,
    marginTop: 22,
    borderRadius: 13,
    backgroundColor:
      colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  modalPrimaryText: {
    fontFamily:
      fonts.bodyBold,
    fontSize: 14,
    color: "#FFFFFF",
  },
});