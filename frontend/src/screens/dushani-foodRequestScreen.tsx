import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Radius, Spacing } from '@/constants/theme';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';
import { useDisplayName } from '../hooks/dushani-useDisplayName';
import type { RootStackParamList } from '../navigation/types';
import {
  createEmergencyFoodRequest,
  createFoodRequest,
  type FoodRequestUrgency,
} from '../services/dushani-foodRequestApi';

type Props = NativeStackScreenProps<RootStackParamList, 'FoodRequest'>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

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
  // Matches Colors.light.success / successSoft in @/constants/theme.
  success: '#3FA34D',
  successSoft: '#E2F2E5',
};

type CategoryKey = 'Rice' | 'Vegetables' | 'Dry Foods' | 'Bread' | 'Water' | 'Other';

interface CategoryDef {
  key: CategoryKey;
  label: string;
  icon: IconName;
  /** fixed = one preset line; multi = recipient adds named lines. */
  kind: 'fixed' | 'multi';
  /** Written to foodType for fixed categories. */
  itemName?: string;
  unit: string;
  unitLocked?: boolean;
  namePlaceholder?: string;
  addLabel?: string;
}

const CATEGORIES: CategoryDef[] = [
  {
    key: 'Rice',
    label: 'Rice',
    icon: 'restaurant-outline',
    kind: 'fixed',
    itemName: 'Cooked Rice',
    unit: 'packets',
    unitLocked: true,
  },
  {
    key: 'Vegetables',
    label: 'Vegetables',
    icon: 'leaf-outline',
    kind: 'multi',
    unit: 'kg',
    namePlaceholder: 'e.g. Carrot, Beans, Dhal leaves',
    addLabel: 'Add another vegetable',
  },
  {
    key: 'Dry Foods',
    label: 'Dry Foods',
    icon: 'cube-outline',
    kind: 'multi',
    unit: 'kg',
    namePlaceholder: 'e.g. Parboiled rice, Milk powder, Lentils',
    addLabel: 'Add another dry food',
  },
  {
    key: 'Bread',
    label: 'Bread',
    icon: 'fast-food-outline',
    kind: 'fixed',
    itemName: 'Bread',
    unit: 'slices',
  },
  {
    key: 'Water',
    label: 'Water',
    icon: 'water-outline',
    kind: 'fixed',
    itemName: 'Water',
    unit: 'bottles',
  },
  {
    key: 'Other',
    label: 'Other',
    icon: 'ellipsis-horizontal-outline',
    kind: 'multi',
    unit: '',
    namePlaceholder: 'e.g. Baby formula, Eggs, Toothpaste',
    addLabel: 'Add another item',
  },
];

const CATEGORY_BY_KEY = Object.fromEntries(
  CATEGORIES.map((category) => [category.key, category]),
) as Record<CategoryKey, CategoryDef>;

interface Item {
  id: string;
  group: CategoryKey;
  name: string;
  amount: string;
  unit: string;
}

// Same rule as the phone field in the recipient registration form:
// 10 digits with a Sri Lankan mobile or landline prefix.
const SRI_LANKAN_PHONE_PREFIXES = [
  '070', '071', '072', '074', '075', '076', '077', '078', '079',
  '011', '021', '023', '024', '025', '026', '027', '031', '032', '033', '034',
  '035', '036', '037', '038', '041', '045', '047', '052', '054', '055', '057',
  '058', '061', '062', '063', '064', '065', '066', '067', '068', '069',
];

// The recipient says when they want the food: only today and tomorrow can be
// picked, and a standard request stays open until that moment. Anything needed
// inside five hours goes through the emergency track instead, so those slots
// are not offered here at all.
const DAY_LABELS = ['Today', 'Tomorrow'];
const TIME_SLOTS = ['07:00', '09:00', '12:00', '15:00', '18:00', '20:00'];
const MIN_LEAD_MS = 5 * 60 * 60 * 1000;

function dayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function dayOptions() {
  return [0, 1].map((offset) => {
    const date = new Date();
    date.setHours(date.getHours() + 24 * offset, 0, 0, 0);
    const key = dayKey(date);
    return {
      key,
      label: DAY_LABELS[offset],
      sub: date.toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
      // Late in the evening even "Today" has nothing five hours ahead.
      available: TIME_SLOTS.some((time) => slotSelectable(key, time)),
    };
  });
}

function slotLabel(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${`${minute}`.padStart(2, '0')} ${suffix}`;
}

// localTime on purpose — the instant has to be the wall-clock reading the
// recipient picked, not the same clock shifted into UTC.
function toPreferredIso(dateKey: string, time: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

// A slot is offered only when it is still five or more hours away.
function slotSelectable(dateKey: string, time: string): boolean {
  return new Date(toPreferredIso(dateKey, time)).getTime() - Date.now() >= MIN_LEAD_MS;
}

function isValidSriLankanPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (!/^\d{10}$/.test(digits)) return false;
  return SRI_LANKAN_PHONE_PREFIXES.includes(digits.slice(0, 3));
}

/**
 * Navy brand band behind the card — same navy (#023047) used across the
 * user-management auth screens. The card overlaps its lower edge.
 */
function Backdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.band}>
        <View style={styles.bandGlowTeal} />
        <View style={styles.bandGlowAmber} />
      </View>
    </View>
  );
}

export default function FoodRequestScreen({ navigation, route }: Props) {
  const T = useAppTypography();
  const displayName = useDisplayName();
  const idRef = useRef(1);

  const [selected, setSelected] = useState<CategoryKey[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [invalidIds, setInvalidIds] = useState<string[]>([]);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postal, setPostal] = useState('');
  const [landmark, setLandmark] = useState('');
  const [phone, setPhone] = useState('');
  const [details, setDetails] = useState('');
  const [wantedDay, setWantedDay] = useState('');
  const [wantedTime, setWantedTime] = useState('');
  const [urgency, setUrgency] = useState<FoodRequestUrgency>(
    route.params?.urgency ?? 'NORMAL',
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    foodTypes?: string;
    quantities?: string;
    address?: string;
    phone?: string;
    when?: string;
  }>({});

  const isUrgent = urgency === 'URGENT';
  const groupsWithItems = CATEGORIES.filter((c) => selected.includes(c.key));

  const clearQtyErrors = () => {
    setInvalidIds([]);
    setErrors((current) => ({ ...current, quantities: undefined }));
  };

  const toggleCategory = (key: CategoryKey) => {
    const def = CATEGORY_BY_KEY[key];
    const removing = selected.includes(key);

    setSelected((current) =>
      removing ? current.filter((item) => item !== key) : [...current, key],
    );
    setItems((current) => {
      if (removing) return current.filter((item) => item.group !== key);
      return [
        ...current,
        {
          id: `it-${idRef.current++}`,
          group: key,
          name: def.itemName ?? '',
          amount: '',
          unit: def.unit,
        },
      ];
    });
    clearQtyErrors();
    setErrors((current) => ({ ...current, foodTypes: undefined }));
  };

  const updateItem = (id: string, patch: Partial<Omit<Item, 'id' | 'group'>>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
    clearQtyErrors();
  };

  const addItem = (key: CategoryKey) => {
    const def = CATEGORY_BY_KEY[key];
    setItems((current) => [
      ...current,
      {
        id: `it-${idRef.current++}`,
        group: key,
        name: '',
        amount: '',
        unit: def.unit,
      },
    ]);
    clearQtyErrors();
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    clearQtyErrors();
  };

  const validate = () => {
    const nextErrors: typeof errors = {};
    const bad: string[] = [];
    const emptyGroups: string[] = [];
    let missingName = false;
    let missingAmount = false;

    if (selected.length === 0) {
      nextErrors.foodTypes = 'Select at least one food type';
    }

    selected.forEach((key) => {
      const def = CATEGORY_BY_KEY[key];
      const groupItems = items.filter((item) => item.group === key);
      if (groupItems.length === 0) {
        emptyGroups.push(def.label);
        return;
      }
      groupItems.forEach((item) => {
        const amount = item.amount.trim();
        const amountOk = /^\d+(\.\d{1,2})?$/.test(amount) && Number(amount) > 0;
        if (def.kind === 'multi' && !item.name.trim()) {
          missingName = true;
          bad.push(item.id);
        } else if (!amountOk) {
          missingAmount = true;
          bad.push(item.id);
        }
      });
    });

    if (emptyGroups.length) {
      nextErrors.quantities = `Add at least one item to ${emptyGroups.join(' and ')}`;
    } else if (missingName) {
      nextErrors.quantities = 'Give every item a name';
    } else if (missingAmount) {
      nextErrors.quantities = 'Enter a valid amount for every item';
    }
    const streetValue = street.trim();
    const cityValue = city.trim();
    const postalValue = postal.trim();

    if (!streetValue) nextErrors.address = 'Enter your street address';
    else if (!cityValue) nextErrors.address = 'Enter your city or town';
    else if (postalValue && !/^\d{4,5}$/.test(postalValue))
      nextErrors.address = 'Postal code must be 4-5 digits';

    if (!phone.trim()) nextErrors.phone = 'Phone number is required';
    else if (!isValidSriLankanPhone(phone))
      nextErrors.phone = 'Enter a valid 10-digit local phone number.';

    // An emergency is needed straight away, so it carries no slot.
    if (!isUrgent && !wantedDay) nextErrors.when = 'Choose the day you need it';
    else if (!isUrgent && !wantedTime) nextErrors.when = 'Choose a time';
    else if (!isUrgent && !slotSelectable(wantedDay, wantedTime))
      nextErrors.when =
        'That time is less than 5 hours away — pick a later slot or post an emergency request';

    setErrors(nextErrors);
    setInvalidIds(nextErrors.quantities ? bad : []);
    return Object.keys(nextErrors).length === 0;
  };

  // Show one message per section under the field that actually failed.
  const errorFor = (
    section: 'address' | 'when',
    field: 'street' | 'city' | 'postal' | 'day' | 'time',
  ): string | undefined => {
    const message = errors[section];
    if (!message) return undefined;

    if (section === 'when') {
      // No day yet → the day row carries it; otherwise it is about the time
      // (nothing chosen, or a slot that is too close to post as standard).
      const dayMissing = !wantedDay;
      return (field === 'day' && dayMissing) || (field === 'time' && !dayMissing)
        ? message
        : undefined;
    }

    const streetMissing = !street.trim();
    const cityMissing = !streetMissing && !city.trim();
    const postalBad =
      !streetMissing && !!postal.trim() && !/^\d{4,5}$/.test(postal.trim());
    const match =
      (field === 'street' && streetMissing) ||
      (field === 'city' && cityMissing) ||
      (field === 'postal' && postalBad);
    return match ? message : undefined;
  };

  const dayError = errorFor('when', 'day');
  const timeError = errorFor('when', 'time');

  const cleanName = (item: Item) =>
    item.group === 'Rice' ? 'Cooked Rice' : item.name.trim();

  const buildFoodType = () =>
    items.map(cleanName).filter(Boolean).join(', ');

  // e.g. "Cooked Rice - 6 packets, Carrot - 2 kg, Beans - 1 kg"
  const buildQuantity = () =>
    items
      .map((item) => {
        const unit = item.unit.trim();
        return `${cleanName(item)} - ${item.amount.trim()}${unit ? ` ${unit}` : ''}`;
      })
      .join(', ');

  // e.g. "No. 24, Galle Road, Colombo, 00300 — opposite the temple"
  const buildLocation = () => {
    const parts = [street.trim(), city.trim(), postal.trim()].filter(Boolean);
    const landmarkValue = landmark.trim();
    return parts.join(', ') + (landmarkValue ? ` — ${landmarkValue}` : '');
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!validate()) return;

    setSubmitting(true);
    const basePayload = {
      foodType: buildFoodType(),
      quantity: buildQuantity(),
      location: buildLocation(),
      details: details.trim(),
      contactNumber: phone.replace(/\D/g, ''),
    };
    try {
      if (isUrgent) {
        await createEmergencyFoodRequest(basePayload);
      } else {
        await createFoodRequest({
          ...basePayload,
          urgency: 'NORMAL',
          preferredAt: toPreferredIso(wantedDay, wantedTime),
        });
      }
      // Posted — go straight to the recipient's request dashboard.
      navigation.replace('RequestStatus');
    } catch (err) {
      setSubmitError(
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
            <Text style={{ ...T.caption, color: C.amber }}>{displayName}</Text>
            <Text style={{ ...T.h2, color: C.white, fontSize: 26 }}>
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
              {CATEGORIES.map((category) => {
                const active = selected.includes(category.key);
                return (
                  <TouchableOpacity
                    key={category.key}
                    onPress={() => toggleCategory(category.key)}
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
                        name={category.icon}
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
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.foodTypes && <ErrorText message={errors.foodTypes} />}

            <SectionTitle
              step="02"
              title="How much of each?"
              subtitle="Add an amount for every item you need"
            />
            {groupsWithItems.length === 0 ? (
              <View style={styles.qtyEmpty}>
                <Ionicons
                  name="alert-circle-outline"
                  size={17}
                  color={C.textMuted}
                  style={{ marginRight: Spacing.two }}
                />
                <Text style={{ ...T.bodySmall, color: C.textMuted, flex: 1 }}>
                  Choose your food types in step 01 and quantity lines appear
                  here for each one.
                </Text>
              </View>
            ) : (
              <View>
                {groupsWithItems.map((def) => {
                  const groupItems = items.filter(
                    (item) => item.group === def.key,
                  );
                  return (
                    <View key={def.key} style={styles.group}>
                      <View style={styles.groupHead}>
                        <Ionicons
                          name={def.icon}
                          size={15}
                          color={C.teal}
                          style={{ marginRight: Spacing.one + 2 }}
                        />
                        <Text style={{ ...T.label, fontSize: 12, color: C.teal }}>
                          {def.label}
                        </Text>
                        {def.kind === 'multi' && (
                          <View style={styles.groupCount}>
                            <Text
                              style={{ ...T.caption, fontSize: 10, color: C.teal }}
                            >
                              {groupItems.length}
                            </Text>
                          </View>
                        )}
                      </View>

                      {groupItems.map((item) => {
                        const invalid = invalidIds.includes(item.id);
                        return (
                          <View
                            key={item.id}
                            style={[styles.qtyRow, invalid && { borderColor: C.error }]}
                          >
                            {def.kind === 'fixed' ? (
                              <View style={styles.qtyIcon}>
                                <Ionicons
                                  name={def.icon}
                                  size={17}
                                  color={C.teal}
                                />
                              </View>
                            ) : null}

                            {def.kind === 'multi' ? (
                              <TextInput
                                style={[styles.itemName, invalid && !item.name.trim() && { borderColor: C.error }]}
                                value={item.name}
                                onChangeText={(text) =>
                                  updateItem(item.id, { name: text })
                                }
                                placeholder={def.namePlaceholder}
                                placeholderTextColor={C.textMuted}
                              />
                            ) : (
                              <Text
                                style={{
                                  ...T.labelStrong,
                                  fontSize: 14,
                                  color: C.navy,
                                  flex: 1,
                                  marginRight: Spacing.two,
                                }}
                              >
                                {def.itemName}
                              </Text>
                            )}

                            <TextInput
                              style={[
                                styles.qtyAmount,
                                invalid && item.name.trim() && { borderColor: C.error },
                              ]}
                              value={item.amount}
                              onChangeText={(text) =>
                                updateItem(item.id, { amount: text })
                              }
                              placeholder="0"
                              placeholderTextColor={C.textMuted}
                              keyboardType="numeric"
                            />

                            {def.unitLocked ? (
                              <View style={styles.unitStatic}>
                                <Text
                                  style={{
                                    ...T.bodySmall,
                                    color: C.textMuted,
                                  }}
                                >
                                  {item.unit}
                                </Text>
                              </View>
                            ) : (
                              <TextInput
                                style={styles.qtyUnit}
                                value={item.unit}
                                onChangeText={(text) =>
                                  updateItem(item.id, { unit: text })
                                }
                                placeholder="unit"
                                placeholderTextColor={C.textMuted}
                                autoCapitalize="none"
                              />
                            )}

                            {def.kind === 'multi' && groupItems.length > 1 && (
                              <TouchableOpacity
                                onPress={() => removeItem(item.id)}
                                style={styles.removeBtn}
                                accessibilityLabel={`Remove ${def.label} item`}
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={17}
                                  color={C.error}
                                />
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}

                      {def.kind === 'multi' && (
                        <TouchableOpacity
                          onPress={() => addItem(def.key)}
                          style={styles.addBtn}
                        >
                          <Ionicons
                            name="add"
                            size={16}
                            color={C.teal}
                            style={{ marginRight: Spacing.one + 2 }}
                          />
                          <Text style={{ ...T.labelStrong, fontSize: 12, color: C.teal }}>
                            {def.addLabel}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}

                {errors.quantities && <ErrorText message={errors.quantities} />}
              </View>
            )}

            <SectionTitle
              step="03"
              title="Where should it be delivered?"
              subtitle="Where to drop the food and how the donor can reach you"
            />
            <Field
              label="Street Address"
              value={street}
              onChangeText={(text) => {
                setStreet(text);
                setErrors((c) => ({ ...c, address: undefined }));
              }}
              error={errorFor('address', 'street')}
              placeholder="e.g. No. 24, Galle Road"
              icon="home-outline"
            />
            <View style={styles.addressRow}>
              <View style={styles.cityCol}>
                <Field
                  label="City / Town"
                  value={city}
                  onChangeText={(text) => {
                    setCity(text);
                    setErrors((c) => ({ ...c, address: undefined }));
                  }}
                  error={errorFor('address', 'city')}
                  placeholder="e.g. Colombo"
                  icon="business-outline"
                />
              </View>
              <View style={styles.postalCol}>
                <Field
                  label="Postal Code (optional)"
                  value={postal}
                  onChangeText={(text) => {
                    setPostal(text);
                    setErrors((c) => ({ ...c, address: undefined }));
                  }}
                  error={errorFor('address', 'postal')}
                  placeholder="e.g. 00300"
                  keyboardType="numeric"
                />
              </View>
            </View>
            <Field
              label="Nearest Landmark (optional)"
              value={landmark}
              onChangeText={setLandmark}
              placeholder="e.g. opposite the temple"
              icon="pin-outline"
            />
            <Field
              label="Mobile Number"
              value={phone}
              onChangeText={(text) => {
                setPhone(text.replace(/\D/g, '').slice(0, 10));
                setErrors((c) => ({ ...c, phone: undefined }));
              }}
              error={errors.phone}
              placeholder="e.g. 0771234567"
              icon="call-outline"
              keyboardType="numeric"
              maxLength={10}
            />

            <SectionTitle
              step="04"
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
                        active ? (urgent ? C.error : C.teal) : C.textMuted
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
                      {urgent ? 'Within 5 hours' : 'Choose your own time'}
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

            {!isUrgent && (
              <>
                <SectionTitle
                  step="05"
                  title="When do you need it?"
                  subtitle="At least 5 hours ahead — your request stays open until then"
                />
                <Text
                  style={{ ...T.label, fontSize: 14, color: C.navy, marginBottom: Spacing.two }}
                >
                  Day
                </Text>
                <View style={styles.whenRow}>
                  {dayOptions().map((option) => {
                    const active = wantedDay === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        disabled={!option.available}
                        onPress={() => {
                          setWantedDay(option.key);
                          setWantedTime('');
                          setErrors((c) => ({ ...c, when: undefined }));
                        }}
                        activeOpacity={0.85}
                        style={[
                          styles.whenChip,
                          active && styles.whenChipActive,
                          !option.available && styles.whenChipDisabled,
                          !!errors.when && !active && option.available && {
                            borderColor: C.error,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            ...T.labelStrong,
                            fontSize: 14,
                            color: active ? C.white : C.navy,
                          }}
                        >
                          {option.label}
                        </Text>
                        <Text
                          style={{
                            ...T.bodySmall,
                            fontSize: 12,
                            color: active ? C.white : C.textMuted,
                            marginTop: 1,
                          }}
                        >
                          {option.available ? option.sub : 'No slots left today'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {dayError && <ErrorText message={dayError} />}

                {!!wantedDay && (
                  <View style={{ marginTop: Spacing.four }}>
                    <Text
                      style={{ ...T.label, fontSize: 14, color: C.navy, marginBottom: Spacing.two }}
                    >
                      Time
                    </Text>
                    <View style={styles.whenRow}>
                      {TIME_SLOTS.map((time) => {
                        const disabled = !slotSelectable(wantedDay, time);
                        const active = wantedTime === time;
                        return (
                          <TouchableOpacity
                            key={time}
                            disabled={disabled}
                            onPress={() => {
                              setWantedTime(time);
                              setErrors((c) => ({ ...c, when: undefined }));
                            }}
                            activeOpacity={0.85}
                            style={[
                              styles.whenChip,
                              styles.whenChipTime,
                              active && styles.whenChipActive,
                              disabled && { opacity: 0.45 },
                            ]}
                          >
                            <Ionicons
                              name="time-outline"
                              size={16}
                              color={active ? C.white : C.teal}
                              style={{ marginRight: Spacing.two }}
                            />
                            <Text
                              style={{
                                ...T.labelStrong,
                                fontSize: 14,
                                color: active ? C.white : C.navy,
                              }}
                            >
                              {slotLabel(time)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {timeError && <ErrorText message={timeError} />}
                    <TouchableOpacity
                      onPress={() => setUrgency('URGENT')}
                      style={styles.soonerLink}
                      accessibilityLabel="Post this as an emergency request instead"
                    >
                      <Ionicons name="flash-outline" size={14} color={C.error} />
                      <Text style={{ ...T.bodySmall, color: C.error }}>
                        Need it within 5 hours? Post an emergency request
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            <SectionTitle
              step={isUrgent ? '05' : '06'}
              title="Anything else?"
              subtitle="Everything here is optional"
            />
            <Field
              label="Details (optional)"
              value={details}
              onChangeText={setDetails}
              placeholder="e.g. Halal only, pickup after 6 PM"
              icon="chatbox-ellipses-outline"
              multiline
            />

            <View style={styles.divider} />

            {!!submitError && (
              <View style={styles.submitError}>
                <Ionicons
                  name="alert-circle"
                  size={17}
                  color={C.error}
                  style={{ marginRight: Spacing.two + 2 }}
                />
                <Text style={{ ...T.bodySmall, color: C.error, flex: 1 }}>
                  {submitError}
                </Text>
              </View>
            )}

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
                    {isUrgent ? 'Post Emergency Request' : 'Post Food Request'}
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
              <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
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
  icon?: IconName;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
  maxLength?: number;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  icon,
  multiline,
  keyboardType,
  maxLength,
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
          keyboardType={keyboardType}
          maxLength={maxLength}
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
    paddingTop: Spacing.six,
    paddingBottom: Spacing.seven,
  },
  band: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 248,
    backgroundColor: C.navy,
    overflow: 'hidden',
  },
  bandGlowTeal: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: C.teal,
    opacity: 0.5,
    top: -120,
    right: -80,
  },
  bandGlowAmber: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: C.amber,
    opacity: 0.22,
    bottom: -78,
    left: 70,
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
    marginBottom: Spacing.five,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: Spacing.five,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
    elevation: 10,
  },
  cardIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.successSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: C.success,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: C.success,
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
  qtyEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.offWhite,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.cardBorder,
    padding: Spacing.three,
  },
  group: {
    marginBottom: Spacing.four,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  groupCount: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.two,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.offWhite,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  qtyIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  itemName: {
    flex: 1,
    height: 42,
    backgroundColor: C.white,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: Spacing.three,
    color: C.navy,
    fontSize: 14,
    marginRight: Spacing.two,
    minWidth: 90,
  },
  qtyAmount: {
    width: 52,
    height: 42,
    backgroundColor: C.white,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: C.cardBorder,
    textAlign: 'center',
    color: C.navy,
    fontSize: 15,
    marginRight: Spacing.two,
  },
  qtyUnit: {
    width: 78,
    height: 42,
    backgroundColor: C.white,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: Spacing.two,
    color: C.navy,
    fontSize: 14,
  },
  unitStatic: {
    width: 78,
    height: 42,
    borderRadius: Radius.sm,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.one,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.teal,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  addressRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  cityCol: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: 200,
  },
  postalCol: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 150,
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  whenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  whenChip: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    flexBasis: '28%',
    minWidth: 120,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.teal,
    backgroundColor: C.offWhite,
  },
  whenChipTime: {
    flexDirection: 'row',
  },
  whenChipActive: {
    backgroundColor: C.teal,
    borderColor: C.teal,
    borderStyle: 'solid',
  },
  whenChipDisabled: {
    opacity: 0.4,
    borderColor: C.cardBorder,
  },
  soonerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    marginTop: Spacing.three,
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
  submitError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.errorSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.error,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: Radius.md,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
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
