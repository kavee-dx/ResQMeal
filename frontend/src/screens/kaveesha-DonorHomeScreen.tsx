// frontend/src/screens/kaveesha-DonorHomeScreen.tsx
// Registered in AppNavigator.tsx as the "DonorHome" route.
// Owner: Kaveesha

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import {
  colors,
  fonts,
  radius,
  shadow,
  spacing,
  typography,
} from '../styles/kaveesha-theme';

import KaveeshaBottomTabBar, {
  TabKey,
} from '../components/kaveesha-BottomTabBar';

import KaveeshaScrollCard from '../components/kaveesha-ScrollCard';
import KaveeshaSectionHeader from '../components/kaveesha-SectionHeader';
import LogoutButton from '../components/kaveesha-LogoutButton';

import {
  MOCK_CATEGORIES,
  MOCK_COMMUNITY_POSTS,
  MOCK_DONATIONS,
  MOCK_IMPACT,
  MOCK_NGO_CAMPAIGNS,
  MOCK_RECIPIENTS,
} from '../constants/kaveesha-mockData';

import { DonationUrgency } from '../types/kaveesha-donation.types';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'DonorHome'
>;

const { width } = Dimensions.get('window');

const URGENCY_BADGE: Record<
  DonationUrgency,
  {
    label: string;
    bg: string;
    text: string;
  }
> = {
  HIGH: {
    label: 'URGENT',
    bg: colors.urgentSoft,
    text: colors.urgent,
  },
  MEDIUM: {
    label: 'SOON',
    bg: colors.mediumSoft,
    text: colors.medium,
  },
  NORMAL: {
    label: 'NORMAL',
    bg: colors.accentSoft,
    text: colors.primary,
  },
};

export default function DonorHomeScreen({
  navigation,
  route,
}: Props) {
  const { fullName } = route.params;

  const firstName =
    fullName?.trim().split(' ')[0] || 'there';

  const [activeTab, setActiveTab] =
    useState<TabKey>('Home');

  const [search, setSearch] = useState('');

  const [postFilter, setPostFilter] =
    useState<'HIGH' | 'NORMAL'>('HIGH');

  const filteredPosts = useMemo(() => {
    return MOCK_COMMUNITY_POSTS.filter(
      (post) => post.urgency === postFilter,
    );
  }, [postFilter]);

  const handleTabPress = (tab: TabKey) => {
    setActiveTab(tab);

    if (tab === 'Create') {
      navigation.navigate('CreateDonation');
    }

    if (tab === 'Donations') {
      navigation.navigate('MyDonations');
    }

    if (tab === 'Profile') {
      navigation.navigate('Profile');
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {/* ================================================= */}
        {/* TOP HEADER */}
        {/* ================================================= */}

        <View style={styles.header}>

          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.menuButton}
          >
            <Ionicons
              name="menu-outline"
              size={24}
              color={colors.textPrimary}
            />
          </TouchableOpacity>

          <View style={styles.brandContainer}>
            <View style={styles.brandIcon}>
              <MaterialCommunityIcons
                name="leaf"
                size={17}
                color={colors.white}
              />
            </View>

            <Text style={styles.brandText}>
              ResQMeal
            </Text>
          </View>

          <View style={styles.headerActions}>

            {/* Notification */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.headerActionButton}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={colors.textPrimary}
              />

              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  2
                </Text>
              </View>
            </TouchableOpacity>

            {/* Profile */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.headerActionButton}
              onPress={() =>
                navigation.navigate('Profile')
              }
            >
              <Ionicons
                name="person-circle-outline"
                size={27}
                color={colors.textPrimary}
              />
            </TouchableOpacity>

            <LogoutButton
              navigation={navigation}
              compact
            />
          </View>
        </View>

        {/* ================================================= */}
        {/* WELCOME */}
        {/* ================================================= */}

        <View style={styles.welcomeSection}>
          <View>
            <Text style={styles.welcomeSmall}>
              GOOD MORNING
            </Text>

            <Text style={styles.greeting}>
              Hello, {firstName} 👋
            </Text>

            <Text style={styles.greetingSub}>
              Ready to make an impact today?
            </Text>
          </View>

          <View style={styles.welcomeDecoration}>
            <MaterialCommunityIcons
              name="food-apple"
              size={26}
              color={colors.primary}
            />
          </View>
        </View>

        {/* ================================================= */}
        {/* SEARCH */}
        {/* ================================================= */}

        <View style={styles.searchRow}>

          <View style={styles.searchBar}>

            <Ionicons
              name="search-outline"
              size={20}
              color={colors.textMuted}
            />

            <TextInput
              placeholder="Search donations..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />

            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch('')}
              >
                <Ionicons
                  name="close-circle"
                  size={19}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.filterButton}
          >
            <Ionicons
              name="options-outline"
              size={21}
              color={colors.white}
            />
          </TouchableOpacity>
        </View>

        {/* ================================================= */}
        {/* HERO */}
        {/* ================================================= */}

        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() =>
            navigation.navigate('CreateDonation')
          }
          style={styles.heroContainer}
        >
          <LinearGradient
            colors={[
              colors.primaryDark,
              colors.primary,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >

            {/* Decorative circles */}
            <View style={styles.heroCircleOne} />
            <View style={styles.heroCircleTwo} />

            <View style={styles.heroContent}>

              <View style={styles.heroPill}>
                <MaterialCommunityIcons
                  name="heart-outline"
                  size={13}
                  color={colors.white}
                />

                <Text style={styles.heroPillText}>
                  MAKE A DIFFERENCE
                </Text>
              </View>

              <Text style={styles.heroTitle}>
                Good Food.
              </Text>

              <Text style={styles.heroTitleSecond}>
                Good Impact.
              </Text>

              <Text style={styles.heroSubtitle}>
                Turn your surplus food into
                meaningful meals for people
                who need them.
              </Text>

              <View style={styles.heroButton}>
                <Text style={styles.heroButtonText}>
                  Donate Food
                </Text>

                <View style={styles.heroArrow}>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={colors.primary}
                  />
                </View>
              </View>
            </View>

            <View style={styles.heroIllustration}>
              <View style={styles.heroIllustrationCircle}>
                <MaterialCommunityIcons
                  name="food-apple-outline"
                  size={66}
                  color="rgba(255,255,255,0.92)"
                />
              </View>

              <View style={styles.floatingLeaf}>
                <MaterialCommunityIcons
                  name="leaf"
                  size={22}
                  color={colors.accent}
                />
              </View>

              <View style={styles.floatingHeart}>
                <Ionicons
                  name="heart"
                  size={17}
                  color={colors.white}
                />
              </View>
            </View>

          </LinearGradient>
        </TouchableOpacity>

        {/* ================================================= */}
        {/* QUICK ACTIONS */}
        {/* ================================================= */}

        <View style={styles.sectionTopSpacing}>

          <View style={styles.quickHeader}>
            <View>
              <Text style={styles.sectionKicker}>
                QUICK ACTIONS
              </Text>

              <Text style={styles.quickTitle}>
                What would you like to do?
              </Text>
            </View>
          </View>

          <View style={styles.categoryRow}>
            {MOCK_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.8}
                style={styles.categoryItem}
              >
                <View style={styles.categoryIconWrap}>
                  <Ionicons
                    name={cat.icon as any}
                    size={22}
                    color={colors.primary}
                  />
                </View>

                <Text style={styles.categoryLabel}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ================================================= */}
        {/* IMPACT */}
        {/* ================================================= */}

        <View style={styles.impactSection}>

          <View style={styles.impactHeader}>
            <View>
              <Text style={styles.sectionKicker}>
                YOUR IMPACT
              </Text>

              <Text style={styles.impactTitle}>
                Every meal matters
              </Text>
            </View>

            <View style={styles.impactHeart}>
              <Ionicons
                name="heart"
                size={16}
                color={colors.primary}
              />
            </View>
          </View>

          <View style={styles.impactRow}>

            {/* Meals */}
            <View style={styles.statCard}>
              <View style={styles.statTopRow}>
                <View style={styles.statIconWrap}>
                  <Ionicons
                    name="restaurant"
                    size={19}
                    color={colors.primary}
                  />
                </View>

                <Ionicons
                  name="trending-up"
                  size={18}
                  color={colors.primary}
                />
              </View>

              <Text style={styles.statValue}>
                {MOCK_IMPACT.mealsRescued}
              </Text>

              <Text style={styles.statLabel}>
                Meals Rescued
              </Text>
            </View>

            {/* Active */}
            <View style={styles.statCard}>
              <View style={styles.statTopRow}>
                <View style={styles.statIconWrap}>
                  <Ionicons
                    name="pulse"
                    size={19}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.liveDot} />
              </View>

              <Text style={styles.statValue}>
                {MOCK_IMPACT.activeDonations}
              </Text>

              <Text style={styles.statLabel}>
                Active Now
              </Text>
            </View>

          </View>
        </View>

        {/* ================================================= */}
        {/* YOUR DONATIONS */}
        {/* ================================================= */}

        <KaveeshaSectionHeader
          kicker="YOUR ACTIVITY"
          title="Your Donations"
          onViewAll={() =>
            navigation.navigate('MyDonations')
          }
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hScrollContent}
        >
          {MOCK_DONATIONS.map((donation) => {
            const badge =
              URGENCY_BADGE[donation.urgency];

            return (
              <KaveeshaScrollCard
                key={donation.id}
                icon="fast-food"
                title={donation.foodName}
                subtitle={donation.category}
                metaIcon="location-outline"
                metaText={donation.pickupLocation}
                footerText={donation.quantity}
                badgeLabel={badge.label}
                badgeBg={badge.bg}
                badgeColor={badge.text}
                onPress={() =>
                  navigation.navigate(
                    'DonationDetail',
                    {
                      donationId: donation.id,
                    },
                  )
                }
              />
            );
          })}
        </ScrollView>

        {/* ================================================= */}
        {/* NGO CAMPAIGNS */}
        {/* ================================================= */}

        <KaveeshaSectionHeader
          kicker="GIVE TOGETHER"
          title="NGO Campaigns"
          onViewAll={() => {}}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hScrollContent}
        >
          {MOCK_NGO_CAMPAIGNS.map((campaign) => (
            <KaveeshaScrollCard
              key={campaign.id}
              icon="hand-left"
              title={campaign.title}
              subtitle={campaign.orgName}
              metaIcon="location-outline"
              metaText={campaign.location}
              footerText={campaign.goalText}
              badgeLabel="NGO"
            />
          ))}
        </ScrollView>

        {/* ================================================= */}
        {/* RECIPIENTS */}
        {/* ================================================= */}

        <KaveeshaSectionHeader
          kicker="FIND WHO TO HELP"
          title="Available Recipients"
          onViewAll={() => {}}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hScrollContent}
        >
          {MOCK_RECIPIENTS.map((recipient) => (
            <KaveeshaScrollCard
              key={recipient.id}
              icon="people"
              title={recipient.name}
              subtitle={recipient.needsText}
              metaIcon="navigate-outline"
              metaText={`${recipient.distanceKm} km away`}
              footerText={recipient.type}
              badgeLabel={
                recipient.type.toUpperCase()
              }
            />
          ))}
        </ScrollView>

        {/* ================================================= */}
        {/* COMMUNITY POSTS */}
        {/* ================================================= */}

        <KaveeshaSectionHeader
          kicker="OPEN REQUESTS"
          title="Community Posts"
        />

        {/* Filter */}
        <View style={styles.segmentContainer}>

          <View style={styles.segmentBackground}>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.segmentButton,
                postFilter === 'HIGH' &&
                  styles.segmentButtonActiveUrgent,
              ]}
              onPress={() =>
                setPostFilter('HIGH')
              }
            >
              <View
                style={[
                  styles.segmentDot,
                  {
                    backgroundColor:
                      postFilter === 'HIGH'
                        ? colors.white
                        : colors.urgent,
                  },
                ]}
              />

              <Text
                style={[
                  styles.segmentText,
                  postFilter === 'HIGH' &&
                    styles.segmentTextActive,
                ]}
              >
                Urgent
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.segmentButton,
                postFilter === 'NORMAL' &&
                  styles.segmentButtonActive,
              ]}
              onPress={() =>
                setPostFilter('NORMAL')
              }
            >
              <Text
                style={[
                  styles.segmentText,
                  postFilter === 'NORMAL' &&
                    styles.segmentTextActive,
                ]}
              >
                Normal
              </Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* Posts */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hScrollContent}
        >
          {filteredPosts.map((post) => {
            const badge =
              URGENCY_BADGE[post.urgency];

            return (
              <KaveeshaScrollCard
                key={post.id}
                icon="restaurant-outline"
                title={post.foodName}
                subtitle={post.donorName}
                metaIcon="location-outline"
                metaText={post.location}
                footerText={`${post.quantity} · ${post.expiresInHours}h left`}
                badgeLabel={badge.label}
                badgeBg={badge.bg}
                badgeColor={badge.text}
              />
            );
          })}
        </ScrollView>

        {/* ================================================= */}
        {/* BOTTOM SPACE */}
        {/* ================================================= */}

        <View style={styles.bottomSpace} />

      </ScrollView>

      {/* ================================================= */}
      {/* BOTTOM NAVIGATION */}
      {/* ================================================= */}

      <KaveeshaBottomTabBar
        active={activeTab}
        onNavigate={handleTabPress}
      />

    </SafeAreaView>
  );
}

/* ========================================================= */
/* STYLES */
/* ========================================================= */

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingBottom: spacing.lg,
  },

  /* ----------------------------------------------------- */
  /* HEADER */
  /* ----------------------------------------------------- */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },

  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },

  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  brandIcon: {
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandText: {
    fontFamily: fonts.heading,
    fontSize: 19,
    color: colors.primaryDark,
    letterSpacing: -0.4,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  headerActionButton: {
    width: 37,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.urgent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },

  notificationBadgeText: {
    color: colors.white,
    fontSize: 8,
    fontFamily: fonts.bodyBold,
  },

  /* ----------------------------------------------------- */
  /* WELCOME */
  /* ----------------------------------------------------- */

  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },

  welcomeSmall: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.primary,
    marginBottom: 5,
  },

  greeting: {
    ...typography.h1,
    color: colors.textPrimary,
    fontSize: 28,
    letterSpacing: -0.7,
  },

  greetingSub: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 4,
  },

  welcomeDecoration: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ----------------------------------------------------- */
  /* SEARCH */
  /* ----------------------------------------------------- */

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },

  searchBar: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 15,
    gap: 9,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },

  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 0,
  },

  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },

  /* ----------------------------------------------------- */
  /* HERO */
  /* ----------------------------------------------------- */

  heroContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: 26,
    overflow: 'hidden',
    ...shadow.card,
  },

  hero: {
    minHeight: 225,
    padding: 20,
    flexDirection: 'row',
    overflow: 'hidden',
  },

  heroContent: {
    flex: 1,
    zIndex: 3,
  },

  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  heroPillText: {
    color: colors.white,
    fontFamily: fonts.bodySemiBold,
    fontSize: 8,
    letterSpacing: 1.1,
  },

  heroTitle: {
    fontFamily: fonts.heading,
    fontSize: 27,
    color: colors.white,
    marginTop: 13,
    lineHeight: 31,
    letterSpacing: -0.6,
  },

  heroTitleSecond: {
    fontFamily: fonts.heading,
    fontSize: 27,
    color: colors.accent,
    lineHeight: 31,
    letterSpacing: -0.6,
  },

  heroSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.82)',
    maxWidth: width * 0.57,
    marginTop: 8,
  },

  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 15,
    paddingLeft: 15,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 30,
    backgroundColor: colors.white,
    gap: 8,
  },

  heroButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.primaryDark,
  },

  heroArrow: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroIllustration: {
    width: 105,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  heroIllustrationCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  floatingLeaf: {
    position: 'absolute',
    top: 23,
    right: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  floatingHeart: {
    position: 'absolute',
    bottom: 27,
    left: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroCircleOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -85,
    top: -75,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },

  heroCircleTwo: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    right: 30,
    bottom: -100,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },

  /* ----------------------------------------------------- */
  /* QUICK ACTIONS */
  /* ----------------------------------------------------- */

  sectionTopSpacing: {
    marginTop: 24,
  },

  quickHeader: {
    paddingHorizontal: spacing.lg,
  },

  sectionKicker: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    letterSpacing: 1.35,
    color: colors.primary,
    marginBottom: 4,
  },

  quickTitle: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: -0.25,
  },

  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: 14,
  },

  categoryItem: {
    width: 66,
    alignItems: 'center',
  },

  categoryIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },

  categoryLabel: {
    ...typography.bodySmall,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 10.5,
  },

  /* ----------------------------------------------------- */
  /* IMPACT */
  /* ----------------------------------------------------- */

  impactSection: {
    marginTop: 25,
    paddingHorizontal: spacing.lg,
  },

  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  impactTitle: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: -0.25,
  },

  impactHeart: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  impactRow: {
    flexDirection: 'row',
    gap: 11,
    marginTop: 13,
  },

  statCard: {
    flex: 1,
    minHeight: 125,
    backgroundColor: colors.surface,
    borderRadius: 19,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },

  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statValue: {
    fontFamily: fonts.heading,
    fontSize: 25,
    color: colors.primaryDark,
    marginTop: 13,
    letterSpacing: -0.5,
  },

  statLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 2,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  /* ----------------------------------------------------- */
  /* HORIZONTAL CARDS */
  /* ----------------------------------------------------- */

  hScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingRight: spacing.lg + 8,
  },

  /* ----------------------------------------------------- */
  /* SEGMENT FILTER */
  /* ----------------------------------------------------- */

  segmentContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: -5,
    marginBottom: 13,
  },

  segmentBackground: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    padding: 4,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  segmentButton: {
    minWidth: 84,
    height: 34,
    paddingHorizontal: 13,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  segmentButtonActive: {
    backgroundColor: colors.primary,
  },

  segmentButtonActiveUrgent: {
    backgroundColor: colors.urgent,
  },

  segmentText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textSecondary,
  },

  segmentTextActive: {
    color: colors.white,
  },

  segmentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  /* ----------------------------------------------------- */
  /* BOTTOM */
  /* ----------------------------------------------------- */

  bottomSpace: {
    height: 115,
  },
});