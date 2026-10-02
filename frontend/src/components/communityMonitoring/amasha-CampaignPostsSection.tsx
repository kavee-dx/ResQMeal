import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import api from '@/services/api';
import { CAMPAIGN_CATEGORIES, CampaignPost } from '@/types/amasha-campaign';

// Images are saved as relative paths, so put the server address in front.
// If your API base URL ends in /api, that part is removed.
const serverRoot = (api.defaults.baseURL ?? '').replace(/\/api\/?$/, '');

const categoryLabel = (value: string) =>
  CAMPAIGN_CATEGORIES.find((c) => c.value === value)?.label ?? value;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function AmashaCampaignPostsSection() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [campaigns, setCampaigns] = useState<CampaignPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await api.get('/campaigns/me');
      setCampaigns(res.data.campaigns);
    } catch (err) {
      console.error('Failed to load campaigns', err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Published campaigns</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : failed ? (
        <View style={styles.message}>
          <Text style={styles.messageText}>Could not load your campaigns.</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.link}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : campaigns.length === 0 ? (
        <View style={styles.message}>
          <Text style={styles.messageText}>
            No campaigns yet. Posts you publish will appear here for the community to see.
          </Text>
        </View>
      ) : (
        campaigns.map((c) => {
          const ended = new Date(c.endDate).getTime() < Date.now();
          return (
            <View key={c._id} style={styles.card}>
              {c.imageUrl ? (
                <Image source={{ uri: serverRoot + c.imageUrl }} style={styles.image} />
              ) : null}

              <View style={styles.body}>
                <View style={styles.tagRow}>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{categoryLabel(c.category)}</Text>
                  </View>
                  {ended ? (
                    <View style={[styles.tag, styles.tagEnded]}>
                      <Text style={styles.tagTextEnded}>Ended</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.title}>{c.title}</Text>
                <Text style={styles.description} numberOfLines={3}>
                  {c.description}
                </Text>

                <Text style={styles.meta}>{c.location}</Text>
                <Text style={styles.meta}>
                  {formatDate(c.startDate)} to {formatDate(c.endDate)}
                </Text>
                {c.targetMeals ? (
                  <Text style={styles.meta}>Target: {c.targetMeals} meals</Text>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const makeStyles = (c: (typeof Colors)['light'] | (typeof Colors)['dark']) =>
  StyleSheet.create({
    section: { paddingHorizontal: Spacing.three, paddingTop: Spacing.four },
    heading: { ...Typography.h3, color: c.text, marginBottom: Spacing.three },
    loader: { marginVertical: Spacing.four },
    message: {
      padding: Spacing.three,
      borderRadius: Radius.md,
      backgroundColor: c.surfaceSoft,
      gap: Spacing.two,
    },
    messageText: { ...Typography.body, color: c.textSecondary },
    link: { ...Typography.buttonSmall, color: c.primary },
    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      marginBottom: Spacing.three,
      overflow: 'hidden',
      ...Shadows.card,
    },
    image: { width: '100%', aspectRatio: 16 / 9, backgroundColor: c.backgroundElement },
    body: { padding: Spacing.three, gap: Spacing.one },
    tagRow: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.one },
    tag: {
      paddingHorizontal: Spacing.two,
      paddingVertical: Spacing.one,
      borderRadius: Radius.pill,
      backgroundColor: c.primarySoft,
    },
    tagText: { ...Typography.bodySmall, color: c.primary },
    tagEnded: { backgroundColor: c.backgroundElement },
    tagTextEnded: { ...Typography.bodySmall, color: c.textSecondary },
    title: { ...Typography.h3, color: c.text },
    description: { ...Typography.body, color: c.textSecondary },
    meta: { ...Typography.bodySmall, color: c.textMuted },
  });