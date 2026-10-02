import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing, Shadows, ComponentSizes } from '@/constants/theme';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';
import { useVolunteerNavigation } from '../hooks/dilshara-useVolunteerNavigation';
import VolunteerBottomNav from '../components/dilshara-VolunteerBottomNav';
import { getAvailability, updateAvailability } from '@/services/dilshara-availabilityService';
import {
  getDeliveryPreferences,
  updateDeliveryPreferences,
} from '@/services/dilshara-deliveryPreferencesService';

type Day = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

const ALL_DAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MAX_DISTANCE_KM = 100;

interface FormState {
  availabilityStatus: 'AVAILABLE' | 'UNAVAILABLE';
  availableDays: Day[];
  availableFrom: string;
  availableTo: string;
  preferredDeliveryArea: string;
  maxDeliveryDistance: string; // kept as text for the input
}

function getErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message ?? fallback;
}

export default function VolunteerDeliveryPreferencesScreen() {
  const theme = Colors.light;
  const T = useAppTypography();
  const insets = useSafeAreaInsets();
  const { navigation, goTo } = useVolunteerNavigation();

  const [form, setForm] = useState<FormState>({
    availabilityStatus: 'UNAVAILABLE',
    availableDays: [],
    availableFrom: '16:00',
    availableTo: '22:00',
    preferredDeliveryArea: '',
    maxDeliveryDistance: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Hide the bottom bar while typing so it never covers the inputs.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Load previously saved availability + preferences.
  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [availability, preferences] = await Promise.all([
          getAvailability(),
          getDeliveryPreferences(),
        ]);
        if (!active) return;

        setForm({
          availabilityStatus: availability.availabilityStatus,
          availableDays: availability.availableDays as Day[],
          availableFrom: availability.availableFrom,
          availableTo: availability.availableTo,
          preferredDeliveryArea: preferences.preferredDeliveryArea,
          maxDeliveryDistance:
            preferences.maxDeliveryDistance !== null
              ? String(preferences.maxDeliveryDistance)
              : '',
        });
      } catch {
        if (active) Alert.alert('Error', 'Could not load your saved preferences.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const isAvailable = form.availabilityStatus === 'AVAILABLE';

  const area = form.preferredDeliveryArea.trim();
  const distance = Number(form.maxDeliveryDistance);
  const distanceValid =
    form.maxDeliveryDistance.trim() !== '' &&
    Number.isFinite(distance) &&
    distance > 0 &&
    distance <= MAX_DISTANCE_KM;
  const preferencesComplete = area.length > 0 && distanceValid;

  const toggleDay = (day: Day) => {
    if (!isAvailable) return;
    setForm((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day],
    }));
  };

  const validate = (): string | null => {
    if (!TIME_REGEX.test(form.availableFrom) || !TIME_REGEX.test(form.availableTo)) {
      return 'Enter time in HH:mm format (e.g. 16:00).';
    }

    if (isAvailable) {
      if (form.availableDays.length === 0) {
        return 'Select at least one available day.';
      }
      if (form.availableFrom >= form.availableTo) {
        return '"Available from" must be earlier than "available until".';
      }
      if (!preferencesComplete) {
        return `Enter your preferred area and a maximum distance between 0 and ${MAX_DISTANCE_KM} km so we can match deliveries near you.`;
      }
    } else if (
      (area || form.maxDeliveryDistance.trim()) &&
      !preferencesComplete
    ) {
      return 'Complete both delivery preference fields, or clear them, before saving.';
    }

    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Check your input', error);
      return;
    }

    setSaving(true);

    const [availabilityResult, preferencesResult] = await Promise.allSettled([
      updateAvailability({
        availabilityStatus: form.availabilityStatus,
        availableDays: form.availableDays,
        availableFrom: form.availableFrom,
        availableTo: form.availableTo,
      }),
      preferencesComplete
        ? updateDeliveryPreferences({
            preferredDeliveryArea: area,
            // Generated from the availability window so it is typed only once.
            preferredDeliveryTime: `${form.availableFrom} - ${form.availableTo}`,
            maxDeliveryDistance: distance,
          })
        : Promise.resolve(null),
    ]);

    const failures: string[] = [];
    if (availabilityResult.status === 'rejected') {
      failures.push(`Availability: ${getErrorMessage(availabilityResult.reason, 'could not be saved.')}`);
    }
    if (preferencesResult.status === 'rejected') {
      failures.push(`Preferences: ${getErrorMessage(preferencesResult.reason, 'could not be saved.')}`);
    }

    if (failures.length === 0) {
      Alert.alert(
        'Saved',
        preferencesComplete
          ? 'Your availability and delivery preferences have been updated.'
          : 'Your availability has been updated.',
      );
    } else {
      Alert.alert('Could not save everything', failures.join('\n'));
    }

    setSaving(false);
  };

  const inputStyle = {
    ...T.input,
    height: ComponentSizes.inputHeight,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: Radius.md,
    backgroundColor: theme.inputBackground,
    color: theme.inputText,
    paddingHorizontal: Spacing.three,
  };

  const cardStyle = {
    backgroundColor: theme.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: theme.borderLight,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    ...Shadows.card,
  };

  if (loading) {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.four,
          paddingTop: insets.top + Spacing.three,
          paddingBottom: Spacing.four,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.four }}>
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : goTo('home'))}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.borderLight,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: Spacing.three,
            }}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ ...T.h1, fontSize: 22, lineHeight: 28, color: theme.text }}>
              Delivery Preferences
            </Text>
            <Text style={{ ...T.bodySmall, color: theme.textSecondary }}>
              Tell us when and where you like to deliver.
            </Text>
          </View>
        </View>

        {/* Availability */}
        <View style={cardStyle}>
          <Text style={{ ...T.label, fontSize: 15, color: theme.text, marginBottom: Spacing.three }}>
            Availability
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...T.bodyMedium, color: theme.text }}>
              {isAvailable ? 'Available' : 'Unavailable'}
            </Text>
            <Switch
              value={isAvailable}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  availabilityStatus: value ? 'AVAILABLE' : 'UNAVAILABLE',
                }))
              }
              trackColor={{ false: theme.border, true: theme.secondary }}
              thumbColor={theme.surface}
            />
          </View>
          <Text style={{ ...T.bodySmall, color: theme.textSecondary, marginTop: Spacing.two }}>
            {isAvailable
              ? 'You may receive delivery requests.'
              : 'You will not be considered for delivery matching.'}
          </Text>

          <Text style={{ ...T.label, color: theme.textSecondary, marginTop: Spacing.three, marginBottom: Spacing.two }}>
            Available days
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {ALL_DAYS.map((day) => {
              const selected = form.availableDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => toggleDay(day)}
                  disabled={!isAvailable}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: !isAvailable }}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: Radius.pill,
                    borderWidth: 1,
                    borderColor: selected ? theme.primary : theme.border,
                    backgroundColor: selected ? theme.primary : theme.surface,
                    marginRight: Spacing.two,
                    marginBottom: Spacing.two,
                    opacity: isAvailable ? 1 : 0.45,
                  }}
                >
                  <Text style={{ ...T.label, color: selected ? theme.textOnPrimary : theme.text }}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', marginTop: Spacing.two }}>
            <View style={{ flex: 1, marginRight: Spacing.two }}>
              <Text style={{ ...T.label, color: theme.textSecondary, marginBottom: 6 }}>Available from</Text>
              <TextInput
                style={[
                  inputStyle,
                  { textAlign: 'center' },
                  !isAvailable && { backgroundColor: theme.backgroundElement, color: theme.textMuted },
                ]}
                value={form.availableFrom}
                onChangeText={(text) => setForm((prev) => ({ ...prev, availableFrom: text }))}
                placeholder="16:00"
                placeholderTextColor={theme.inputPlaceholder}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                editable={isAvailable}
              />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.two }}>
              <Text style={{ ...T.label, color: theme.textSecondary, marginBottom: 6 }}>Available until</Text>
              <TextInput
                style={[
                  inputStyle,
                  { textAlign: 'center' },
                  !isAvailable && { backgroundColor: theme.backgroundElement, color: theme.textMuted },
                ]}
                value={form.availableTo}
                onChangeText={(text) => setForm((prev) => ({ ...prev, availableTo: text }))}
                placeholder="22:00"
                placeholderTextColor={theme.inputPlaceholder}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                editable={isAvailable}
              />
            </View>
          </View>
        </View>

        {/* Delivery preferences */}
        <View style={cardStyle}>
          <Text style={{ ...T.label, fontSize: 15, color: theme.text, marginBottom: Spacing.three }}>
            Delivery preferences
          </Text>

          <Text style={{ ...T.label, color: theme.textSecondary, marginBottom: 6 }}>
            Preferred delivery area
          </Text>
          <TextInput
            style={inputStyle}
            value={form.preferredDeliveryArea}
            onChangeText={(text) => setForm((prev) => ({ ...prev, preferredDeliveryArea: text }))}
            placeholder="e.g. Malabe, Kaduwela"
            placeholderTextColor={theme.inputPlaceholder}
            maxLength={100}
          />

          <Text style={{ ...T.label, color: theme.textSecondary, marginTop: Spacing.three, marginBottom: 6 }}>
            Maximum delivery distance
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={[inputStyle, { flex: 1 }]}
              value={form.maxDeliveryDistance}
              onChangeText={(text) =>
                setForm((prev) => ({ ...prev, maxDeliveryDistance: text.replace(/[^0-9.]/g, '') }))
              }
              placeholder="e.g. 5"
              placeholderTextColor={theme.inputPlaceholder}
              keyboardType="decimal-pad"
              maxLength={5}
            />
            <Text style={{ ...T.bodyMedium, color: theme.textSecondary, marginLeft: Spacing.two }}>km</Text>
          </View>
          <Text style={{ ...T.bodySmall, color: theme.textSecondary, marginTop: Spacing.two }}>
            Used to match you with pickups near you. Your preferred delivery time follows the hours above.
          </Text>
        </View>

        {/* Save */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Save preferences"
          style={{
            height: ComponentSizes.buttonHeight,
            borderRadius: Radius.md,
            backgroundColor: theme.primary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            opacity: saving ? 0.7 : 1,
            ...Shadows.button,
          }}
        >
          {saving ? (
            <ActivityIndicator color={theme.textOnPrimary} />
          ) : (
            <Text style={{ ...T.button, color: theme.textOnPrimary }}>Save Preferences</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {!keyboardVisible && <VolunteerBottomNav active="profile" />}
    </KeyboardAvoidingView>
  );
}