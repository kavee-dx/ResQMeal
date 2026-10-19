// frontend/src/screens/kaveesha-DonorHomeScreen.tsx
// Registered in AppNavigator.tsx as the "DonorHome" route.
// Owner: Kaveesha
//
// Responsive donor home screen
//   phone   (< 700px)   -> mobile app: slim header, swipeable card rows,
//                          bottom tab bar (Home, Donations, Donate, Impact, Profile)
//   tablet  (>= 700px)  -> app layout with card grids and the bottom tab bar
//   desktop (>= 1024px) -> website: vertical navy sidebar on the left,
//                          content on the right, big footer at the end


import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useFocusEffect } from "@react-navigation/native";

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";

import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { LinearGradient } from "expo-linear-gradient";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/types";
import { registerForPushNotificationsAsync } from "@/services/kaveesha-pushNotificationService";
import api from "@/services/api";
import type { CampaignPost } from "@/types/amasha-campaign";
import AmashaCampaignFeedSection from "@/components/amasha-CampaignFeedSection";

import {
  Colors,
  ComponentSizes,
  Radius,
  Shadows,
  Spacing,
  Typography,
} from "../constants/theme";

import type { ThemeColor } from "../constants/theme";

import type { Donation } from "../types/kaveesha-donation.types";

/*
  The feed rules live in a dependency-free module so they can be unit tested
  on their own and stay identical wherever the home page uses them.
*/
import {
  DONATION_FOOT_NOTE,
  buildDonorFeed,
  countToneFilters,
  donationExpiryLabel,
  donationPostedLabel,
  donationRouteId,
  donationStatusMeta,
  isVisibleInDonorFeed,
  isUrgentDonation,
  summarizeDonorImpact,
  type FeedFilterId,
  type StatusTone,
} from "../utils/kaveesha-donationFeed";

import {
  getDonations,
  getExpiryAlerts,
  getUnreadExpiryAlertCount,
  markExpiryAlertAsRead,
  markAllExpiryAlertsAsRead,
  type ExpiryAlert,
} from "../services/kaveesha-donationApi";

import {
  getAppNotifications,
  getAppUnreadCount,
  markAppNotificationRead,
  markAllAppNotificationsRead,
  type AppNotification,
} from "../services/amasha-notificationApi";

import { onNewNotification } from "../services/amasha-chatSocket";

/* ========================================================= */
/* TYPES + CONSTANTS                                          */
/* ========================================================= */

type Props = NativeStackScreenProps<RootStackParamList, "DonorHome">;

type Palette = Record<ThemeColor, string>;

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type TabKey = "Home" | "Donations" | "Impact" | "Create" | "Profile" | "Map";

type ExtraNavKey = "FoodRequests" | "NGOCommunities";

type SidebarKey = TabKey | ExtraNavKey;

type SectionKey = "impact" | "donations" | "campaigns";

const LOGOUT_ROUTE = "Login";

const CONTENT_MAX = 1200;
const SIDEBAR_WIDTH = 264;

/* Gap between posts in the donation feed. */
const POST_GAP = 16;

/* Only two ways to slice the home feed: time-critical posts and the rest. */
const FEED_FILTERS: Array<{
  id: FeedFilterId;
  label: string;
  icon: IconName;
}> = [
  {
    id: "urgent",
    label: "Urgent",
    icon: "flash-outline",
  },
  {
    id: "normal",
    label: "Normal",
    icon: "pulse-outline",
  },
];

type QuickActionId =
  | "create"
  | "posts"
  | "requests"
  | "campaigns"
  | "map";

const QUICK_ACTIONS: Array<{
  id: QuickActionId;
  label: string;
  icon: IconName;
}> = [
  {
    id: "create",
    label: "Donate food",
    icon: "add-circle-outline",
  },
  {
    id: "posts",
    label: "My posts",
    icon: "gift-outline",
  },
  {
    id: "requests",
    label: "Rescue requests",
    icon: "people-circle-outline",
  },
  {
    id: "campaigns",
    label: "NGO campaigns",
    icon: "megaphone-outline",
  },
  {
    id: "map",
    label: "Rescue map",
    icon: "map-outline",
  },
];

type NavItem = {
  key: Exclude<TabKey, "Create">;
  label: string;
  tabLabel: string;
  icon: IconName;
  iconActive: IconName;
};

const NAV_ITEMS: NavItem[] = [
  {
    key: "Home",
    label: "Home",
    tabLabel: "Home",
    icon: "home-outline",
    iconActive: "home",
  },
  {
    key: "Donations",
    label: "My donations",
    tabLabel: "Donations",
    icon: "gift-outline",
    iconActive: "gift",
  },
  {
    key: "Impact",
    label: "Impact",
    tabLabel: "Impact",
    icon: "heart-outline",
    iconActive: "heart",
  },
  {
    key: "Profile",
    label: "Profile",
    tabLabel: "Profile",
    icon: "person-outline",
    iconActive: "person",
  },
  {
    key: "Map",
    label: "Rescue map",
    tabLabel: "Map",
    icon: "map-outline",
    iconActive: "map",
  },
];

type ExtraNavItem = {
  key: ExtraNavKey;
  label: string;
  icon: IconName;
  iconActive: IconName;
};

const EXTRA_NAV_ITEMS: ExtraNavItem[] = [
  {
    key: "FoodRequests",
    label: "Food rescue requests",
    icon: "fast-food-outline",
    iconActive: "fast-food",
  },
  {
    key: "NGOCommunities",
    label: "NGO communities",
    icon: "people-circle-outline",
    iconActive: "people-circle",
  },
];

const SIDEBAR_NAV_ITEMS: Array<NavItem | ExtraNavItem> = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  ...EXTRA_NAV_ITEMS,
  NAV_ITEMS[2],
  NAV_ITEMS[3],
  NAV_ITEMS[4],
];

/* ========================================================= */
/* LAYOUT + THEME HOOKS                                       */
/* ========================================================= */

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

function makeStyles(c: Palette, accent: string) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.background,
    },

    scrollContent: {
      alignItems: "center",
    },

    container: {
      width: "100%",
      maxWidth: CONTENT_MAX,
    },

    /* ---------------- Brand ---------------- */

    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    brandIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    brandText: {
      ...Typography.h3,
      fontSize: 21,
      fontWeight: "800",
      color: c.text,
      letterSpacing: -0.4,
    },

    /* ---------------- Desktop sidebar ---------------- */

    sidebar: {
      width: SIDEBAR_WIDTH,
      paddingHorizontal: 18,
      paddingTop: 28,
      paddingBottom: 22,
      overflow: "hidden",
    },

    sidebarCircleOne: {
      position: "absolute",
      width: 260,
      height: 260,
      borderRadius: 130,
      bottom: -110,
      left: -90,
      backgroundColor: "rgba(255,255,255,0.04)",
    },

    sidebarCircleTwo: {
      position: "absolute",
      width: 200,
      height: 200,
      borderRadius: 100,
      top: -80,
      right: -90,
      backgroundColor: "rgba(255,255,255,0.05)",
    },

    sidebarNav: {
      marginTop: 40,
      gap: 6,
    },

    sidebarItem: {
      height: 50,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 16,
      borderRadius: Radius.md,
      overflow: "hidden",
    },

    sidebarItemActive: {
      backgroundColor: "rgba(255,255,255,0.12)",
    },

    sidebarIndicator: {
      position: "absolute",
      left: 0,
      top: 12,
      bottom: 12,
      width: 4,
      borderTopRightRadius: 4,
      borderBottomRightRadius: 4,
      backgroundColor: c.secondary,
    },

    sidebarItemText: {
      ...Typography.bodyMedium,
      color: "rgba(255,255,255,0.74)",
    },

    sidebarItemTextActive: {
      color: "#FFFFFF",
      fontWeight: "700",
    },

    sidebarSpacer: {
      flex: 1,
    },

    sidebarUser: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: Radius.lg,
      backgroundColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      marginBottom: 12,
    },

    sidebarUserName: {
      ...Typography.label,
      fontSize: 14,
      color: "#FFFFFF",
    },

    sidebarUserRole: {
      ...Typography.bodySmall,
      color: "rgba(255,255,255,0.62)",
    },

    /* ---------------- Logout ---------------- */

    logoutSidebar: {
      height: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      borderRadius: Radius.md,
      backgroundColor: c.error,
      ...Shadows.button,
    },

    logoutSidebarText: {
      ...Typography.button,
      color: "#FFFFFF",
    },

    logoutIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: c.error,
      alignItems: "center",
      justifyContent: "center",
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(1,19,31,0.55)",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },

    modalSheet: {
      width: "100%",
      maxWidth: 380,
      backgroundColor: c.surface,
      borderRadius: Radius.xl,
      padding: 28,
      alignItems: "center",
      ...Shadows.card,
    },

    modalIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.errorSoft,
      alignItems: "center",
      justifyContent: "center",
    },

    modalTitle: {
      ...Typography.h3,
      color: c.text,
      marginTop: 18,
      textAlign: "center",
    },

    modalText: {
      ...Typography.body,
      color: c.textSecondary,
      marginTop: 8,
      textAlign: "center",
    },

    modalActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 24,
      width: "100%",
    },

    modalStay: {
      flex: 1,
      height: 48,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },

    modalStayText: {
      ...Typography.button,
      color: c.text,
    },

    modalConfirm: {
      flex: 1,
      height: 48,
      borderRadius: Radius.pill,
      backgroundColor: c.error,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },

    modalConfirmText: {
      ...Typography.button,
      color: "#FFFFFF",
    },

    /* ---------------- Phone / tablet hamburger ---------------- */

    menuOverlay: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: "rgba(1,19,31,0.5)",
    },

    menuScrim: {
      flex: 1,
    },

    menuSheet: {
      width: 296,
      maxWidth: "84%",
      height: "100%",
      backgroundColor: c.surface,
      borderTopRightRadius: 26,
      borderBottomRightRadius: 26,
      overflow: "hidden",
      shadowColor: "#011C2E",
      shadowOffset: { width: 6, height: 0 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 16,
    },

    menuHeaderGradient: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },

    menuHeaderTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },

    menuBrandIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: "rgba(255,255,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
    },

    menuCloseButton: {
      width: 32,
      height: 32,
      borderRadius: 11,
      backgroundColor: "rgba(255,255,255,0.14)",
      alignItems: "center",
      justifyContent: "center",
    },

    menuUserRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: Radius.lg,
      backgroundColor: "rgba(255,255,255,0.10)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.14)",
    },

    menuUserName: {
      ...Typography.label,
      fontSize: 14,
      color: "#FFFFFF",
    },

    menuUserRole: {
      ...Typography.bodySmall,
      color: "rgba(255,255,255,0.65)",
    },

    menuList: {
      paddingHorizontal: 14,
      paddingTop: 16,
      gap: 4,
    },

    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      height: 52,
      paddingHorizontal: 12,
      borderRadius: Radius.md,
      overflow: "hidden",
    },

    menuItemActive: {
      backgroundColor: c.primarySoft,
    },

    menuItemIndicator: {
      position: "absolute",
      left: 0,
      top: 10,
      bottom: 10,
      width: 4,
      borderTopRightRadius: 4,
      borderBottomRightRadius: 4,
      backgroundColor: c.secondary,
    },

    menuItemIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: c.surfaceSoft,
      alignItems: "center",
      justifyContent: "center",
    },

    menuItemText: {
      ...Typography.bodyMedium,
      color: c.text,
    },

    /* ---------------- Mobile header ---------------- */

    mobileHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      backgroundColor: c.background,
    },

    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },

    notificationBadge: {
      position: "absolute",
      top: 4,
      right: 4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 3,
      backgroundColor: c.error,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: c.surface,
    },

    notificationBadgeText: {
      color: "#FFFFFF",
      fontSize: 9,
      fontWeight: "700",
    },

    avatar: {
      alignItems: "center",
      justifyContent: "center",
    },

    avatarText: {
      ...Typography.button,
    },

    /* ===================================================== */
    /* NOTIFICATION MODAL                                    */
    /* ===================================================== */

    notificationOverlay: {
      flex: 1,
      backgroundColor: "rgba(1,19,31,0.55)",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },

    notificationSheet: {
      width: "100%",
      maxWidth: 520,
      maxHeight: "82%",
      backgroundColor: c.surface,
      borderRadius: 24,
      overflow: "hidden",
      ...Shadows.card,
    },

    notificationHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },

    notificationHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      flexShrink: 1,
    },

    notificationHeaderIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    notificationTitle: {
      ...Typography.h3,
      fontSize: 20,
      color: c.text,
    },

    notificationUnreadLabel: {
      ...Typography.bodySmall,
      color: c.textSecondary,
      marginTop: 1,
    },

    notificationHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    markAllButton: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: Radius.pill,
      backgroundColor: c.primarySoft,
    },

    markAllText: {
      ...Typography.label,
      color: accent,
      fontSize: 11,
    },

    notificationClose: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: c.surfaceSoft,
      alignItems: "center",
      justifyContent: "center",
    },

    notificationList: {
      paddingHorizontal: 14,
      paddingVertical: 12,
    },

    notificationRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      padding: 13,
      marginBottom: 8,
      borderRadius: 16,
      backgroundColor: c.surfaceSoft,
      borderWidth: 1,
      borderColor: c.borderLight,
    },

    notificationRowUnread: {
      backgroundColor: c.primarySoft,
      borderColor: "rgba(2,48,71,0.10)",
    },

    notificationIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },

    notificationContent: {
      flex: 1,
      minWidth: 0,
    },

    notificationRowTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },

    notificationRowTitle: {
      ...Typography.bodyMedium,
      fontWeight: "700",
      color: c.text,
      flex: 1,
    },

    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.secondary,
      marginTop: 5,
    },

    notificationMessage: {
      ...Typography.bodySmall,
      color: c.textSecondary,
      lineHeight: 19,
      marginTop: 4,
    },

    notificationTime: {
      ...Typography.label,
      fontSize: 10,
      color: c.textMuted,
      marginTop: 7,
    },

    notificationEmpty: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
      paddingVertical: 50,
    },

    notificationEmptyIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F1F5F7",
      marginBottom: 12,
    },

    notificationEmptyTitle: {
      ...Typography.h3,
      fontSize: 18,
      color: c.text,
      textAlign: "center",
    },

    notificationEmptyText: {
      ...Typography.bodySmall,
      color: c.textSecondary,
      textAlign: "center",
      marginTop: 6,
      maxWidth: 320,
      lineHeight: 19,
    },

    notificationLoading: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 50,
    },

    notificationCard: {
      borderWidth: 1,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
    },

    notificationCardUnread: {
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      elevation: 3,
    },

    notificationCardTop: {
      flexDirection: "row",
      alignItems: "flex-start",
    },

    notificationCardIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    notificationCardTitleWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },

    notificationCardTitle: {
      flex: 1,
      fontSize: 15.5,
      fontWeight: "800",
      lineHeight: 21,
    },

    notificationUnreadBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 7,
      marginTop: 1,
    },

    notificationUnreadBadgeText: {
      color: "#FFFFFF",
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 0.5,
    },

    notificationFoodRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 15,
    },

    notificationFoodIcon: {
      width: 28,
      height: 28,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
      backgroundColor: "rgba(255,255,255,0.75)",
    },

    notificationFoodName: {
      flex: 1,
      fontSize: 15,
      fontWeight: "700",
      color: "#25323A",
    },

    notificationTimeBadge: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 9,
      marginTop: 11,
    },

    notificationTimeBadgeText: {
      marginLeft: 5,
      fontSize: 10.5,
      fontWeight: "800",
      letterSpacing: 0.4,
    },

    notificationCardMessage: {
      marginTop: 12,
      fontSize: 13,
      lineHeight: 19,
      color: "#56636B",
    },

    notificationCardBottom: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 15,
      paddingTop: 11,
      borderTopWidth: 1,
      borderTopColor: "rgba(0,0,0,0.06)",
    },

    notificationCardTime: {
      fontSize: 11.5,
      color: "#7A878E",
      fontWeight: "500",
    },

    notificationCardAction: {
      flexDirection: "row",
      alignItems: "center",
    },

    notificationCardActionText: {
      fontSize: 11.5,
      fontWeight: "700",
      marginRight: 2,
    },

    /* ---------------- Welcome + search ---------------- */

    welcomeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    },

    greeting: {
      ...Typography.h1,
      color: c.text,
      letterSpacing: -0.7,
    },

    greetingSub: {
      ...Typography.body,
      color: c.textSecondary,
      marginTop: 4,
    },

    welcomeDecoration: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: c.secondarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    searchBar: {
      flex: 1,
      height: ComponentSizes.inputHeight,
      flexDirection: "row",
      alignItems: "center",
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
      ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
    },

    /* ---------------- Hero ---------------- */

    heroWrap: {
      borderRadius: Radius.xl,
      overflow: "hidden",
      ...Shadows.card,
    },

    hero: {
      flexDirection: "row",
      alignItems: "center",
      overflow: "hidden",
    },

    heroContent: {
      flex: 1,
      zIndex: 3,
    },

    heroPill: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      backgroundColor: "rgba(255,255,255,0.16)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.14)",
    },

    heroPillText: {
      ...Typography.label,
      fontSize: 12,
      color: "#FFFFFF",
    },

    heroTitle: {
      color: "#FFFFFF",
      fontWeight: "800",
      letterSpacing: -0.8,
    },

    heroTitleAccent: {
      color: c.secondary,
      fontWeight: "800",
      letterSpacing: -0.8,
    },

    heroSubtitle: {
      color: "rgba(255,255,255,0.86)",
    },

    heroButtons: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 10,
    },

    heroCta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingLeft: 20,
      paddingRight: 6,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      backgroundColor: c.secondary,
      ...Shadows.button,
    },

    heroCtaText: {
      ...Typography.button,
      color: c.textOnSecondary,
    },

    heroCtaArrow: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.35)",
      alignItems: "center",
      justifyContent: "center",
    },

    heroGhost: {
      height: 44,
      paddingHorizontal: 20,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.4)",
      alignItems: "center",
      justifyContent: "center",
    },

    heroGhostText: {
      ...Typography.button,
      color: "#FFFFFF",
    },

    heroIllustration: {
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },

    heroIllustrationCircle: {
      backgroundColor: "rgba(255,255,255,0.11)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.14)",
      alignItems: "center",
      justifyContent: "center",
    },

    floatingChip: {
      position: "absolute",
      backgroundColor: "rgba(255,255,255,0.14)",
      alignItems: "center",
      justifyContent: "center",
    },

    heroCircleOne: {
      position: "absolute",
      width: 240,
      height: 240,
      borderRadius: 120,
      right: -100,
      top: -100,
      backgroundColor: "rgba(255,255,255,0.05)",
    },

    heroCircleTwo: {
      position: "absolute",
      width: 170,
      height: 170,
      borderRadius: 85,
      right: 40,
      bottom: -120,
      backgroundColor: "rgba(255,255,255,0.04)",
    },

    /* ---------------- Impact stats ---------------- */

    impactRow: {
      flexDirection: "row",
      gap: 12,
    },

    statCard: {
      flex: 1,
      minHeight: 120,
      backgroundColor: c.surface,
      borderRadius: Radius.xl,
      padding: 18,
      borderWidth: 1,
      borderColor: c.borderLight,
      shadowColor: "#023047",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },

    statCardH: {
      flexDirection: "row",
      alignItems: "center",
      gap: 18,
      minHeight: 108,
      paddingHorizontal: 22,
    },

    statTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    statIcon: {
      width: 46,
      height: 46,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.5)",
    },

    statIconLg: {
      width: 60,
      height: 60,
      borderRadius: 20,
    },

    statValue: {
      ...Typography.h1,
      fontSize: 30,
      color: c.text,
      marginTop: 14,
      letterSpacing: -0.5,
    },

    statLabel: {
      ...Typography.bodySmall,
      color: c.textSecondary,
    },

    liveDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: c.success,
    },

    /* ---------------- Sections ---------------- */

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 14,
    },

    sectionTitle: {
      ...Typography.h3,
      color: c.text,
    },

    viewAll: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: Radius.pill,
      backgroundColor: c.primarySoft,
    },

    viewAllText: {
      ...Typography.label,
      color: accent,
    },

    /* ---------------- Quick actions ---------------- */

    quickWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },

    quickTile: {
      flexGrow: 1,
      flexBasis: 170,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      ...Shadows.card,
    },

    quickIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    quickLabel: {
      ...Typography.bodyMedium,
      color: c.text,
      flexShrink: 1,
    },

    quickTileMobile: {
      width: 84,
      alignItems: "center",
    },

    quickIconMobile: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    quickLabelMobile: {
      ...Typography.bodySmall,
      fontSize: 12,
      lineHeight: 16,
      color: c.textSecondary,
      textAlign: "center",
      marginTop: 8,
    },

    /* ---------------- Donation post feed ---------------- */

    postFilterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },

    postFilterChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: Radius.pill,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },

    postFilterChipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
      shadowColor: "#023047",
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 4,
    },

    /* The urgent chip keeps its amber warning colour when selected */

    postFilterChipActiveWarn: {
      backgroundColor: c.secondary,
      borderColor: c.secondary,
      shadowColor: c.secondaryDark,
    },

    postFilterChipText: {
      ...Typography.label,
      fontSize: 12,
      color: c.textSecondary,
    },

    /* Dark text on the amber chip, which white would wash out */

    postFilterChipOnWarn: {
      color: c.primaryDark,
    },

    postFilterChipTextActive: {
      color: "#FFFFFF",
    },

    postFilterCount: {
      ...Typography.label,
      fontSize: 11,
      color: c.textMuted,
    },

    postFilterCountActive: {
      color: "rgba(255,255,255,0.8)",
    },

    /* Clears the active urgency chip and returns to every post */

    postFilterClear: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: Radius.pill,
      backgroundColor: c.surfaceSoft,
    },

    postFilterClearText: {
      ...Typography.label,
      fontSize: 11.5,
      color: c.textSecondary,
    },

    /* Horizontal strip; the padding leaves room for the card shadows. */
    postFeed: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: POST_GAP,
      paddingVertical: 8,
    },

    postCard: {
      backgroundColor: c.surface,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: c.borderLight,
      overflow: "hidden",
      shadowColor: "#023047",
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.12,
      shadowRadius: 28,
      elevation: 10,
    },

    /* Amber hairline that marks an urgent post before anything else */

    postAccent: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      zIndex: 3,
    },

    postHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 15,
    },

    postAvatarRing: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    postAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },

    postAvatarText: {
      ...Typography.labelStrong,
      fontSize: 16,
      color: "#FFFFFF",
    },

    postAuthorCol: {
      flex: 1,
      gap: 2,
    },

    postAuthorName: {
      ...Typography.bodyMedium,
      fontSize: 14,
      lineHeight: 19,
      color: c.text,
    },

    postAuthorMeta: {
      ...Typography.bodySmall,
      fontSize: 12,
      lineHeight: 16,
      color: c.textMuted,
    },

    postStatusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      maxWidth: "46%",
    },

    postStatusText: {
      ...Typography.label,
      fontSize: 11,
      letterSpacing: 0.2,
    },

    postPhotoBox: {
      width: "100%",
      aspectRatio: 4 / 3,
      backgroundColor: c.surfaceSoft,
      overflow: "hidden",
    },

    postPhotoFallback: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },

    postPhotoFallbackRing: {
      width: 62,
      height: 62,
      borderRadius: 31,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.34)",
      backgroundColor: "rgba(255,255,255,0.10)",
      alignItems: "center",
      justifyContent: "center",
    },

    postPhotoFallbackText: {
      ...Typography.bodySmall,
      fontSize: 12,
      color: "rgba(255,255,255,0.86)",
    },

    postPhotoScrim: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "58%",
      pointerEvents: "none",
    },

    /* Hairline that separates the photo from the card edge */

    postPhotoEdge: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.16)",
      pointerEvents: "none",
    },

    postChipRow: {
      position: "absolute",
      left: 12,
      right: 12,
      bottom: 12,
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
      pointerEvents: "none",
    },

    postChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      backgroundColor: "rgba(1,28,46,0.6)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.24)",
      maxWidth: "58%",
    },

    postChipText: {
      ...Typography.label,
      fontSize: 11,
      color: "#FFFFFF",
    },

    postChipWarn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      backgroundColor: c.secondary,
    },

    postChipWarnText: {
      ...Typography.labelStrong,
      fontSize: 10,
      letterSpacing: 0.7,
      color: c.primaryDark,
    },

    postBody: {
      padding: 18,
      gap: 10,
    },

    postTitle: {
      ...Typography.h3,
      fontSize: 19,
      lineHeight: 26,
      letterSpacing: -0.4,
      color: c.text,
    },

    postCaption: {
      ...Typography.body,
      fontSize: 13.5,
      lineHeight: 21,
      color: c.textSecondary,
    },

    /* One stat bar with value over label, instead of loose floating pills */

    postStatBar: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: 10,
      marginTop: 6,
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 18,
      backgroundColor: c.surfaceSoft,
      borderWidth: 1,
      borderColor: c.borderLight,
    },

    postStat: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
      gap: 3,
    },

    postStatValue: {
      ...Typography.labelStrong,
      fontSize: 12.5,
      lineHeight: 17,
      color: c.text,
      alignSelf: "stretch",
      textAlign: "center",
    },

    postStatLabel: {
      ...Typography.bodySmall,
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: c.textMuted,
    },

    postStatDivider: {
      width: 1,
      alignSelf: "stretch",
      backgroundColor: c.border,
    },

    postFoot: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginTop: 8,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
    },

    postFootNoteRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexShrink: 1,
    },

    postFootDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },

    postFootNote: {
      ...Typography.bodySmall,
      fontSize: 12,
      lineHeight: 17,
      color: c.textSecondary,
      flexShrink: 1,
    },

    postViewBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: Radius.pill,
      shadowColor: "#023047",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 4,
    },

    postViewText: {
      ...Typography.labelStrong,
      fontSize: 12,
      color: "#FFFFFF",
    },

    /* Swipe affordance under the strip */

    postStripHint: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      marginTop: 12,
    },

    postStripHintText: {
      ...Typography.bodySmall,
      fontSize: 12,
      color: c.textMuted,
    },

    postEmpty: {
      alignItems: "center",
      paddingVertical: 30,
      paddingHorizontal: 22,
      borderRadius: 22,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: c.border,
      gap: 4,
    },

    postEmptyTitle: {
      ...Typography.h3,
      fontSize: 16,
      lineHeight: 22,
      color: c.text,
      marginTop: 8,
      textAlign: "center",
    },

    postEmptyText: {
      ...Typography.bodySmall,
      color: c.textMuted,
      textAlign: "center",
      maxWidth: 340,
    },

    postEmptyCta: {
      marginTop: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: Radius.pill,
      backgroundColor: c.primary,
    },

    postEmptyCtaText: {
      ...Typography.label,
      fontSize: 13,
      color: "#FFFFFF",
    },

    /* ---------------- Search action ---------------- */

    searchAction: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      height: ComponentSizes.inputHeight,
      paddingHorizontal: 16,
      borderRadius: Radius.pill,
      backgroundColor: c.primary,
    },

    searchActionText: {
      ...Typography.label,
      color: c.textOnPrimary,
    },

    /* ---------------- Empty state ---------------- */

    empty: {
      alignItems: "center",
      padding: 28,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: c.border,
      backgroundColor: c.surfaceSoft,
    },

    emptyText: {
      ...Typography.body,
      color: c.textMuted,
      marginTop: 8,
      textAlign: "center",
    },

    /* ---------------- Bottom tab bar ---------------- */

    tabBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 8,
      shadowColor: "#023047",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 12,
    },

    tabBarInner: {
      width: "100%",
      maxWidth: 600,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "flex-end",
    },

    tabItem: {
      flex: 1,
      alignItems: "center",
      gap: 3,
      paddingVertical: 2,
    },

    tabIconPill: {
      width: 48,
      height: 30,
      borderRadius: Radius.pill,
      alignItems: "center",
      justifyContent: "center",
    },

    tabLabel: {
      ...Typography.label,
      fontSize: 11,
      lineHeight: 14,
    },

    tabFab: {
      width: 56,
      height: 56,
      borderRadius: 20,
      backgroundColor: c.secondary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: -28,
      ...Shadows.button,
    },

    /* ---------------- Website footer ---------------- */

    footerCard: {
      marginTop: 64,
      marginBottom: 32,
      borderRadius: Radius.xl,
      overflow: "hidden",
      padding: 44,
      ...Shadows.card,
    },

    footerTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 48,
      zIndex: 2,
    },

    footerBrandCol: {
      flex: 1.3,
    },

    footerBlurb: {
      ...Typography.body,
      color: "rgba(255,255,255,0.82)",
      marginTop: 16,
      maxWidth: 360,
    },

    footerCta: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 8,
      height: 46,
      paddingHorizontal: 22,
      borderRadius: Radius.pill,
      backgroundColor: c.secondary,
      marginTop: 22,
      ...Shadows.button,
    },

    footerCtaText: {
      ...Typography.button,
      color: c.textOnSecondary,
    },

    footerCols: {
      flex: 1.4,
      flexDirection: "row",
      gap: 40,
    },

    footerCol: {
      flex: 1,
      gap: 12,
    },

    footerHeading: {
      ...Typography.label,
      fontSize: 14,
      color: "#FFFFFF",
      marginBottom: 4,
    },

    footerLink: {
      ...Typography.body,
      fontSize: 14,
      color: "rgba(255,255,255,0.72)",
    },

    footerRule: {
      height: 1,
      backgroundColor: "rgba(255,255,255,0.16)",
      marginTop: 34,
      marginBottom: 22,
      zIndex: 2,
    },

    footerBottom: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      zIndex: 2,
    },

    footerCopy: {
      ...Typography.bodySmall,
      color: "rgba(255,255,255,0.66)",
      flexShrink: 1,
    },

    backToTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      height: 38,
      paddingHorizontal: 16,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.35)",
    },

    backToTopText: {
      ...Typography.label,
      color: "#FFFFFF",
    },
  });
}

const styleCache = {
  light: makeStyles(Colors.light as Palette, Colors.light.primary),

  dark: makeStyles(Colors.dark as Palette, Colors.dark.info),
};

function useTheme() {
  const c = Colors.light as Palette;
  const accent = c.primary;

  return {
    c,
    accent,
    s: styleCache.light,
    scheme: "light" as const,
  };
}

/* ========================================================= */
/* SMALL COMPONENTS                                           */
/* ========================================================= */

function Brand({ onDark }: { onDark?: boolean }) {
  const { c, s } = useTheme();

  return (
    <View style={s.brandRow}>
      <View
        style={[
          s.brandIcon,
          onDark && {
            backgroundColor: c.secondary,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="leaf"
          size={20}
          color={onDark ? c.textOnSecondary : "#FFFFFF"}
        />
      </View>

      <Text
        style={[
          s.brandText,
          onDark && {
            color: "#FFFFFF",
          },
        ]}
      >
        ResQMeal
      </Text>
    </View>
  );
}

/* ========================================================= */
/* NOTIFICATION BUTTON                                       */
/* ========================================================= */

function NotificationButton({
  size = 44,
  unreadCount = 0,
  onPress,
}: {
  size?: number;
  unreadCount?: number;
  onPress?: () => void;
}) {
  const { c, s } = useTheme();

  const displayCount = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[
        s.iconButton,
        {
          width: size,
          height: size,
        },
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={unreadCount > 0 ? "notifications" : "notifications-outline"}
        size={22}
        color={unreadCount > 0 ? c.primary : c.text}
      />

      {unreadCount > 0 && (
        <View style={s.notificationBadge}>
          <Text style={s.notificationBadgeText}>{displayCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/* ========================================================= */
/* NOTIFICATION HELPERS                                      */
/* ========================================================= */

function getNotificationAppearance(type?: string) {
  switch (type) {
    case "EXPIRING_30_MINUTES":
      return {
        icon: "warning-outline" as IconName,
        color: "#C62828",
        background: "#FFF1F1",
        borderColor: "#F5C2C2",
        badgeBackground: "#FDE2E2",
        timeLabel: "30 MINUTES LEFT",
        urgencyLabel: "Urgent",
      };

    case "EXPIRING_2_HOURS":
      return {
        icon: "time-outline" as IconName,
        color: "#E07800",
        background: "#FFF7E8",
        borderColor: "#F5D8A8",
        badgeBackground: "#FFECCF",
        timeLabel: "ABOUT 2 HOURS LEFT",
        urgencyLabel: "Important",
      };

    case "EXPIRING_6_HOURS":
    default:
      return {
        icon: "information-circle-outline" as IconName,
        color: "#1976A8",
        background: "#EFF8FC",
        borderColor: "#C9E6F2",
        badgeBackground: "#DFF2FA",
        timeLabel: "ABOUT 6 HOURS LEFT",
        urgencyLabel: "Informational",
      };
  }
}

function formatNotificationTime(value?: string | Date) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  const diffMs = now.getTime() - date.getTime();

  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/* ========================================================= */
/* NOTIFICATION MODAL                                        */
/* ========================================================= */

// One row in the merged sheet: an expiry alert OR a persisted app
// notification (new chat message, campaign alert, ...), newest first.
type MergedNotification =
  | { kind: "expiry"; at: string; alert: ExpiryAlert }
  | { kind: "chat"; at: string; chat: AppNotification };

function NotificationModal({
  visible,
  alerts,
  chatItems,
  unreadCount,
  loading,
  markingAll,
  onClose,
  onRefresh,
  onMarkRead,
  onMarkAllRead,
  onNotificationPress,
  onChatPress,
}: {
  visible: boolean;
  alerts: ExpiryAlert[];
  chatItems: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markingAll: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onMarkRead: (alert: ExpiryAlert) => void;
  onMarkAllRead: () => void;
  onNotificationPress: (alert: ExpiryAlert) => void;
  onChatPress: (item: AppNotification) => void;
}) {
  const { c, accent, s } = useTheme();

  const mergedItems: MergedNotification[] = [
    ...alerts.map((alert) => ({
      kind: "expiry" as const,
      at: alert.createdAt || alert.triggeredAt,
      alert,
    })),
    ...chatItems.map((chat) => ({
      kind: "chat" as const,
      at: chat.createdAt,
      chat,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.notificationOverlay}>
        <View style={s.notificationSheet}>
          {/* Header */}
          <View style={s.notificationHeader}>
            <View style={s.notificationHeaderLeft}>
              <View style={s.notificationHeaderIcon}>
                <Ionicons name="notifications" size={19} color={c.primary} />
              </View>

              <View>
                <Text style={s.notificationTitle}>Notifications</Text>

                <Text style={s.notificationUnreadLabel}>
                  {unreadCount > 0
                    ? `${unreadCount} unread ${
                        unreadCount === 1 ? "alert" : "alerts"
                      }`
                    : "All caught up"}
                </Text>
              </View>
            </View>

            <View style={s.notificationHeaderActions}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={s.markAllButton}
                  onPress={onMarkAllRead}
                  disabled={markingAll}
                >
                  <Text style={s.markAllText}>
                    {markingAll ? "Marking..." : "Mark all read"}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.75}
                style={s.notificationClose}
                onPress={onClose}
              >
                <Ionicons name="close" size={20} color={c.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Notifications */}
          {loading ? (
            <View style={s.notificationLoading}>
              <ActivityIndicator size="large" color={accent} />

              <Text style={[s.notificationEmptyText, { marginTop: 14 }]}>
                Loading notifications...
              </Text>
            </View>
          ) : mergedItems.length === 0 ? (
            <View style={s.notificationEmpty}>
              <View style={s.notificationEmptyIcon}>
                <Ionicons
                  name="notifications-off-outline"
                  size={27}
                  color={c.textMuted}
                />
              </View>

              <Text style={s.notificationEmptyTitle}>You're all caught up</Text>

              <Text style={s.notificationEmptyText}>
                No alerts or new chat messages right now. We'll let you know
                when something needs your attention.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={s.notificationList}
              showsVerticalScrollIndicator
            >
              {mergedItems.map((entry) => {
                // ----- new chat message / campaign alert -------------------
                if (entry.kind === "chat") {
                  const chat = entry.chat;
                  const unread = !chat.readAt;

                  return (
                    <TouchableOpacity
                      key={`chat-${String(chat._id)}`}
                      activeOpacity={0.82}
                      style={[
                        s.notificationCard,
                        {
                          backgroundColor: unread ? c.infoSoft : c.surface,
                          borderColor: c.borderLight,
                        },
                        unread && s.notificationCardUnread,
                      ]}
                      onPress={() => onChatPress(chat)}
                    >
                      <View style={s.notificationCardTop}>
                        <View
                          style={[
                            s.notificationCardIcon,
                            { backgroundColor: c.primarySoft },
                          ]}
                        >
                          <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={21}
                            color={c.info}
                          />
                        </View>

                        <View style={s.notificationCardTitleWrap}>
                          <Text
                            style={[
                              s.notificationCardTitle,
                              { color: c.info },
                            ]}
                            numberOfLines={2}
                          >
                            {chat.title}
                          </Text>

                          {unread && (
                            <View
                              style={[
                                s.notificationUnreadBadge,
                                { backgroundColor: c.info },
                              ]}
                            >
                              <Text style={s.notificationUnreadBadgeText}>
                                NEW
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <Text style={s.notificationCardMessage} numberOfLines={2}>
                        {chat.body}
                      </Text>

                      <View style={s.notificationCardBottom}>
                        <Text style={s.notificationCardTime}>
                          {formatNotificationTime(chat.createdAt)}
                        </Text>

                        <View style={s.notificationCardAction}>
                          <Text
                            style={[
                              s.notificationCardActionText,
                              { color: c.info },
                            ]}
                          >
                            Open chat
                          </Text>

                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={c.info}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }

                // ----- expiry alert (original rich card) --------------------
                const alert = entry.alert;
                const appearance = getNotificationAppearance(alert.type);

                const foodName =
                  alert.donation?.foodType ||
                  alert.donation?.foodName ||
                  "Food donation";

                return (
                  <TouchableOpacity
                    key={String(alert._id)}
                    activeOpacity={0.82}
                    style={[
                      s.notificationCard,
                      {
                        backgroundColor: appearance.background,
                        borderColor: appearance.borderColor,
                      },
                      !alert.read && s.notificationCardUnread,
                    ]}
                    onPress={() => onNotificationPress(alert)}
                  >
                    <View style={s.notificationCardTop}>
                      <View
                        style={[
                          s.notificationCardIcon,
                          {
                            backgroundColor: appearance.badgeBackground,
                          },
                        ]}
                      >
                        <Ionicons
                          name={appearance.icon}
                          size={21}
                          color={appearance.color}
                        />
                      </View>

                      <View style={s.notificationCardTitleWrap}>
                        <Text
                          style={[
                            s.notificationCardTitle,
                            {
                              color: appearance.color,
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {alert.title}
                        </Text>

                        {!alert.read && (
                          <View
                            style={[
                              s.notificationUnreadBadge,
                              {
                                backgroundColor: appearance.color,
                              },
                            ]}
                          >
                            <Text style={s.notificationUnreadBadgeText}>
                              NEW
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={s.notificationFoodRow}>
                      <View style={s.notificationFoodIcon}>
                        <MaterialCommunityIcons
                          name="food-outline"
                          size={17}
                          color={appearance.color}
                        />
                      </View>

                      <Text style={s.notificationFoodName} numberOfLines={1}>
                        {foodName}
                      </Text>
                    </View>

                    <View
                      style={[
                        s.notificationTimeBadge,
                        {
                          backgroundColor: appearance.badgeBackground,
                        },
                      ]}
                    >
                      <Ionicons
                        name="timer-outline"
                        size={15}
                        color={appearance.color}
                      />

                      <Text
                        style={[
                          s.notificationTimeBadgeText,
                          {
                            color: appearance.color,
                          },
                        ]}
                      >
                        {appearance.timeLabel}
                      </Text>
                    </View>

                    <Text style={s.notificationCardMessage}>
                      {alert.message}
                    </Text>

                    <View style={s.notificationCardBottom}>
                      <Text style={s.notificationCardTime}>
                        {formatNotificationTime(
                          alert.createdAt || alert.triggeredAt,
                        )}
                      </Text>

                      <View style={s.notificationCardAction}>
                        <Text
                          style={[
                            s.notificationCardActionText,
                            {
                              color: appearance.color,
                            },
                          ]}
                        >
                          View donation
                        </Text>

                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={appearance.color}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onRefresh}
                style={{
                  alignSelf: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  marginTop: 2,
                }}
              >
                <Text style={[s.markAllText, { fontSize: 12 }]}>
                  Refresh notifications
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

/* ========================================================= */
/* AVATAR                                                     */
/* ========================================================= */

function Avatar({
  name,
  size = 40,
  onDark,
  onPress,
}: {
  name: string;
  size?: number;
  onDark?: boolean;
  onPress?: () => void;
}) {
  const { c, s } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={!onPress}
      onPress={onPress}
      style={[
        s.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: onDark ? c.secondary : c.primary,
        },
      ]}
    >
      <Text
        style={[
          s.avatarText,
          {
            color: onDark ? c.textOnSecondary : c.textOnPrimary,
          },
        ]}
      >
        {name.charAt(0).toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
}

/* ========================================================= */
/* LOGOUT                                                     */
/* ========================================================= */

function LogoutAction({
  variant,
  onConfirm,
}: {
  variant: "sidebar" | "icon";
  onConfirm: () => void;
}) {
  const { c, s } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "sidebar" ? (
        <TouchableOpacity
          activeOpacity={0.85}
          style={s.logoutSidebar}
          onPress={() => setOpen(true)}
        >
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />

          <Text style={s.logoutSidebarText}>Log out</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          activeOpacity={0.85}
          style={s.logoutIcon}
          onPress={() => setOpen(true)}
        >
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalIcon}>
              <Ionicons name="log-out" size={32} color={c.error} />
            </View>

            <Text style={s.modalTitle}>Log out of ResQMeal?</Text>

            <Text style={s.modalText}>
              You can sign back in any time to keep rescuing meals.
            </Text>

            <View style={s.modalActions}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={s.modalStay}
                onPress={() => setOpen(false)}
              >
                <Text style={s.modalStayText}>Stay</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={s.modalConfirm}
                onPress={() => {
                  setOpen(false);
                  onConfirm();
                }}
              >
                <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />

                <Text style={s.modalConfirmText}>Log out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/* ========================================================= */
/* DONATION POST                                              */
/* ========================================================= */

function DonationPost({
  donation,
  width,
  authorName,
  onView,
}: {
  donation: Donation;
  width: number;
  authorName: string;
  onView: () => void;
}) {
  const { c, s } = useTheme();

  const status = donationStatusMeta(donation.status);

  const toneColor: Record<StatusTone, string> = {
    success: c.success,
    warning: c.secondaryDark,
    info: c.info,
    danger: c.error,
    muted: c.textMuted,
  };

  const toneBg: Record<StatusTone, string> = {
    success: c.successSoft,
    warning: c.warningSoft,
    info: c.infoSoft,
    danger: c.errorSoft,
    muted: c.surfaceSoft,
  };

  const expiry = donationExpiryLabel(donation);

  const portions = donation.numberOfPortions ?? donation.portions ?? 0;

  const location =
    donation.pickupLocation || donation.pickupDistrict || "Pickup on request";

  const urgent = isUrgentDonation(donation);

  const caption =
    donation.additionalDetails?.trim() ||
    `${donation.category || "Food donation"} \u00b7 ${portions} ${
      portions === 1 ? "portion" : "portions"
    } ready for pickup`;

  const title = donation.foodName || "Food donation";

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onView}
      style={[s.postCard, { width }]}
      accessibilityRole="button"
      accessibilityLabel={`Open post: ${title}`}
    >
      {urgent ? (
        <LinearGradient
          colors={[c.secondary, c.warning]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.postAccent}
        />
      ) : null}

      {/* Author strip - who posted it and when */}
      <View style={s.postHead}>
        <View style={s.postAvatarRing}>
          <LinearGradient
            colors={[c.primary, c.info]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.postAvatar}
          >
            <Text style={s.postAvatarText}>
              {(authorName.trim().charAt(0) || "D").toUpperCase()}
            </Text>
          </LinearGradient>
        </View>

        <View style={s.postAuthorCol}>
          <Text style={s.postAuthorName} numberOfLines={1}>
            {authorName}
          </Text>

          <Text style={s.postAuthorMeta} numberOfLines={1}>
            {`${donationPostedLabel(donation.createdAt)}${
              donation.donationCode ? ` \u00b7 ${donation.donationCode}` : ""
            }`}
          </Text>
        </View>

        <View
          style={[
            s.postStatusPill,
            {
              backgroundColor: toneBg[status.tone],
            },
          ]}
        >
          <Ionicons
            name={status.icon}
            size={12}
            color={toneColor[status.tone]}
          />

          <Text
            style={[s.postStatusText, { color: toneColor[status.tone] }]}
            numberOfLines={1}
          >
            {status.label}
          </Text>
        </View>
      </View>

      {/* Photo first, with the live facts floating on top of it */}
      <View style={s.postPhotoBox}>
        {donation.photoUrl ? (
          <Image
            source={{
              uri: donation.photoUrl,
            }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={[c.primaryDark, c.primary, c.info]}
            locations={[0, 0.6, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.postPhotoFallback}
          >
            <View style={s.postPhotoFallbackRing}>
              <MaterialCommunityIcons
                name="food-apple-outline"
                size={30}
                color="rgba(255,255,255,0.92)"
              />
            </View>

            <Text style={s.postPhotoFallbackText}>No photo shared yet</Text>
          </LinearGradient>
        )}

        <LinearGradient
          colors={[
            "rgba(1,28,46,0)",
            "rgba(1,28,46,0.55)",
            "rgba(1,28,46,0.88)",
          ]}
          locations={[0, 0.55, 1]}
          style={s.postPhotoScrim}
        />

        <View style={s.postPhotoEdge} />

        <View style={s.postChipRow}>
          {urgent ? (
            <View style={s.postChipWarn}>
              <Ionicons name="flash" size={11} color={c.primaryDark} />

              <Text style={s.postChipWarnText}>URGENT</Text>
            </View>
          ) : null}

          {expiry ? (
            <View style={s.postChip}>
              <Ionicons name="time-outline" size={12} color="#FFFFFF" />

              <Text style={s.postChipText}>{expiry}</Text>
            </View>
          ) : null}

          <View style={s.postChip}>
            <Ionicons name="location-outline" size={12} color="#FFFFFF" />

            <Text style={s.postChipText} numberOfLines={1}>
              {location}
            </Text>
          </View>
        </View>
      </View>

      {/* Caption and the numbers a rescuer acts on */}
      <View style={s.postBody}>
        <Text style={s.postTitle} numberOfLines={2}>
          {title}
        </Text>

        <Text style={s.postCaption} numberOfLines={3}>
          {caption}
        </Text>

        <View style={s.postStatBar}>
          <View style={s.postStat}>
            <Text style={s.postStatValue} numberOfLines={1}>
              {`${donation.quantity} ${donation.quantityUnit ?? "units"}`}
            </Text>

            <Text style={s.postStatLabel}>Quantity</Text>
          </View>

          <View style={s.postStatDivider} />

          <View style={s.postStat}>
            <Text style={s.postStatValue} numberOfLines={1}>
              {portions}
            </Text>

            <Text style={s.postStatLabel}>Portions</Text>
          </View>

          <View style={s.postStatDivider} />

          <View style={s.postStat}>
            <Text style={s.postStatValue} numberOfLines={1}>
              {donation.category || "Mixed"}
            </Text>

            <Text style={s.postStatLabel}>Category</Text>
          </View>
        </View>

        <View style={s.postFoot}>
          <View style={s.postFootNoteRow}>
            <View
              style={[
                s.postFootDot,
                { backgroundColor: toneColor[status.tone] },
              ]}
            />

            <Text style={s.postFootNote} numberOfLines={2}>
              {DONATION_FOOT_NOTE[donation.status]}
            </Text>
          </View>

          <LinearGradient
            colors={[c.primaryDark, c.primary, c.info]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.postViewBtn}
          >
            <Text style={s.postViewText}>View post</Text>

            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </LinearGradient>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* ========================================================= */
/* SECTION HEADER                                             */
/* ========================================================= */

function SectionHeader({
  title,
  onViewAll,
  large,
}: {
  title: string;
  onViewAll?: () => void;
  large?: boolean;
}) {
  const { accent, s } = useTheme();

  return (
    <View style={s.sectionHeader}>
      <Text
        style={[
          s.sectionTitle,
          large && {
            fontSize: 22,
            lineHeight: 30,
          },
        ]}
      >
        {title}
      </Text>

      {onViewAll && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onViewAll}
          style={s.viewAll}
        >
          <Text style={s.viewAllText}>View all</Text>

          <Ionicons name="arrow-forward" size={14} color={accent} />
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ========================================================= */
/* STAT CARD                                                  */
/* ========================================================= */

function StatCard({
  icon,
  value,
  label,
  tone,
  trailing,
  horizontal,
}: {
  icon: IconName;
  value: string | number;
  label: string;
  tone: "primary" | "secondary" | "tertiary";
  trailing?: React.ReactNode;
  horizontal?: boolean;
}) {
  const { c, accent, s } = useTheme();

  const tileBg =
    tone === "primary"
      ? c.primarySoft
      : tone === "secondary"
        ? c.secondarySoft
        : c.infoSoft;

  const iconColor =
    tone === "primary" ? accent : tone === "secondary" ? c.secondary : c.info;

  if (horizontal) {
    return (
      <View style={[s.statCard, s.statCardH]}>
        <View
          style={[
            s.statIcon,
            s.statIconLg,
            {
              backgroundColor: tileBg,
            },
          ]}
        >
          <Ionicons name={icon} size={28} color={iconColor} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[s.statValue, { marginTop: 0 }]}>{value}</Text>

          <Text style={s.statLabel}>{label}</Text>
        </View>

        {trailing}
      </View>
    );
  }

  return (
    <View style={s.statCard}>
      <View style={s.statTop}>
        <View
          style={[
            s.statIcon,
            {
              backgroundColor: tileBg,
            },
          ]}
        >
          <Ionicons name={icon} size={21} color={iconColor} />
        </View>

        {trailing}
      </View>

      <Text style={s.statValue}>{value}</Text>

      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

/* ========================================================= */
/* DESKTOP SIDEBAR                                            */
/* ========================================================= */

function Sidebar({
  fullName,
  active,
  onNavigate,
  onProfile,
  onLogout,
}: {
  fullName: string;
  active: SidebarKey;
  onNavigate: (tab: SidebarKey) => void;
  onProfile: () => void;
  onLogout: () => void;
}) {
  const { c, s } = useTheme();

  return (
    <LinearGradient
      colors={[c.primaryDark, c.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={s.sidebar}
    >
      <View style={s.sidebarCircleOne} />

      <View style={s.sidebarCircleTwo} />

      <Brand onDark />

      <View style={s.sidebarNav}>
        {SIDEBAR_NAV_ITEMS.map((item) => {
          const isActive = item.key === active;

          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.8}
              style={[s.sidebarItem, isActive && s.sidebarItemActive]}
              onPress={() => onNavigate(item.key)}
            >
              {isActive && <View style={s.sidebarIndicator} />}

              <Ionicons
                name={isActive ? item.iconActive : item.icon}
                size={21}
                color={isActive ? c.secondary : "rgba(255,255,255,0.74)"}
              />

              <Text
                style={[s.sidebarItemText, isActive && s.sidebarItemTextActive]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={s.sidebarSpacer} />

      <TouchableOpacity
        activeOpacity={0.85}
        style={s.sidebarUser}
        onPress={onProfile}
      >
        <Avatar name={fullName} size={44} onDark />

        <View style={{ flex: 1 }}>
          <Text style={s.sidebarUserName} numberOfLines={1}>
            {fullName}
          </Text>

          <Text style={s.sidebarUserRole}>Donor</Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={16}
          color="rgba(255,255,255,0.6)"
        />
      </TouchableOpacity>

      <LogoutAction variant="sidebar" onConfirm={onLogout} />
    </LinearGradient>
  );
}

/* ========================================================= */
/* BOTTOM TAB BAR                                             */
/* ========================================================= */

function BottomTabBar({
  active,
  onNavigate,
}: {
  active: SidebarKey;
  onNavigate: (tab: TabKey) => void;
}) {
  const { c, accent, s } = useTheme();

  const insets = useSafeAreaInsets();

  const renderTab = (item: NavItem) => {
    const isActive = item.key === active;

    return (
      <TouchableOpacity
        key={item.key}
        activeOpacity={0.8}
        style={s.tabItem}
        onPress={() => onNavigate(item.key)}
      >
        <View
          style={[
            s.tabIconPill,
            isActive && {
              backgroundColor: c.primarySoft,
            },
          ]}
        >
          <Ionicons
            name={isActive ? item.iconActive : item.icon}
            size={22}
            color={isActive ? accent : c.textMuted}
          />
        </View>

        <Text
          style={[
            s.tabLabel,
            {
              color: isActive ? accent : c.textMuted,
            },
          ]}
        >
          {item.tabLabel}
        </Text>
      </TouchableOpacity>
    );
  };

  // Impact lives further down the page itself, so it is left out of the
  // mobile tab bar (the desktop sidebar still offers it).
  const barItems = NAV_ITEMS.filter((item) => item.key !== "Impact");

  return (
    <View
      style={[
        s.tabBar,
        {
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View style={s.tabBarInner}>
        {barItems.slice(0, 2).map(renderTab)}

        <TouchableOpacity
          activeOpacity={0.85}
          style={s.tabItem}
          onPress={() => onNavigate("Create")}
        >
          <View style={s.tabFab}>
            <Ionicons name="add" size={30} color={c.textOnSecondary} />
          </View>

          <Text
            style={[
              s.tabLabel,
              {
                color: c.textSecondary,
              },
            ]}
          >
            Donate
          </Text>
        </TouchableOpacity>

        {barItems.slice(2).map(renderTab)}
      </View>
    </View>
  );
}

/* ========================================================= */
/* MOBILE NAV MENU                                            */
/* ========================================================= */

function MobileNavMenu({
  visible,
  fullName,
  active,
  onNavigate,
  onProfile,
  onClose,
}: {
  visible: boolean;
  fullName: string;
  active: SidebarKey;
  onNavigate: (tab: SidebarKey) => void;
  onProfile: () => void;
  onClose: () => void;
}) {
  const { c, accent, s } = useTheme();

  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.menuOverlay}>
        <View style={s.menuSheet}>
          <LinearGradient
            colors={[c.primaryDark, c.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              s.menuHeaderGradient,
              {
                paddingTop: Math.max(insets.top, 16) + 6,
              },
            ]}
          >
            <View style={s.menuHeaderTop}>
              <View style={s.brandRow}>
                <View style={s.menuBrandIcon}>
                  <MaterialCommunityIcons
                    name="leaf"
                    size={17}
                    color={c.textOnSecondary}
                  />
                </View>

                <Text
                  style={[
                    s.brandText,
                    {
                      color: "#FFFFFF",
                      fontSize: 18,
                    },
                  ]}
                >
                  ResQMeal
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.75}
                style={s.menuCloseButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={17} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={s.menuUserRow}
              onPress={onProfile}
            >
              <Avatar name={fullName} size={40} onDark />

              <View style={{ flex: 1 }}>
                <Text style={s.menuUserName} numberOfLines={1}>
                  {fullName}
                </Text>

                <Text style={s.menuUserRole}>Donor</Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={16}
                color="rgba(255,255,255,0.65)"
              />
            </TouchableOpacity>
          </LinearGradient>

          <View style={s.menuList}>
            {SIDEBAR_NAV_ITEMS.map((item) => {
              const isActive = item.key === active;

              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.8}
                  style={[s.menuItem, isActive && s.menuItemActive]}
                  onPress={() => onNavigate(item.key)}
                >
                  {isActive && <View style={s.menuItemIndicator} />}

                  <View
                    style={[
                      s.menuItemIconWrap,
                      isActive && {
                        backgroundColor: c.primarySoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isActive ? item.iconActive : item.icon}
                      size={18}
                      color={isActive ? accent : c.textSecondary}
                    />
                  </View>

                  <Text
                    style={[
                      s.menuItemText,
                      isActive && {
                        color: accent,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={s.menuScrim}
          activeOpacity={1}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

/* ========================================================= */
/* DESKTOP FOOTER                                             */
/* ========================================================= */

function SiteFooter({
  onNavigate,
  onSection,
  onTop,
}: {
  onNavigate: (tab: SidebarKey) => void;
  onSection: (key: SectionKey) => void;
  onTop: () => void;
}) {
  const { c, s } = useTheme();

  return (
    <LinearGradient
      colors={[c.primaryDark, c.primary, c.info]}
      locations={[0, 0.65, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.footerCard}
    >
      <View style={s.heroCircleOne} />

      <View style={s.heroCircleTwo} />

      <View style={s.footerTop}>
        <View style={s.footerBrandCol}>
          <Brand onDark />

          <Text style={s.footerBlurb}>
            ResQMeal connects people with surplus food to the people and
            organisations who need it, so good meals never go to waste.
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={s.footerCta}
            onPress={() => onNavigate("Create")}
          >
            <Ionicons name="add-circle" size={20} color={c.textOnSecondary} />

            <Text style={s.footerCtaText}>Donate food</Text>
          </TouchableOpacity>
        </View>

        <View style={s.footerCols}>
          <View style={s.footerCol}>
            <Text style={s.footerHeading}>Explore</Text>

            {NAV_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.7}
                onPress={() => onNavigate(item.key)}
              >
                <Text style={s.footerLink}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.footerCol}>
            <Text style={s.footerHeading}>Discover</Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onSection("donations")}
            >
              <Text style={s.footerLink}>Your donation posts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onSection("campaigns")}
            >
              <Text style={s.footerLink}>NGO campaigns</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onNavigate("FoodRequests")}
            >
              <Text style={s.footerLink}>Food rescue requests</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onNavigate("NGOCommunities")}
            >
              <Text style={s.footerLink}>NGO communities</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={s.footerRule} />

      <View style={s.footerBottom}>
        <Text style={s.footerCopy}>
          © {new Date().getFullYear()} ResQMeal. All rights reserved.
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          style={s.backToTop}
          onPress={onTop}
        >
          <Text style={s.backToTopText}>Back to top</Text>

          <Ionicons name="arrow-up" size={15} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

/* ========================================================= */
/* SCREEN                                                      */
/* ========================================================= */

export default function DonorHomeScreen({ navigation, route }: Props) {
  const { fullName } = route.params;

  const displayName = fullName?.trim() || "Donor";

  useEffect(() => {
    let cancelled = false;

    const registerPushNotifications = async () => {
      try {
        const token = await registerForPushNotificationsAsync();

        if (cancelled) {
          return;
        }

        if (token) {
          console.log("[DonorHome] Expo Push Token registered:", token);
        } else {
          console.log("[DonorHome] Expo Push Token was not registered.");
        }
      } catch (error) {
        console.error(
          "[DonorHome] Push notification registration failed:",
          error,
        );
      }
    };

    registerPushNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = fullName?.trim().split(" ")[0] || "there";

  const { c, accent, s } = useTheme();

  const L = useLayout();

  const scrollRef = useRef<ScrollView>(null);

  const sectionY = useRef<Partial<Record<SectionKey, number>>>({});

  const [search, setSearch] = useState("");

  const [feedFilter, setFeedFilter] = useState<FeedFilterId | null>(null);

  const [boxWidth, setBoxWidth] = useState(0);

  const [activeTab, setActiveTab] = useState<SidebarKey>("Home");

  const [menuOpen, setMenuOpen] = useState(false);

  /* ======================================================= */
  /* DONATIONS                                               */
  /* ======================================================= */

  const [donations, setDonations] = useState<Donation[]>([]);

  const [donationsLoading, setDonationsLoading] = useState(true);

  const loadDonations = useCallback(async () => {
    try {
      setDonationsLoading(true);

      const data = await getDonations("all");

      setDonations(data);
    } catch (error) {
      console.error("[DonorHome] Failed to load donations:", error);

      setDonations([]);
    } finally {
      setDonationsLoading(false);
    }
  }, []);

  /* ======================================================= */
  /* NGO CAMPAIGNS (community feed)                          */
  /* ======================================================= */

  const [campaigns, setCampaigns] = useState<CampaignPost[]>([]);

  const [campaignsLoading, setCampaignsLoading] = useState(true);

  const loadCampaigns = useCallback(async () => {
    try {
      setCampaignsLoading(true);

      const res = await api.get("/campaigns");

      setCampaigns(res.data.campaigns ?? []);
    } catch (error) {
      console.error("[DonorHome] Failed to load campaigns:", error);

      setCampaigns([]);
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  /* ======================================================= */
  /* EXPIRY NOTIFICATIONS                                    */
  /* ======================================================= */

  const [notifications, setNotifications] = useState<ExpiryAlert[]>([]);

  // Chat / campaign alerts from the persisted /api/notifications feed.
  const [chatNotifications, setChatNotifications] = useState<AppNotification[]>(
    [],
  );

  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const [notificationModalOpen, setNotificationModalOpen] = useState(false);

  const [markingAllNotifications, setMarkingAllNotifications] = useState(false);

  const loadNotifications = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setNotificationsLoading(true);
      }

      const [alertData, unreadCount, chatData, chatUnread] = await Promise.all([
        getExpiryAlerts({
          limit: 20,
        }),
        getUnreadExpiryAlertCount(),
        getAppNotifications({ limit: 20 }),
        getAppUnreadCount(),
      ]);

      console.log("🔔 EXPIRY ALERTS:", alertData);

      console.log("🔔 UNREAD COUNT:", unreadCount, "CHAT UNREAD:", chatUnread);

      setNotifications(alertData ?? []);

      setChatNotifications(chatData ?? []);

      setUnreadNotificationCount((Number(unreadCount) || 0) + chatUnread);
    } catch (error) {
      console.error("[DonorHome] Failed to load expiry notifications:", error);
    } finally {
      if (showLoader) {
        setNotificationsLoading(false);
      }
    }
  }, []);

  /*
   * Refresh donations and notifications
   * whenever Donor Home receives focus.
   */
  useFocusEffect(
    useCallback(() => {
      loadDonations();
      loadNotifications(false);
    }, [loadDonations, loadNotifications]),
  );

  // Realtime: bump the bell as soon as a peer's message push arrives.
  useEffect(() => {
    const unsubscribe = onNewNotification(() => {
      loadNotifications(false);
    });

    return unsubscribe;
  }, [loadNotifications]);

  const openNotifications = useCallback(() => {
    setNotificationModalOpen(true);

    loadNotifications(true);
  }, [loadNotifications]);

  const closeNotifications = useCallback(() => {
    setNotificationModalOpen(false);
  }, []);

  const handleMarkNotificationRead = useCallback(async (alert: ExpiryAlert) => {
    if (alert.read) {
      return;
    }

    try {
      await markExpiryAlertAsRead(String(alert._id));

      setNotifications((current) =>
        current.map((item) =>
          String(item._id) === String(alert._id)
            ? {
                ...item,
                read: true,
              }
            : item,
        ),
      );

      setUnreadNotificationCount((current) => Math.max(0, current - 1));
    } catch (error) {
      console.error("[DonorHome] Failed to mark notification as read:", error);
    }
  }, []);

  const handleMarkAllNotificationsRead = useCallback(async () => {
    if (unreadNotificationCount === 0) {
      return;
    }

    try {
      setMarkingAllNotifications(true);

      await markAllExpiryAlertsAsRead();

      await markAllAppNotificationsRead();

      setChatNotifications((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read: true,
        })),
      );

      setUnreadNotificationCount(0);
    } catch (error) {
      console.error(
        "[DonorHome] Failed to mark all notifications as read:",
        error,
      );
    } finally {
      setMarkingAllNotifications(false);
    }
  }, [unreadNotificationCount]);

  const handleNotificationPress = useCallback(
    async (alert: ExpiryAlert) => {
      try {
        // ---------------------------------------------
        // 1. Mark notification as read
        // ---------------------------------------------
        if (!alert.read) {
          await markExpiryAlertAsRead(String(alert._id));

          setNotifications((previous) =>
            previous.map((item) =>
              String(item._id) === String(alert._id)
                ? {
                    ...item,
                    read: true,
                  }
                : item,
            ),
          );

          setUnreadNotificationCount((count) => Math.max(0, count - 1));
        }

        // ---------------------------------------------
        // 2. Get related donation ID
        // ---------------------------------------------
        const donationId = alert.donation?._id;

        if (!donationId) {
          console.warn(
            "[DonorHome] Notification has no related donation:",
            alert,
          );
          return;
        }

        // ---------------------------------------------
        // 3. Close notification modal
        // ---------------------------------------------
        setNotificationModalOpen(false);

        // ---------------------------------------------
        // 4. Navigate to donation details
        // ---------------------------------------------
        navigation.navigate("DonationDetail", {
          donationId: String(donationId),
        });
      } catch (error) {
        console.error("[DonorHome] Failed to open notification:", error);
      }
    },
    [navigation],
  );

  // Tapping a chat alert opens that exact 1-on-1 conversation.
  const handleChatNotificationPress = useCallback(
    async (item: AppNotification) => {
      try {
        if (!item.readAt) {
          await markAppNotificationRead(String(item._id));

          setChatNotifications((current) =>
            current.map((n) =>
              String(n._id) === String(item._id)
                ? { ...n, readAt: new Date().toISOString() }
                : n,
            ),
          );

          setUnreadNotificationCount((count) => Math.max(0, count - 1));
        }

        const data = item.data ?? {};

        if (
          item.type === "CHAT_NEW_MESSAGE" &&
          data.contextType &&
          data.contextId &&
          data.senderId
        ) {
          setNotificationModalOpen(false);

          navigation.navigate("Chat", {
            contextType: data.contextType,
            contextId: String(data.contextId),
            peerId: String(data.senderId),
            title:
              data.contextType === "campaign"
                ? String(data.title || "Campaign chat")
                : "Rescue chat",
            subtitle: data.senderName
              ? `Chat · ${String(data.senderName)}`
              : undefined,
          });
          return;
        }

        // Alerts saved before senderId existed still lead to the chat list.
        if (item.target?.type === "chat") {
          setNotificationModalOpen(false);

          navigation.navigate("ChatList");
        }
      } catch (error) {
        console.error("[DonorHome] Failed to open chat notification:", error);
      }
    },
    [navigation],
  );
  /* ======================================================= */
  /* DERIVED DATA                                            */
  /* ======================================================= */

  const query = search.trim().toLowerCase();

  /*
    Expired posts stay off the home page, so the pool below is what every
    label, chip count and empty state on this page is measured against.
  */
  const feedPool = useMemo(
    () => donations.filter(isVisibleInDonorFeed),
    [donations],
  );

  /* Chip counts come from the visible pool, so they match what a chip opens. */
  const feedCounts = useMemo(() => countToneFilters(donations), [donations]);

  /* Words plus the one active chip, newest first. Impact figures stay put. */
  const filteredFeed = useMemo(
    () => buildDonorFeed(donations, { query, filter: feedFilter }),
    [donations, query, feedFilter],
  );

  const impact = useMemo(() => summarizeDonorImpact(donations), [donations]);

  const hour = new Date().getHours();

  const greetingWord =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  /* ======================================================= */
  /* SIZES                                                    */
  /* ======================================================= */

  const innerWidth =
    boxWidth > 0
      ? boxWidth - L.pad * 2
      : Math.min(L.width - (L.isDesktop ? SIDEBAR_WIDTH : 0), CONTENT_MAX) -
        L.pad * 2;

  /*
    Horizontal strip: one post fills most of a phone so the next card peeks
    in and invites a swipe; larger screens get a fixed comfortable card.
  */
  const postCardWidth = L.isDesktop
    ? 430
    : L.isTablet
      ? 380
      : Math.min(Math.floor(innerWidth * 0.84), 380);

  const hero = {
    minHeight: L.isDesktop ? 340 : L.isTablet ? 270 : 225,

    padding: L.isDesktop ? 40 : L.isTablet ? 32 : 20,

    title: L.isDesktop ? 48 : L.isTablet ? 38 : 27,

    subtitle: L.isDesktop ? 16 : L.isTablet ? 14.5 : 11.5,

    illustrationWidth: L.isDesktop ? 280 : L.isTablet ? 200 : 105,

    circle: L.isDesktop ? 200 : L.isTablet ? 150 : 92,

    icon: L.isDesktop ? 120 : L.isTablet ? 90 : 66,
  };

  const sectionGap = L.isDesktop ? 44 : 28;

  /* ======================================================= */
  /* SCROLLING + NAVIGATION                                  */
  /* ======================================================= */

  const track = (key: SectionKey) => (e: LayoutChangeEvent) => {
    sectionY.current[key] = e.nativeEvent.layout.y;
  };

  const scrollToTop = () => {
    setActiveTab("Home");

    scrollRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
  };

  const scrollToSection = (key: SectionKey) => {
    const y = sectionY.current[key];

    if (y === undefined) {
      return;
    }

    if (key === "impact") {
      setActiveTab("Impact");
    }

    scrollRef.current?.scrollTo({
      y: Math.max(0, y - 16),
      animated: true,
    });
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;

    const impactY = sectionY.current.impact;

    const donationsY = sectionY.current.donations;

    const next: TabKey =
      impactY !== undefined &&
      donationsY !== undefined &&
      y >= impactY - 200 &&
      y < donationsY - 200
        ? "Impact"
        : "Home";

    setActiveTab((prev) => (prev === next ? prev : next));
  };

  const handleNavigate = (tab: SidebarKey) => {
    if (tab === "Home") {
      scrollToTop();
    }

    if (tab === "Impact") {
      scrollToSection("impact");
    }

    if (tab === "Create") {
      navigation.navigate("CreateDonation");
    }

    if (tab === "Donations") {
      navigation.navigate("MyDonations");
    }

    if (tab === "Profile") {
      navigation.navigate("Profile");
    }

    if (tab === "FoodRequests") {
      navigation.navigate("FoodRescueRequests");
    }

    if (tab === "NGOCommunities") {
      navigation.navigate("NGOCommunities");
    }

    if (tab === "Map") {
      navigation.navigate("FoodRescueMap");
    }
  };

  const handleLogout = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: LOGOUT_ROUTE as any,
        },
      ],
    });
  };

  /* Every quick action leads somewhere real - a screen or a section below. */
  const runQuickAction = (id: QuickActionId) => {
    if (id === "create") {
      navigation.navigate("CreateDonation");

      return;
    }

    if (id === "posts") {
      scrollToSection("donations");

      return;
    }

    if (id === "campaigns") {
      scrollToSection("campaigns");

      return;
    }

    if (id === "requests") {
      navigation.navigate("FoodRescueRequests");

      return;
    }

    navigation.navigate("FoodRescueMap");
  };

  /* ======================================================= */
  /* SEARCH                                                   */
  /* ======================================================= */

  const searchRow = (
    <View style={s.searchRow}>
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={20} color={c.textMuted} />

        <TextInput
          placeholder="Search your posts..."
          placeholderTextColor={c.inputPlaceholder}
          value={search}
          onChangeText={setSearch}
          style={s.searchInput}
        />

        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={19} color={c.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        style={s.searchAction}
        onPress={() => navigation.navigate("CreateDonation")}
        accessibilityRole="button"
        accessibilityLabel="Post a new donation"
      >
        <Ionicons name="add" size={20} color={c.textOnPrimary} />

        {!L.isMobile && <Text style={s.searchActionText}>New post</Text>}
      </TouchableOpacity>
    </View>
  );

  /* ======================================================= */
  /* HERO                                                      */
  /* ======================================================= */

  const heroBlock = (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() => navigation.navigate("CreateDonation")}
      style={s.heroWrap}
    >
      <LinearGradient
        colors={[c.primaryDark, c.primary, c.info]}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          s.hero,
          {
            minHeight: hero.minHeight,
            padding: hero.padding,
          },
        ]}
      >
        <View style={s.heroCircleOne} />

        <View style={s.heroCircleTwo} />

        <View style={s.heroContent}>
          <View style={s.heroPill}>
            <MaterialCommunityIcons
              name="heart-outline"
              size={14}
              color="#FFFFFF"
            />

            <Text style={s.heroPillText}>Make a difference</Text>
          </View>

          <Text
            style={[
              s.heroTitle,
              {
                fontSize: hero.title,
                lineHeight: Math.round(hero.title * 1.12),
                marginTop: L.isMobile ? 13 : 20,
              },
            ]}
          >
            Good food.
          </Text>

          <Text
            style={[
              s.heroTitleAccent,
              {
                fontSize: hero.title,
                lineHeight: Math.round(hero.title * 1.12),
              },
            ]}
          >
            Good impact.
          </Text>

          <Text
            style={[
              s.heroSubtitle,
              {
                fontSize: hero.subtitle,
                lineHeight: Math.round(hero.subtitle * 1.5),
                marginTop: L.isMobile ? 8 : 14,
                marginBottom: L.isMobile ? 15 : 24,
                maxWidth: 460,
              },
            ]}
          >
            Turn your surplus food into meaningful meals for people who need
            them.
          </Text>

          <View style={s.heroButtons}>
            <View style={s.heroCta}>
              <Text style={s.heroCtaText}>Donate food</Text>

              <View style={s.heroCtaArrow}>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={c.textOnSecondary}
                />
              </View>
            </View>

            {!L.isMobile && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={s.heroGhost}
                onPress={() => navigation.navigate("MyDonations")}
              >
                <Text style={s.heroGhostText}>My donations</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View
          style={[
            s.heroIllustration,
            {
              width: hero.illustrationWidth,
            },
          ]}
        >
          <View
            style={[
              s.heroIllustrationCircle,
              {
                width: hero.circle,
                height: hero.circle,
                borderRadius: hero.circle / 2,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="food-apple-outline"
              size={hero.icon}
              color="rgba(255,255,255,0.92)"
            />
          </View>

          <View
            style={[
              s.floatingChip,
              {
                top: L.isMobile ? -6 : 8,
                right: L.isMobile ? -4 : 6,
                width: L.isMobile ? 34 : 52,
                height: L.isMobile ? 34 : 52,
                borderRadius: L.isMobile ? 17 : 26,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="leaf"
              size={L.isMobile ? 20 : 28}
              color={c.secondary}
            />
          </View>

          <View
            style={[
              s.floatingChip,
              {
                bottom: L.isMobile ? -6 : 8,
                left: L.isMobile ? -6 : 6,
                width: L.isMobile ? 32 : 46,
                height: L.isMobile ? 32 : 46,
                borderRadius: L.isMobile ? 16 : 23,
              },
            ]}
          >
            <Ionicons
              name="heart"
              size={L.isMobile ? 16 : 22}
              color="#FFFFFF"
            />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  /* ======================================================= */
  /* QUICK ACTIONS                                            */
  /* ======================================================= */

  const quickActions = (
    <View
      style={{
        marginTop: sectionGap,
      }}
    >
      <SectionHeader title="What would you like to do?" large={!L.isMobile} />

      {L.isMobile ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            marginHorizontal: -L.pad,
          }}
          contentContainerStyle={{
            paddingHorizontal: L.pad,
            gap: 10,
          }}
        >
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              activeOpacity={0.8}
              style={s.quickTileMobile}
              onPress={() => runQuickAction(action.id)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <View style={s.quickIconMobile}>
                <Ionicons name={action.icon} size={24} color={accent} />
              </View>

              <Text style={s.quickLabelMobile} numberOfLines={2}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={s.quickWrap}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              activeOpacity={0.85}
              style={s.quickTile}
              onPress={() => runQuickAction(action.id)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <View style={s.quickIcon}>
                <Ionicons name={action.icon} size={23} color={accent} />
              </View>

              <Text style={s.quickLabel} numberOfLines={2}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  /* ======================================================= */
  /* RENDER                                                    */
  /* ======================================================= */

  return (
    <SafeAreaView style={s.safeArea} edges={["top"]}>
      <View
        style={{
          flex: 1,
          flexDirection: L.isDesktop ? "row" : "column",
        }}
      >
        {/* DESKTOP SIDEBAR / MOBILE HEADER */}

        {L.isDesktop ? (
          <Sidebar
            fullName={displayName}
            active={activeTab}
            onNavigate={handleNavigate}
            onProfile={() => navigation.navigate("Profile")}
            onLogout={handleLogout}
          />
        ) : (
          <View
            style={[
              s.mobileHeader,
              {
                paddingHorizontal: L.pad,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.75}
              style={s.iconButton}
              onPress={() => setMenuOpen(true)}
            >
              <Ionicons name="menu-outline" size={24} color={c.text} />
            </TouchableOpacity>

            <Brand />

            <View style={s.headerActions}>
              <NotificationButton
                size={40}
                unreadCount={unreadNotificationCount}
                onPress={openNotifications}
              />

              <Avatar
                name={firstName}
                size={36}
                onPress={() => navigation.navigate("Profile")}
              />

              <LogoutAction variant="icon" onConfirm={handleLogout} />
            </View>
          </View>
        )}

        {/* MOBILE / TABLET NAV MENU */}

        {!L.isDesktop && (
          <MobileNavMenu
            visible={menuOpen}
            fullName={displayName}
            active={activeTab}
            onNavigate={(tab) => {
              setMenuOpen(false);

              handleNavigate(tab);
            }}
            onProfile={() => {
              setMenuOpen(false);

              navigation.navigate("Profile");
            }}
            onClose={() => setMenuOpen(false)}
          />
        )}

        {/* PAGE */}

        <ScrollView
          ref={scrollRef}
          style={{
            flex: 1,
          }}
          showsVerticalScrollIndicator={!L.isDesktop}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            s.scrollContent,
            {
              paddingBottom: L.isDesktop ? 0 : 130,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              s.container,
              {
                paddingHorizontal: L.pad,
              },
            ]}
            onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}
          >
            {/* Welcome */}

            <View
              style={[
                s.welcomeRow,
                {
                  marginTop: L.isDesktop ? 36 : 8,
                },
              ]}
            >
              <View
                style={{
                  flexShrink: 1,
                }}
              >
                <Text
                  style={[
                    s.greeting,
                    L.isDesktop
                      ? {
                          fontSize: 34,
                          lineHeight: 42,
                        }
                      : {
                          fontSize: 26,
                          lineHeight: 34,
                        },
                  ]}
                >
                  {greetingWord}, {firstName} 👋
                </Text>

                <Text style={s.greetingSub}>
                  Ready to make an impact today?
                </Text>
              </View>

              {L.isDesktop ? (
                <NotificationButton
                  unreadCount={unreadNotificationCount}
                  onPress={openNotifications}
                />
              ) : (
                L.isTablet && (
                  <View style={s.welcomeDecoration}>
                    <MaterialCommunityIcons
                      name="food-apple"
                      size={26}
                      color={c.secondary}
                    />
                  </View>
                )
              )}
            </View>

            {/* Search */}

            <View
              style={{
                marginTop: L.isDesktop ? 24 : 16,
              }}
            >
              {searchRow}
            </View>

            {/* Hero */}

            <View
              style={{
                marginTop: L.isDesktop ? 28 : 20,
              }}
            >
              {heroBlock}
            </View>

            {/* Quick actions */}

            {quickActions}

            {/* Impact */}

            <View
              style={{
                marginTop: sectionGap,
              }}
              onLayout={track("impact")}
            >
              <SectionHeader title="Your impact so far" large={!L.isMobile} />

              <View
                style={[
                  s.impactRow,
                  L.isDesktop && {
                    gap: 16,
                  },
                ]}
              >
                <StatCard
                  icon="restaurant"
                  tone="secondary"
                  horizontal={L.isDesktop}
                  value={impact.pledged}
                  label="Portions pledged"
                  trailing={
                    <Ionicons name="trending-up" size={20} color={c.success} />
                  }
                />

                <StatCard
                  icon="pulse"
                  tone="primary"
                  horizontal={L.isDesktop}
                  value={impact.live}
                  label="Open posts"
                  trailing={<View style={s.liveDot} />}
                />

                <StatCard
                  icon="checkmark-done"
                  tone="tertiary"
                  horizontal={L.isDesktop}
                  value={impact.delivered}
                  label="Portions delivered"
                  trailing={<Ionicons name="heart" size={18} color={c.info} />}
                />
              </View>
            </View>

            {/* Your donation posts */}

            <View
              style={{
                marginTop: sectionGap,
              }}
              onLayout={track("donations")}
            >
              <SectionHeader
                title="Your donation posts"
                large={!L.isMobile}
                onViewAll={() => navigation.navigate("MyDonations")}
              />

              {/* Urgency chips: tap one to narrow the strip, tap it again to undo */}
              <View style={s.postFilterRow}>
                {FEED_FILTERS.map(({ id, label, icon }) => {
                  const active = feedFilter === id;

                  /* The amber chip needs dark label text to stay readable */
                  const onWarn = active && id === "urgent";

                  return (
                    <TouchableOpacity
                      key={id}
                      activeOpacity={0.8}
                      style={[
                        s.postFilterChip,
                        active && s.postFilterChipActive,
                        onWarn && s.postFilterChipActiveWarn,
                      ]}
                      onPress={() => {
                        setFeedFilter(active ? null : id);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: active,
                      }}
                      accessibilityLabel={
                        active
                          ? "Show all posts again"
                          : `Show only ${label.toLowerCase()} posts`
                      }
                    >
                      <Ionicons
                        name={icon}
                        size={13}
                        color={
                          active ? (onWarn ? c.primaryDark : "#FFFFFF") : c.textSecondary
                        }
                      />

                      <Text
                        style={[
                          s.postFilterChipText,
                          active && s.postFilterChipTextActive,
                          onWarn && s.postFilterChipOnWarn,
                        ]}
                      >
                        {label}
                      </Text>

                      <Text
                        style={[
                          s.postFilterCount,
                          active && s.postFilterCountActive,
                          onWarn && s.postFilterChipOnWarn,
                        ]}
                      >
                        {feedCounts[id]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {feedFilter ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={s.postFilterClear}
                    onPress={() => {
                      setFeedFilter(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Show all posts again"
                  >
                    <Ionicons name="close" size={12} color={c.textMuted} />

                    <Text style={s.postFilterClearText}>Show all</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {donationsLoading ? (
                <View style={s.empty}>
                  <ActivityIndicator size="small" color={accent} />

                  <Text style={s.emptyText}>Loading your donations...</Text>
                </View>
              ) : feedPool.length === 0 ? (
                <View style={s.postEmpty}>
                  <Ionicons
                    name="add-circle-outline"
                    size={30}
                    color={c.textMuted}
                  />

                  <Text style={s.postEmptyTitle}>
                    {donations.length === 0 ? "No posts yet" : "Nothing open right now"}
                  </Text>

                  <Text style={s.postEmptyText}>
                    {donations.length === 0
                      ? "Share the surplus you have and it appears here as a post recipients and NGOs can claim."
                      : "Every post you made has reached the end of its pickup window. Share the next surplus and it appears here."}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={s.postEmptyCta}
                    onPress={() => navigation.navigate("CreateDonation")}
                    accessibilityRole="button"
                    accessibilityLabel="Post your first donation"
                  >
                    <Ionicons name="heart" size={16} color="#FFFFFF" />

                    <Text style={s.postEmptyCtaText}>Donate food</Text>
                  </TouchableOpacity>
                </View>
              ) : filteredFeed.length === 0 ? (
                <View style={s.postEmpty}>
                  <Ionicons
                    name="search-outline"
                    size={28}
                    color={c.textMuted}
                  />

                  <Text style={s.postEmptyTitle}>Nothing matches this view</Text>

                  <Text style={s.postEmptyText}>
                    {query
                      ? `No post matches “${search.trim()}” in this view.`
                      : feedFilter === "urgent"
                        ? "None of your posts are flagged urgent right now."
                        : "Every post you have open is flagged urgent."}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={s.postEmptyCta}
                    onPress={() => {
                      setSearch("");

                      setFeedFilter(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear the search and the urgency filter"
                  >
                    <Ionicons name="refresh" size={16} color="#FFFFFF" />

                    <Text style={s.postEmptyCtaText}>Clear filters</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* Swipe through the posts instead of scrolling down the page */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    indicatorStyle="black"
                    style={{
                      marginHorizontal: L.isDesktop ? 0 : -L.pad,
                    }}
                    contentContainerStyle={[
                      s.postFeed,
                      {
                        paddingHorizontal: L.isDesktop ? 0 : L.pad,
                      },
                    ]}
                  >
                    {filteredFeed.map((donation, index) => (
                      <DonationPost
                        key={donationRouteId(donation) || `post-${index}`}
                        donation={donation}
                        width={postCardWidth}
                        authorName={displayName}
                        onView={() => {
                          const donationId = donationRouteId(donation);

                          if (!donationId) {
                            return;
                          }

                          navigation.navigate("DonationDetail", {
                            donationId,
                          });
                        }}
                      />
                    ))}
                  </ScrollView>

                  <View style={s.postStripHint}>
                    <Ionicons
                      name="swap-horizontal-outline"
                      size={15}
                      color={c.textMuted}
                    />

                    <Text style={s.postStripHintText}>
                      {`Swipe through your ${filteredFeed.length} ${
                        filteredFeed.length === 1 ? "post" : "posts"
                      }${
                        feedFilter
                          ? ` \u00b7 ${feedFilter === "urgent" ? "urgent only" : "normal only"}`
                          : ""
                      }`}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* My chats — shortcut to the donor's full rescue chat history */}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate("ChatList")}
              style={{
                marginTop: sectionGap,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                padding: Spacing.four,
                borderRadius: Radius.md,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.borderLight,
                ...Shadows.card,
              }}
              accessibilityLabel="Open my chats"
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: c.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="chatbubbles-outline" size={22} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...Typography.h3, color: c.text, fontSize: 16 }}>
                  My chats
                </Text>
                <Text style={{ ...Typography.bodySmall, color: c.textMuted, marginTop: 2 }}>
                  Every rescue conversation with recipients who asked for your donations
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
            </TouchableOpacity>

            {/* NGO campaigns — shared component, includes the chat button */}

            <View
              style={{
                marginTop: sectionGap,
              }}
              onLayout={track("campaigns")}
            >
              <AmashaCampaignFeedSection
                title="NGO campaigns"
                subtitle="Food drives, surplus pickups and awareness events near you"
              />
            </View>

            {/* Desktop footer */}

            {L.isDesktop && (
              <SiteFooter
                onNavigate={handleNavigate}
                onSection={scrollToSection}
                onTop={scrollToTop}
              />
            )}
          </View>
        </ScrollView>
      </View>

      {/* Notification modal */}

      <NotificationModal
        visible={notificationModalOpen}
        alerts={notifications}
        chatItems={chatNotifications}
        unreadCount={unreadNotificationCount}
        loading={notificationsLoading}
        markingAll={markingAllNotifications}
        onClose={closeNotifications}
        onRefresh={() => loadNotifications(true)}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onNotificationPress={handleNotificationPress}
        onChatPress={handleChatNotificationPress}
      />

      {/* Bottom tabs */}

      {!L.isDesktop && (
        <BottomTabBar active={activeTab} onNavigate={handleNavigate} />
      )}
    </SafeAreaView>
  );
}
