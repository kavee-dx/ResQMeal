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
//
// All colours, spacing, radius, typography and shadows come from
// constants/theme.ts (light + dark, follows the device / browser setting).

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
} from 'react-native';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import {
  Colors,
  ComponentSizes,
  Radius,
  Shadows,
  Spacing,
  Typography,
} from '../constants/theme';
import type { ThemeColor } from '../constants/theme';

import {
  MOCK_CATEGORIES,
  MOCK_COMMUNITY_POSTS,
  MOCK_IMPACT,
  MOCK_NGO_CAMPAIGNS,
  MOCK_RECIPIENTS,
} from '../constants/kaveesha-mockData';

import type {
  Donation,
  DonationUrgency,
} from '../types/kaveesha-donation.types';

import { getDonations } from '../services/kaveesha-donationApi';

/* ========================================================= */
/* TYPES + CONSTANTS                                          */
/* ========================================================= */

type Props = NativeStackScreenProps<RootStackParamList, 'DonorHome'>;

type Palette = Record<ThemeColor, string>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];
type TabKey = 'Home' | 'Donations' | 'Impact' | 'Create' | 'Profile';

// Two extra destinations that live in the sidebar (laptop) / hamburger
// menu (phone + tablet) but NOT in the bottom tab bar, so the mobile
// footer stays exactly as it was.
//   FoodRequests   -> recipients' food requests, searchable by the donor
//   NGOCommunities -> NGO profiles + campaigns, searchable by the donor
// >>> Once those screens exist, add their route names to
//     RootStackParamList and replace the `as any` casts in
//     handleNavigate below. <<<
type ExtraNavKey = 'FoodRequests' | 'NGOCommunities';
type SidebarKey = TabKey | ExtraNavKey;

type SectionKey =
  | 'impact'
  | 'donations'
  | 'campaigns'
  | 'recipients'
  | 'posts';

// Name of the screen to go back to after logging out.
// >>> Change this to the login / welcome route name in your navigator. <<<
const LOGOUT_ROUTE = 'Login';

const CONTENT_MAX = 1200; // max width of the page content
const SIDEBAR_WIDTH = 264;
const GRID_GAP = 16;
const MOBILE_CARD_WIDTH = 260;

type NavItem = {
  key: Exclude<TabKey, 'Create'>;
  label: string; // sidebar / footer label
  tabLabel: string; // bottom tab label
  icon: IconName;
  iconActive: IconName;
};

// Order: Home, My donations, Impact, Profile
// This exact list is what the BOTTOM TAB BAR (phone/tablet footer) and
// the desktop footer's "Explore" column use — keep it untouched so the
// mobile footer never changes.
const NAV_ITEMS: NavItem[] = [
  { key: 'Home', label: 'Home', tabLabel: 'Home', icon: 'home-outline', iconActive: 'home' },
  { key: 'Donations', label: 'My donations', tabLabel: 'Donations', icon: 'gift-outline', iconActive: 'gift' },
  { key: 'Impact', label: 'Impact', tabLabel: 'Impact', icon: 'heart-outline', iconActive: 'heart' },
  { key: 'Profile', label: 'Profile', tabLabel: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

type ExtraNavItem = {
  key: ExtraNavKey;
  label: string;
  icon: IconName;
  iconActive: IconName;
};

// Shown in the desktop sidebar and the phone/tablet hamburger menu only,
// inserted right after "My donations". Each will get its own screen —
// for now they just navigate (see handleNavigate).
const EXTRA_NAV_ITEMS: ExtraNavItem[] = [
  {
    key: 'FoodRequests',
    label: 'Food rescue requests',
    icon: 'fast-food-outline',
    iconActive: 'fast-food',
  },
  {
    key: 'NGOCommunities',
    label: 'NGO communities',
    icon: 'people-circle-outline',
    iconActive: 'people-circle',
  },
];

// Sidebar + hamburger-menu order: Home, My donations, Food rescue
// requests, NGO communities, Impact, Profile.
const SIDEBAR_NAV_ITEMS: Array<NavItem | ExtraNavItem> = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  ...EXTRA_NAV_ITEMS,
  NAV_ITEMS[2],
  NAV_ITEMS[3],
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

  return { width, isDesktop, isTablet, isMobile, pad };
}

function makeStyles(c: Palette, accent: string) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.background },
    scrollContent: { alignItems: 'center' },
    container: { width: '100%', maxWidth: CONTENT_MAX },

    /* ---------------- Brand ---------------- */
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    brandIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandText: {
      ...Typography.h3,
      fontSize: 21,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.4,
    },

    /* ---------------- Desktop sidebar ---------------- */
    sidebar: {
      width: SIDEBAR_WIDTH,
      paddingHorizontal: 18,
      paddingTop: 28,
      paddingBottom: 22,
      overflow: 'hidden',
    },
    sidebarCircleOne: {
      position: 'absolute',
      width: 260,
      height: 260,
      borderRadius: 130,
      bottom: -110,
      left: -90,
      backgroundColor: 'rgba(255,255,255,0.04)',
    },
    sidebarCircleTwo: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: 100,
      top: -80,
      right: -90,
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    sidebarNav: { marginTop: 40, gap: 6 },
    sidebarItem: {
      height: 50,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 16,
      borderRadius: Radius.md,
      overflow: 'hidden',
    },
    sidebarItemActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
    sidebarIndicator: {
      position: 'absolute',
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
      color: 'rgba(255,255,255,0.74)',
    },
    sidebarItemTextActive: { color: '#FFFFFF', fontWeight: '700' },
    sidebarSpacer: { flex: 1 },
    sidebarUser: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: Radius.lg,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
      marginBottom: 12,
    },
    sidebarUserName: {
      ...Typography.label,
      fontSize: 14,
      color: '#FFFFFF',
    },
    sidebarUserRole: {
      ...Typography.bodySmall,
      color: 'rgba(255,255,255,0.62)',
    },

    /* ---------------- Logout button + dialog ---------------- */
    logoutSidebar: {
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: Radius.md,
      backgroundColor: c.error,
      ...Shadows.button,
    },
    logoutSidebarText: { ...Typography.button, color: '#FFFFFF' },
    logoutIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: c.error,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(1,19,31,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    modalSheet: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: c.surface,
      borderRadius: Radius.xl,
      padding: 28,
      alignItems: 'center',
      ...Shadows.card,
    },
    modalIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.errorSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      ...Typography.h3,
      color: c.text,
      marginTop: 18,
      textAlign: 'center',
    },
    modalText: {
      ...Typography.body,
      color: c.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
      width: '100%',
    },
    modalStay: {
      flex: 1,
      height: 48,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalStayText: { ...Typography.button, color: c.text },
    modalConfirm: {
      flex: 1,
      height: 48,
      borderRadius: Radius.pill,
      backgroundColor: c.error,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    modalConfirmText: { ...Typography.button, color: '#FFFFFF' },

    /* ---------------- Phone / tablet hamburger nav menu ---------------- */
    menuOverlay: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: 'rgba(1,19,31,0.5)',
    },
    menuScrim: { flex: 1 },
    menuSheet: {
      width: 296,
      maxWidth: '84%',
      height: '100%',
      backgroundColor: c.surface,
      borderTopRightRadius: 26,
      borderBottomRightRadius: 26,
      overflow: 'hidden',
      shadowColor: '#011C2E',
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    menuBrandIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuCloseButton: {
      width: 32,
      height: 32,
      borderRadius: 11,
      backgroundColor: 'rgba(255,255,255,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuUserRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: Radius.lg,
      backgroundColor: 'rgba(255,255,255,0.10)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.14)',
    },
    menuUserName: { ...Typography.label, fontSize: 14, color: '#FFFFFF' },
    menuUserRole: {
      ...Typography.bodySmall,
      color: 'rgba(255,255,255,0.65)',
    },
    menuList: { paddingHorizontal: 14, paddingTop: 16, gap: 4 },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      height: 52,
      paddingHorizontal: 12,
      borderRadius: Radius.md,
      overflow: 'hidden',
    },
    menuItemActive: { backgroundColor: c.primarySoft },
    menuItemIndicator: {
      position: 'absolute',
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
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuItemText: { ...Typography.bodyMedium, color: c.text },

    /* ---------------- Mobile header ---------------- */
    mobileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      backgroundColor: c.background,
    },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },

    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notificationBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 3,
      backgroundColor: c.error,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: c.surface,
    },
    notificationBadgeText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '700',
    },
    avatar: { alignItems: 'center', justifyContent: 'center' },
    avatarText: { ...Typography.button },

    /* ---------------- Welcome + search ---------------- */
    welcomeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    greeting: { ...Typography.h1, color: c.text, letterSpacing: -0.7 },
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
      alignItems: 'center',
      justifyContent: 'center',
    },

    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
      ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
    },
    filterButton: {
      width: ComponentSizes.inputHeight,
      height: ComponentSizes.inputHeight,
      borderRadius: Radius.md,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* ---------------- Hero ---------------- */
    heroWrap: {
      borderRadius: Radius.xl,
      overflow: 'hidden',
      ...Shadows.card,
    },
    hero: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
    heroContent: { flex: 1, zIndex: 3 },
    heroPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.14)',
    },
    heroPillText: { ...Typography.label, fontSize: 12, color: '#FFFFFF' },
    heroTitle: {
      color: '#FFFFFF',
      fontWeight: '800',
      letterSpacing: -0.8,
    },
    heroTitleAccent: {
      color: c.secondary,
      fontWeight: '800',
      letterSpacing: -0.8,
    },
    heroSubtitle: { color: 'rgba(255,255,255,0.86)' },
    heroButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 10,
    },
    heroCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingLeft: 20,
      paddingRight: 6,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      backgroundColor: c.secondary,
      ...Shadows.button,
    },
    heroCtaText: { ...Typography.button, color: c.textOnSecondary },
    heroCtaArrow: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroGhost: {
      height: 44,
      paddingHorizontal: 20,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroGhostText: { ...Typography.button, color: '#FFFFFF' },

    heroIllustration: {
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    heroIllustrationCircle: {
      backgroundColor: 'rgba(255,255,255,0.11)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    floatingChip: {
      position: 'absolute',
      backgroundColor: 'rgba(255,255,255,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroCircleOne: {
      position: 'absolute',
      width: 240,
      height: 240,
      borderRadius: 120,
      right: -100,
      top: -100,
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    heroCircleTwo: {
      position: 'absolute',
      width: 170,
      height: 170,
      borderRadius: 85,
      right: 40,
      bottom: -120,
      backgroundColor: 'rgba(255,255,255,0.04)',
    },

    /* ---------------- Impact stats ---------------- */
    impactRow: { flexDirection: 'row', gap: 12 },
    statCard: {
  flex: 1,
  minHeight: 120,
  backgroundColor: c.surface,
  borderRadius: Radius.xl,
  padding: 18,
  borderWidth: 1,
  borderColor: c.borderLight,
  shadowColor: '#023047',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 4,
},
    statCardH: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 18,
      minHeight: 108,
      paddingHorizontal: 22,
    },
    statTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statIcon: {
  width: 46,
  height: 46,
  borderRadius: 16,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.5)',
},
    statIconLg: { width: 60, height: 60, borderRadius: 20 },
    statValue: {
      ...Typography.h1,
      fontSize: 30,
      color: c.text,
      marginTop: 14,
      letterSpacing: -0.5,
    },
    statLabel: { ...Typography.bodySmall, color: c.textSecondary },
    liveDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: c.success,
    },

    /* ---------------- Sections ---------------- */
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 14,
    },
    sectionTitle: { ...Typography.h3, color: c.text },
    viewAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: Radius.pill,
      backgroundColor: c.primarySoft,
    },
    viewAllText: { ...Typography.label, color: accent },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },

    /* ---------------- Quick actions ---------------- */
    quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    quickTile: {
      flexGrow: 1,
      flexBasis: 170,
      flexDirection: 'row',
      alignItems: 'center',
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
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickLabel: { ...Typography.bodyMedium, color: c.text, flexShrink: 1 },

    quickTileMobile: { width: 84, alignItems: 'center' },
    quickIconMobile: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickLabelMobile: {
      ...Typography.bodySmall,
      fontSize: 12,
      lineHeight: 16,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },

    /* ---------------- Info card ---------------- */
    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      ...Shadows.card,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: Radius.pill,
    },
    badgeText: { ...Typography.label, fontSize: 12 },
    cardTitle: {
      ...Typography.h3,
      fontSize: 17,
      lineHeight: 24,
      color: c.text,
    },
    cardSubtitle: {
      ...Typography.bodySmall,
      color: c.textSecondary,
      marginTop: 2,
      minHeight: 40,
    },
    cardDivider: {
      height: 1,
      backgroundColor: c.borderLight,
      marginVertical: 12,
    },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardMetaText: {
      ...Typography.bodySmall,
      color: c.textSecondary,
      flex: 1,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 12,
    },
    cardFooterPill: {
      backgroundColor: c.surfaceSoft,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: Radius.pill,
      flexShrink: 1,
    },
    cardFooterText: { ...Typography.label, color: c.text },

    /* ---------------- Segment filter ---------------- */
    segmentWrap: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      padding: 4,
      borderRadius: Radius.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 14,
    },
    segmentButton: {
      minWidth: 92,
      height: 36,
      paddingHorizontal: 14,
      borderRadius: Radius.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    segmentText: { ...Typography.label, color: c.textSecondary },
    segmentTextActive: { color: '#FFFFFF' },
    segmentDot: { width: 6, height: 6, borderRadius: 3 },

    /* ---------------- Empty state ---------------- */
    empty: {
      alignItems: 'center',
      padding: 28,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.border,
      backgroundColor: c.surfaceSoft,
    },
    emptyText: {
      ...Typography.body,
      color: c.textMuted,
      marginTop: 8,
      textAlign: 'center',
    },

    /* ---------------- Bottom tab bar (phone + tablet) ---------------- */
    tabBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 8,
      shadowColor: '#023047',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 12,
    },
    tabBarInner: {
      width: '100%',
      maxWidth: 600,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      gap: 3,
      paddingVertical: 2,
    },
    tabIconPill: {
      width: 48,
      height: 30,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabLabel: { ...Typography.label, fontSize: 11, lineHeight: 14 },
    tabFab: {
      width: 56,
      height: 56,
      borderRadius: 20,
      backgroundColor: c.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -28,
      ...Shadows.button,
    },

    /* ---------------- Website footer (desktop) ---------------- */
    footerCard: {
      marginTop: 64,
      marginBottom: 32,
      borderRadius: Radius.xl,
      overflow: 'hidden',
      padding: 44,
      ...Shadows.card,
    },
    footerTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 48,
      zIndex: 2,
    },
    footerBrandCol: { flex: 1.3 },
    footerBlurb: {
      ...Typography.body,
      color: 'rgba(255,255,255,0.82)',
      marginTop: 16,
      maxWidth: 360,
    },
    footerCta: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 8,
      height: 46,
      paddingHorizontal: 22,
      borderRadius: Radius.pill,
      backgroundColor: c.secondary,
      marginTop: 22,
      ...Shadows.button,
    },
    footerCtaText: { ...Typography.button, color: c.textOnSecondary },
    footerCols: { flex: 1.4, flexDirection: 'row', gap: 40 },
    footerCol: { flex: 1, gap: 12 },
    footerHeading: {
      ...Typography.label,
      fontSize: 14,
      color: '#FFFFFF',
      marginBottom: 4,
    },
    footerLink: {
      ...Typography.body,
      fontSize: 14,
      color: 'rgba(255,255,255,0.72)',
    },
    footerRule: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.16)',
      marginTop: 34,
      marginBottom: 22,
      zIndex: 2,
    },
    footerBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      zIndex: 2,
    },
    footerCopy: {
      ...Typography.bodySmall,
      color: 'rgba(255,255,255,0.66)',
      flexShrink: 1,
    },
    backToTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 38,
      paddingHorizontal: 16,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    backToTopText: { ...Typography.label, color: '#FFFFFF' },
  });
}

// Built once per colour scheme, reused by every component below.
const styleCache = {
  light: makeStyles(Colors.light as Palette, Colors.light.primary),
  // The navy primary is too dark for text/icons on dark surfaces,
  // so dark mode uses the lighter info blue as its "accent".
  dark: makeStyles(Colors.dark as Palette, Colors.dark.info),
};

function useTheme() {
  // NOTE: DonorHome is now a light-only screen by design (white
  // background, navy sidebar as the accent) so it no longer follows
  // useColorScheme(). If you want it to respect dark mode again,
  // restore the scheme switch:
  //   const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  //   const c = Colors[scheme] as Palette;
  //   const accent = scheme === 'dark' ? c.info : c.primary;
  //   return { c, accent, s: styleCache[scheme], scheme };
  const c = Colors.light as Palette;
  const accent = c.primary;
  return { c, accent, s: styleCache.light, scheme: 'light' as const };
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
          onDark && { backgroundColor: c.secondary },
        ]}
      >
        <MaterialCommunityIcons
          name="leaf"
          size={20}
          color={onDark ? c.textOnSecondary : '#FFFFFF'}
        />
      </View>
      <Text style={[s.brandText, onDark && { color: '#FFFFFF' }]}>
        ResQMeal
      </Text>
    </View>
  );
}

function NotificationButton({ size = 44 }: { size?: number }) {
  const { c, s } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[s.iconButton, { width: size, height: size }]}
    >
      <Ionicons name="notifications-outline" size={22} color={c.text} />
      <View style={s.notificationBadge}>
        <Text style={s.notificationBadgeText}>2</Text>
      </View>
    </TouchableOpacity>
  );
}

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
          { color: onDark ? c.textOnSecondary : c.textOnPrimary },
        ]}
      >
        {name.charAt(0).toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Log out button + confirmation dialog.
 *  - variant "sidebar": full-width solid red button (desktop sidebar)
 *  - variant "icon":    compact solid red icon button (phone header)
 */
function LogoutAction({
  variant,
  onConfirm,
}: {
  variant: 'sidebar' | 'icon';
  onConfirm: () => void;
}) {
  const { c, s } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === 'sidebar' ? (
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
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={s.modalConfirmText}>Log out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

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
        style={[s.sectionTitle, large && { fontSize: 22, lineHeight: 30 }]}
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
  tone: 'primary' | 'secondary' | 'tertiary';
  trailing?: React.ReactNode;
  horizontal?: boolean;
}) {
  const { c, accent, s } = useTheme();

  const tileBg =
    tone === 'primary' ? c.primarySoft
    : tone === 'secondary' ? c.secondarySoft
    : c.infoSoft;

  const iconColor =
    tone === 'primary' ? accent
    : tone === 'secondary' ? c.secondary
    : c.info;

  if (horizontal) {
    return (
      <View style={[s.statCard, s.statCardH]}>
        <View style={[s.statIcon, s.statIconLg, { backgroundColor: tileBg }]}>
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
        <View style={[s.statIcon, { backgroundColor: tileBg }]}>
          <Ionicons name={icon} size={21} color={iconColor} />
        </View>
        {trailing}
      </View>

      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

type InfoCardProps = {
  icon: IconName;
  title: string;
  subtitle: string;
  metaIcon: IconName;
  metaText: string;
  footerText: string;
  badgeLabel: string;
  badgeBg?: string;
  badgeColor?: string;
  width: number;
  onPress?: () => void;
};

function InfoCard({
  icon,
  title,
  subtitle,
  metaIcon,
  metaText,
  footerText,
  badgeLabel,
  badgeBg,
  badgeColor,
  width,
  onPress,
}: InfoCardProps) {
  const { c, accent, s } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={!onPress}
      onPress={onPress}
      style={[s.card, { width }]}
    >
      <View style={s.cardTop}>
        <View style={s.cardIcon}>
          <Ionicons name={icon} size={21} color={accent} />
        </View>

        <View
          style={[
            s.badge,
            { backgroundColor: badgeBg ?? c.primarySoft },
          ]}
        >
          <Text style={[s.badgeText, { color: badgeColor ?? accent }]}>
            {badgeLabel}
          </Text>
        </View>
      </View>

      <Text style={s.cardTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={s.cardSubtitle} numberOfLines={2}>
        {subtitle}
      </Text>

      <View style={s.cardDivider} />

      <View style={s.cardMeta}>
        <Ionicons name={metaIcon} size={15} color={c.textMuted} />
        <Text style={s.cardMetaText} numberOfLines={1}>
          {metaText}
        </Text>
      </View>

      <View style={s.cardFooter}>
        <View style={s.cardFooterPill}>
          <Text style={s.cardFooterText} numberOfLines={1}>
            {footerText}
          </Text>
        </View>

        {onPress && (
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ text }: { text: string }) {
  const { c, s } = useTheme();

  return (
    <View style={s.empty}>
      <Ionicons name="leaf-outline" size={26} color={c.textMuted} />
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

/* ---------------- Desktop sidebar ---------------- */

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
                color={isActive ? c.secondary : 'rgba(255,255,255,0.74)'}
              />
              <Text
                style={[
                  s.sidebarItemText,
                  isActive && s.sidebarItemTextActive,
                ]}
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

/* ---------------- Phone / tablet bottom tab bar ---------------- */

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
            isActive && { backgroundColor: c.primarySoft },
          ]}
        >
          <Ionicons
            name={isActive ? item.iconActive : item.icon}
            size={22}
            color={isActive ? accent : c.textMuted}
          />
        </View>
        <Text
          style={[s.tabLabel, { color: isActive ? accent : c.textMuted }]}
        >
          {item.tabLabel}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={s.tabBarInner}>
        {/* Home, Donations */}
        {NAV_ITEMS.slice(0, 2).map(renderTab)}

        {/* Donate (centre) */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={s.tabItem}
          onPress={() => onNavigate('Create')}
        >
          <View style={s.tabFab}>
            <Ionicons name="add" size={30} color={c.textOnSecondary} />
          </View>
          <Text style={[s.tabLabel, { color: c.textSecondary }]}>
            Donate
          </Text>
        </TouchableOpacity>

        {/* Impact, Profile */}
        {NAV_ITEMS.slice(2).map(renderTab)}
      </View>
    </View>
  );
}

/* ---------------- Phone / tablet hamburger nav menu ---------------- */
// Mirrors the sidebar's item list (Home, My donations, Food rescue
// requests, NGO communities, Impact, Profile). Does NOT touch the
// bottom tab bar — that stays exactly as it was.

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
        {/* ---- Left-docked sheet ---- */}
        <View style={s.menuSheet}>
          <LinearGradient
            colors={[c.primaryDark, c.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              s.menuHeaderGradient,
              { paddingTop: Math.max(insets.top, 16) + 6 },
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
                <Text style={[s.brandText, { color: '#FFFFFF', fontSize: 18 }]}>
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
                      isActive && { backgroundColor: c.primarySoft },
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
                      isActive && { color: accent, fontWeight: '700' },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ---- Tap-to-close scrim, fills the rest of the screen ---- */}
        <TouchableOpacity
          style={s.menuScrim}
          activeOpacity={1}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

/* ---------------- Desktop website footer ---------------- */

function SiteFooter({
  onNavigate,
  onSection,
  onTop,
}: {
  onNavigate: (tab: TabKey) => void;
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
            onPress={() => onNavigate('Create')}
          >
            <Ionicons
              name="add-circle"
              size={20}
              color={c.textOnSecondary}
            />
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
              onPress={() => onSection('campaigns')}
            >
              <Text style={s.footerLink}>NGO campaigns</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onSection('recipients')}
            >
              <Text style={s.footerLink}>Available recipients</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onSection('posts')}
            >
              <Text style={s.footerLink}>Community posts</Text>
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
/* SCREEN                                                     */
/* ========================================================= */

export default function DonorHomeScreen({ navigation, route }: Props) {
  const { fullName } = route.params;

  const displayName = fullName?.trim() || 'Donor';
  const firstName = fullName?.trim().split(' ')[0] || 'there';

  const { c, accent, s } = useTheme();
  const L = useLayout();

  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Partial<Record<SectionKey, number>>>({});

const [search, setSearch] = useState('');
const [postFilter, setPostFilter] = useState<'HIGH' | 'NORMAL'>('HIGH');
const [boxWidth, setBoxWidth] = useState(0);
const [activeTab, setActiveTab] = useState<SidebarKey>('Home');
const [menuOpen, setMenuOpen] = useState(false);

const [donations, setDonations] = useState<Donation[]>([]);
const [donationsLoading, setDonationsLoading] = useState(true);

const loadDonations = useCallback(async () => {
  try {
    setDonationsLoading(true);

    const data = await getDonations('all');

    setDonations(data);
  } catch (error) {
    console.error('[DonorHome] Failed to load donations:', error);
    setDonations([]);
  } finally {
    setDonationsLoading(false);
  }
}, []);

useFocusEffect(
  useCallback(() => {
    loadDonations();
  }, [loadDonations]),
);

  /* ---------- derived data ---------- */

  const query = search.trim().toLowerCase();

const filteredDonations = useMemo(
  () =>
    donations.filter(
      (d) =>
        !query ||
        d.foodName.toLowerCase().includes(query) ||
        d.category.toLowerCase().includes(query),
    ),
  [donations, query],
);
  const filteredPosts = useMemo(
    () =>
      MOCK_COMMUNITY_POSTS.filter(
        (p) =>
          p.urgency === postFilter &&
          (!query || p.foodName.toLowerCase().includes(query)),
      ),
    [postFilter, query],
  );

  const urgencyBadge: Record<
    DonationUrgency,
    { label: string; bg: string; text: string }
  > = {
    HIGH: { label: 'Urgent', bg: c.errorSoft, text: c.error },
    MEDIUM: { label: 'Soon', bg: c.warningSoft, text: c.secondaryDark },
    NORMAL: { label: 'Normal', bg: c.infoSoft, text: c.info },
  };

  const hour = new Date().getHours();
  const greetingWord =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  /* ---------- sizes ---------- */

  const innerWidth =
    boxWidth > 0
      ? boxWidth - L.pad * 2
      : Math.min(L.width - (L.isDesktop ? SIDEBAR_WIDTH : 0), CONTENT_MAX) -
        L.pad * 2;

  const columns = innerWidth >= 1000 ? 4 : innerWidth >= 680 ? 3 : 2;

  const cardWidth = Math.floor(
    (innerWidth - GRID_GAP * (columns - 1)) / columns,
  );

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

  /* ---------- scrolling + navigation ---------- */

  const track = (key: SectionKey) => (e: LayoutChangeEvent) => {
    sectionY.current[key] = e.nativeEvent.layout.y;
  };

  const scrollToTop = () => {
    setActiveTab('Home');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const scrollToSection = (key: SectionKey) => {
    const y = sectionY.current[key];
    if (y === undefined) return;

    if (key === 'impact') setActiveTab('Impact');
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
  };

  // Highlights "Impact" while the impact section is on screen.
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const impactY = sectionY.current.impact;
    const donationsY = sectionY.current.donations;

    const next: TabKey =
      impactY !== undefined &&
      donationsY !== undefined &&
      y >= impactY - 200 &&
      y < donationsY - 200
        ? 'Impact'
        : 'Home';

    setActiveTab((prev) => (prev === next ? prev : next));
  };

  const handleNavigate = (tab: SidebarKey) => {
    if (tab === 'Home') scrollToTop();
    if (tab === 'Impact') scrollToSection('impact');
    if (tab === 'Create') navigation.navigate('CreateDonation');
    if (tab === 'Donations') navigation.navigate('MyDonations');
    if (tab === 'Profile') navigation.navigate('Profile');
    // Donor discovery screens
// These are available from the hamburger/sidebar navigation,
// but are intentionally NOT part of the bottom tab bar.
    if (tab === 'FoodRequests') {
  navigation.navigate('FoodRescueRequests');
}

if (tab === 'NGOCommunities') {
  navigation.navigate('NGOCommunities');
}
  };

  const handleLogout = () => {
    // If your old LogoutButton also cleared a token / auth context,
    // call that here before resetting the navigation.
    navigation.reset({
      index: 0,
      routes: [{ name: LOGOUT_ROUTE as any }],
    });
  };

  /* ---------- reusable render helpers ---------- */

  // Phones: swipeable row. Tablet / desktop: responsive grid.
  function renderCards<T extends { id: React.Key }>(
    items: T[],
    renderItem: (item: T, width: number) => React.ReactNode,
    emptyText: string,
  ) {
    if (items.length === 0) return <EmptyState text={emptyText} />;

    if (L.isMobile) {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -L.pad }}
          contentContainerStyle={{
            paddingHorizontal: L.pad,
            paddingVertical: 6,
            gap: 12,
          }}
        >
          {items.map((item) => renderItem(item, MOBILE_CARD_WIDTH))}
        </ScrollView>
      );
    }

    return (
      <View style={s.grid}>
        {items.map((item) => renderItem(item, cardWidth))}
      </View>
    );
  }

  const searchRow = (
    <View style={s.searchRow}>
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={20} color={c.textMuted} />

        <TextInput
          placeholder="Search donations..."
          placeholderTextColor={c.inputPlaceholder}
          value={search}
          onChangeText={setSearch}
          style={s.searchInput}
        />

        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={19} color={c.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity activeOpacity={0.8} style={s.filterButton}>
        <Ionicons name="options-outline" size={21} color={c.textOnPrimary} />
      </TouchableOpacity>
    </View>
  );

  /* ---------- hero ---------- */

  const heroBlock = (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() => navigation.navigate('CreateDonation')}
      style={s.heroWrap}
    >
      <LinearGradient
        colors={[c.primaryDark, c.primary, c.info]}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          s.hero,
          { minHeight: hero.minHeight, padding: hero.padding },
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
                onPress={() => navigation.navigate('MyDonations')}
              >
                <Text style={s.heroGhostText}>My donations</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[s.heroIllustration, { width: hero.illustrationWidth }]}>
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

  /* ---------- quick actions ---------- */

  const quickActions = (
    <View style={{ marginTop: sectionGap }}>
      <SectionHeader
        title="What would you like to do?"
        large={!L.isMobile}
      />

      {L.isMobile ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -L.pad }}
          contentContainerStyle={{
            paddingHorizontal: L.pad,
            gap: 10,
          }}
        >
          {MOCK_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.8}
              style={s.quickTileMobile}
            >
              <View style={s.quickIconMobile}>
                <Ionicons
                  name={cat.icon as any}
                  size={24}
                  color={accent}
                />
              </View>
              <Text style={s.quickLabelMobile} numberOfLines={2}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={s.quickWrap}>
          {MOCK_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.85}
              style={s.quickTile}
            >
              <View style={s.quickIcon}>
                <Ionicons
                  name={cat.icon as any}
                  size={23}
                  color={accent}
                />
              </View>
              <Text style={s.quickLabel} numberOfLines={2}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  /* ========================================================= */
  /* RENDER                                                     */
  /* ========================================================= */

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <View
        style={{
          flex: 1,
          flexDirection: L.isDesktop ? 'row' : 'column',
        }}
      >
        {/* ---------------- DESKTOP: vertical sidebar / PHONE: header ---------------- */}
        {L.isDesktop ? (
          <Sidebar
            fullName={displayName}
            active={activeTab}
            onNavigate={handleNavigate}
            onProfile={() => navigation.navigate('Profile')}
            onLogout={handleLogout}
          />
        ) : (
          <View style={[s.mobileHeader, { paddingHorizontal: L.pad }]}>
            <TouchableOpacity
              activeOpacity={0.75}
              style={s.iconButton}
              onPress={() => setMenuOpen(true)}
            >
              <Ionicons name="menu-outline" size={24} color={c.text} />
            </TouchableOpacity>

            <Brand />

            <View style={s.headerActions}>
              <NotificationButton size={40} />
              <Avatar
                name={firstName}
                size={36}
                onPress={() => navigation.navigate('Profile')}
              />
              <LogoutAction variant="icon" onConfirm={handleLogout} />
            </View>
          </View>
        )}

        {/* ---------------- PHONE / TABLET: hamburger nav menu ---------------- */}
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
              navigation.navigate('Profile');
            }}
            onClose={() => setMenuOpen(false)}
          />
        )}

        {/* ---------------- PAGE ---------------- */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={!L.isDesktop}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            s.scrollContent,
            { paddingBottom: L.isDesktop ? 0 : 130 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[s.container, { paddingHorizontal: L.pad }]}
            onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}
          >
            {/* Welcome */}
            <View
              style={[
                s.welcomeRow,
                { marginTop: L.isDesktop ? 36 : 8 },
              ]}
            >
              <View style={{ flexShrink: 1 }}>
                <Text
                  style={[
                    s.greeting,
                    L.isDesktop
                      ? { fontSize: 34, lineHeight: 42 }
                      : { fontSize: 26, lineHeight: 34 },
                  ]}
                >
                  {greetingWord}, {firstName} 👋
                </Text>
                <Text style={s.greetingSub}>
                  Ready to make an impact today?
                </Text>
              </View>

              {L.isDesktop ? (
                <NotificationButton />
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
            <View style={{ marginTop: L.isDesktop ? 24 : 16 }}>
              {searchRow}
            </View>

            {/* Hero */}
            <View style={{ marginTop: L.isDesktop ? 28 : 20 }}>
              {heroBlock}
            </View>

            {/* Quick actions */}
            {quickActions}

            {/* Impact */}
            <View
              style={{ marginTop: sectionGap }}
              onLayout={track('impact')}
            >
              <SectionHeader
                title="Every meal matters"
                large={!L.isMobile}
              />

              <View style={[s.impactRow, L.isDesktop && { gap: 16 }]}>
              <StatCard
                icon="restaurant"
                tone="secondary"
                horizontal={L.isDesktop}
                value={MOCK_IMPACT.mealsRescued}
                label="Meals rescued"
                trailing={
                  <Ionicons name="trending-up" size={20} color={c.success} />
                }
              />

              <StatCard
                icon="pulse"
                tone="primary"
                horizontal={L.isDesktop}
                value={MOCK_IMPACT.activeDonations}
                label="Active donations"
                trailing={<View style={s.liveDot} />}
              />

              <StatCard
                icon="people"
                tone="tertiary"
                horizontal={L.isDesktop}
                value={MOCK_IMPACT.peopleHelped}
                label="People helped"
                trailing={
                  <Ionicons name="heart" size={18} color={c.info} />
                }
              />
            </View>
            </View>

            {/* Your donations */}
            <View
              style={{ marginTop: sectionGap }}
              onLayout={track('donations')}
            >
              <SectionHeader
                title="Your donations"
                large={!L.isMobile}
                onViewAll={() => navigation.navigate('MyDonations')}
              />

             {donationsLoading ? (
  <View style={s.empty}>
    <Text style={s.emptyText}>Loading your donations...</Text>
  </View>
) : (
  renderCards(
    filteredDonations,
    (donation, width) => {
                  const badge = urgencyBadge[donation.urgency];

                  return (
                    <InfoCard
                      key={donation.id}
                      width={width}
                      icon="fast-food"
                      title={donation.foodName}
                      subtitle={donation.category}
                      metaIcon="location-outline"
                      metaText={donation.pickupLocation}
                      footerText={`${donation.quantity} ${donation.quantityUnit ?? ''}`.trim()}
                      badgeLabel={badge.label}
                      badgeBg={badge.bg}
                      badgeColor={badge.text}
                      onPress={() =>
                        navigation.navigate('DonationDetail', {
                          donationId: donation.id,
                        })
                      }
                    />
                  );
                },
                'No donations match your search.',
              ))}
            </View>

            {/* NGO campaigns */}
            <View
              style={{ marginTop: sectionGap }}
              onLayout={track('campaigns')}
            >
              <SectionHeader
                title="NGO campaigns"
                large={!L.isMobile}
                onViewAll={() => {}}
              />

              {renderCards(
                MOCK_NGO_CAMPAIGNS,
                (campaign, width) => (
                  <InfoCard
                    key={campaign.id}
                    width={width}
                    icon="hand-left"
                    title={campaign.title}
                    subtitle={campaign.orgName}
                    metaIcon="location-outline"
                    metaText={campaign.location}
                    footerText={campaign.goalText}
                    badgeLabel="NGO"
                  />
                ),
                'No campaigns yet.',
              )}
            </View>

            {/* Recipients */}
            <View
              style={{ marginTop: sectionGap }}
              onLayout={track('recipients')}
            >
              <SectionHeader
                title="Available recipients"
                large={!L.isMobile}
                onViewAll={() => {}}
              />

              {renderCards(
                MOCK_RECIPIENTS,
                (recipient, width) => (
                  <InfoCard
                    key={recipient.id}
                    width={width}
                    icon="people"
                    title={recipient.name}
                    subtitle={recipient.needsText}
                    metaIcon="navigate-outline"
                    metaText={`${recipient.distanceKm} km away`}
                    footerText={recipient.type}
                    badgeLabel={recipient.type}
                  />
                ),
                'No recipients nearby.',
              )}
            </View>

            {/* Community posts */}
            <View
              style={{ marginTop: sectionGap }}
              onLayout={track('posts')}
            >
              <SectionHeader title="Community posts" large={!L.isMobile} />

              <View style={s.segmentWrap}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    s.segmentButton,
                    postFilter === 'HIGH' && { backgroundColor: c.error },
                  ]}
                  onPress={() => setPostFilter('HIGH')}
                >
                  <View
                    style={[
                      s.segmentDot,
                      {
                        backgroundColor:
                          postFilter === 'HIGH' ? '#FFFFFF' : c.error,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      s.segmentText,
                      postFilter === 'HIGH' && s.segmentTextActive,
                    ]}
                  >
                    Urgent
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    s.segmentButton,
                    postFilter === 'NORMAL' && {
                      backgroundColor: c.primary,
                    },
                  ]}
                  onPress={() => setPostFilter('NORMAL')}
                >
                  <Text
                    style={[
                      s.segmentText,
                      postFilter === 'NORMAL' && s.segmentTextActive,
                    ]}
                  >
                    Normal
                  </Text>
                </TouchableOpacity>
              </View>

              {renderCards(
                filteredPosts,
                (post, width) => {
                  const urgency: DonationUrgency = post.urgency;
                  const badge = urgencyBadge[urgency];
                  return (
                    <InfoCard
                      key={post.id}
                      width={width}
                      icon="restaurant-outline"
                      title={post.foodName}
                      subtitle={post.donorName}
                      metaIcon="location-outline"
                      metaText={post.location}
                      footerText={`${post.quantity}, ${post.expiresInHours}h left`}
                      badgeLabel={badge.label}
                      badgeBg={badge.bg}
                      badgeColor={badge.text}
                    />
                  );
                },
                'No community posts in this category.',
              )}
            </View>

            {/* Website footer (laptop / desktop) */}
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

      {/* ---------------- PHONE / TABLET: bottom tab bar ---------------- */}
      {!L.isDesktop && (
        <BottomTabBar active={activeTab} onNavigate={handleNavigate} />
      )}
    </SafeAreaView>
  );
}