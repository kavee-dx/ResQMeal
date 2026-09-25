import React, { useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { CreateDonationFlowParamList } from '../../navigation/kaveesha-createDonationFlow.types';
import { useCreateDonation } from '../../context/kaveesha-CreateDonationContext';
import VoiceAssistantModal from '../../components/kaveesha-VoiceAssistantModal';

type Props = NativeStackScreenProps<
  CreateDonationFlowParamList,
  'Details'
>;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type TimeField = 'preparation' | 'expiry' | null;

const C = {
  navy: '#023047',
  navyDeep: '#011C2E',
  teal: '#126782',
  orange: '#FB8500',
  amber: '#FFB703',

  background: '#F6F8FA',
  white: '#FFFFFF',

  text: '#023047',
  secondary: '#4D6470',
  muted: '#8A9AA3',

  border: '#D7E3E7',
  softBlue: '#EAF2F5',
  softOrange: '#FFF1E3',

  success: '#3FA34D',
  successSoft: '#EAF7ED',

  warning: '#D99100',
  warningSoft: '#FFF7DD',

  danger: '#D64545',
  dangerSoft: '#FBEAEA',
};

const FOOD_CATEGORIES = [
  'Cooked Meal',
  'Rice',
  'Curry',
  'Bakery',
  'Fruits',
  'Vegetables',
  'Beverages',
  'Packaged Food',
  'Other',
];

const UNITS = [
  'kg',
  'g',
  'L',
  'mL',
  'items',
  'boxes',
  'trays',
  'packs',
  'other',
] as const;

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function parseTime(value: string): Date {
  const now = new Date();

  const match = value.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
  );

  if (!match) {
    now.setHours(12, 0, 0, 0);
    return now;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hour !== 12) {
    hour += 12;
  }

  if (period === 'AM' && hour === 12) {
    hour = 0;
  }

  now.setHours(hour, minute, 0, 0);

  return now;
}

function aiResultConfig(result: string) {
  switch (result) {
    case 'GOOD':
      return {
        icon: 'checkmark-circle' as IconName,
        title: 'No obvious visual concern',
        message:
          'The image did not show obvious visible concerns based on the screening.',
        color: C.success,
        background: C.successSoft,
      };

    case 'REVIEW':
      return {
        icon: 'alert-circle' as IconName,
        title: 'Manual review recommended',
        message:
          'The image contains something that may need a closer look.',
        color: C.warning,
        background: C.warningSoft,
      };

    case 'CONCERN':
      return {
        icon: 'warning' as IconName,
        title: 'Visible concern detected',
        message:
          'The screening found a visible indicator that should be reviewed carefully.',
        color: C.danger,
        background: C.dangerSoft,
      };

    default:
      return {
        icon: 'information-circle' as IconName,
        title: 'AI screening not performed',
        message:
          'You can continue without using the optional AI screening.',
        color: C.secondary,
        background: C.softBlue,
      };
  }
}

export default function DetailsScreen({
  navigation,
}: Props) {
  const { state, update } = useCreateDonation();

  const [voiceVisible, setVoiceVisible] = useState(false);

  const [pickingPostPhoto, setPickingPostPhoto] = useState(false);
  const [pickingAiPhoto, setPickingAiPhoto] = useState(false);

  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [aiPhotoUri, setAiPhotoUri] = useState<string | null>(null);
  const [aiPhotoBase64, setAiPhotoBase64] = useState<string | null>(null);
  const [aiPhotoMimeType, setAiPhotoMimeType] =
    useState<string | null>(null);

  const [timeField, setTimeField] = useState<TimeField>(null);

  const [iosPickerVisible, setIosPickerVisible] = useState(false);

  const preparationDate = useMemo(
    () => parseTime(state.preparationTime),
    [state.preparationTime],
  );

  const expiryDate = useMemo(
    () => parseTime(state.expiryTime),
    [state.expiryTime],
  );

  const canContinue =
    state.foodType.trim().length > 0 &&
    Number(state.quantity) > 0 &&
    Number(state.portions) > 0 &&
    state.preparationTime.trim().length > 0 &&
    state.expiryTime.trim().length > 0 &&
    state.pickupLocation.trim().length > 0;

  function updateField<K extends keyof typeof state>(
  field: K,
  value: (typeof state)[K],
) {
  update(field, value);
}

  async function requestPhotoPermission() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Photo permission needed',
        'Please allow photo access so you can upload a food image.',
      );

      return false;
    }

    return true;
  }

  async function choosePostPhoto() {
    const allowed = await requestPhotoPermission();

    if (!allowed) {
      return;
    }

    setPickingPostPhoto(true);

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
          base64: true,
        });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];

      updateField('photoUri', asset.uri);
      updateField('photoBase64', asset.base64 ?? null);
      updateField(
        'photoMimeType',
        asset.mimeType ?? 'image/jpeg',
      );

      /*
       * A new post photo means the old AI result may no longer
       * describe the current post photo.
       */
      update('aiResult', 'PENDING');
update('aiReason', '');
    } catch (error) {
      console.error('Post photo selection error:', error);

      Alert.alert(
        'Unable to select photo',
        'Please try selecting the photo again.',
      );
    } finally {
      setPickingPostPhoto(false);
    }
  }

 async function chooseAiPhoto() {
  const allowed = await requestPhotoPermission();

  if (!allowed) {
    return;
  }

  setPickingAiPhoto(true);

  try {
    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];

    /*
     * The AI photo also becomes the actual post photo.
     * This keeps the Home feed photo and AI-checked photo
     * synchronized.
     */
    updateField('photoUri', asset.uri);
    updateField(
      'photoBase64',
      asset.base64 ?? null,
    );
    updateField(
      'photoMimeType',
      asset.mimeType ?? 'image/jpeg',
    );

    /*
     * Store the same photo for the AI check.
     */
    setAiPhotoUri(asset.uri);
    setAiPhotoBase64(asset.base64 ?? null);
    setAiPhotoMimeType(
      asset.mimeType ?? 'image/jpeg',
    );

    /*
     * A new photo means the previous AI result is no
     * longer valid until the new photo is checked.
     */
    update('aiResult', 'PENDING');
    update('aiReason', '');
  } catch (error) {
    console.error(
      'AI photo selection error:',
      error,
    );

    Alert.alert(
      'Unable to select photo',
      'Please try selecting another photo.',
    );
  } finally {
    setPickingAiPhoto(false);
  }
}

  function usePostPhotoForAi() {
    if (!state.photoBase64) {
      Alert.alert(
        'Post photo required',
        'Please upload the food post photo first.',
      );

      return;
    }

    setAiPhotoUri(state.photoUri);
    setAiPhotoBase64(state.photoBase64);
    setAiPhotoMimeType(
      state.photoMimeType ?? 'image/jpeg',
    );
  }

  async function runAiScreening() {
    const imageBase64 = aiPhotoBase64;

    if (!imageBase64) {
      Alert.alert(
        'Photo required',
        'Please use the post photo or upload another clear food photo.',
      );

      return;
    }

    const apiUrl = process.env.EXPO_PUBLIC_API_URL;

    if (!apiUrl) {
      Alert.alert(
        'Configuration error',
        'EXPO_PUBLIC_API_URL is not configured.',
      );

      return;
    }

    setAiLoading(true);

    try {
      const response = await fetch(
        `${apiUrl}/donations/analyze-photo`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageBase64,
            mimeType: aiPhotoMimeType ?? 'image/jpeg',
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message ||
            data?.error ||
            'AI screening failed.',
        );
      }

      update('aiResult', data.result);
update('aiReason', data.reason ?? '');

      setAiModalVisible(false);
    } catch (error: any) {
      console.error('AI screening error:', error);

      Alert.alert(
        'AI screening unavailable',
        error?.message ||
          'Unable to complete the AI screening. You can try another photo or continue without AI.',
      );
    } finally {
      setAiLoading(false);
    }
  }

  function openAiModal() {
    setAiPhotoUri(null);
    setAiPhotoBase64(null);
    setAiPhotoMimeType(null);
    setAiModalVisible(true);
  }

  function closeAiModal() {
    if (aiLoading) {
      return;
    }

    setAiModalVisible(false);
  }

  function openTimePicker(field: TimeField) {
    setTimeField(field);

    if (Platform.OS === 'ios') {
      setIosPickerVisible(true);
    }
  }

  function handleTimeChange(
    event: any,
    selectedDate?: Date,
  ) {
    if (Platform.OS === 'android') {
      setTimeField(null);
    }

    if (event?.type === 'dismissed' || !selectedDate) {
      return;
    }

    if (timeField === 'preparation') {
      updateField(
        'preparationTime',
        formatTime(selectedDate),
      );
    }

    if (timeField === 'expiry') {
      updateField(
        'expiryTime',
        formatTime(selectedDate),
      );
    }

    if (Platform.OS === 'ios') {
      setIosPickerVisible(false);
      setTimeField(null);
    }
  }

  function renderTimePicker() {
    if (!timeField) {
      return null;
    }

    const currentDate =
      timeField === 'preparation'
        ? preparationDate
        : expiryDate;

    if (Platform.OS === 'android') {
      return (
        <DateTimePicker
          value={currentDate}
          mode="time"
          is24Hour={false}
          display="clock"
          onChange={handleTimeChange}
        />
      );
    }

    if (!iosPickerVisible) {
      return null;
    }

    return (
      <Modal
        visible={iosPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setIosPickerVisible(false);
          setTimeField(null);
        }}
      >
        <View style={styles.timeModalOverlay}>
          <View style={styles.timeModalCard}>
            <View style={styles.timeModalHeader}>
              <View>
                <Text style={styles.timeModalEyebrow}>
                  SELECT TIME
                </Text>

                <Text style={styles.timeModalTitle}>
                  {timeField === 'preparation'
                    ? 'Preparation time'
                    : 'Expiry time'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setIosPickerVisible(false);
                  setTimeField(null);
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={C.navy}
                />
              </TouchableOpacity>
            </View>

            <DateTimePicker
              value={currentDate}
              mode="time"
              display="spinner"
              is24Hour={false}
              onChange={handleTimeChange}
              style={styles.iosPicker}
            />

            <TouchableOpacity
              style={styles.timeDoneButton}
              onPress={() => {
                setIosPickerVisible(false);
                setTimeField(null);
              }}
            >
              <Text style={styles.timeDoneText}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderLabel(
    label: string,
    required = false,
  ) {
    return (
      <Text style={styles.fieldLabel}>
        {label}
        {required && (
          <Text style={styles.required}> *</Text>
        )}
      </Text>
    );
  }

  function renderSectionHeader(
    icon: IconName,
    title: string,
    subtitle?: string,
  ) {
    return (
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons
            name={icon}
            size={20}
            color={C.orange}
          />
        </View>

        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>
            {title}
          </Text>

          {subtitle ? (
            <Text style={styles.sectionSubtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  const aiConfig = aiResultConfig(state.aiResult);

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* ------------------------------------------------ */}
          {/* HEADER */}
          {/* ------------------------------------------------ */}

          <View style={styles.topHeader}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={C.navy}
              />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerEyebrow}>
                STEP 2 OF 5
              </Text>

              <Text style={styles.headerTitle}>
                Food details
              </Text>
            </View>

            <View style={styles.headerPlaceholder} />
          </View>

          {/* Progress */}
          <View style={styles.progressTrack}>
            <View style={styles.progressActive} />
            <View style={styles.progressInactive} />
            <View style={styles.progressInactive} />
            <View style={styles.progressInactive} />
            <View style={styles.progressInactive} />
          </View>

          {/* ------------------------------------------------ */}
          {/* INTRO */}
          {/* ------------------------------------------------ */}

          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Ionicons
                name="restaurant-outline"
                size={25}
                color={C.orange}
              />
            </View>

            <View style={styles.introText}>
              <Text style={styles.introTitle}>
                Tell us about the food
              </Text>

              <Text style={styles.introDescription}>
                Add enough information so recipients
                and volunteers can understand the
                donation clearly.
              </Text>
            </View>
          </View>

          {/* ------------------------------------------------ */}
          {/* FOOD INFORMATION */}
          {/* ------------------------------------------------ */}

         <View style={styles.card}>
  {renderSectionHeader(
    'fast-food-outline',
    'Food information',
    'Basic information about your donation',
  )}

  {/* VOICE ASSISTANT */}

  <TouchableOpacity
    activeOpacity={0.88}
    onPress={() => setVoiceVisible(true)}
    style={styles.voiceCard}
  >
    <View style={styles.voiceIcon}>
      <Ionicons
        name="mic-outline"
        size={24}
        color={C.white}
      />
    </View>

    <View style={styles.voiceText}>
      <View style={styles.voiceTitleRow}>
        <Text style={styles.voiceTitle}>
          Use Voice Assistant
        </Text>

        <View style={styles.voiceOptional}>
          <Text style={styles.voiceOptionalText}>
            OPTIONAL
          </Text>
        </View>
      </View>

      <Text style={styles.voiceSubtitle}>
        Answer the food questions by speaking instead of typing.
      </Text>
    </View>

    <Ionicons
      name="chevron-forward"
      size={21}
      color={C.white}
    />
  </TouchableOpacity>

  {renderLabel('Food Type', true)}

            <View style={styles.inputWrapper}>
              <Ionicons
                name="restaurant-outline"
                size={19}
                color={C.muted}
              />

              <TextInput
                value={state.foodType}
                onChangeText={(value) =>
                  updateField('foodType', value)
                }
                placeholder="e.g. Vegetable Fried Rice"
                placeholderTextColor={C.muted}
                style={styles.textInput}
              />
            </View>

            {renderLabel('Category', true)}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={
                styles.horizontalOptions
              }
            >
              {FOOD_CATEGORIES.map((category) => {
                const selected =
                  state.category === category;

                return (
                  <TouchableOpacity
                    key={category}
                    onPress={() =>
                      updateField(
                        'category',
                        category,
                      )
                    }
                    style={[
                      styles.categoryPill,
                      selected &&
                        styles.categoryPillSelected,
                    ]}
                  >
                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={15}
                        color={C.white}
                      />
                    ) : null}

                    <Text
                      style={[
                        styles.categoryText,
                        selected &&
                          styles.categoryTextSelected,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Quantity */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                {renderLabel('Quantity', true)}

                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="scale-outline"
                    size={18}
                    color={C.muted}
                  />

                  <TextInput
                    value={state.quantity}
                    onChangeText={(value) =>
                      updateField(
                        'quantity',
                        value.replace(
                          /[^0-9.]/g,
                          '',
                        ),
                      )
                    }
                    keyboardType="decimal-pad"
                    placeholder="5"
                    placeholderTextColor={C.muted}
                    style={styles.textInput}
                  />
                </View>
              </View>

              <View style={styles.halfField}>
                {renderLabel('Unit', true)}

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={
                    styles.unitScroll
                  }
                >
                  {UNITS.map((unit) => {
                    const selected =
                      state.quantityUnit === unit;

                    return (
                      <TouchableOpacity
                        key={unit}
                        onPress={() =>
                          updateField(
                            'quantityUnit',
                            unit,
                          )
                        }
                        style={[
                          styles.unitPill,
                          selected &&
                            styles.unitPillSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.unitText,
                            selected &&
                              styles.unitTextSelected,
                          ]}
                        >
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {renderLabel('Number of Portions', true)}

            <View style={styles.inputWrapper}>
              <Ionicons
                name="people-outline"
                size={19}
                color={C.muted}
              />

              <TextInput
                value={state.portions}
                onChangeText={(value) =>
                  updateField(
                    'portions',
                    value.replace(
                      /[^0-9]/g,
                      '',
                    ),
                  )
                }
                keyboardType="number-pad"
                placeholder="e.g. 12"
                placeholderTextColor={C.muted}
                style={styles.textInput}
              />
            </View>
          </View>

          {/* ------------------------------------------------ */}
          {/* TIME */}
          {/* ------------------------------------------------ */}

          <View style={styles.card}>
            {renderSectionHeader(
              'time-outline',
              'Food timing',
              'Select times using the clock',
            )}

            <View style={styles.row}>
              <View style={styles.halfField}>
                {renderLabel(
                  'Preparation Time',
                  true,
                )}

                <TouchableOpacity
                  onPress={() =>
                    openTimePicker(
                      'preparation',
                    )
                  }
                  style={[
                    styles.timeField,
                    state.preparationTime &&
                      styles.timeFieldSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.timeIcon,
                      state.preparationTime &&
                        styles.timeIconSelected,
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={20}
                      color={
                        state.preparationTime
                          ? C.orange
                          : C.navy
                      }
                    />
                  </View>

                  <View
                    style={styles.timeTextContainer}
                  >
                    <Text
                      style={[
                        styles.timeValue,
                        !state.preparationTime &&
                          styles.timePlaceholder,
                      ]}
                    >
                      {state.preparationTime ||
                        'Select time'}
                    </Text>

                    <Text style={styles.timeHint}>
                      Tap to choose
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={C.muted}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.halfField}>
                {renderLabel('Expiry Time', true)}

                <TouchableOpacity
                  onPress={() =>
                    openTimePicker('expiry')
                  }
                  style={[
                    styles.timeField,
                    state.expiryTime &&
                      styles.timeFieldSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.timeIcon,
                      state.expiryTime &&
                        styles.timeIconSelected,
                    ]}
                  >
                    <Ionicons
                      name="alarm-outline"
                      size={20}
                      color={
                        state.expiryTime
                          ? C.orange
                          : C.navy
                      }
                    />
                  </View>

                  <View
                    style={styles.timeTextContainer}
                  >
                    <Text
                      style={[
                        styles.timeValue,
                        !state.expiryTime &&
                          styles.timePlaceholder,
                      ]}
                    >
                      {state.expiryTime ||
                        'Select time'}
                    </Text>

                    <Text style={styles.timeHint}>
                      Tap to choose
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={C.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.timeInfo}>
              <Ionicons
                name="information-circle-outline"
                size={17}
                color={C.teal}
              />

              <Text style={styles.timeInfoText}>
                Select the actual preparation and
                expiry times using the clock picker.
              </Text>
            </View>
          </View>

          {/* ------------------------------------------------ */}
          {/* STORAGE */}
          {/* ------------------------------------------------ */}

          <View style={styles.card}>
            {renderSectionHeader(
              'snow-outline',
              'Storage & pickup',
              'Help us understand where the food can be collected',
            )}

            {renderLabel(
              'Storage Condition',
              true,
            )}

            <View style={styles.storageGrid}>
              {(
                [
                  'Refrigerated',
                  'Frozen',
                  'Room Temperature',
                  'Other',
                ] as const
              ).map((condition) => {
                const selected =
                  state.storageCondition ===
                  condition;

                return (
                  <TouchableOpacity
                    key={condition}
                    onPress={() =>
                      updateField(
                        'storageCondition',
                        condition,
                      )
                    }
                    style={[
                      styles.storageOption,
                      selected &&
                        styles.storageOptionSelected,
                    ]}
                  >
                    <Ionicons
                      name={
                        condition ===
                        'Refrigerated'
                          ? 'snow-outline'
                          : condition ===
                              'Frozen'
                            ? 'ice-cream-outline'
                            : 'cube-outline'
                      }
                      size={20}
                      color={
                        selected
                          ? C.orange
                          : C.navy
                      }
                    />

                    <Text
                      style={[
                        styles.storageText,
                        selected &&
                          styles.storageTextSelected,
                      ]}
                    >
                      {condition}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {renderLabel(
              'Pickup Location',
              true,
            )}

            <View style={styles.inputWrapper}>
              <Ionicons
                name="location-outline"
                size={19}
                color={C.muted}
              />

              <TextInput
                value={state.pickupLocation}
                onChangeText={(value) =>
                  updateField(
                    'pickupLocation',
                    value,
                  )
                }
                placeholder="e.g. Colombo 05, near Independence Square"
                placeholderTextColor={C.muted}
                style={styles.textInput}
              />
            </View>

            {renderLabel('Pickup District')}

            <View style={styles.inputWrapper}>
              <Ionicons
                name="map-outline"
                size={19}
                color={C.muted}
              />

              <TextInput
                value={state.pickupDistrict}
                onChangeText={(value) =>
                  updateField(
                    'pickupDistrict',
                    value,
                  )
                }
                placeholder="e.g. Colombo"
                placeholderTextColor={C.muted}
                style={styles.textInput}
              />
            </View>
          </View>

          {/* ------------------------------------------------ */}
          {/* FOOD PHOTO */}
          {/* ------------------------------------------------ */}

          <View style={styles.card}>
            {renderSectionHeader(
              'camera-outline',
              'Food photo',
              'This is the photo recipients will see in the food post',
            )}

            {state.photoUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image
                  source={{
                    uri: state.photoUri,
                  }}
                  style={styles.foodPhoto}
                />

                <View
                  style={styles.photoOverlay}
                >
                  <View
                    style={styles.photoBadge}
                  >
                    <Ionicons
                      name="images-outline"
                      size={15}
                      color={C.white}
                    />

                    <Text
                      style={styles.photoBadgeText}
                    >
                      Post photo
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={choosePostPhoto}
                  style={styles.changePhotoButton}
                >
                  <Ionicons
                    name="camera-outline"
                    size={17}
                    color={C.white}
                  />

                  <Text
                    style={
                      styles.changePhotoText
                    }
                  >
                    Change photo
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={choosePostPhoto}
                activeOpacity={0.85}
                style={styles.photoUploadBox}
              >
                <View style={styles.photoUploadIcon}>
                  <Ionicons
                    name="camera-outline"
                    size={30}
                    color={C.orange}
                  />
                </View>

                <Text
                  style={styles.photoUploadTitle}
                >
                  Upload food photo
                </Text>

                <Text
                  style={styles.photoUploadSubtitle}
                >
                  Add a clear photo of the food
                  for the Home feed
                </Text>

                <View
                  style={styles.uploadAction}
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={C.white}
                  />

                  <Text
                    style={styles.uploadActionText}
                  >
                    Choose Photo
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.photoTip}>
              <View style={styles.photoTipIcon}>
                <Ionicons
                  name="bulb-outline"
                  size={18}
                  color={C.orange}
                />
              </View>

              <View style={styles.photoTipContent}>
                <Text
                  style={styles.photoTipTitle}
                >
                  Photo tip
                </Text>

                <Text
                  style={styles.photoTipText}
                >
                  Use good lighting and show the
                  food closely. Avoid blurry,
                  dark, or distant photos.
                </Text>
              </View>
            </View>

            {/* ------------------------------------------------ */}
            {/* AI ACTION */}
            {/* ------------------------------------------------ */}

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={openAiModal}
              style={styles.aiActionCard}
            >
              <View style={styles.aiActionIcon}>
                <Ionicons
                  name="sparkles"
                  size={24}
                  color={C.orange}
                />
              </View>

              <View style={styles.aiActionText}>
                <View
                  style={styles.aiActionTitleRow}
                >
                  <Text
                    style={styles.aiActionTitle}
                  >
                    AI Food Safety Check
                  </Text>

                  <View
                    style={styles.optionalBadge}
                  >
                    <Text
                      style={styles.optionalText}
                    >
                      OPTIONAL
                    </Text>
                  </View>
                </View>

                <Text
                  style={styles.aiActionDescription}
                >
                  Get visual screening and
                  food-safety decision support
                  from a food photo.
                </Text>

                <Text
                  style={styles.aiActionLink}
                >
                  Tap to check a photo
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={21}
                color={C.navy}
              />
            </TouchableOpacity>

            {/* ------------------------------------------------ */}
            {/* AI RESULT */}
            {/* ------------------------------------------------ */}

            {state.aiResult !== 'PENDING' ? (
              <View
                style={[
                  styles.aiResultCard,
                  {
                    backgroundColor:
                      aiConfig.background,
                  },
                ]}
              >
                <View
                  style={[
                    styles.aiResultIcon,
                    {
                      backgroundColor:
                        C.white,
                    },
                  ]}
                >
                  <Ionicons
                    name={aiConfig.icon}
                    size={24}
                    color={aiConfig.color}
                  />
                </View>

                <View
                  style={styles.aiResultContent}
                >
                  <View
                    style={styles.aiResultHeader}
                  >
                    <Text
                      style={[
                        styles.aiResultTitle,
                        {
                          color:
                            aiConfig.color,
                        },
                      ]}
                    >
                      {aiConfig.title}
                    </Text>

                    <View
                      style={[
                        styles.completedBadge,
                        {
                          backgroundColor:
                            C.white,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.completedText,
                          {
                            color:
                              aiConfig.color,
                          },
                        ]}
                      >
                        CHECKED
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={styles.aiResultMessage}
                  >
                    {state.aiReason ||
                      aiConfig.message}
                  </Text>

                  <Text
                    style={styles.aiDisclaimer}
                  >
                    AI screening provides decision
                    support based on visible
                    indicators only. It cannot
                    confirm that food is safe or
                    unsafe.
                  </Text>

                  <TouchableOpacity
                    onPress={openAiModal}
                    style={styles.checkAgainButton}
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={17}
                      color={C.navy}
                    />

                    <Text
                      style={
                        styles.checkAgainText
                      }
                    >
                      Check Another Photo
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>

          {/* ------------------------------------------------ */}
          {/* ADDITIONAL DETAILS */}
          {/* ------------------------------------------------ */}

          <View style={styles.card}>
            {renderSectionHeader(
              'document-text-outline',
              'Additional details',
              'Anything else recipients or volunteers should know',
            )}

            <TextInput
              value={state.additionalDetails}
              onChangeText={(value) =>
                updateField(
                  'additionalDetails',
                  value,
                )
              }
              placeholder="Add helpful information about the food, packaging, pickup instructions, or allergens..."
              placeholderTextColor={C.muted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={styles.multilineInput}
            />
          </View>

          

          {/* ------------------------------------------------ */}
          {/* CONTINUE */}
          {/* ------------------------------------------------ */}

          <TouchableOpacity
            disabled={!canContinue}
            onPress={() =>
              navigation.navigate('Safety')
            }
            style={[
              styles.continueButton,
              !canContinue &&
                styles.continueButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.continueText,
                !canContinue &&
                  styles.continueTextDisabled,
              ]}
            >
              Continue to Safety Check
            </Text>

            <Ionicons
              name="arrow-forward"
              size={21}
              color={
                canContinue ? C.white : C.muted
              }
            />
          </TouchableOpacity>

          {!canContinue ? (
            <View style={styles.validationHint}>
              <Ionicons
                name="information-circle-outline"
                size={17}
                color={C.orange}
              />

              <Text
                style={styles.validationHintText}
              >
                Complete the required food,
                quantity, portion, time, and
                pickup fields to continue.
              </Text>
            </View>
          ) : null}

          <View style={styles.bottomSpace} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ================================================== */}
      {/* TIME PICKER */}
      {/* ================================================== */}

      {renderTimePicker()}

      {/* ================================================== */}
      {/* AI MODAL */}
      {/* ================================================== */}

      <Modal
        visible={aiModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeAiModal}
      >
        <View style={styles.aiModalOverlay}>
          <View style={styles.aiModalCard}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={
                styles.aiModalContent
              }
            >
              {/* Modal header */}

              <View style={styles.aiModalHeader}>
                <View
                  style={styles.aiModalIcon}
                >
                  <Ionicons
                    name="sparkles"
                    size={28}
                    color={C.orange}
                  />
                </View>

                <TouchableOpacity
                  onPress={closeAiModal}
                  disabled={aiLoading}
                  style={
                    styles.aiModalClose
                  }
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={C.navy}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.aiModalTitle}>
                AI Food Safety Check
              </Text>

              <Text
                style={styles.aiModalSubtitle}
              >
                Optional visual screening to
                support your food-safety decision.
              </Text>

              {/* Info */}

              <View style={styles.aiInfoBox}>
                <View
                  style={styles.aiInfoIcon}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={21}
                    color={C.teal}
                  />
                </View>

                <View
                  style={styles.aiInfoText}
                >
                  <Text
                    style={styles.aiInfoTitle}
                  >
                    What does AI check?
                  </Text>

                  <Text
                    style={styles.aiInfoDescription}
                  >
                    The system looks for visible
                    indicators such as unusual
                    discoloration, mold-like
                    appearance, damaged packaging,
                    uncovered food, or visible
                    foreign objects.
                  </Text>
                </View>
              </View>

              {/* Important disclaimer */}

              <View
                style={styles.aiWarningBox}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={19}
                  color={C.warning}
                />

                <Text
                  style={styles.aiWarningText}
                >
                  This is decision support only.
                  A photo cannot confirm whether
                  food is actually safe or unsafe.
                </Text>
              </View>

              {/* Instructions */}

              <View
                style={styles.photoInstructionCard}
              >
                <View
                  style={
                    styles.instructionHeader
                  }
                >
                  <Ionicons
                    name="camera-outline"
                    size={20}
                    color={C.orange}
                  />

                  <Text
                    style={
                      styles.instructionTitle
                    }
                  >
                    For a clearer AI check
                  </Text>
                </View>

                <View
                  style={styles.instructionRow}
                >
                  <View
                    style={
                      styles.instructionNumber
                    }
                  >
                    <Text
                      style={
                        styles.instructionNumberText
                      }
                    >
                      1
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.instructionText
                    }
                  >
                    Take a close-up photo of the
                    food.
                  </Text>
                </View>

                <View
                  style={styles.instructionRow}
                >
                  <View
                    style={
                      styles.instructionNumber
                    }
                  >
                    <Text
                      style={
                        styles.instructionNumberText
                      }
                    >
                      2
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.instructionText
                    }
                  >
                    Use good lighting and avoid
                    dark shadows.
                  </Text>
                </View>

                <View
                  style={styles.instructionRow}
                >
                  <View
                    style={
                      styles.instructionNumber
                    }
                  >
                    <Text
                      style={
                        styles.instructionNumberText
                      }
                    >
                      3
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.instructionText
                    }
                  >
                    Make sure the food surface is
                    clearly visible.
                  </Text>
                </View>

                <View
                  style={styles.instructionRow}
                >
                  <View
                    style={
                      styles.instructionNumber
                    }
                  >
                    <Text
                      style={
                        styles.instructionNumberText
                      }
                    >
                      4
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.instructionText
                    }
                  >
                    Avoid blurry or very distant
                    photos.
                  </Text>
                </View>
              </View>

              {/* Current selected AI photo */}

              {aiPhotoUri ? (
                <View
                  style={styles.aiSelectedPhoto}
                >
                  <Image
                    source={{
                      uri: aiPhotoUri,
                    }}
                    style={
                      styles.aiSelectedPhotoImage
                    }
                  />

                  <View
                    style={
                      styles.aiSelectedPhotoBadge
                    }
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={17}
                      color={C.white}
                    />

                    <Text
                      style={
                        styles.aiSelectedPhotoBadgeText
                      }
                    >
                      Ready for AI check
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Photo choices */}

              <Text
                style={styles.choosePhotoTitle}
              >
                Choose a photo
              </Text>

              {state.photoBase64 ? (
                <TouchableOpacity
                  onPress={usePostPhotoForAi}
                  disabled={aiLoading}
                  style={styles.aiPhotoChoice}
                >
                  <View
                    style={
                      styles.aiPhotoChoiceIcon
                    }
                  >
                    <Ionicons
                      name="images-outline"
                      size={22}
                      color={C.orange}
                    />
                  </View>

                  <View
                    style={
                      styles.aiPhotoChoiceText
                    }
                  >
                    <Text
                      style={
                        styles.aiPhotoChoiceTitle
                      }
                    >
                      Use Post Photo
                    </Text>

                    <Text
                      style={
                        styles.aiPhotoChoiceSubtitle
                      }
                    >
                      Use the same photo shown on
                      the Home food post.
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={19}
                    color={C.muted}
                  />
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={chooseAiPhoto}
                disabled={
                  pickingAiPhoto ||
                  aiLoading
                }
                style={styles.aiPhotoChoice}
              >
                <View
                  style={[
                    styles.aiPhotoChoiceIcon,
                    {
                      backgroundColor:
                        C.softBlue,
                    },
                  ]}
                >
                  <Ionicons
                    name="camera-outline"
                    size={22}
                    color={C.teal}
                  />
                </View>

                <View
                  style={
                    styles.aiPhotoChoiceText
                  }
                >
                  <Text
                    style={
                      styles.aiPhotoChoiceTitle
                    }
                  >
                    Upload Another Photo
                  </Text>

                  <Text
                    style={
                      styles.aiPhotoChoiceSubtitle
                    }
                  >
                    Choose a closer or clearer
                    photo just for the AI check.
                  </Text>
                </View>

                {pickingAiPhoto ? (
                  <ActivityIndicator
                    size="small"
                    color={C.orange}
                  />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={19}
                    color={C.muted}
                  />
                )}
              </TouchableOpacity>

              {/* Run */}

              <TouchableOpacity
                disabled={
                  !aiPhotoBase64 ||
                  aiLoading
                }
                onPress={runAiScreening}
                style={[
                  styles.runAiButton,
                  (!aiPhotoBase64 ||
                    aiLoading) &&
                    styles.runAiButtonDisabled,
                ]}
              >
                {aiLoading ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={C.white}
                    />

                    <Text
                      style={styles.runAiText}
                    >
                      Checking photo...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="sparkles"
                      size={20}
                      color={C.white}
                    />

                    <Text
                      style={styles.runAiText}
                    >
                      Start AI Check
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                disabled={aiLoading}
                onPress={closeAiModal}
                style={styles.skipAiButton}
              >
                <Text
                  style={styles.skipAiText}
                >
                  Skip AI Check
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================================================== */}
      {/* VOICE */}
      {/* ================================================== */}

      <VoiceAssistantModal
  visible={voiceVisible}
  onComplete={(values: any) => {
    update(
      'foodType',
      values.foodType ?? state.foodType
    );

    update(
      'category',
      values.category ?? state.category
    );

    update(
      'quantity',
      values.quantity ?? state.quantity
    );

    update(
      'portions',
      values.portions ?? state.portions
    );

    update(
      'preparationTime',
      values.preparationTime ?? state.preparationTime
    );

    update(
      'expiryTime',
      values.expiryTime ?? state.expiryTime
    );

    update(
      'storageCondition',
      values.storageCondition ?? state.storageCondition
    );

    update(
      'pickupLocation',
      values.pickupLocation ?? state.pickupLocation
    );

    update(
      'additionalDetails',
      values.additionalDetails ?? state.additionalDetails
    );

    setVoiceVisible(false);
  }}
/>
       

    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  screen: {
    flex: 1,
    backgroundColor: C.background,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 35,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },

  /* HEADER */

  topHeader: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: {
    alignItems: 'center',
  },

  headerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: C.orange,
    marginBottom: 2,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: C.navy,
  },

  headerPlaceholder: {
    width: 42,
  },

  progressTrack: {
    height: 5,
    flexDirection: 'row',
    gap: 5,
    marginTop: 7,
    marginBottom: 18,
  },

  progressActive: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: C.orange,
  },

  progressInactive: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: C.border,
  },

  /* INTRO */

  introCard: {
    flexDirection: 'row',
    padding: 17,
    borderRadius: 20,
    backgroundColor: C.navy,
    marginBottom: 15,
  },

  introIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  introText: {
    flex: 1,
  },

  introTitle: {
    color: C.white,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },

  introDescription: {
    color: '#D9E6EA',
    fontSize: 13,
    lineHeight: 19,
  },

  /* CARD */

  card: {
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 17,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E7EEF1',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.softOrange,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  sectionHeaderText: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.navy,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
    lineHeight: 17,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: C.navy,
    marginBottom: 8,
    marginTop: 2,
  },

  required: {
    color: C.orange,
  },

  inputWrapper: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: '#FCFDFD',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    marginBottom: 14,
  },

  textInput: {
    flex: 1,
    minHeight: 48,
    color: C.navy,
    fontSize: 14,
    marginLeft: 9,
    paddingVertical: 8,
  },

  horizontalOptions: {
    gap: 8,
    paddingBottom: 5,
    marginBottom: 13,
  },

  categoryPill: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.white,
  },

  categoryPillSelected: {
    backgroundColor: C.navy,
    borderColor: C.navy,
  },

  categoryText: {
    color: C.secondary,
    fontSize: 12,
    fontWeight: '700',
  },

  categoryTextSelected: {
    color: C.white,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  halfField: {
    flex: 1,
    minWidth: 0,
  },

  unitScroll: {
    gap: 6,
    paddingBottom: 5,
  },

  unitPill: {
    minHeight: 48,
    paddingHorizontal: 11,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
  },

  unitPillSelected: {
    borderColor: C.orange,
    backgroundColor: C.softOrange,
  },

  unitText: {
    color: C.secondary,
    fontSize: 12,
    fontWeight: '700',
  },

  unitTextSelected: {
    color: C.orange,
  },

  /* TIME */

  timeField: {
    minHeight: 69,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#FCFDFD',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 5,
  },

  timeFieldSelected: {
    borderColor: '#F6C18D',
    backgroundColor: '#FFFBF7',
  },

  timeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  timeIconSelected: {
    backgroundColor: C.softOrange,
  },

  timeTextContainer: {
    flex: 1,
  },

  timeValue: {
    fontSize: 14,
    fontWeight: '800',
    color: C.navy,
  },

  timePlaceholder: {
    color: C.muted,
    fontWeight: '700',
  },

  timeHint: {
    fontSize: 10,
    color: C.muted,
    marginTop: 2,
  },

  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.softBlue,
    padding: 11,
    borderRadius: 13,
    marginTop: 8,
  },

  timeInfoText: {
    flex: 1,
    color: C.teal,
    fontSize: 11,
    lineHeight: 16,
    marginLeft: 7,
  },

  /* STORAGE */

  storageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },

  storageOption: {
    width: '48%',
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
  },

  storageOptionSelected: {
    borderColor: C.orange,
    backgroundColor: C.softOrange,
  },

  storageText: {
    flex: 1,
    color: C.secondary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },

  storageTextSelected: {
    color: C.navy,
  },

  /* PHOTO */

  photoPreviewContainer: {
    height: 230,
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: C.softBlue,
    position: 'relative',
  },

  foodPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  photoOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
  },

  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(2,48,71,0.88)',
  },

  photoBadgeText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '800',
  },

  changePhotoButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: C.orange,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  changePhotoText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '800',
  },

  photoUploadBox: {
    minHeight: 220,
    borderRadius: 19,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C8D9DF',
    backgroundColor: '#FBFDFD',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  photoUploadIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: C.softOrange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  photoUploadTitle: {
    color: C.navy,
    fontSize: 17,
    fontWeight: '800',
  },

  photoUploadSubtitle: {
    color: C.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 5,
    marginBottom: 14,
  },

  uploadAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.navy,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  uploadActionText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '800',
  },

  photoTip: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 15,
    backgroundColor: C.softOrange,
    marginTop: 12,
  },

  photoTipIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  photoTipContent: {
    flex: 1,
  },

  photoTipTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: C.navy,
    marginBottom: 2,
  },

  photoTipText: {
    fontSize: 11,
    color: C.secondary,
    lineHeight: 16,
  },

  /* AI ACTION */

  aiActionCard: {
    marginTop: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E9D4C1',
    backgroundColor: '#FFF9F3',
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  aiActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  aiActionText: {
    flex: 1,
  },

  aiActionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },

  aiActionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.navy,
  },

  optionalBadge: {
    backgroundColor: '#FCE7D2',
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  optionalText: {
    color: C.orange,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  aiActionDescription: {
    fontSize: 11,
    color: C.secondary,
    lineHeight: 16,
    marginTop: 3,
    marginRight: 5,
  },

  aiActionLink: {
    fontSize: 11,
    color: C.orange,
    fontWeight: '800',
    marginTop: 5,
  },

  /* AI RESULT */

  aiResultCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 13,
    flexDirection: 'row',
  },

  aiResultIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  aiResultContent: {
    flex: 1,
  },

  aiResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 7,
  },

  aiResultTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
  },

  completedBadge: {
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  completedText: {
    fontSize: 8,
    fontWeight: '900',
  },

  aiResultMessage: {
    color: C.secondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },

  aiDisclaimer: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 7,
  },

  checkAgainButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 9,
    paddingVertical: 6,
  },

  checkAgainText: {
    color: C.navy,
    fontSize: 11,
    fontWeight: '800',
  },

  /* DETAILS */

  multilineInput: {
    minHeight: 125,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 13,
    color: C.navy,
    fontSize: 13,
    lineHeight: 19,
    backgroundColor: '#FCFDFD',
  },

  /* VOICE */

  voiceCard: {
    backgroundColor: C.navy,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  voiceIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: C.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  voiceText: {
    flex: 1,
  },

  voiceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },

  voiceTitle: {
    color: C.white,
    fontSize: 14,
    fontWeight: '800',
  },

  voiceOptional: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  voiceOptionalText: {
    color: '#D8E7EC',
    fontSize: 8,
    fontWeight: '900',
  },

  voiceSubtitle: {
    color: '#C9D9DF',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  /* CONTINUE */

  continueButton: {
    minHeight: 55,
    borderRadius: 17,
    backgroundColor: C.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 2,
  },

  continueButtonDisabled: {
    backgroundColor: '#E5EAEC',
  },

  continueText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '900',
  },

  continueTextDisabled: {
    color: C.muted,
  },

  validationHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 9,
    paddingHorizontal: 6,
  },

  validationHintText: {
    flex: 1,
    color: C.secondary,
    fontSize: 10,
    lineHeight: 15,
    marginLeft: 6,
  },

  bottomSpace: {
    height: 10,
  },

  /* TIME MODAL */

  timeModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(1,28,46,0.48)',
  },

  timeModalCard: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },

  timeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  timeModalEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: C.orange,
  },

  timeModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: C.navy,
    marginTop: 3,
  },

  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: C.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iosPicker: {
    alignSelf: 'center',
    width: 300,
    height: 210,
  },

  timeDoneButton: {
    height: 52,
    borderRadius: 15,
    backgroundColor: C.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timeDoneText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '900',
  },

  /* AI MODAL */

  aiModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(1,28,46,0.56)',
    justifyContent: 'flex-end',
  },

  aiModalCard: {
    backgroundColor: C.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '94%',
    overflow: 'hidden',
  },

  aiModalContent: {
    padding: 20,
    paddingBottom: 28,
  },

  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  aiModalIcon: {
    width: 57,
    height: 57,
    borderRadius: 19,
    backgroundColor: C.softOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiModalClose: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiModalTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: C.navy,
    marginTop: 15,
  },

  aiModalSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: C.secondary,
    marginTop: 5,
    marginBottom: 15,
  },

  aiInfoBox: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },

  aiInfoIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  aiInfoText: {
    flex: 1,
  },

  aiInfoTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: C.navy,
  },

  aiInfoDescription: {
    fontSize: 11,
    color: C.secondary,
    lineHeight: 17,
    marginTop: 4,
  },

  aiWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.warningSoft,
    borderRadius: 14,
    padding: 11,
    marginTop: 10,
  },

  aiWarningText: {
    flex: 1,
    color: '#765600',
    fontSize: 10,
    lineHeight: 15,
    marginLeft: 7,
  },

  photoInstructionCard: {
    backgroundColor: C.navy,
    borderRadius: 19,
    padding: 15,
    marginTop: 12,
  },

  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },

  instructionTitle: {
    color: C.white,
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 8,
  },

  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
  },

  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: C.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  instructionNumberText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '900',
  },

  instructionText: {
    flex: 1,
    color: '#D8E7EC',
    fontSize: 11,
    lineHeight: 16,
  },

  aiSelectedPhoto: {
    height: 175,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 13,
    position: 'relative',
    backgroundColor: C.softBlue,
  },

  aiSelectedPhotoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  aiSelectedPhotoBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(2,48,71,0.88)',
  },

  aiSelectedPhotoBadgeText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '800',
  },

  choosePhotoTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: C.navy,
    marginTop: 16,
    marginBottom: 8,
  },

  aiPhotoChoice: {
    minHeight: 68,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  aiPhotoChoiceIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.softOrange,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  aiPhotoChoiceText: {
    flex: 1,
  },

  aiPhotoChoiceTitle: {
    color: C.navy,
    fontSize: 12,
    fontWeight: '900',
  },

  aiPhotoChoiceSubtitle: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
  },

  runAiButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: C.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 9,
  },

  runAiButtonDisabled: {
    backgroundColor: '#C9D1D5',
  },

  runAiText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '900',
  },

  skipAiButton: {
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },

  skipAiText: {
    color: C.secondary,
    fontSize: 12,
    fontWeight: '800',
  },
});