// frontend/src/screens/kaveesha-NGOCommunitiesScreen.tsx
// >>> Register this in AppNavigator.tsx as the "NGOCommunities" route,
//     and add that route name to RootStackParamList in
//     ../navigation/types. <<<
// Owner: Kaveesha
//
// Donor-facing screen: browse NGOs and their active campaigns, search +
// filter them, follow/join a community, and see full NGO details.
// Same responsive breakpoints and visual language as
// kaveesha-DonorHomeScreen.tsx (light theme, navy + amber brand colors).
//
//   phone / tablet (< 1024px) -> single column list, cards stack full width
//   desktop        (>= 1024px) -> centered content, 2-3 column card grid
//
// This screen intentionally does NOT duplicate the donor home's sidebar /
// bottom tab bar — it's reached via that nav and uses a simple back
// button + title banner instead. Say the word if you'd like the sidebar
// wired in here too.

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
  Linking,
} from 'react-native';
import type { DimensionValue, LayoutChangeEvent } from 'react-native';
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

/* ========================================================= */
/* TYPES + MOCK DATA                                          */
/* ========================================================= */

type Props = NativeStackScreenProps<RootStackParamList, any>;

type Palette = Record<ThemeColor, string>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

type FilterTag = 'Nearby' | 'Food Rescue' | 'Emergency' | 'Active';

type Campaign = {
  id: string;
  title: string;
  purpose: string;
  progressPercent: number;
  progressLabel: string;
  deadline: string;
};

type NGO = {
  id: string;
  name: string;
  initials: string;
  verified: boolean;
  location: string;
  about: string;
  needsText: string;
  tags: FilterTag[];
  followers: number;
  phone: string;
  email: string;
  campaigns: Campaign[];
};

const MOCK_NGOS: NGO[] = [
  {
    id: 'ngo-1',
    name: 'Hope Haven Foundation',
    initials: 'HH',
    verified: true,
    location: 'Colombo 10',
    about:
      'Hope Haven runs three shelters across Colombo, providing meals, housing, and job placement support for displaced families.',
    needsText: 'Cooked meals, rice, and dry rations for 180 residents weekly.',
    tags: ['Nearby', 'Food Rescue', 'Active'],
    followers: 412,
    phone: '+94 71 234 5678',
    email: 'contact@hopehaven.org',
    campaigns: [
      {
        id: 'c-1',
        title: 'Winter meal drive',
        purpose: 'Fund 500 warm meals for shelter residents this month.',
        progressPercent: 64,
        progressLabel: '320 of 500 meals funded',
        deadline: 'Ends in 12 days',
      },
    ],
  },
  {
    id: 'ngo-2',
    name: 'Green Valley Relief',
    initials: 'GV',
    verified: true,
    location: 'Nugegoda',
    about:
      'Green Valley Relief connects surplus produce from local farms and markets to community kitchens across the Western province.',
    needsText: 'Fresh produce, grains, and volunteer drivers.',
    tags: ['Food Rescue', 'Active'],
    followers: 268,
    phone: '+94 77 345 6789',
    email: 'hello@greenvalleyrelief.org',
    campaigns: [
      {
        id: 'c-2',
        title: 'Farm-to-table rescue',
        purpose: 'Redirect 2 tonnes of surplus produce from local markets.',
        progressPercent: 40,
        progressLabel: '800 of 2,000 kg rescued',
        deadline: 'Ongoing',
      },
      {
        id: 'c-3',
        title: 'Volunteer driver drive',
        purpose: 'Recruit 15 volunteer drivers for weekend pickups.',
        progressPercent: 53,
        progressLabel: '8 of 15 drivers signed up',
        deadline: 'Ends in 20 days',
      },
    ],
  },
  {
    id: 'ngo-3',
    name: 'Kelaniya Relief Committee',
    initials: 'KR',
    verified: false,
    location: 'Kelaniya',
    about:
      'A volunteer-run committee coordinating emergency food and shelter support for families affected by seasonal flooding.',
    needsText: 'Emergency ready-to-eat meals and bottled water.',
    tags: ['Emergency', 'Nearby', 'Active'],
    followers: 96,
    phone: '+94 76 456 7890',
    email: 'kelaniyarelief@gmail.com',
    campaigns: [
      {
        id: 'c-4',
        title: 'Flood emergency response',
        purpose: 'Provide meals and water to 300 displaced residents.',
        progressPercent: 78,
        progressLabel: '234 of 300 families reached',
        deadline: 'Urgent — ongoing',
      },
    ],
  },
  {
    id: 'ngo-4',
    name: "St. Anne's Children's Trust",
    initials: 'SA',
    verified: true,
    location: 'Wellawatte',
    about:
      "St. Anne's Trust runs a children's home and daily breakfast program for over 40 children in the Wellawatte area.",
    needsText: 'Bakery items, milk, and school lunch supplies.',
    tags: ['Nearby'],
    followers: 154,
    phone: '+94 70 567 8901',
    email: 'admin@stannestrust.org',
    campaigns: [
      {
        id: 'c-5',
        title: 'Breakfast for 40',
        purpose: 'Cover daily breakfast costs for 40 children this term.',
        progressPercent: 25,
        progressLabel: '10 of 40 sponsorships filled',
        deadline: 'Ends in 45 days',
      },
    ],
  },
];

const FILTERS: Array<{ key: FilterTag | 'All'; icon: IconName }> = [
  { key: 'All', icon: 'apps-outline' },
  { key: 'Nearby', icon: 'navigate-outline' },
  { key: 'Food Rescue', icon: 'fast-food-outline' },
  { key: 'Emergency', icon: 'alert-circle-outline' },
  { key: 'Active', icon: 'flash-outline' },
];

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
  const pad = isDesktop ? Spacing.five : isTablet ? Spacing.four : Spacing.three;

  return { width, isDesktop, isTablet, isMobile, pad };
}

const CONTENT_MAX = 1100;
const GRID_GAP = 16;

/* ========================================================= */
/* STYLES                                                      */
/* ========================================================= */

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: c.background },
  scrollContent: { alignItems: 'center', paddingBottom: 48 },
  container: { width: '100%', maxWidth: CONTENT_MAX },

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
    alignItems: 'center',
    gap: 12,
  },

  logo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: c.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoText: {
    ...Typography.label,
    fontSize: 15,
    color: accent,
  },

  cardHeaderText: {
    flex: 1,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  ngoName: {
    ...Typography.h3,
    fontSize: 16,
    color: c.text,
    flexShrink: 1,
  },

  ngoLocation: {
    ...Typography.bodySmall,
    color: c.textSecondary,
    marginTop: 2,
  },

  cardDivider: {
    height: 1,
    backgroundColor: c.borderLight,
    marginVertical: 12,
  },

  about: {
    ...Typography.bodySmall,
    color: c.textMuted,
    lineHeight: 19,
  },

  needsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
  },

  needsText: {
    ...Typography.bodySmall,
    color: c.textSecondary,
    flex: 1,
  },

  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },

  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: c.surfaceSoft,
  },

  tagPillText: {
    ...Typography.label,
    fontSize: 11,
    color: c.textSecondary,
  },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: c.surfaceSoft,
    overflow: 'hidden',
    marginTop: 8,
  },

  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: c.secondary,
  },

  campaignTitle: {
    ...Typography.label,
    fontSize: 13,
    color: c.text,
    marginTop: 12,
  },

  campaignMeta: {
    ...Typography.bodySmall,
    fontSize: 12,
    color: c.textMuted,
    marginTop: 4,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 16,
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

  followBtn: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.primary,
  },

  followBtnActive: {
    backgroundColor: c.primary,
  },

  followBtnText: {
    ...Typography.buttonSmall,
    color: c.primary,
  },

  followBtnTextActive: {
    color: '#FFFFFF',
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
    maxHeight: '88%',
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

  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },

  modalName: {
    ...Typography.h3,
    fontSize: 19,
    color: c.text,
    flexShrink: 1,
  },

  modalLocation: {
    ...Typography.body,
    color: c.textSecondary,
    marginTop: 2,
  },

  sectionLabel: {
    ...Typography.label,
    fontSize: 12,
    color: c.textMuted,
    marginTop: 20,
    marginBottom: 8,
  },

  modalAbout: {
    ...Typography.body,
    color: c.textSecondary,
    lineHeight: 22,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },

  contactText: {
    ...Typography.bodySmall,
    color: c.text,
  },

  campaignCard: {
    backgroundColor: c.surfaceSoft,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 10,
  },

  modalFollowBtn: {
    height: 50,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    borderWidth: 1,
    borderColor: c.primary,
  },

  modalFollowBtnActive: {
    backgroundColor: c.primary,
  },

  modalFollowBtnText: {
    ...Typography.button,
    color: c.primary,
  },

  modalFollowBtnTextActive: {
    color: '#FFFFFF',
  },
});

/* ========================================================= */
/* SMALL COMPONENTS                                            */
/* ========================================================= */

function ProgressBar({ percent }: { percent: number }) {
  return (
    <View style={s.progressTrack}>
      <View
        style={[
          s.progressFill,
          { width: `${Math.min(100, Math.max(0, percent))}%` },
        ]}
      />
    </View>
  );
}

function VerifiedBadge() {
  return <Ionicons name="checkmark-circle" size={16} color={c.info} />;
}

function NgoCard({
  ngo,
  width,
  isFollowing,
  onToggleFollow,
  onViewDetails,
}: {
  ngo: NGO;
  width: DimensionValue;
  isFollowing: boolean;
  onToggleFollow: () => void;
  onViewDetails: () => void;
}) {
  const topCampaign = ngo.campaigns[0];

  return (
    <View style={[s.card, { width }]}>
      <View style={s.cardTop}>
        <View style={s.logo}>
          <Text style={s.logoText}>{ngo.initials}</Text>
        </View>

        <View style={s.cardHeaderText}>
          <View style={s.nameRow}>
            <Text style={s.ngoName} numberOfLines={1}>
              {ngo.name}
            </Text>

            {ngo.verified && <VerifiedBadge />}
          </View>

          <Text style={s.ngoLocation} numberOfLines={1}>
            {ngo.location}
          </Text>
        </View>
      </View>

      <View style={s.cardDivider} />

      <Text style={s.about} numberOfLines={2}>
        {ngo.about}
      </Text>

      <View style={s.needsRow}>
        <Ionicons name="basket-outline" size={15} color={c.textMuted} />
        <Text style={s.needsText} numberOfLines={2}>
          {ngo.needsText}
        </Text>
      </View>

      <View style={s.tagRow}>
        {ngo.tags.map((tag) => (
          <View key={tag} style={s.tagPill}>
            <Text style={s.tagPillText}>{tag}</Text>
          </View>
        ))}
      </View>

      {topCampaign && (
        <>
          <Text style={s.campaignTitle} numberOfLines={1}>
            {topCampaign.title}
          </Text>

          <ProgressBar percent={topCampaign.progressPercent} />

          <Text style={s.campaignMeta} numberOfLines={1}>
            {topCampaign.progressLabel} · {topCampaign.deadline}
          </Text>
        </>
      )}

      <View style={s.cardFooter}>
        <TouchableOpacity
          activeOpacity={0.75}
          style={s.viewDetailsBtn}
          onPress={onViewDetails}
        >
          <Text style={s.viewDetailsText}>View details</Text>
          <Ionicons name="chevron-forward" size={14} color={accent} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[s.followBtn, isFollowing && s.followBtnActive]}
          onPress={onToggleFollow}
        >
          <Text
            style={[
              s.followBtnText,
              isFollowing && s.followBtnTextActive,
            ]}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NgoDetailModal({
  ngo,
  isFollowing,
  onToggleFollow,
  onClose,
}: {
  ngo: NGO | null;
  isFollowing: boolean;
  onToggleFollow: () => void;
  onClose: () => void;
}) {
  if (!ngo) return null;

  return (
    <Modal
      visible={!!ngo}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.modalOverlay}>
        <View style={s.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={s.modalTop}>
              <View style={s.logo}>
                <Text style={s.logoText}>{ngo.initials}</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.75}
                style={s.modalClose}
                onPress={onClose}
              >
                <Ionicons name="close" size={18} color={c.text} />
              </TouchableOpacity>
            </View>

            <View style={s.modalHeaderRow}>
              <Text style={s.modalName} numberOfLines={2}>
                {ngo.name}
              </Text>

              {ngo.verified && <VerifiedBadge />}
            </View>

            <Text style={s.modalLocation}>{ngo.location}</Text>

            <Text style={s.sectionLabel}>About</Text>
            <Text style={s.modalAbout}>{ngo.about}</Text>

            <Text style={s.sectionLabel}>Current needs</Text>
            <Text style={s.modalAbout}>{ngo.needsText}</Text>

            <Text style={s.sectionLabel}>
              Active campaigns ({ngo.campaigns.length})
            </Text>

            {ngo.campaigns.map((campaign) => (
              <View key={campaign.id} style={s.campaignCard}>
                <Text style={s.campaignTitle} numberOfLines={1}>
                  {campaign.title}
                </Text>

                <Text
                  style={[
                    s.campaignMeta,
                    { marginTop: 2, color: c.textSecondary },
                  ]}
                >
                  {campaign.purpose}
                </Text>

                <ProgressBar percent={campaign.progressPercent} />

                <Text style={s.campaignMeta}>
                  {campaign.progressLabel} · {campaign.deadline}
                </Text>
              </View>
            ))}

            <Text style={s.sectionLabel}>Contact</Text>

            <TouchableOpacity
              style={s.contactRow}
              onPress={() => Linking.openURL(`tel:${ngo.phone}`)}
            >
              <Ionicons
                name="call-outline"
                size={16}
                color={c.textMuted}
              />
              <Text style={s.contactText}>{ngo.phone}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.contactRow}
              onPress={() => Linking.openURL(`mailto:${ngo.email}`)}
            >
              <Ionicons
                name="mail-outline"
                size={16}
                color={c.textMuted}
              />
              <Text style={s.contactText}>{ngo.email}</Text>
            </TouchableOpacity>

            <View style={s.contactRow}>
              <Ionicons
                name="people-outline"
                size={16}
                color={c.textMuted}
              />
              <Text style={s.contactText}>
                {ngo.followers + (isFollowing ? 1 : 0)} followers
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                s.modalFollowBtn,
                isFollowing && s.modalFollowBtnActive,
              ]}
              onPress={onToggleFollow}
            >
              <Text
                style={[
                  s.modalFollowBtnText,
                  isFollowing && s.modalFollowBtnTextActive,
                ]}
              >
                {isFollowing
                  ? 'Following this community'
                  : 'Follow this community'}
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

export default function NGOCommunitiesScreen({ navigation }: Props) {
  const L = useLayout();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTag | 'All'>('All');
  const [containerWidth, setContainerWidth] = useState(0);
  const [selected, setSelected] = useState<NGO | null>(null);

  const [following, setFollowing] = useState<Record<string, boolean>>({});

  const innerWidth =
    containerWidth > 0 ? containerWidth - L.pad * 2 : 0;

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
          (innerWidth - GRID_GAP * (columns - 1)) / columns
        );

  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    return MOCK_NGOS.filter((ngo) => {
      const matchesQuery =
        !query ||
        ngo.name.toLowerCase().includes(query) ||
        ngo.location.toLowerCase().includes(query) ||
        ngo.campaigns.some((c2) =>
          c2.title.toLowerCase().includes(query)
        );

      const matchesFilter =
        filter === 'All' || ngo.tags.includes(filter);

      return matchesQuery && matchesFilter;
    });
  }, [query, filter]);

  const toggleFollow = (id: string) =>
    setFollowing((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
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
            setContainerWidth(e.nativeEvent.layout.width)
          }
        >
          {/* Banner */}
          <LinearGradient
            colors={[c.primaryDark, c.primary, c.info]}
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
              <Text style={s.bannerTitle}>NGO communities</Text>

              <Text style={s.bannerSubtitle}>
                {filtered.length} organization
                {filtered.length === 1 ? '' : 's'} to support
              </Text>
            </View>

            <View style={s.bannerIconWrap}>
              <Ionicons
                name="people-circle"
                size={26}
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
                  placeholder="Search NGOs, campaigns, locations..."
                  placeholderTextColor={c.inputPlaceholder}
                  value={search}
                  onChangeText={setSearch}
                  style={s.searchInput}
                />

                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
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

          {/* Filters */}
          <View style={{ marginTop: 18 }}>
            <Text style={s.filterLabel}>Filter</Text>

            <View style={s.chipRow}>
              {FILTERS.map((f) => {
                const isActive = f.key === filter;

                return (
                  <TouchableOpacity
                    key={f.key}
                    activeOpacity={0.8}
                    style={[
                      s.chip,
                      isActive && s.chipActive,
                    ]}
                    onPress={() => setFilter(f.key)}
                  >
                    <Ionicons
                      name={f.icon}
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
                        isActive && s.chipTextActive,
                      ]}
                    >
                      {f.key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Results */}
          <View style={{ marginTop: 22 }}>
            {filtered.length === 0 ? (
              <View style={s.empty}>
                <Ionicons
                  name="people-outline"
                  size={26}
                  color={c.textMuted}
                />

                <Text style={s.emptyText}>
                  No NGOs match your filters.
                </Text>
              </View>
            ) : columns === 1 ? (
              <View style={{ gap: GRID_GAP }}>
                {filtered.map((ngo) => (
                  <NgoCard
                    key={ngo.id}
                    ngo={ngo}
                    width="100%"
                    isFollowing={!!following[ngo.id]}
                    onToggleFollow={() =>
                      toggleFollow(ngo.id)
                    }
                    onViewDetails={() =>
                      setSelected(ngo)
                    }
                  />
                ))}
              </View>
            ) : (
              <View style={s.grid}>
                {filtered.map((ngo) => (
                  <NgoCard
                    key={ngo.id}
                    ngo={ngo}
                    width={cardWidth}
                    isFollowing={!!following[ngo.id]}
                    onToggleFollow={() =>
                      toggleFollow(ngo.id)
                    }
                    onViewDetails={() =>
                      setSelected(ngo)
                    }
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <NgoDetailModal
        ngo={selected}
        isFollowing={
          selected
            ? !!following[selected.id]
            : false
        }
        onToggleFollow={() =>
          selected && toggleFollow(selected.id)
        }
        onClose={() => setSelected(null)}
      />
    </SafeAreaView>
  );
}