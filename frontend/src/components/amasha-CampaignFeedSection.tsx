import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import api from '@/services/api';
import { CAMPAIGN_CATEGORIES, CampaignPost } from '@/types/amasha-campaign';

// Images are saved as relative paths, so put the server address in front.
const serverRoot = (api.defaults.baseURL ?? '').replace(/\/api\/?$/, '');

const categoryIcon: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  surplus_pickup: 'nutrition-outline',
  food_drive: 'basket-outline',
  awareness: 'bulb-outline',
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export default function AmashaCampaignFeedSection({
  title = 'Community campaigns',
  subtitle = 'What NGOs are organizing right now',
}: {
  title?: string;
  subtitle?: string;
}) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();

  const [campaigns, setCampaigns] = useState<CampaignPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await api.get('/campaigns');
      setCampaigns(res.data.campaigns ?? []);
    } catch (err) {
      console.error('Failed to load campaign feed', err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isWide = width >= 900;
  const cardWidth = Math.min(isWide ? 360 : width * 0.82, 360);

  if (loading) {
    return (
      <View style={styles.section}>
        <SectionIntro styles={styles} title={title} subtitle={subtitle} />
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      </View>
    );
  }

  if (failed) {
    return (
      <View style={styles.section}>
        <SectionIntro styles={styles} title={title} subtitle={subtitle} />
        <View style={styles.message}>
          <Text style={styles.messageText}>Could not load campaigns.</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.link}>Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (campaigns.length === 0) {
    return (
      <View style={styles.section}>
        <SectionIntro styles={styles} title={title} subtitle={subtitle} />
        <View style={styles.message}>
          <Text style={styles.messageText}>
            No campaigns right now. Check back soon — NGOs post here when they need the
            community's help.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionIntro styles={styles} title={title} subtitle={subtitle} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        decelerationRate="fast"
      >
        {campaigns.map((c) => {
          const ended = new Date(c.endDate).getTime() < Date.now();
          const icon = categoryIcon[c.category] ?? 'megaphone-outline';
          return (
            <View key={c._id} style={[styles.card, { width: cardWidth }]}>
              {c.imageUrl ? (
                <Image source={{ uri: serverRoot + c.imageUrl }} style={styles.image} />
              ) : (
                <LinearGradient
                  colors={[colors.primaryDark, colors.primary, colors.info]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.imagePlaceholder}
                >
                  <Ionicons name={icon} size={44} color="rgba(255,255,255,0.9)" />
                </LinearGradient>
              )}

              <View style={styles.chipFloat}>
                <Ionicons
                  name={icon}
                  size={13}
                  color={colors.primary}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.categoryText}>
                  {CAMPAIGN_CATEGORIES.find((x) => x.value === c.category)?.label ??
                    c.category}
                </Text>
              </View>
              {ended ? (
                <View style={[styles.chipFloat, styles.chipEnded]}>
                  <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
                    Ended
                  </Text>
                </View>
              ) : null}

              <View style={styles.body}>
                <Text style={styles.title} numberOfLines={2}>
                  {c.title}
                </Text>

                <View style={styles.orgRow}>
                  <View style={styles.orgAvatar}>
                    <Text style={styles.orgAvatarText}>
                      {(c.ngoName ?? 'N').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.orgName} numberOfLines={1}>
                    {c.ngoName ?? 'NGO'}
                  </Text>
                </View>

                <Text style={styles.description} numberOfLines={2}>
                  {c.description}
                </Text>

                <View style={styles.metaCol}>
                  <View style={styles.metaRow}>
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color={colors.textMuted}
                    />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {c.location}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={colors.textMuted}
                    />
                    <Text style={styles.metaText}>
                      {formatDate(c.startDate)} – {formatDate(c.endDate)}
                    </Text>
                  </View>
                </View>

                {c.targetMeals ? (
                  <View style={styles.targetPill}>
                    <Ionicons name="restaurant-outline" size={13} color={colors.secondary} />
                    <Text style={[styles.targetText, { color: colors.secondaryDark }]}>
                      Target: {c.targetMeals} meals
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SectionIntro({
  styles,
  title,
  subtitle,
}: {
  styles: ReturnType<typeof makeStyles>;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={{ marginBottom: Spacing.three }}>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.subheading}>{subtitle}</Text>
    </View>
  );
}

const makeStyles = (c: (typeof Colors)['light'] | (typeof Colors)['dark']) =>
  StyleSheet.create({
    section: { marginTop: Spacing.four },
    heading: { ...Typography.h3, color: c.text },
    subheading: { ...Typography.bodySmall, color: c.textSecondary, marginTop: 2 },
    loader: { marginVertical: Spacing.four },
    message: {
      padding: Spacing.three,
      borderRadius: Radius.md,
      backgroundColor: c.surfaceSoft,
      gap: Spacing.two,
    },
    messageText: { ...Typography.body, color: c.textSecondary },
    link: { ...Typography.buttonSmall, color: c.primary },
    row: {
      paddingLeft: Spacing.three,
      paddingRight: Spacing.four,
      gap: Spacing.three,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      overflow: 'hidden',
      ...Shadows.card,
    },
    image: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: c.backgroundElement,
    },
    imagePlaceholder: {
      width: '100%',
      aspectRatio: 16 / 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipFloat: {
      position: 'absolute',
      top: Spacing.two,
      left: Spacing.two,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: Spacing.two,
      paddingVertical: 4,
      borderRadius: Radius.pill,
      backgroundColor: 'rgba(255,255,255,0.94)',
    },
    chipEnded: { left: undefined, right: Spacing.two },
    categoryText: { ...Typography.bodySmall, color: c.primary, fontSize: 11 },
    body: { padding: Spacing.three, gap: Spacing.two },
    title: { ...Typography.h3, fontSize: 17, lineHeight: 23, color: c.text },
    orgRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
    orgAvatar: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    orgAvatarText: { ...Typography.labelStrong, color: c.primary, fontSize: 12 },
    orgName: { ...Typography.label, color: c.textSecondary, flexShrink: 1 },
    description: { ...Typography.bodySmall, color: c.textSecondary },
    metaCol: { gap: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { ...Typography.bodySmall, color: c.textMuted, flexShrink: 1 },
    targetPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 5,
      paddingHorizontal: Spacing.two,
      paddingVertical: 4,
      borderRadius: Radius.pill,
      backgroundColor: c.secondarySoft,
    },
    targetText: { ...Typography.label, fontSize: 12 },
  });
