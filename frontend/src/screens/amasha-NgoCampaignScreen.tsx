import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import AmashaCampaignPostForm from '@/components/communityMonitoring/amasha-CampaignPostForm';
import AmashaCampaignPostsSection from '@/components/communityMonitoring/amasha-CampaignPostsSection';

type TabKey = 'create' | 'published';

export default function NgoCampaignScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const styles = makeStyles(colors);
  const navigation = useNavigation();

  const [tab, setTab] = useState<TabKey>('create');

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Ionicons name="megaphone" size={18} color={colors.textOnPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Campaigns</Text>
          <Text style={styles.headerSubtitle}>
            Post drives and rallies the community
          </Text>
        </View>
      </View>

      {/* Segmented control */}
      <View style={styles.segmentWrap}>
        <View style={styles.segmentTrack}>
          {(
            [
              { key: 'create', label: 'New post', icon: 'add-circle-outline' },
              { key: 'published', label: 'Published', icon: 'documents-outline' },
            ] as const
          ).map((s) => {
            const active = tab === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.segment, active && styles.segmentActive]}
                onPress={() => setTab(s.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={s.icon}
                  size={15}
                  color={active ? colors.textOnPrimary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.segmentText,
                    active && { color: colors.textOnPrimary },
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tab content — rendered conditionally so switching to "Published"
          remounts the list and picks up campaigns created just now */}
      {tab === 'create' ? (
        <AmashaCampaignPostForm
          onCreated={() => setTab('published')}
        />
      ) : (
        <AmashaCampaignPostsSection />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: (typeof Colors)['light'] | (typeof Colors)['dark']) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.three,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
      ...Shadows.button,
    },
    headerTitle: { ...Typography.h3, color: c.text },
    headerSubtitle: { ...Typography.bodySmall, color: c.textSecondary },
    segmentWrap: {
      paddingHorizontal: Spacing.three,
      paddingTop: Spacing.two,
      paddingBottom: Spacing.three,
    },
    segmentTrack: {
      flexDirection: 'row',
      backgroundColor: c.backgroundElement,
      borderRadius: Radius.md,
      padding: 4,
      gap: 4,
    },
    segment: {
      flex: 1,
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: Radius.sm,
    },
    segmentActive: {
      backgroundColor: c.primary,
      ...Shadows.card,
    },
    segmentText: { ...Typography.buttonSmall, color: c.textSecondary },
  });
