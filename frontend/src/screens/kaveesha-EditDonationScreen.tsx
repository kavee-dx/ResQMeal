// frontend/src/screens/kaveeshaEditDonation.tsx
// Owner: Kaveesha

import React, {
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import { Ionicons } from '@expo/vector-icons';

import {
  Donation,
  DonationFormErrors,
  DonationFormValues,
  QuantityUnit,
  donationToFormValues,
  emptyDonationForm,
} from '@/types/kaveesha-donation.types';

import {
  validateDonationForm,
  isFormValid,
} from './kaveesha-donationValidation';

import {
  getDonationById,
  updateDonation,
} from '@/services/kaveesha-donationApi';

import {
  colors,
  fonts,
} from '@/styles/kaveesha-theme';

const UNIT_OPTIONS: QuantityUnit[] = [
  'kg',
  'g',
  'L',
  'mL',
  'items',
  'boxes',
  'trays',
  'packs',
  'other',
];

type IconName = keyof typeof Ionicons.glyphMap;

type ModalType =
  | 'success'
  | 'error'
  | 'warning';

function getDonationId(
  donation?: Donation | null,
) {
  return (
    donation?._id ||
    donation?.id ||
    ''
  );
}

function formatSafetyValue(
  value?: string | null,
) {
  if (!value) {
    return 'Not recorded';
  }

  switch (value) {
    case 'YES':
      return 'Yes';

    case 'NO':
      return 'No';

    case 'NOT_SURE':
      return 'Not sure';

    default:
      return value;
  }
}

function getSafetyValueColor(
  value?: string | null,
) {
  if (value === 'NO') {
    return colors.urgent;
  }

  if (value === 'NOT_SURE') {
    return colors.accent;
  }

  if (value === 'YES') {
    return colors.success;
  }

  return colors.textMuted;
}

function formatDateForDisplay(
  value?: string,
) {
  if (!value) {
    return 'Not provided';
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})$/,
  );

  if (!match) {
    return value;
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function getStatusLabel(
  status?: Donation['status'],
) {
  switch (status) {
    case 'pending':
      return 'Pending';

    case 'active':
      return 'Active';

    case 'completed':
      return 'Completed';

    case 'cancelled':
      return 'Cancelled';

    case 'expired':
      return 'Expired';

    default:
      return 'Unavailable';
  }
}

function getStatusIcon(
  status?: Donation['status'],
): IconName {
  switch (status) {
    case 'pending':
      return 'time-outline';

    case 'active':
      return 'radio-button-on-outline';


    case 'completed':
      return 'checkmark-circle-outline';

    case 'cancelled':
      return 'close-circle-outline';

    case 'expired':
      return 'calendar-outline';

    default:
      return 'help-circle-outline';
  }
}

function InfoBanner({
  icon,
  title,
  message,
}: {
  icon: IconName;
  title: string;
  message: string;
}) {
  return (
    <View style={styles.infoBanner}>
      <View style={styles.infoBannerIcon}>
        <Ionicons
          name={icon}
          size={20}
          color={colors.info}
        />
      </View>

      <View style={styles.infoBannerContent}>
        <Text style={styles.infoBannerTitle}>
          {title}
        </Text>

        <Text style={styles.infoBannerMessage}>
          {message}
        </Text>
      </View>
    </View>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons
            name={icon}
            size={20}
            color={colors.primary}
          />
        </View>

        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>
            {title}
          </Text>

          <Text style={styles.sectionSubtitle}>
            {subtitle}
          </Text>
        </View>
      </View>

      {children}
    </View>
  );
}

function FieldLabel({
  children,
  required = false,
}: {
  children: string;
  required?: boolean;
}) {
  return (
    <View style={styles.fieldLabelRow}>
      <Text style={styles.fieldLabel}>
        {children}
      </Text>

      {required && (
        <Text style={styles.requiredMark}>
          *
        </Text>
      )}
    </View>
  );
}

function ErrorText({
  message,
}: {
  message?: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <View style={styles.errorRow}>
      <Ionicons
        name="alert-circle-outline"
        size={13}
        color={colors.urgent}
      />

      <Text style={styles.errorText}>
        {message}
      </Text>
    </View>
  );
}

interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: 'default' | 'numeric';
  multiline?: boolean;
  icon?: IconName;
}

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType = 'default',
  multiline = false,
  icon,
}: FormInputProps) {
  return (
    <View style={styles.inputGroup}>
      <FieldLabel
        required
        children={label}
      />

      <View
        style={[
          styles.inputContainer,
          error
            ? styles.inputContainerError
            : null,
          multiline
            ? styles.inputContainerMultiline
            : null,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={colors.textMuted}
            style={styles.inputIcon}
          />
        )}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A0A9B3"
          keyboardType={keyboardType}
          multiline={multiline}
          maxLength={
            multiline ? 500 : undefined
          }
          textAlignVertical={
            multiline ? 'top' : 'center'
          }
          style={[
            styles.textInput,
            multiline
              ? styles.multilineInput
              : null,
            icon
              ? styles.textInputWithIcon
              : null,
          ]}
        />
      </View>

      <ErrorText message={error} />
    </View>
  );
}

function ReadOnlyField({
  label,
  value,
  icon,
  compact = false,
}: {
  label: string;
  value: string;
  icon: IconName;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        styles.readOnlyField,
        compact
          ? styles.readOnlyFieldCompact
          : null,
      ]}
    >
      <View style={styles.readOnlyIcon}>
        <Ionicons
          name={icon}
          size={17}
          color={colors.textSecondary}
        />
      </View>

      <View style={styles.readOnlyContent}>
        <Text style={styles.readOnlyLabel}>
          {label}
        </Text>

        <Text style={styles.readOnlyValue}>
          {value || 'Not recorded'}
        </Text>
      </View>

      <Ionicons
        name="lock-closed-outline"
        size={15}
        color={colors.textMuted}
      />
    </View>
  );
}

function DateTimeRow({
  title,
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  dateError,
  timeError,
  datePlaceholder,
  timePlaceholder,
  dateIcon,
  timeIcon,
}: {
  title: string;
  dateValue: string;
  timeValue: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  dateError?: string;
  timeError?: string;
  datePlaceholder: string;
  timePlaceholder: string;
  dateIcon: IconName;
  timeIcon: IconName;
}) {
  return (
    <View style={styles.dateTimeBlock}>
      <Text style={styles.subFieldTitle}>
        {title}
      </Text>

      <View style={styles.dateTimeRow}>
        <View style={styles.dateInputWrapper}>
          <FormInput
            label="Date"
            value={dateValue}
            onChangeText={onDateChange}
            placeholder={datePlaceholder}
            error={dateError}
            icon={dateIcon}
          />
        </View>

        <View style={styles.timeInputWrapper}>
          <FormInput
            label="Time"
            value={timeValue}
            onChangeText={onTimeChange}
            placeholder={timePlaceholder}
            error={timeError}
            icon={timeIcon}
          />
        </View>
      </View>
    </View>
  );
}

function SafetyAnswerRow({
  label,
  value,
  noBorder = false,
}: {
  label: string;
  value?: string | null;
  noBorder?: boolean;
}) {
  const displayValue =
    formatSafetyValue(value);

  const valueColor =
    getSafetyValueColor(value);

  return (
    <View
      style={[
        styles.safetyAnswerRow,
        noBorder
          ? null
          : styles.safetyAnswerBorder,
      ]}
    >
      <Text
        style={styles.safetyAnswerLabel}
      >
        {label}
      </Text>

      <View
        style={[
          styles.answerBadge,
          {
            backgroundColor:
              `${valueColor}15`,
          },
        ]}
      >
        <Text
          style={[
            styles.answerBadgeText,
            {
              color: valueColor,
            },
          ]}
        >
          {displayValue}
        </Text>
      </View>
    </View>
  );
}

function ModalIcon({
  type,
}: {
  type: ModalType;
}) {
  const icon =
    type === 'success'
      ? 'checkmark-circle'
      : type === 'warning'
      ? 'alert-circle'
      : 'close-circle';

  const iconColor =
    type === 'success'
      ? colors.success
      : type === 'warning'
      ? colors.accent
      : colors.urgent;

  const background =
    type === 'success'
      ? '#E8F7EF'
      : type === 'warning'
      ? '#FFF5D9'
      : '#FDECEC';

  return (
    <View
      style={[
        styles.modalIcon,
        {
          backgroundColor: background,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={34}
        color={iconColor}
      />
    </View>
  );
}

export default function EditDonationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width } =
    useWindowDimensions();

  const isDesktop = width >= 1100;
  const horizontalPadding = isDesktop
    ? 32
    : width >= 700
    ? 24
    : 16;

  const donationId =
    route.params?.donationId ||
    route.params?.id ||
    '';

  const [donation, setDonation] =
    useState<Donation | null>(null);

  const [values, setValues] =
    useState<DonationFormValues>(
      emptyDonationForm,
    );

  const [errors, setErrors] =
    useState<DonationFormErrors>({});

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [modal, setModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: ModalType;
    closeAfterSuccess?: boolean;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'error',
  });

  useEffect(() => {
    let mounted = true;

    async function loadDonation() {
      if (!donationId) {
        setLoading(false);
        return;
      }

      try {
        const data =
          await getDonationById(donationId);

        if (!mounted) {
          return;
        }

        setDonation(data);

        setValues(
          donationToFormValues(data),
        );
      } catch (error: any) {
        console.error(
          '[EditDonation] Failed to load donation:',
          error,
        );

        if (mounted) {
          setModal({
            visible: true,
            title: 'Unable to load donation',
            message:
              error?.response?.data?.message ||
              error?.message ||
              'Please try again.',
            type: 'error',
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDonation();

    return () => {
      mounted = false;
    };
  }, [donationId]);

  const isPending =
    donation?.status === 'pending';

  const isActive =
    donation?.status === 'active';

  const isLockedStatus =
    donation?.status === 'completed' ||
    donation?.status === 'cancelled' ||
    donation?.status === 'expired';

  const isEditableStatus =
    isPending || isActive;

  const canEditField = (
    field: keyof DonationFormValues,
  ) => {
    if (isPending) {
      return true;
    }

    if (isActive) {
      return [
        'quantity',
        'quantityUnit',
        'portions',
        'pickupLocation',
        'pickupDistrict',
        'pickupAvailableFromDate',
        'pickupAvailableFromTime',
        'pickupAvailableUntilDate',
        'pickupAvailableUntilTime',
        'additionalDetails',
      ].includes(field);
    }

    return false;
  };

  const setField = <
    K extends keyof DonationFormValues
  >(
    field: K,
  ) => {
    return (
      value: DonationFormValues[K],
    ) => {
      if (!canEditField(field)) {
        return;
      }

      setValues(
        (previous) => ({
          ...previous,
          [field]: value,
        }),
      );

      if (errors[field]) {
        setErrors(
          (previous) => ({
            ...previous,
            [field]: undefined,
          }),
        );
      }
    };
  };

  const safetyConcerns = useMemo(() => {
    const concerns: string[] = [];

    if (
      donation?.safety?.storage ===
      'NO'
    ) {
      concerns.push(
        'The food was reported as not being stored appropriately.',
      );
    }

    if (
      donation?.safety?.handling ===
      'NO'
    ) {
      concerns.push(
        'The food was reported as not being handled hygienically.',
      );
    }

    if (
      donation?.safety?.packaging ===
      'NO'
    ) {
      concerns.push(
        'The food container was reported as not clean or intact.',
      );
    }

    return concerns;
  }, [donation]);

  const hasSafetyConcern =
    safetyConcerns.length > 0;

  const hasSafetyUncertainty =
    donation?.safety?.temperature ===
      'NOT_SURE' ||
    donation?.safety?.allergens ===
      'NOT_SURE';

  const showModal = (
    title: string,
    message: string,
    type: ModalType = 'error',
    closeAfterSuccess = false,
  ) => {
    setModal({
      visible: true,
      title,
      message,
      type,
      closeAfterSuccess,
    });
  };

  const closeModal = () => {
    const shouldGoBack =
      modal.closeAfterSuccess;

    setModal((previous) => ({
      ...previous,
      visible: false,
    }));

    if (shouldGoBack) {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (!isEditableStatus) {
      showModal(
        'Donation cannot be edited',
        `This donation is currently ${getStatusLabel(
          donation?.status,
        )}. Donations in this status can no longer be edited.`,
        'warning',
      );

      return;
    }

    if (hasSafetyConcern) {
      showModal(
        'Safety concern recorded',
        'This donation has a recorded safety concern and cannot be updated from this page. The donation should not continue.',
        'error',
      );

      return;
    }

    const validationErrors =
      validateDonationForm(values);

    setErrors(validationErrors);

    if (!isFormValid(validationErrors)) {
      showModal(
        'Check your details',
        'Please correct the highlighted fields before saving.',
        'warning',
      );

      return;
    }

    const id =
      getDonationId(donation);

    if (!id) {
      showModal(
        'Donation ID missing',
        'We could not identify this donation.',
        'error',
      );

      return;
    }

    try {
      setSubmitting(true);

      await updateDonation(
        id,
        values,
      );

      showModal(
        'Donation Updated',
        'Your donation details have been updated successfully.',
        'success',
        true,
      );
    } catch (error: any) {
      console.error(
        '[EditDonation] Update failed:',
        error,
      );

      showModal(
        'Update Failed',
        error?.response?.data?.message ||
          error?.message ||
          'The donation could not be updated. Please try again.',
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={
            colors.primaryDark
          }
        />

        <View style={styles.loadingIcon}>
          <Ionicons
            name="create-outline"
            size={32}
            color={colors.accent}
          />
        </View>

        <ActivityIndicator
          size="large"
          color={colors.accent}
          style={styles.loadingSpinner}
        />

        <Text style={styles.loadingTitle}>
          Loading donation
        </Text>

        <Text style={styles.loadingText}>
          Preparing your editable details...
        </Text>
      </View>
    );
  }

  if (!donation) {
    return (
      <View style={styles.emptyScreen}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={
            colors.primaryDark
          }
        />

        <View style={styles.emptyIcon}>
          <Ionicons
            name="fast-food-outline"
            size={42}
            color={colors.primary}
          />
        </View>

        <Text style={styles.emptyTitle}>
          Donation not found
        </Text>

        <Text style={styles.emptyText}>
          We could not find the donation you are
          trying to edit.
        </Text>

        <Pressable
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Ionicons
            name="arrow-back"
            size={18}
            color="#FFFFFF"
          />

          <Text style={styles.backButtonText}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  if (isLockedStatus) {
    return (
      <View style={styles.emptyScreen}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={
            colors.primaryDark
          }
        />

        <View
          style={[
            styles.emptyIcon,
            styles.lockedEmptyIcon,
          ]}
        >
          <Ionicons
            name={getStatusIcon(
              donation.status,
            )}
            size={42}
            color={colors.primary}
          />
        </View>

        <View style={styles.statusLockedBadge}>
          <Ionicons
            name={getStatusIcon(
              donation.status,
            )}
            size={14}
            color={colors.primary}
          />

          <Text style={styles.statusLockedBadgeText}>
            {getStatusLabel(
              donation.status,
            )}
          </Text>
        </View>

        <Text style={styles.emptyTitle}>
          Donation cannot be edited
        </Text>

        <Text style={styles.emptyText}>
          This donation is currently{' '}
          {getStatusLabel(
            donation.status,
          ).toLowerCase()}
          . Donations in this status can no
          longer be edited.
        </Text>

        <Pressable
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Ionicons
            name="arrow-back"
            size={18}
            color="#FFFFFF"
          />

          <Text style={styles.backButtonText}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={
          colors.primaryDark
        }
      />

      {/* Header */}
      <View style={styles.header}>
        <View
          style={[
            styles.headerInner,
            {
              maxWidth: 1180,
              paddingHorizontal:
                horizontalPadding,
            },
          ]}
        >
          <Pressable
            style={styles.headerButton}
            onPress={() =>
              navigation.goBack()
            }
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#FFFFFF"
            />
          </Pressable>

          <View
            style={styles.headerTitleContainer}
          >
            <Text style={styles.headerTitle}>
              Edit Donation
            </Text>

            <Text style={styles.headerSubtitle}>
              {donation.donationCode
                ? `#${donation.donationCode}`
                : 'Update your donation'}
            </Text>
          </View>

          <View
            style={styles.headerStatus}
          >
            <Ionicons
              name={
                isActive
                  ? 'radio-button-on-outline'
                  : 'time-outline'
              }
              size={15}
              color={
                isActive
                  ? '#8FE0B3'
                  : colors.accent
              }
            />

            <Text
              style={
                styles.headerStatusText
              }
            >
              {getStatusLabel(
                donation.status,
              )}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal:
              horizontalPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Intro */}
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons
              name="pencil-outline"
              size={24}
              color={colors.primary}
            />
          </View>

          <View style={styles.introText}>
            <Text style={styles.introTitle}>
              Update your donation
            </Text>

            <Text style={styles.introSubtitle}>
              {isActive
                ? 'Update the current quantity and pickup information while this donation is active.'
                : 'Review and update your donation details before it becomes active.'}
            </Text>
          </View>
        </View>

        {/* Status Information */}
        {isPending && (
          <InfoBanner
            icon="create-outline"
            title="Pending donation"
            message="You can update the donation details before it becomes active."
          />
        )}

        {isActive && (
          <InfoBanner
            icon="lock-closed-outline"
            title="Active donation"
            message="Only quantity, portions, pickup details and additional notes can be updated. Food identity, preparation and expiry information are locked."
          />
        )}

        <InfoBanner
          icon="shield-checkmark-outline"
          title="Safety information is protected"
          message="The completed safety assessment cannot be changed from this page. This prevents safety answers from being changed after the donation has been posted."
        />

        {/* Donation Type */}
        <SectionCard
          icon="flash-outline"
          title="Donation Priority"
          subtitle={
            isActive
              ? 'Priority is locked while the donation is active'
              : 'Choose how this donation should be treated'
          }
        >
          <View style={styles.typeRow}>
            <Pressable
              disabled={isActive}
              style={[
                styles.typeCard,
                values.donationType ===
                  'NORMAL'
                  ? styles.typeCardNormalSelected
                  : null,
                isActive
                  ? styles.lockedCard
                  : null,
              ]}
              onPress={() =>
                setField(
                  'donationType',
                )('NORMAL')
              }
            >
              <View
                style={[
                  styles.typeIcon,
                  values.donationType ===
                    'NORMAL'
                    ? styles.typeIconSelected
                    : null,
                ]}
              >
                <Ionicons
                  name="leaf-outline"
                  size={22}
                  color={
                    values.donationType ===
                    'NORMAL'
                      ? colors.success
                      : colors.textMuted
                  }
                />
              </View>

              <Text style={styles.typeTitle}>
                Normal
              </Text>

              <Text
                style={styles.typeDescription}
              >
                Standard food rescue
              </Text>

              {values.donationType ===
                'NORMAL' && (
                <View
                  style={styles.selectedCheck}
                >
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color="#FFFFFF"
                  />
                </View>
              )}
            </Pressable>

            <Pressable
              disabled={isActive}
              style={[
                styles.typeCard,
                values.donationType ===
                  'URGENT'
                  ? styles.typeCardUrgentSelected
                  : null,
                isActive
                  ? styles.lockedCard
                  : null,
              ]}
              onPress={() =>
                setField(
                  'donationType',
                )('URGENT')
              }
            >
              <View
                style={[
                  styles.typeIcon,
                  values.donationType ===
                    'URGENT'
                    ? styles.typeIconUrgentSelected
                    : null,
                ]}
              >
                <Ionicons
                  name="flash-outline"
                  size={22}
                  color={
                    values.donationType ===
                    'URGENT'
                      ? colors.urgent
                      : colors.textMuted
                  }
                />
              </View>

              <Text style={styles.typeTitle}>
                Urgent
              </Text>

              <Text
                style={styles.typeDescription}
              >
                Needs faster rescue
              </Text>

              {values.donationType ===
                'URGENT' && (
                <View
                  style={[
                    styles.selectedCheck,
                    styles.selectedCheckUrgent,
                  ]}
                >
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color="#FFFFFF"
                  />
                </View>
              )}
            </Pressable>
          </View>

          {isActive && (
            <View
              style={styles.lockedInlineNotice}
            >
              <Ionicons
                name="lock-closed-outline"
                size={15}
                color={colors.textMuted}
              />

              <Text
                style={
                  styles.lockedInlineNoticeText
                }
              >
                Donation priority cannot be changed
                after the donation becomes active.
              </Text>
            </View>
          )}
        </SectionCard>

        {/* Food Information */}
        <SectionCard
          icon="restaurant-outline"
          title="Food Information"
          subtitle={
            isActive
              ? 'Food identity is locked for active donations'
              : 'Update what you are donating'
          }
        >
          {isActive ? (
            <>
              <ReadOnlyField
                label="Food type"
                value={values.foodType}
                icon="fast-food-outline"
              />

              <ReadOnlyField
                label="Food category"
                value={values.category}
                icon="pricetag-outline"
              />
            </>
          ) : (
            <>
              <FormInput
                label="Food type"
                value={values.foodType}
                onChangeText={setField(
                  'foodType',
                )}
                placeholder="e.g. Vegetable Fried Rice"
                error={errors.foodType}
                icon="fast-food-outline"
              />

              <FormInput
                label="Food category"
                value={values.category}
                onChangeText={setField(
                  'category',
                )}
                placeholder="e.g. Cooked Meal"
                error={errors.category}
                icon="pricetag-outline"
              />
            </>
          )}

          <View style={styles.quantityRow}>
            <View style={styles.quantityInput}>
              <FormInput
                label="Quantity"
                value={values.quantity}
                onChangeText={setField(
                  'quantity',
                )}
                placeholder="5"
                error={errors.quantity}
                keyboardType="numeric"
                icon="scale-outline"
              />
            </View>

            <View style={styles.portionsInput}>
              <FormInput
                label="Portions"
                value={values.portions}
                onChangeText={setField(
                  'portions',
                )}
                placeholder="12"
                error={errors.portions}
                keyboardType="numeric"
                icon="people-outline"
              />
            </View>
          </View>

          <Text style={styles.chipLabel}>
            Quantity unit
          </Text>

          <View style={styles.chipContainer}>
            {UNIT_OPTIONS.map(
              (unit) => {
                const selected =
                  values.quantityUnit ===
                  unit;

                return (
                  <Pressable
                    key={unit}
                    onPress={() =>
                      setField(
                        'quantityUnit',
                      )(unit)
                    }
                    style={[
                      styles.chip,
                      selected
                        ? styles.chipSelected
                        : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected
                          ? styles.chipTextSelected
                          : null,
                      ]}
                    >
                      {unit}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>
        </SectionCard>

        {/* Food Timing */}
        <SectionCard
          icon="time-outline"
          title="Food Timing"
          subtitle={
            isActive
              ? 'Preparation and expiry times are locked for active donations'
              : 'Keep preparation and expiry times accurate'
          }
        >
          {isActive ? (
            <>
              <ReadOnlyField
                label="Preparation date"
                value={formatDateForDisplay(
                  values.preparationDate,
                )}
                icon="calendar-outline"
              />

              <ReadOnlyField
                label="Preparation time"
                value={
                  values.preparationTime
                }
                icon="time-outline"
              />

              <ReadOnlyField
                label="Expiry date"
                value={formatDateForDisplay(
                  values.expiryDate,
                )}
                icon="calendar-outline"
              />

              <ReadOnlyField
                label="Expiry time"
                value={values.expiryTime}
                icon="hourglass-outline"
              />

              <View
                style={styles.lockedInlineNotice}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={15}
                  color={colors.textMuted}
                />

                <Text
                  style={
                    styles.lockedInlineNoticeText
                  }
                >
                  Preparation and expiry information
                  cannot be changed after activation.
                </Text>
              </View>
            </>
          ) : (
            <>
              <DateTimeRow
                title="Preparation"
                dateValue={
                  values.preparationDate
                }
                timeValue={
                  values.preparationTime
                }
                onDateChange={setField(
                  'preparationDate',
                )}
                onTimeChange={setField(
                  'preparationTime',
                )}
                dateError={
                  errors.preparationDate
                }
                timeError={
                  errors.preparationTime
                }
                datePlaceholder="YYYY-MM-DD"
                timePlaceholder="10:00 AM"
                dateIcon="calendar-outline"
                timeIcon="time-outline"
              />

              <View
                style={styles.timingDivider}
              >
                <Ionicons
                  name="arrow-down-outline"
                  size={18}
                  color={colors.textMuted}
                />

                <Text
                  style={
                    styles.timingDividerText
                  }
                >
                  then
                </Text>
              </View>

              <DateTimeRow
                title="Expiry"
                dateValue={
                  values.expiryDate
                }
                timeValue={
                  values.expiryTime
                }
                onDateChange={setField(
                  'expiryDate',
                )}
                onTimeChange={setField(
                  'expiryTime',
                )}
                dateError={
                  errors.expiryDate
                }
                timeError={
                  errors.expiryTime
                }
                datePlaceholder="YYYY-MM-DD"
                timePlaceholder="8:00 PM"
                dateIcon="calendar-outline"
                timeIcon="hourglass-outline"
              />

              <View
                style={styles.dateFormatHint}
              >
                <Ionicons
                  name="bulb-outline"
                  size={15}
                  color={colors.accent}
                />

                <Text
                  style={
                    styles.dateFormatHintText
                  }
                >
                  Use dates like 2026-10-05 and
                  times like 5:30 PM.
                </Text>
              </View>
            </>
          )}
        </SectionCard>

        {/* Pickup */}
        <SectionCard
          icon="location-outline"
          title="Pickup Information"
          subtitle="Tell rescuers where and when to collect the food"
        >
          <FormInput
            label="Pickup address"
            value={
              values.pickupLocation
            }
            onChangeText={setField(
              'pickupLocation',
            )}
            placeholder="Enter the pickup location"
            error={
              errors.pickupLocation
            }
            icon="location-outline"
          />

          <FormInput
            label="District"
            value={
              values.pickupDistrict
            }
            onChangeText={setField(
              'pickupDistrict',
            )}
            placeholder="e.g. Colombo"
            error={errors.pickupDistrict}
            icon="map-outline"
          />

          <View
            style={styles.pickupWindowHeader}
          >
            <View>
              <Text
                style={
                  styles.pickupWindowTitle
                }
              >
                Pickup window
              </Text>

              <Text
                style={
                  styles.pickupWindowSubtitle
                }
              >
                When the food can be collected
              </Text>
            </View>

            <View style={styles.windowIcon}>
              <Ionicons
                name="calendar-clear-outline"
                size={18}
                color={colors.accent}
              />
            </View>
          </View>

          <DateTimeRow
            title="Available from"
            dateValue={
              values.pickupAvailableFromDate
            }
            timeValue={
              values.pickupAvailableFromTime
            }
            onDateChange={setField(
              'pickupAvailableFromDate',
            )}
            onTimeChange={setField(
              'pickupAvailableFromTime',
            )}
            dateError={
              errors.pickupAvailableFromDate
            }
            timeError={
              errors.pickupAvailableFromTime
            }
            datePlaceholder="YYYY-MM-DD"
            timePlaceholder="5:00 PM"
            dateIcon="calendar-outline"
            timeIcon="time-outline"
          />

          <DateTimeRow
            title="Available until"
            dateValue={
              values.pickupAvailableUntilDate
            }
            timeValue={
              values.pickupAvailableUntilTime
            }
            onDateChange={setField(
              'pickupAvailableUntilDate',
            )}
            onTimeChange={setField(
              'pickupAvailableUntilTime',
            )}
            dateError={
              errors.pickupAvailableUntilDate
            }
            timeError={
              errors.pickupAvailableUntilTime
            }
            datePlaceholder="YYYY-MM-DD"
            timePlaceholder="8:00 PM"
            dateIcon="calendar-outline"
            timeIcon="time-outline"
          />
        </SectionCard>

        {/* Additional Details */}
        <SectionCard
          icon="document-text-outline"
          title="Additional Details"
          subtitle="Add anything else rescuers should know"
        >
          <FormInput
            label="Notes"
            value={
              values.additionalDetails
            }
            onChangeText={setField(
              'additionalDetails',
            )}
            placeholder="e.g. Please keep refrigerated during transport."
            error={
              errors.additionalDetails
            }
            multiline
            icon="chatbox-ellipses-outline"
          />

          <Text style={styles.characterCount}>
            {values.additionalDetails.length}/500
          </Text>
        </SectionCard>

        {/* Safety Assessment */}
        <SectionCard
          icon="shield-checkmark-outline"
          title="Food Safety"
          subtitle="Completed safety information is protected"
        >
          {hasSafetyConcern ? (
            <View
              style={styles.safetyDangerCard}
            >
              <View
                style={styles.safetyDangerIcon}
              >
                <Ionicons
                  name="warning"
                  size={24}
                  color={colors.urgent}
                />
              </View>

              <Text
                style={
                  styles.safetyDangerTitle
                }
              >
                SAFETY CONCERN
              </Text>

              <Text
                style={
                  styles.safetyDangerHeadline
                }
              >
                DO NOT DONATE THIS FOOD
              </Text>

              <Text
                style={
                  styles.safetyDangerMessage
                }
              >
                A blocking safety concern was
                recorded for this donation. The
                donation should not continue.
              </Text>

              <View
                style={styles.concernList}
              >
                {safetyConcerns.map(
                  (
                    concern,
                    index,
                  ) => (
                    <View
                      key={index}
                      style={
                        styles.concernItem
                      }
                    >
                      <View
                        style={
                          styles.concernBullet
                        }
                      >
                        <Ionicons
                          name="close"
                          size={11}
                          color="#FFFFFF"
                        />
                      </View>

                      <Text
                        style={
                          styles.concernText
                        }
                      >
                        {concern}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            </View>
          ) : (
            <View
              style={
                styles.safetyPassedCard
              }
            >
              <View
                style={
                  styles.safetyPassedIcon
                }
              >
                <Ionicons
                  name="checkmark-circle"
                  size={25}
                  color={colors.success}
                />
              </View>

              <View
                style={
                  styles.safetyPassedContent
                }
              >
                <Text
                  style={
                    styles.safetyPassedTitle
                  }
                >
                  SAFETY CHECK PASSED
                </Text>

                <Text
                  style={
                    styles.safetyPassedText
                  }
                >
                  Required food-safety information was
                  completed before this donation was
                  posted.
                </Text>
              </View>
            </View>
          )}

          <View
            style={styles.lockedDivider}
          />

          <Text
            style={styles.lockedSectionTitle}
          >
            Recorded safety information
          </Text>

          <ReadOnlyField
            label="Storage condition"
            value={
              values.storageCondition
            }
            icon="snow-outline"
          />

          <ReadOnlyField
            label="Allergen information"
            value={
              values.allergenInfo ||
              'No additional allergen information recorded'
            }
            icon="alert-circle-outline"
          />

          <ReadOnlyField
            label="Packaging condition"
            value={
              values.packagingCondition ||
              'No packaging information recorded'
            }
            icon="cube-outline"
          />

          {donation.safety ? (
            <View
              style={styles.assessmentList}
            >
              <Text
                style={
                  styles.assessmentListTitle
                }
              >
                Safety answers
              </Text>

              <SafetyAnswerRow
                label="Storage appropriate"
                value={
                  donation.safety.storage
                }
              />

              <SafetyAnswerRow
                label="Temperature control"
                value={
                  donation.safety.temperature
                }
              />

              <SafetyAnswerRow
                label="Hygienic handling"
                value={
                  donation.safety.handling
                }
              />

              <SafetyAnswerRow
                label="Container clean and intact"
                value={
                  donation.safety.packaging
                }
              />

              <SafetyAnswerRow
                label="Known allergens"
                value={
                  donation.safety.allergens
                }
                noBorder
              />
            </View>
          ) : (
            <View
              style={
                styles.noSafetyRecorded
              }
            >
              <Ionicons
                name="help-circle-outline"
                size={18}
                color={colors.textMuted}
              />

              <Text
                style={
                  styles.noSafetyRecordedText
                }
              >
                No detailed safety answers are
                available for this donation.
              </Text>
            </View>
          )}

          {hasSafetyUncertainty && (
            <View
              style={
                styles.uncertaintyCard
              }
            >
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={colors.accent}
              />

              <Text
                style={
                  styles.uncertaintyText
                }
              >
                Some safety information was
                recorded as "Not sure". This
                should be considered before
                proceeding with the donation.
              </Text>
            </View>
          )}

          <View style={styles.lockedNotice}>
            <Ionicons
              name="lock-closed-outline"
              size={16}
              color={colors.textMuted}
            />

            <Text
              style={
                styles.lockedNoticeText
              }
            >
              Safety answers are locked after the
              safety assessment and cannot be
              changed here.
            </Text>
          </View>
        </SectionCard>

        {/* Save Notice */}
        <View style={styles.saveNotice}>
          <View style={styles.saveNoticeIcon}>
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={colors.primary}
            />
          </View>

          <View
            style={styles.saveNoticeContent}
          >
            <Text
              style={styles.saveNoticeTitle}
            >
              Before saving
            </Text>

            <Text
              style={styles.saveNoticeText}
            >
              Make sure the quantity and pickup
              information are accurate. These
              details help rescuers plan collection
              correctly.
            </Text>
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={
            submitting ||
            hasSafetyConcern
          }
          style={[
            styles.saveButton,
            hasSafetyConcern
              ? styles.saveButtonDisabled
              : null,
          ]}
        >
          {submitting ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <>
              <Ionicons
                name="save-outline"
                size={20}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.saveButtonText
                }
              >
                Save Changes
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() =>
            navigation.goBack()
          }
          disabled={submitting}
          style={
            styles.cancelEditButton
          }
        >
          <Text
            style={
              styles.cancelEditButtonText
            }
          >
            Cancel
          </Text>
        </Pressable>

        <View
          style={styles.bottomSpace}
        />
      </ScrollView>

      {/* Custom Modal */}
      <Modal
        visible={modal.visible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                width:
                  width >= 700
                    ? 430
                    : '88%',
              },
            ]}
          >
            <ModalIcon
              type={modal.type}
            />

            <Text style={styles.modalTitle}>
              {modal.title}
            </Text>

            <Text
              style={styles.modalMessage}
            >
              {modal.message}
            </Text>

            <Pressable
              style={[
                styles.modalButton,
                modal.type ===
                'success'
                  ? styles.modalSuccessButton
                  : modal.type ===
                    'warning'
                  ? styles.modalWarningButton
                  : styles.modalErrorButton,
              ]}
              onPress={closeModal}
            >
              <Text
                style={
                  styles.modalButtonText
                }
              >
                {modal.type ===
                'success'
                  ? 'Done'
                  : 'OK'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    backgroundColor: colors.primaryDark,
  },

  headerInner: {
    width: '100%',
    alignSelf: 'center',
    paddingTop: 48,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(255,255,255,0.10)',
  },

  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 14,
  },

  headerTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: '#FFFFFF',
  },

  headerSubtitle: {
    marginTop: 3,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color:
      'rgba(255,255,255,0.68)',
  },

  headerStatus: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: 17,
    backgroundColor:
      'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  headerStatusText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: '#FFFFFF',
  },

  scrollView: {
    flex: 1,
  },

  content: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingTop: 20,
    paddingBottom: 35,
  },

  intro: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 17,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor:
      colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  introText: {
    flex: 1,
    marginLeft: 13,
  },

  introTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.textPrimary,
  },

  introSubtitle: {
    marginTop: 5,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  infoBanner: {
    backgroundColor: '#F1F7FA',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#D8EAF0',
    padding: 13,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  infoBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoBannerContent: {
    flex: 1,
    marginLeft: 10,
  },

  infoBannerTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textPrimary,
  },

  infoBannerMessage: {
    marginTop: 3,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSecondary,
  },

  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor:
      colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeaderText: {
    flex: 1,
    marginLeft: 11,
  },

  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
  },

  sectionSubtitle: {
    marginTop: 3,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
  },

  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },

  typeCard: {
    flex: 1,
    minHeight: 135,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    padding: 14,
    position: 'relative',
  },

  lockedCard: {
    opacity: 0.58,
  },

  typeCardNormalSelected: {
    borderColor: colors.success,
    backgroundColor: '#F3FBF6',
  },

  typeCardUrgentSelected: {
    borderColor: colors.urgent,
    backgroundColor: '#FFF7F5',
  },

  typeIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor:
      colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  typeIconSelected: {
    backgroundColor: '#E5F7EB',
  },

  typeIconUrgentSelected: {
    backgroundColor: '#FFE8E2',
  },

  typeTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
  },

  typeDescription: {
    marginTop: 4,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
  },

  selectedCheck: {
    position: 'absolute',
    top: 11,
    right: 11,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedCheckUrgent: {
    backgroundColor: colors.urgent,
  },

  lockedInlineNotice: {
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },

  lockedInlineNoticeText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    lineHeight: 16,
    color: colors.textMuted,
  },

  inputGroup: {
    marginBottom: 15,
  },

  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  requiredMark: {
    marginLeft: 3,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.urgent,
  },

  inputContainer: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },

  inputContainerError: {
    borderColor: '#E7A5A5',
    backgroundColor: '#FFF9F9',
  },

  inputContainerMultiline: {
    minHeight: 105,
    alignItems: 'flex-start',
  },

  inputIcon: {
    marginLeft: 14,
  },

  textInput: {
    flex: 1,
    minHeight: 49,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },

  textInputWithIcon: {
    paddingLeft: 9,
  },

  multilineInput: {
    minHeight: 100,
    paddingTop: 13,
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 4,
  },

  errorText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.urgent,
  },

  quantityRow: {
    flexDirection: 'row',
    gap: 10,
  },

  quantityInput: {
    flex: 1,
  },

  portionsInput: {
    flex: 1,
  },

  chipLabel: {
    marginBottom: 8,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },

  chipSelected: {
    borderColor: colors.primary,
    backgroundColor:
      colors.primaryLight,
  },

  chipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textMuted,
  },

  chipTextSelected: {
    color: colors.primary,
  },

  readOnlyField: {
    minHeight: 55,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  readOnlyFieldCompact: {
    minHeight: 50,
  },

  readOnlyIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  readOnlyContent: {
    flex: 1,
    marginHorizontal: 9,
  },

  readOnlyLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.textMuted,
  },

  readOnlyValue: {
    marginTop: 3,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textPrimary,
  },

  dateTimeBlock: {
    marginBottom: 3,
  },

  subFieldTitle: {
    marginBottom: 9,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textPrimary,
  },

  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },

  dateInputWrapper: {
    flex: 1.15,
  },

  timeInputWrapper: {
    flex: 1,
  },

  timingDivider: {
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    marginBottom: 4,
  },

  timingDividerText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.textMuted,
  },

  dateFormatHint: {
    marginTop: 2,
    backgroundColor:
      colors.accentSoft,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  dateFormatHintText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
  },

  pickupWindowHeader: {
    marginTop: 5,
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  pickupWindowTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
  },

  pickupWindowSubtitle: {
    marginTop: 3,
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.textMuted,
  },

  windowIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor:
      colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  characterCount: {
    marginTop: -7,
    textAlign: 'right',
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.textMuted,
  },

  safetyDangerCard: {
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#F0B5B5',
    backgroundColor: '#FFF5F5',
    padding: 15,
  },

  safetyDangerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#FFE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },

  safetyDangerTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.6,
    color: colors.urgent,
  },

  safetyDangerHeadline: {
    marginTop: 5,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: '#A83232',
  },

  safetyDangerMessage: {
    marginTop: 5,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 17,
    color: '#7A3A3A',
  },

  concernList: {
    marginTop: 13,
    gap: 8,
  },

  concernItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  concernBullet: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: colors.urgent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
    marginTop: 1,
  },

  concernText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 17,
    color: '#7A3A3A',
  },

  safetyPassedCard: {
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#BFE4C9',
    backgroundColor: '#F3FBF6',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  safetyPassedIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: '#E0F5E7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  safetyPassedContent: {
    flex: 1,
    marginLeft: 11,
  },

  safetyPassedTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: '#237A3B',
  },

  safetyPassedText: {
    marginTop: 4,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
  },

  lockedDivider: {
    marginTop: 17,
    marginBottom: 14,
    height: 1,
    backgroundColor: colors.border,
  },

  lockedSectionTitle: {
    marginBottom: 10,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textPrimary,
  },

  assessmentList: {
    marginTop: 15,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.background,
  },

  assessmentListTitle: {
    marginBottom: 4,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textSecondary,
  },

  safetyAnswerRow: {
    minHeight: 45,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  safetyAnswerBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  safetyAnswerLabel: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
  },

  answerBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },

  answerBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
  },

  noSafetyRecorded: {
    marginTop: 12,
    padding: 12,
    borderRadius: 13,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  noSafetyRecordedText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 17,
    color: colors.textMuted,
  },

  uncertaintyCard: {
    marginTop: 11,
    padding: 11,
    borderRadius: 13,
    backgroundColor:
      colors.accentSoft,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },

  uncertaintyText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    lineHeight: 16,
    color: colors.textSecondary,
  },

  lockedNotice: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },

  lockedNoticeText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    lineHeight: 16,
    color: colors.textMuted,
  },

  saveNotice: {
    backgroundColor: '#F1F7FA',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#D8EAF0',
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  saveNoticeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveNoticeContent: {
    flex: 1,
    marginLeft: 10,
  },

  saveNoticeTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textPrimary,
  },

  saveNoticeText: {
    marginTop: 3,
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    lineHeight: 16,
    color: colors.textSecondary,
  },

  saveButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  saveButtonDisabled: {
    backgroundColor: '#AEB7BE',
    elevation: 0,
  },

  saveButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },

  cancelEditButton: {
    minHeight: 48,
    marginTop: 9,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelEditButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textSecondary,
  },

  bottomSpace: {
    height: 35,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor:
      'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  loadingSpinner: {
    marginBottom: 14,
  },

  loadingTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 19,
    color: '#FFFFFF',
  },

  loadingText: {
    marginTop: 6,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color:
      'rgba(255,255,255,0.68)',
  },

  emptyScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor:
      colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  lockedEmptyIcon: {
    marginBottom: 12,
  },

  statusLockedBadge: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },

  statusLockedBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.primary,
  },

  emptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 21,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 8,
    maxWidth: 330,
    textAlign: 'center',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },

  backButton: {
    marginTop: 22,
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  backButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(1,28,46,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  modalCard: {
    maxWidth: 430,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 10,
  },

  modalIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  modalTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 19,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  modalMessage: {
    marginTop: 8,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  modalButton: {
    width: '100%',
    minHeight: 48,
    marginTop: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalSuccessButton: {
    backgroundColor: colors.success,
  },

  modalWarningButton: {
    backgroundColor: colors.accent,
  },

  modalErrorButton: {
    backgroundColor: colors.urgent,
  },

  modalButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});