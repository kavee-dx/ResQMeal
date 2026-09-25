import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useCreateDonation } from '../../context/kaveesha-CreateDonationContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  colors,
  fonts,
  radius,
  spacing,
  typography,
} from '../../styles/kaveesha-theme';

import type { CreateDonationFlowParamList } from '../../navigation/kaveesha-createDonationFlow.types';

type Props = NativeStackScreenProps<CreateDonationFlowParamList, 'TypeSelect'>;

export default function KaveeshaTypeSelectScreen({ navigation }: Props) {
  const { state, update } = useCreateDonation();

  const isNormal = state.donationType === 'NORMAL';
  const isUrgent = state.donationType === 'URGENT';

  const handleContinue = () => {
    navigation.navigate('Details');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.getParent()?.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={colors.primary}
            />
          </Pressable>

          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>STEP 1 OF 4</Text>
          </View>
        </View>

        {/* Intro */}
        <View style={styles.intro}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="gift-outline"
              size={28}
              color={colors.accent}
            />
          </View>

          <Text style={styles.kicker}>CREATE DONATION</Text>

          <Text style={styles.title}>
            How quickly does this food need to be rescued?
          </Text>

          <Text style={styles.subtitle}>
            Choose the option that best matches the time available
            before the food expires.
          </Text>
        </View>

        {/* Donation Type Cards */}
        <View style={styles.optionsContainer}>
          {/* Normal */}
          <Pressable
            onPress={() => update('donationType', 'NORMAL')}
            style={[
              styles.optionCard,
              isNormal && styles.optionCardSelected,
            ]}
          >
            <View
              style={[
                styles.optionIcon,
                isNormal && styles.optionIconSelected,
              ]}
            >
              <Ionicons
                name="time-outline"
                size={25}
                color={isNormal ? colors.accent : colors.primary}
              />
            </View>

            <View style={styles.optionContent}>
              <View style={styles.optionTitleRow}>
                <Text style={styles.optionTitle}>Standard Donation</Text>

                {isNormal && (
                  <View style={styles.selectedBadge}>
                    <Ionicons
                      name="checkmark"
                      size={13}
                      color={colors.white}
                    />
                  </View>
                )}
              </View>

              <Text style={styles.optionDescription}>
                There is enough time before expiry for the standard
                matching and pickup process.
              </Text>

              <View style={styles.optionHint}>
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={colors.info}
                />
                <Text style={styles.optionHintText}>
                  Standard recipient matching
                </Text>
              </View>
            </View>
          </Pressable>

          {/* Urgent */}
          <Pressable
            onPress={() => update('donationType', 'URGENT')}
            style={[
              styles.optionCard,
              isUrgent && styles.optionCardUrgentSelected,
            ]}
          >
            <View
              style={[
                styles.optionIcon,
                styles.urgentIcon,
                isUrgent && styles.urgentIconSelected,
              ]}
            >
              <Ionicons
                name="flash-outline"
                size={25}
                color={isUrgent ? colors.accent : colors.urgent}
              />
            </View>

            <View style={styles.optionContent}>
              <View style={styles.optionTitleRow}>
                <Text style={styles.optionTitle}>Urgent Rescue</Text>

                {isUrgent && (
                  <View style={styles.selectedBadge}>
                    <Ionicons
                      name="checkmark"
                      size={13}
                      color={colors.white}
                    />
                  </View>
                )}
              </View>

              <Text style={styles.optionDescription}>
                This food needs faster rescue because it may expire
                within a short time.
              </Text>

              <View style={styles.optionHintUrgent}>
                <Ionicons
                  name="bicycle-outline"
                  size={16}
                  color={colors.urgent}
                />
                <Text style={styles.optionHintUrgentText}>
                  Prioritized for faster coordination
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Information card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="information-circle-outline"
              size={21}
              color={colors.info}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Not sure which one to choose?
            </Text>

            <Text style={styles.infoText}>
              You can provide the preparation and expiry times on the
              next screen. These details help ResQMeal coordinate the
              rescue appropriately.
            </Text>
          </View>
        </View>

        {/* Continue */}
        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [
            styles.continueButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.continueText}>Continue</Text>

          <View style={styles.arrowCircle}>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={colors.primary}
            />
          </View>
        </Pressable>

        <Text style={styles.footerText}>
          You can review your donation before publishing.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  stepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },

  stepBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.primary,
  },

  intro: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },

  kicker: {
    ...typography.kicker,
    color: colors.accent,
    marginBottom: spacing.sm,
  },

  title: {
    ...typography.h1,
    color: colors.primary,
    textAlign: 'center',
    maxWidth: 650,
  },

  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 600,
  },

  optionsContainer: {
    gap: spacing.md,
  },

  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },

  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F4F8FA',
  },

  optionCardUrgentSelected: {
    borderColor: colors.accent,
    backgroundColor: '#FFF9F3',
  },

  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionIconSelected: {
    backgroundColor: colors.accentSoft,
  },

  urgentIcon: {
    backgroundColor: colors.urgentSoft,
  },

  urgentIconSelected: {
    backgroundColor: colors.accentSoft,
  },

  optionContent: {
    flex: 1,
  },

  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },

  optionTitle: {
    ...typography.h3,
    color: colors.primary,
    flex: 1,
  },

  selectedBadge: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 5,
  },

  optionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.infoSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: spacing.sm,
    gap: 5,
  },

  optionHintText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.info,
  },

  optionHintUrgent: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.urgentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: spacing.sm,
    gap: 5,
  },

  optionHintUrgentText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.urgent,
  },

  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.infoSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },

  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    ...typography.label,
    color: colors.primary,
    marginBottom: 3,
  },

  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  continueButton: {
    minHeight: 54,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    paddingLeft: spacing.lg,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  buttonPressed: {
    opacity: 0.88,
  },

  continueText: {
    ...typography.button,
    color: colors.white,
    marginLeft: 8,
  },

  arrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});