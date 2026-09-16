// frontend/src/screens/kaveesha-DonorHomeScreen.tsx
// Registered in AppNavigator.tsx as the "DonorHome" route — this is what
// getHomeRouteForRole("DONOR") points to after login.
// Owner: Kaveesha

import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radius, shadow, spacing, typography } from '../styles/kaveesha-theme';
import KaveeshaBottomTabBar, { TabKey } from '../components/kaveesha-BottomTabBar';
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

type Props = NativeStackScreenProps<RootStackParamList, 'DonorHome'>;

const URGENCY_BADGE: Record<DonationUrgency, { label: string; bg: string; text: string }> = {
  HIGH: { label: 'URGENT', bg: colors.urgentSoft, text: colors.urgent },
  MEDIUM: { label: 'SOON', bg: colors.mediumSoft, text: colors.medium },
  NORMAL: { label: 'NORMAL', bg: colors.accentSoft, text: colors.primary },
};

export default function DonorHomeScreen({ navigation, route }: Props) {
  const { fullName } = route.params;
  const firstName = fullName?.trim().split(' ')[0] || 'there';

  const [activeTab, setActiveTab] = useState<TabKey>('Home');
  const [search, setSearch] = useState('');
  const [postFilter, setPostFilter] = useState<'HIGH' | 'NORMAL'>('HIGH');

  const filteredPosts = useMemo(
    () => MOCK_COMMUNITY_POSTS.filter((p) => p.urgency === postFilter),
    [postFilter],
  );

  const handleTabPress = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab === 'Create') navigation.navigate('CreateDonation');
    if (tab === 'Donations') navigation.navigate('MyDonations');
    if (tab === 'Profile') navigation.navigate('Profile');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="menu-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.logoWrap}>
            <MaterialCommunityIcons name="leaf" size={18} color={colors.primary} />
            <Text style={styles.logoText}>ResQMeal</Text>
          </View>

          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
              <View style={styles.notifDot}>
                <Text style={styles.notifDotText}>2</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Profile')}>
              <Ionicons name="person-circle-outline" size={26} color={colors.textPrimary} />
            </TouchableOpacity>
            <LogoutButton navigation={navigation} compact />
          </View>
        </View>

        <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
        <Text style={styles.greetingSub}>Ready to rescue some food today?</Text>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              placeholder="Search your donations..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Hero banner */}
        <LinearGradient
          colors={[colors.primaryDark, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.heroKicker}>Good Food</Text>
            <Text style={styles.heroTitle}>Good Impact</Text>
            <Text style={styles.heroSubtitle}>
              Turn surplus food into meals for those who need it most.
            </Text>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => navigation.navigate('CreateDonation')}
            >
              <Text style={styles.heroButtonText}>Donate Now</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons
              name="food-apple-outline"
              size={56}
              color="rgba(255,255,255,0.35)"
            />
          </View>
        </LinearGradient>

        {/* Quick categories */}
        <View style={styles.categoryRow}>
          {MOCK_CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat.id} style={styles.categoryItem}>
              <View style={styles.categoryIconWrap}>
                <Ionicons name={cat.icon as any} size={20} color={colors.primary} />
              </View>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Impact — 2 stat cards, CO2 removed */}
        <View style={styles.impactRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Ionicons name="restaurant" size={18} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{MOCK_IMPACT.mealsRescued}</Text>
            <Text style={styles.statLabel}>Meals Rescued</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Ionicons name="pulse" size={18} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{MOCK_IMPACT.activeDonations}</Text>
            <Text style={styles.statLabel}>Active Now</Text>
          </View>
        </View>

        {/* Your Donations — horizontal scroller */}
        <KaveeshaSectionHeader
          kicker="Your Activity"
          title="Your Donations"
          onViewAll={() => navigation.navigate('MyDonations')}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
          {MOCK_DONATIONS.map((donation) => {
            const badge = URGENCY_BADGE[donation.urgency];
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
                onPress={() => navigation.navigate('DonationDetail', { donationId: donation.id })}
              />
            );
          })}
        </ScrollView>

        {/* NGO Campaigns */}
        <KaveeshaSectionHeader kicker="Give Together" title="NGO Campaigns" onViewAll={() => {}} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
          {MOCK_NGO_CAMPAIGNS.map((c) => (
            <KaveeshaScrollCard
              key={c.id}
              icon="hand-left"
              title={c.title}
              subtitle={c.orgName}
              metaIcon="location-outline"
              metaText={c.location}
              footerText={c.goalText}
              badgeLabel="NGO"
            />
          ))}
        </ScrollView>

        {/* Available Recipients */}
        <KaveeshaSectionHeader
          kicker="Find Who to Help"
          title="Available Recipients"
          onViewAll={() => {}}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
          {MOCK_RECIPIENTS.map((r) => (
            <KaveeshaScrollCard
              key={r.id}
              icon="people"
              title={r.name}
              subtitle={r.needsText}
              metaIcon="navigate-outline"
              metaText={`${r.distanceKm} km away`}
              footerText={r.type}
              badgeLabel={r.type.toUpperCase()}
            />
          ))}
        </ScrollView>

        {/* Community Posts — Urgent / Normal filter */}
        <KaveeshaSectionHeader kicker="Open Requests" title="Community Posts" />
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segmentButton, postFilter === 'HIGH' && styles.segmentButtonActiveUrgent]}
            onPress={() => setPostFilter('HIGH')}
          >
            <Text style={[styles.segmentText, postFilter === 'HIGH' && styles.segmentTextActive]}>
              Urgent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, postFilter === 'NORMAL' && styles.segmentButtonActive]}
            onPress={() => setPostFilter('NORMAL')}
          >
            <Text style={[styles.segmentText, postFilter === 'NORMAL' && styles.segmentTextActive]}>
              Normal
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
          {filteredPosts.map((post) => {
            const badge = URGENCY_BADGE[post.urgency];
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

        <View style={{ height: 110 }} />
      </ScrollView>

      <KaveeshaBottomTabBar active={activeTab} onNavigate={handleTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  iconButton: { padding: 4 },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoText: { fontFamily: fonts.heading, fontSize: 19, color: colors.primaryDark },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.urgent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDotText: { color: colors.white, fontSize: 9, fontFamily: fonts.bodyBold },
  greeting: {
    ...typography.h1,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  greetingSub: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 3,
    paddingHorizontal: spacing.lg,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: 10,
    paddingHorizontal: spacing.lg,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 48,
    gap: 8,
    ...shadow.soft,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  heroKicker: { ...typography.kicker, color: colors.accent, letterSpacing: 1 },
  heroTitle: { ...typography.h1, color: colors.white, marginTop: 4, fontSize: 26 },
  heroSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  heroButtonText: { ...typography.label, fontFamily: fonts.bodySemiBold, color: colors.primary },
  heroIconWrap: { justifyContent: 'flex-end', alignItems: 'flex-end' },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  categoryItem: { alignItems: 'center', gap: 6, width: 60 },
  categoryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    ...typography.bodySmall,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  impactRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: { ...typography.h2, color: colors.primaryDark },
  statLabel: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  hScrollContent: { paddingHorizontal: spacing.lg },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
  },
  segmentButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentButtonActiveUrgent: { backgroundColor: colors.urgent, borderColor: colors.urgent },
  segmentText: { ...typography.label, color: colors.textSecondary },
  segmentTextActive: { color: colors.white },
});