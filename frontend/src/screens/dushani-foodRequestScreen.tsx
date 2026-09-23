import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Radius, Spacing, Shadows } from '@/constants/theme';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';
import type { RootStackParamList } from '../navigation/types';
import {
  createEmergencyFoodRequest,
  createFoodRequest,
  type FoodRequestUrgency,
} from '../services/dushani-foodRequestApi';

type Props = NativeStackScreenProps<RootStackParamList, 'FoodRequest'>;

// User-management palette (same constants as RegisterScreen / LoginScreen).
const C = {
  navy: '#023047',
  teal: '#126782',
  tealSoft: '#E1EEF2',
  amber: '#FFB703',
  orange: '#FB8500',
  white: '#FFFFFF',
  offWhite: '#F6F8FA',
  inputBg: '#F1F5F7',
  cardBorder: '#E4E9ED',
  textMuted: '#6B7B85',
  error: '#D64545',
  errorSoft: '#FBEAEA',
};

const OTHER_FOOD = 'Other';

const FOOD_TYPE_OPTIONS: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { label: 'Rice', icon: 'restaurant-outline' },
  { label: 'Vegetables', icon: 'leaf-outline' },
  { label: 'Dry Foods', icon: 'cube-outline' },
  { label: 'Bread', icon: 'fast-food-outline' },
  { label: 'Water', icon: 'water-outline' },
  { label: OTHER_FOOD, icon: 'ellipsis-horizontal-outline' },
];

/**
 * Soft colour wash behind the request card — same decorative language as the
 * user-management auth screens, so the form never floats on a flat grey page.
 */
function Backdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.blob, { width: 340, height: 340, borderRadius: 170, backgroundColor: C.teal, opacity: 0.18, top: -90, left: -80 }]} />
      <View style={[styles.blob, { width: 280, height: 280, borderRadius: 140, backgroundColor: C.amber, opacity: 0.16, top: 180, right: -100 }]} />
      <View style={[styles.blob, { width: 220, height: 220, borderRadius: 110, backgroundColor: C.navy, opacity: 0.1, bottom: 90, left: -60 }]} />
      <View style={[styles.blob, { width: 180, height: 180, borderRadius: 90, backgroundColor: C.orange, opacity: 0.14, bottom: -60, right: 40 }]} />
    </View>
  );
}

export default function FoodRequestScreen({ navigation, route }: Props) {
  const T = useAppTypography();

  const [foodTypes, setFoodTypes] = useState<string[]>([]);
  const [otherFood, setOtherFood] = useState('');
  const [quantity, setQuantity] = useState('');
  const [location, setLocation] = useState('');
  const [details, setDetails] = useState('');
  const [urgency, setUrgency] = useState<FoodRequestUrgency>(
    route.params?.urgency ?? 'NORMAL',
  );
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    foodTypes?: string;
    otherFood?: string;
    quantity?: string;
    location?: string;
  }>({});

  const otherSelected = foodTypes.includes(OTHER_FOOD);
  const isUrgent = urgency === 'URGENT';

  const toggleFoodType = (label: string) => {
    setFoodTypes((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label],
    );
    setErrors((current) => ({ ...current, foodTypes: undefined }));
  };

  const validate = () => {
    const nextErrors: typeof errors = {};
    if (foodTypes.length === 0) {
      nextErrors.foodTypes = 'Select at least one food type';
    }
    if (foodTypes.includes(OTHER_FOOD) && !otherFood.trim()) {
      nextErrors.otherFood = 'Please specify the food you need';
    }
    if (!quantity.trim()) nextErrors.quantity = 'Quantity is required';
    if (!location.trim()) nextErrors.location = 'Location is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildFoodType = () => {
    const named = foodTypes.filter((label) => label !== OTHER_FOOD);
    if (otherSelected) named.push(otherFood.trim());
    return named.join(', ');
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    const basePayload = {
      foodType: buildFoodType(),
      quantity: quantity.trim(),
      location: location.trim(),
      details: details.trim(),
    };
    try {
      if (isUrgent) {
        await createEmergencyFoodRequest(basePayload);
      } else {
        await createFoodRequest({ ...basePayload, urgency: 'NORMAL' });
      }
      Alert.alert('Request submitted', 'Your food request has been posted.', [
        {
          text: 'View status',
          onPress: () => navigation.replace('RequestStatus'),
        },
        { text: 'OK', style: 'cancel' },
      ]);
    } catch (err) {
      Alert.alert(
        'Something went wrong',
        err instanceof Error
          ? err.message
          : 'Failed to submit your request. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Backdrop />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={C.navy} />
          </TouchableOpacity>
          <View>
            <Text style={{ ...T.caption, color: C.teal }}>Recipient</Text>
            <Text style={{ ...T.h2, color: C.navy, fontSize: 26 }}>
              Create Request
            </Text>
          </View>
        </View>

        <View style={styles.page}>

          <View style={styles.card}>
            <View style={styles.cardIntro}>
              <View style={styles.heroIcon}>
                <Ionicons name="restaurant" size={24} color={C.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...T.h3, color: C.navy, fontSize: 20 }}>
                  Ask nearby donors for food
                </Text>
                <Text style={{ ...T.body, color: C.textMuted, marginTop: 3 }}>
                  Pick what you need, and mark it urgent to be shown to donors
                  first.
                </Text>
              </View>
            </View>

            <SectionTitle
              step="01"
              title="What food do you need?"
              subtitle="Select all that apply"
            />
            <View style={styles.chipGrid}>
              {FOOD_TYPE_OPTIONS.map((option) => {
                const active = foodTypes.includes(option.label);
                return (
                  <TouchableOpacity
                    key={option.label}
                    onPress={() => toggleFoodType(option.label)}
                    activeOpacity={0.8}
                    style={[
                      styles.chip,
                      active && {
                        backgroundColor: C.teal,
                        borderColor: C.teal,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.chipIcon,
                        active && { backgroundColor: C.white },
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={C.teal}
                      />
                    </View>
                    <Text
                      style={{
                        ...T.labelStrong,
                        fontSize: 14,
                        color: active ? C.white : C.navy,
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.foodTypes && <ErrorText message={errors.foodTypes} />}

            {otherSelected && (
              <View style={styles.otherBox}>
                <Field
                  label="Specify the food you need"
                  value={otherFood}
                  onChangeText={(text) => {
                    setOtherFood(text);
                    setErrors((c) => ({ ...c, otherFood: undefined }));
                  }}
                  error={errors.otherFood}
                  placeholder="e.g. Baby formula, lentils, milk..."
                  icon="create-outline"
                />
              </View>
            )}

            <SectionTitle
              step="02"
              title="How much and where?"
              subtitle="So donors know what to prepare"
            />
            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Field
                  label="Quantity"
                  value={quantity}
                  onChangeText={(text) => {
                    setQuantity(text);
                    setErrors((c) => ({ ...c, quantity: undefined }));
                  }}
                  error={errors.quantity}
                  placeholder="e.g. 5 kg"
                  icon="scale-outline"
                />
              </View>
              <View style={styles.fieldHalf}>
                <Field
                  label="Preferred Location"
                  value={location}
                  onChangeText={(text) => {
                    setLocation(text);
                    setErrors((c) => ({ ...c, location: undefined }));
                  }}
                  error={errors.location}
                  placeholder="e.g. Colombo 05"
                  icon="location-outline"
                />
              </View>
            </View>

            <SectionTitle
              step="03"
              title="How urgent is it?"
              subtitle="Urgent requests expire after 5 hours"
            />
            <View style={styles.urgencyRow}>
              {(['URGENT', 'NORMAL'] as FoodRequestUrgency[]).map((level) => {
                const active = urgency === level;
                const urgent = level === 'URGENT';
                return (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setUrgency(level)}
                    activeOpacity={0.85}
                    style={[
                      styles.urgencyOption,
                      active && urgent && {
                        backgroundColor: C.errorSoft,
                        borderColor: C.error,
                      },
                      active && !urgent && {
                        backgroundColor: C.tealSoft,
                        borderColor: C.teal,
                      },
                      !active && {
                        backgroundColor: C.inputBg,
                        borderColor: C.cardBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name={urgent ? 'flash' : 'time-outline'}
                      size={26}
                      color={
                        active
                          ? urgent
                            ? C.error
                            : C.teal
                          : C.textMuted
                      }
                      style={{ marginBottom: Spacing.two }}
                    />
                    <Text
                      style={{
                        ...T.labelStrong,
                        fontSize: 15,
                        color: active
                          ? urgent
                            ? C.error
                            : C.teal
                          : C.textMuted,
                      }}
                    >
                      {urgent ? 'Urgent' : 'Normal'}
                    </Text>
                    <Text
                      style={{ ...T.bodySmall, color: C.textMuted, marginTop: 2 }}
                    >
                      {urgent ? 'Within 5 hours' : 'Up to 24 hours'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {isUrgent && (
              <View style={styles.emergencyBanner}>
                <Ionicons
                  name="warning"
                  size={20}
                  color={C.error}
                  style={{ marginRight: Spacing.three }}
                />
                <Text style={{ ...T.body, color: C.error, flex: 1 }}>
                  This will be posted as an emergency request and shown to
                  donors first.
                </Text>
              </View>
            )}

            <SectionTitle
              step="04"
              title="Anything else?"
              subtitle="Optional — allergies, pickup notes"
            />
            <Field
              label="Details"
              value={details}
              onChangeText={setDetails}
              placeholder="e.g. Halal only, pickup after 6 PM"
              icon="chatbox-ellipses-outline"
              multiline
            />

            <View style={styles.divider} />

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.88}
              style={[
                styles.submitButton,
                { backgroundColor: isUrgent ? C.error : C.amber },
                submitting && { opacity: 0.7 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator
                  color={isUrgent ? C.white : C.navy}
                  size="large"
                />
              ) : (
                <>
                  <Ionicons
                    name={isUrgent ? 'flash' : 'send'}
                    size={20}
                    color={isUrgent ? C.white : C.navy}
                    style={{ marginRight: Spacing.two + 2 }}
                  />
                  <Text
                    style={{
                      ...T.button,
                      fontSize: 17,
                      color: isUrgent ? C.white : C.navy,
                    }}
                  >
                    {isUrgent
                      ? 'Post Emergency Request'
                      : 'Post Food Request'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('RequestStatus')}
              style={styles.trackLink}
            >
              <Text style={{ ...T.bodyMedium, color: C.textMuted }}>
                View my requests
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={C.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionTitle({
  step,
  title,
  subtitle,
}: {
  step: string;
  title: string;
  subtitle?: string;
}) {
  const T = useAppTypography();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.stepBadge}>
        <Text style={{ ...T.labelStrong, fontSize: 12, color: C.teal }}>
          {step}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...T.h3, color: C.navy, fontSize: 17 }}>{title}</Text>
        {subtitle && (
          <Text style={{ ...T.bodySmall, color: C.textMuted, fontSize: 13 }}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  multiline?: boolean;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  icon,
  multiline,
}: FieldProps) {
  const T = useAppTypography();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: Spacing.three }}>
      <Text
        style={{ ...T.label, fontSize: 14, color: C.navy, marginBottom: Spacing.two }}
      >
        {label}
      </Text>
      <View
        style={[
          styles.inputWrapper,
          focused && { borderColor: C.teal, backgroundColor: C.white },
          !!error && { borderColor: C.error },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={19}
            color={error ? C.error : focused ? C.teal : C.textMuted}
            style={{ marginRight: Spacing.three, marginTop: multiline ? 6 : 0 }}
          />
        )}
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {error && <ErrorText message={error} />}
    </View>
  );
}

function ErrorText({ message }: { message: string }) {
  const T = useAppTypography();
  return (
    <View style={styles.errorRow}>
      <Ionicons
        name="alert-circle"
        size={15}
        color={C.error}
        style={{ marginRight: Spacing.one + 2 }}
      />
      <Text style={{ ...T.bodySmall, color: C.error, fontSize: 13 }}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.offWhite,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.seven,
  },
  blob: {
    position: 'absolute',
  },
  page: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    marginBottom: Spacing.four,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
    ...Shadows.card,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: Spacing.five,
    ...Shadows.card,
  },
  cardIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.offWhite,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: C.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.four,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.five,
    marginBottom: Spacing.four,
  },
  stepBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 180,
    padding: Spacing.two + 4,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    backgroundColor: C.inputBg,
  },
  chipIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  otherBox: {
    marginTop: Spacing.four,
    backgroundColor: C.offWhite,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.tealSoft,
    padding: Spacing.four,
  },
  fieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.four,
  },
  fieldHalf: {
    flex: 1,
    minWidth: 240,
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  urgencyOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 2,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.errorSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.error,
    padding: Spacing.four,
    marginTop: Spacing.four,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.inputBg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    paddingHorizontal: Spacing.four,
  },
  input: {
    flex: 1,
    minHeight: 56,
    color: C.navy,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    textAlignVertical: 'top',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  divider: {
    height: 1,
    backgroundColor: C.cardBorder,
    marginTop: Spacing.five,
    marginBottom: Spacing.four,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: Radius.md,
    ...Shadows.button,
  },
  trackLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
