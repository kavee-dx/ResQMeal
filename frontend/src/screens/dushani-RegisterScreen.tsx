import React, { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Ionicons } from '@expo/vector-icons';

import {
  Radius,
  Shadows,
  Spacing,
  Typography,
} from '@/constants/theme';

import { useTheme } from '@/hooks/use-theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Role = 'DONOR' | 'RECIPIENT' | 'NGO' | 'VOLUNTEER';

type DonorType =
  | 'INDIVIDUAL'
  | 'HOTEL'
  | 'RESTAURANT'
  | 'BAKERY'
  | 'SUPERMARKET'
  | 'CATERING'
  | 'EVENT_ORGANIZER'
  | 'OTHER';

type RecipientType =
  | 'INDIVIDUAL'
  | 'FAMILY'
  | 'CHARITY'
  | 'COMMUNITY_CENTER'
  | 'SCHOOL'
  | 'DISASTER_RELIEF_ORGANIZATION'
  | 'OTHER';

type NgoType =
  | 'NON_PROFIT_ORGANIZATION'
  | 'CHARITY'
  | 'COMMUNITY_ORGANIZATION'
  | 'RELIEF_ORGANIZATION'
  | 'SOCIAL_SERVICE_ORGANIZATION'
  | 'OTHER';

type VehicleType =
  | 'WALKING'
  | 'BICYCLE'
  | 'MOTORBIKE'
  | 'THREE_WHEELER'
  | 'CAR'
  | 'VAN'
  | 'OTHER';

const ROLES: {
  label: string;
  description: string;
  value: Role;
  icon: IconName;
}[] = [
  {
    label: 'Donor',
    description: 'Share surplus food',
    value: 'DONOR',
    icon: 'gift-outline',
  },
  {
    label: 'Recipient',
    description: 'Receive food support',
    value: 'RECIPIENT',
    icon: 'hand-left-outline',
  },
  {
    label: 'NGO',
    description: 'Support communities',
    value: 'NGO',
    icon: 'business-outline',
  },
  {
    label: 'Volunteer',
    description: 'Help deliver food',
    value: 'VOLUNTEER',
    icon: 'bicycle-outline',
  },
];

const DONOR_TYPES: {
  label: string;
  value: DonorType;
  icon: IconName;
}[] = [
  {
    label: 'Individual',
    value: 'INDIVIDUAL',
    icon: 'person-outline',
  },
  {
    label: 'Hotel',
    value: 'HOTEL',
    icon: 'bed-outline',
  },
  {
    label: 'Restaurant',
    value: 'RESTAURANT',
    icon: 'restaurant-outline',
  },
  {
    label: 'Bakery',
    value: 'BAKERY',
    icon: 'fast-food-outline',
  },
  {
    label: 'Supermarket',
    value: 'SUPERMARKET',
    icon: 'cart-outline',
  },
  {
    label: 'Catering',
    value: 'CATERING',
    icon: 'restaurant-outline',
  },
  {
    label: 'Event Organizer',
    value: 'EVENT_ORGANIZER',
    icon: 'calendar-outline',
  },
  {
    label: 'Other',
    value: 'OTHER',
    icon: 'ellipsis-horizontal-outline',
  },
];

const RECIPIENT_TYPES: {
  label: string;
  value: RecipientType;
  icon: IconName;
}[] = [
  {
    label: 'Individual',
    value: 'INDIVIDUAL',
    icon: 'person-outline',
  },
  {
    label: 'Family',
    value: 'FAMILY',
    icon: 'people-outline',
  },
  {
    label: 'Charity',
    value: 'CHARITY',
    icon: 'heart-outline',
  },
  {
    label: 'Community Center',
    value: 'COMMUNITY_CENTER',
    icon: 'home-outline',
  },
  {
    label: 'School',
    value: 'SCHOOL',
    icon: 'school-outline',
  },
  {
    label: 'Disaster Relief',
    value: 'DISASTER_RELIEF_ORGANIZATION',
    icon: 'alert-circle-outline',
  },
  {
    label: 'Other',
    value: 'OTHER',
    icon: 'ellipsis-horizontal-outline',
  },
];

const NGO_TYPES: {
  label: string;
  value: NgoType;
  icon: IconName;
}[] = [
  {
    label: 'Non-Profit',
    value: 'NON_PROFIT_ORGANIZATION',
    icon: 'business-outline',
  },
  {
    label: 'Charity',
    value: 'CHARITY',
    icon: 'heart-outline',
  },
  {
    label: 'Community',
    value: 'COMMUNITY_ORGANIZATION',
    icon: 'people-outline',
  },
  {
    label: 'Relief',
    value: 'RELIEF_ORGANIZATION',
    icon: 'medkit-outline',
  },
  {
    label: 'Social Service',
    value: 'SOCIAL_SERVICE_ORGANIZATION',
    icon: 'hand-left-outline',
  },
  {
    label: 'Other',
    value: 'OTHER',
    icon: 'ellipsis-horizontal-outline',
  },
];

const VEHICLE_TYPES: {
  label: string;
  value: VehicleType;
  icon: IconName;
}[] = [
  {
    label: 'Walking',
    value: 'WALKING',
    icon: 'walk-outline',
  },
  {
    label: 'Bicycle',
    value: 'BICYCLE',
    icon: 'bicycle-outline',
  },
  {
    label: 'Motorbike',
    value: 'MOTORBIKE',
    icon: 'speedometer-outline',
  },
  {
    label: 'Three-Wheeler',
    value: 'THREE_WHEELER',
    icon: 'car-sport-outline',
  },
  {
    label: 'Car',
    value: 'CAR',
    icon: 'car-outline',
  },
  {
    label: 'Van',
    value: 'VAN',
    icon: 'bus-outline',
  },
  {
    label: 'Other',
    value: 'OTHER',
    icon: 'ellipsis-horizontal-outline',
  },
];

const VEHICLE_TYPES_REQUIRING_NUMBER: VehicleType[] = [
  'MOTORBIKE',
  'THREE_WHEELER',
  'CAR',
  'VAN',
  'OTHER',
];

const FOOD_OPTIONS: {
  label: string;
  icon: IconName;
}[] = [
  {
    label: 'Rice',
    icon: 'restaurant-outline',
  },
  {
    label: 'Vegetables',
    icon: 'leaf-outline',
  },
  {
    label: 'Fruits',
    icon: 'nutrition-outline',
  },
  {
    label: 'Bread',
    icon: 'fast-food-outline',
  },
  {
    label: 'Milk',
    icon: 'cafe-outline',
  },
  {
    label: 'Dry Rations',
    icon: 'cube-outline',
  },
  {
    label: 'Meal Packets',
    icon: 'bag-handle-outline',
  },
  {
    label: 'Drinking Water',
    icon: 'water-outline',
  },
];

type FormState = {
  role: Role;

  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  profilePicture: string;

  address: string;
  district: string;
  city: string;

  donorType: DonorType;
  specifiedDonorType: string;
  businessName: string;
  authorizedPerson: string;
  position: string;
  businessRegistrationNumber: string;
  businessContactNumber: string;
  businessEmail: string;
  businessLogo: string;
  website: string;
  description: string;

  recipientType: RecipientType;
  specifiedRecipientType: string;
  organizationName: string;
  organizationRegistrationNumber: string;
  organizationLogo: string;
  peopleNeedingFood: string;
  foodRequirements: string[];
  specialRequirements: string;

  ngoRegistrationNumber: string;
  organizationType: NgoType;
  specifiedOrganizationType: string;

  vehicleType: VehicleType;
  vehicleNumber: string;
  preferredDeliveryArea: string;
  preferredDeliveryTime: string;
};

const INITIAL_STATE: FormState = {
  role: 'DONOR',

  fullName: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
  profilePicture: '',

  address: '',
  district: '',
  city: '',

  donorType: 'INDIVIDUAL',
  specifiedDonorType: '',
  businessName: '',
  authorizedPerson: '',
  position: '',
  businessRegistrationNumber: '',
  businessContactNumber: '',
  businessEmail: '',
  businessLogo: '',
  website: '',
  description: '',

  recipientType: 'INDIVIDUAL',
  specifiedRecipientType: '',
  organizationName: '',
  organizationRegistrationNumber: '',
  organizationLogo: '',
  peopleNeedingFood: '',
  foodRequirements: [],
  specialRequirements: '',

  ngoRegistrationNumber: '',
  organizationType: 'NON_PROFIT_ORGANIZATION',
  specifiedOrganizationType: '',

  vehicleType: 'WALKING',
  vehicleNumber: '',
  preferredDeliveryArea: '',
  preferredDeliveryTime: '',
};

type Props = NativeStackScreenProps<any, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const theme = useTheme();

  const [form, setForm] =
    useState<FormState>(INITIAL_STATE);

  const [errors, setErrors] =
    useState<Record<string, string>>({});

  const [submitting, setSubmitting] =
    useState(false);

  const isBusinessDonor =
    form.role === 'DONOR' &&
    form.donorType !== 'INDIVIDUAL';

  const isOrganizationRecipient =
    form.role === 'RECIPIENT' &&
    form.recipientType !== 'INDIVIDUAL' &&
    form.recipientType !== 'FAMILY';

  const needsVehicleNumber =
    VEHICLE_TYPES_REQUIRING_NUMBER.includes(
      form.vehicleType,
    );

  function update<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field as string]) {
      setErrors((prev) => ({
        ...prev,
        [field as string]: '',
      }));
    }
  }

  function toggleFoodRequirement(item: string) {
    setForm((prev) => {
      const has =
        prev.foodRequirements.includes(item);

      return {
        ...prev,
        foodRequirements: has
          ? prev.foodRequirements.filter(
              (food) => food !== item,
            )
          : [...prev.foodRequirements, item],
      };
    });

    setErrors((prev) => ({
      ...prev,
      foodRequirements: '',
    }));
  }

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const phoneRegex =
    /^[0-9+\-\s]{7,20}$/;

  function validate(): boolean {
    const next: Record<string, string> = {};

    const req = (
      value: string,
      field: string,
      message: string,
    ) => {
      if (!value || value.trim().length < 2) {
        next[field] = message;
      }
    };

    if (!phoneRegex.test(form.phoneNumber)) {
      next.phoneNumber =
        'Enter a valid phone number.';
    }

    if (form.password.length < 8) {
      next.password =
        'Password must be at least 8 characters.';
    }

    if (
      form.password !== form.confirmPassword
    ) {
      next.confirmPassword =
        'Passwords do not match.';
    }

    req(
      form.address,
      'address',
      'Address is required.',
    );

    req(
      form.district,
      'district',
      'District is required.',
    );

    req(
      form.city,
      'city',
      'City is required.',
    );

    if (form.role === 'DONOR') {
      if (form.donorType === 'INDIVIDUAL') {
        req(
          form.fullName,
          'fullName',
          'Full name is required.',
        );

        if (!emailRegex.test(form.email)) {
          next.email =
            'Enter a valid email address.';
        }
      } else {
        if (form.donorType === 'OTHER') {
          req(
            form.specifiedDonorType,
            'specifiedDonorType',
            'Please specify your donor type.',
          );
        }

        req(
          form.businessName,
          'businessName',
          'Business name is required.',
        );

        req(
          form.authorizedPerson,
          'authorizedPerson',
          'Authorized person is required.',
        );

        req(
          form.position,
          'position',
          'Position is required.',
        );

        req(
          form.businessRegistrationNumber,
          'businessRegistrationNumber',
          'Business registration number is required.',
        );

        if (
          !phoneRegex.test(
            form.businessContactNumber,
          )
        ) {
          next.businessContactNumber =
            'Enter a valid business contact number.';
        }
      }
    }

    if (form.role === 'RECIPIENT') {
      if (!isOrganizationRecipient) {
        req(
          form.fullName,
          'fullName',
          'Full name is required.',
        );

        if (!emailRegex.test(form.email)) {
          next.email =
            'Enter a valid email address.';
        }
      } else {
        if (form.recipientType === 'OTHER') {
          req(
            form.specifiedRecipientType,
            'specifiedRecipientType',
            'Please specify your recipient type.',
          );
        }

        req(
          form.organizationName,
          'organizationName',
          'Organization name is required.',
        );

        req(
          form.organizationRegistrationNumber,
          'organizationRegistrationNumber',
          'Organization registration number is required.',
        );

        req(
          form.authorizedPerson,
          'authorizedPerson',
          'Authorized person is required.',
        );

        req(
          form.position,
          'position',
          'Position is required.',
        );

        if (
          form.email &&
          !emailRegex.test(form.email)
        ) {
          next.email =
            'Enter a valid email address.';
        }
      }

      const people = Number(
        form.peopleNeedingFood,
      );

      if (
        !Number.isInteger(people) ||
        people < 1
      ) {
        next.peopleNeedingFood =
          'Enter the number of people needing food.';
      }

      if (
        form.foodRequirements.length === 0
      ) {
        next.foodRequirements =
          'Select at least one food requirement.';
      }
    }

    if (form.role === 'NGO') {
      req(
        form.organizationName,
        'organizationName',
        'Organization name is required.',
      );

      req(
        form.ngoRegistrationNumber,
        'ngoRegistrationNumber',
        'NGO registration number is required.',
      );

      if (
        form.organizationType === 'OTHER'
      ) {
        req(
          form.specifiedOrganizationType,
          'specifiedOrganizationType',
          'Please specify your organization type.',
        );
      }

      req(
        form.authorizedPerson,
        'authorizedPerson',
        'Authorized person is required.',
      );

      req(
        form.position,
        'position',
        'Position is required.',
      );

      if (!emailRegex.test(form.email)) {
        next.email =
          'Enter a valid email address.';
      }
    }

    if (form.role === 'VOLUNTEER') {
      req(
        form.fullName,
        'fullName',
        'Full name is required.',
      );

      if (!emailRegex.test(form.email)) {
        next.email =
          'Enter a valid email address.';
      }

      if (
        needsVehicleNumber &&
        !form.vehicleNumber.trim()
      ) {
        next.vehicleNumber =
          'Vehicle number is required for this vehicle type.';
      }

      req(
        form.preferredDeliveryArea,
        'preferredDeliveryArea',
        'Preferred delivery area is required.',
      );
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        role: form.role,
        phoneNumber: form.phoneNumber,
        password: form.password,
        confirmPassword:
          form.confirmPassword,
        address: form.address,
        district: form.district,
        city: form.city,
        profilePicture:
          form.profilePicture || undefined,
      };

      if (form.role === 'DONOR') {
        payload.donorType =
          form.donorType;

        if (
          form.donorType === 'INDIVIDUAL'
        ) {
          payload.fullName =
            form.fullName;

          payload.email =
            form.email;
        } else {
          payload.specifiedDonorType =
            form.donorType === 'OTHER'
              ? form.specifiedDonorType
              : undefined;

          payload.businessName =
            form.businessName;

          payload.authorizedPerson =
            form.authorizedPerson;

          payload.position =
            form.position;

          payload.businessRegistrationNumber =
            form.businessRegistrationNumber;

          payload.businessContactNumber =
            form.businessContactNumber;

          payload.businessEmail =
            form.businessEmail || undefined;

          payload.businessLogo =
            form.businessLogo || undefined;

          payload.website =
            form.website || undefined;

          payload.description =
            form.description || undefined;
        }
      }

      if (form.role === 'RECIPIENT') {
        payload.recipientType =
          form.recipientType;

        payload.peopleNeedingFood =
          Number(form.peopleNeedingFood);

        payload.foodRequirements =
          form.foodRequirements;

        payload.specialRequirements =
          form.specialRequirements ||
          undefined;

        if (!isOrganizationRecipient) {
          payload.fullName =
            form.fullName;

          payload.email =
            form.email;
        } else {
          payload.specifiedRecipientType =
            form.recipientType === 'OTHER'
              ? form.specifiedRecipientType
              : undefined;

          payload.organizationName =
            form.organizationName;

          payload.organizationRegistrationNumber =
            form.organizationRegistrationNumber;

          payload.authorizedPerson =
            form.authorizedPerson;

          payload.position =
            form.position;

          payload.email =
            form.email || undefined;

          payload.organizationLogo =
            form.organizationLogo ||
            undefined;

          payload.website =
            form.website || undefined;

          payload.description =
            form.description ||
            undefined;
        }
      }

      if (form.role === 'NGO') {
        payload.organizationName =
          form.organizationName;

        payload.ngoRegistrationNumber =
          form.ngoRegistrationNumber;

        payload.organizationType =
          form.organizationType;

        payload.specifiedOrganizationType =
          form.organizationType === 'OTHER'
            ? form.specifiedOrganizationType
            : undefined;

        payload.authorizedPerson =
          form.authorizedPerson;

        payload.position =
          form.position;

        payload.email =
          form.email;

        payload.organizationLogo =
          form.organizationLogo ||
          undefined;

        payload.website =
          form.website || undefined;

        payload.description =
          form.description ||
          undefined;
      }

      if (form.role === 'VOLUNTEER') {
        payload.fullName =
          form.fullName;

        payload.email =
          form.email;

        payload.vehicleType =
          form.vehicleType;

        payload.vehicleNumber =
          needsVehicleNumber
            ? form.vehicleNumber
            : undefined;

        payload.preferredDeliveryArea =
          form.preferredDeliveryArea;

        payload.preferredDeliveryTime =
          form.preferredDeliveryTime ||
          undefined;
      }

      /*
       * Connect your API here:
       *
       * const res = await registerUser(payload);
       *
       * if (res.success) {
       *   const email =
       *     (payload.email as string) ||
       *     form.email;
       *
       *   navigation.navigate(
       *     'VerifyAccount',
       *     { email },
       *   );
       * } else {
       *   Alert.alert(
       *     'Registration failed',
       *     res.message ?? 'Please try again.',
       *   );
       * }
       */

      console.log(
        'Registration payload:',
        payload,
      );

      Alert.alert(
        'Ready to Register',
        'Your registration form is valid.',
      );
    } catch (err: any) {
      Alert.alert(
        'Registration failed',
        err?.message ??
          'Something went wrong.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: theme.background,
      }}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: Spacing.three,
          paddingTop: Spacing.four,
          paddingBottom: Spacing.seven,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 620,
          }}
        >
          {/* HEADER */}

          <View
            style={{
              alignItems: 'center',
              marginBottom: Spacing.five,
            }}
          >
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 22,
                backgroundColor:
                  theme.primaryLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: Spacing.three,
              }}
            >
              <Ionicons
                name="restaurant"
                size={32}
                color={theme.primary}
              />
            </View>

            <Text
              style={{
                ...Typography.h1,
                color: theme.text,
                textAlign: 'center',
              }}
            >
              Create your account
            </Text>

            <Text
              style={{
                ...Typography.body,
                color: theme.textSecondary,
                textAlign: 'center',
                marginTop: Spacing.one,
                maxWidth: 420,
              }}
            >
              Join ResQMeal and help redirect
              surplus food to where it is
              needed most.
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: Spacing.three,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 3,
                  borderRadius: 3,
                  backgroundColor:
                    theme.primary,
                }}
              />

              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 8,
                  backgroundColor:
                    theme.secondary,
                  marginHorizontal: 8,
                }}
              />

              <View
                style={{
                  width: 32,
                  height: 3,
                  borderRadius: 3,
                  backgroundColor:
                    theme.primary,
                }}
              />
            </View>
          </View>

          {/* MAIN FORM */}

          <View
            style={{
              backgroundColor:
                theme.formBackground,
              borderRadius: Radius.xl,
              borderWidth: 1,
              borderColor:
                theme.border,
              padding: Spacing.four,
              ...Shadows.card,
            }}
          >
            {/* ROLE */}

            <SectionHeader
              icon="people-outline"
              title="Account Type"
              subtitle="Choose how you want to participate in ResQMeal."
            />

            <RoleGrid
              options={ROLES}
              selected={form.role}
              onSelect={(value) =>
                update(
                  'role',
                  value as Role,
                )
              }
            />

            {/* DONOR */}

            {form.role === 'DONOR' && (
              <DonorFields
                form={form}
                update={update}
                errors={errors}
                isBusiness={isBusinessDonor}
              />
            )}

            {/* RECIPIENT */}

            {form.role === 'RECIPIENT' && (
              <RecipientFields
                form={form}
                update={update}
                errors={errors}
                isOrganization={
                  isOrganizationRecipient
                }
                toggleFoodRequirement={
                  toggleFoodRequirement
                }
              />
            )}

            {/* NGO */}

            {form.role === 'NGO' && (
              <NgoFields
                form={form}
                update={update}
                errors={errors}
              />
            )}

            {/* VOLUNTEER */}

            {form.role === 'VOLUNTEER' && (
              <VolunteerFields
                form={form}
                update={update}
                errors={errors}
                needsVehicleNumber={
                  needsVehicleNumber
                }
              />
            )}

            {/* CONTACT */}

            <SectionHeader
              icon="shield-checkmark-outline"
              title="Contact & Security"
              subtitle="Keep your account secure and reachable."
            />

            <Field
              icon="call-outline"
              label="Phone Number"
              placeholder="+94 77 123 4567"
              value={form.phoneNumber}
              onChangeText={(value) =>
                update(
                  'phoneNumber',
                  value,
                )
              }
              error={errors.phoneNumber}
              keyboardType="phone-pad"
            />

            <Field
              icon="lock-closed-outline"
              label="Password"
              placeholder="Create a strong password"
              value={form.password}
              onChangeText={(value) =>
                update(
                  'password',
                  value,
                )
              }
              error={errors.password}
              secureTextEntry
            />

            <Field
              icon="lock-closed-outline"
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChangeText={(value) =>
                update(
                  'confirmPassword',
                  value,
                )
              }
              error={
                errors.confirmPassword
              }
              secureTextEntry
            />

            {/* LOCATION */}

            <SectionHeader
              icon="location-outline"
              title="Location"
              subtitle="Tell us where you are based."
            />

            <Field
              icon="location-outline"
              label="Address"
              placeholder="Enter your address"
              value={form.address}
              onChangeText={(value) =>
                update(
                  'address',
                  value,
                )
              }
              error={errors.address}
            />

            <View
              style={{
                flexDirection: 'row',
                gap: Spacing.two,
              }}
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <Field
                  icon="map-outline"
                  label="District"
                  placeholder="District"
                  value={form.district}
                  onChangeText={(value) =>
                    update(
                      'district',
                      value,
                    )
                  }
                  error={errors.district}
                />
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Field
                  icon="business-outline"
                  label="City"
                  placeholder="City"
                  value={form.city}
                  onChangeText={(value) =>
                    update(
                      'city',
                      value,
                    )
                  }
                  error={errors.city}
                />
              </View>
            </View>

            {/* REGISTER BUTTON */}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
              style={{
                minHeight: 54,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  theme.primary,
                borderRadius:
                  Radius.md,
                marginTop:
                  Spacing.two,
                opacity: submitting
                  ? 0.7
                  : 1,
                ...Shadows.button,
              }}
            >
              {submitting ? (
                <ActivityIndicator
                  color={
                    theme.textOnPrimary
                  }
                />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={21}
                    color={
                      theme.textOnPrimary
                    }
                    style={{
                      marginRight: 8,
                    }}
                  />

                  <Text
                    style={{
                      ...Typography.button,
                      color:
                        theme.textOnPrimary,
                    }}
                  >
                    Create Account
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* LOGIN */}

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: Spacing.four,
              }}
            >
              <Text
                style={{
                  ...Typography.bodySmall,
                  color:
                    theme.textSecondary,
                }}
              >
                Already have an account?
              </Text>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate(
                    'Login',
                  )
                }
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    ...Typography.label,
                    color:
                      theme.primary,
                    marginLeft: 5,
                  }}
                >
                  Log in
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FOOTER */}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: Spacing.three,
            }}
          >
            <Ionicons
              name="leaf-outline"
              size={15}
              color={
                theme.primary
              }
            />

            <Text
              style={{
                ...Typography.bodySmall,
                color:
                  theme.textSecondary,
                marginLeft: 5,
              }}
            >
              Together, we can reduce food waste.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ============================================================
   ROLE GRID
============================================================ */

function RoleGrid({
  options,
  selected,
  onSelect,
}: {
  options: {
    label: string;
    description: string;
    value: string;
    icon: IconName;
  }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.two,
        marginBottom: Spacing.two,
      }}
    >
      {options.map((option) => {
        const active =
          selected === option.value;

        return (
          <TouchableOpacity
            key={option.value}
            onPress={() =>
              onSelect(
                option.value,
              )
            }
            activeOpacity={0.82}
            style={{
              width: '48%',
              minHeight: 104,
              padding:
                Spacing.three,
              borderRadius:
                Radius.md,
              borderWidth:
                active ? 1.5 : 1,
              borderColor:
                active
                  ? theme.primary
                  : theme.border,
              backgroundColor:
                active
                  ? theme.primaryLight
                  : theme.backgroundElement,
            }}
          >
            <View
              style={{
                flexDirection:
                  'row',
                justifyContent:
                  'space-between',
                alignItems:
                  'flex-start',
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  backgroundColor:
                    active
                      ? theme.primary
                      : theme.surface,
                }}
              >
                <Ionicons
                  name={
                    option.icon
                  }
                  size={19}
                  color={
                    active
                      ? theme.textOnPrimary
                      : theme.primary
                  }
                />
              </View>

              {active && (
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 20,
                    backgroundColor:
                      theme.primary,
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                  }}
                >
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color={
                      theme.textOnPrimary
                    }
                  />
                </View>
              )}
            </View>

            <Text
              style={{
                ...Typography.label,
                color:
                  theme.text,
                marginTop:
                  Spacing.two,
              }}
            >
              {option.label}
            </Text>

            <Text
              style={{
                ...Typography.bodySmall,
                color:
                  theme.textSecondary,
                fontSize: 11,
                marginTop: 2,
              }}
            >
              {option.description}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ============================================================
   DONOR
============================================================ */

function DonorFields({
  form,
  update,
  errors,
  isBusiness,
}: any) {
  return (
    <>
      <SectionHeader
        icon="gift-outline"
        title="Donor Information"
        subtitle="Tell us about your food donation."
      />

      <SelectionRow
        title="Donor Type"
        options={DONOR_TYPES}
        selected={form.donorType}
        onSelect={(value) =>
          update(
            'donorType',
            value,
          )
        }
      />

      {!isBusiness ? (
        <>
          <Field
            icon="person-outline"
            label="Full Name"
            placeholder="Enter your full name"
            value={form.fullName}
            onChangeText={(value: string) =>
              update(
                'fullName',
                value,
              )
            }
            error={
              errors.fullName
            }
          />

          <Field
            icon="mail-outline"
            label="Email"
            placeholder="you@example.com"
            value={form.email}
            onChangeText={(value: string) =>
              update(
                'email',
                value,
              )
            }
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Field
            icon="image-outline"
            label="Profile Picture URL"
            placeholder="Optional"
            value={
              form.profilePicture
            }
            onChangeText={(value: string) =>
              update(
                'profilePicture',
                value,
              )
            }
            optional
          />
        </>
      ) : (
        <>
          {form.donorType ===
            'OTHER' && (
            <Field
              icon="create-outline"
              label="Specify Donor Type"
              placeholder="Enter donor type"
              value={
                form.specifiedDonorType
              }
              onChangeText={(
                value: string,
              ) =>
                update(
                  'specifiedDonorType',
                  value,
                )
              }
              error={
                errors.specifiedDonorType
              }
            />
          )}

          <Field
            icon="storefront-outline"
            label="Business Name"
            placeholder="Enter business name"
            value={
              form.businessName
            }
            onChangeText={(value: string) =>
              update(
                'businessName',
                value,
              )
            }
            error={
              errors.businessName
            }
          />

          <InlineHint
            text={`Business Type: ${
              form.donorType ===
              'OTHER'
                ? form.specifiedDonorType ||
                  'Not specified'
                : form.donorType
            }`}
          />

          <Field
            icon="person-outline"
            label="Authorized Person"
            placeholder="Full name"
            value={
              form.authorizedPerson
            }
            onChangeText={(value: string) =>
              update(
                'authorizedPerson',
                value,
              )
            }
            error={
              errors.authorizedPerson
            }
          />

          <Field
            icon="briefcase-outline"
            label="Position"
            placeholder="e.g. Manager"
            value={
              form.position
            }
            onChangeText={(value: string) =>
              update(
                'position',
                value,
              )
            }
            error={
              errors.position
            }
          />

          <Field
            icon="document-text-outline"
            label="Business Registration Number"
            placeholder="Registration number"
            value={
              form.businessRegistrationNumber
            }
            onChangeText={(
              value: string,
            ) =>
              update(
                'businessRegistrationNumber',
                value,
              )
            }
            error={
              errors.businessRegistrationNumber
            }
          />

          <Field
            icon="call-outline"
            label="Business Contact Number"
            placeholder="+94 77 123 4567"
            value={
              form.businessContactNumber
            }
            onChangeText={(
              value: string,
            ) =>
              update(
                'businessContactNumber',
                value,
              )
            }
            error={
              errors.businessContactNumber
            }
            keyboardType="phone-pad"
          />

          <Field
            icon="mail-outline"
            label="Business Email"
            placeholder="Optional"
            value={
              form.businessEmail
            }
            onChangeText={(value: string) =>
              update(
                'businessEmail',
                value,
              )
            }
            keyboardType="email-address"
            autoCapitalize="none"
            optional
          />

          <Field
            icon="image-outline"
            label="Business Logo URL"
            placeholder="Optional"
            value={
              form.businessLogo
            }
            onChangeText={(value: string) =>
              update(
                'businessLogo',
                value,
              )
            }
            optional
          />

          <Field
            icon="globe-outline"
            label="Website"
            placeholder="https://example.com"
            value={form.website}
            onChangeText={(value: string) =>
              update(
                'website',
                value,
              )
            }
            optional
          />

          <Field
            icon="document-outline"
            label="Description"
            placeholder="Tell us about your business..."
            value={
              form.description
            }
            onChangeText={(value: string) =>
              update(
                'description',
                value,
              )
            }
            multiline
            optional
          />
        </>
      )}
    </>
  );
}

/* ============================================================
   RECIPIENT
============================================================ */

function RecipientFields({
  form,
  update,
  errors,
  isOrganization,
  toggleFoodRequirement,
}: any) {
  return (
    <>
      <SectionHeader
        icon="hand-left-outline"
        title="Recipient Information"
        subtitle="Tell us about your food support needs."
      />

      <SelectionRow
        title="Recipient Type"
        options={RECIPIENT_TYPES}
        selected={form.recipientType}
        onSelect={(value) =>
          update(
            'recipientType',
            value,
          )
        }
      />

      {!isOrganization ? (
        <>
          <Field
            icon="person-outline"
            label="Full Name"
            placeholder="Enter your full name"
            value={form.fullName}
            onChangeText={(value: string) =>
              update(
                'fullName',
                value,
              )
            }
            error={
              errors.fullName
            }
          />

          <Field
            icon="mail-outline"
            label="Email"
            placeholder="you@example.com"
            value={form.email}
            onChangeText={(value: string) =>
              update(
                'email',
                value,
              )
            }
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Field
            icon="image-outline"
            label="Profile Picture URL"
            placeholder="Optional"
            value={
              form.profilePicture
            }
            onChangeText={(value: string) =>
              update(
                'profilePicture',
                value,
              )
            }
            optional
          />
        </>
      ) : (
        <>
          {form.recipientType ===
            'OTHER' && (
            <Field
              icon="create-outline"
              label="Specify Recipient Type"
              placeholder="Enter recipient type"
              value={
                form.specifiedRecipientType
              }
              onChangeText={(
                value: string,
              ) =>
                update(
                  'specifiedRecipientType',
                  value,
                )
              }
              error={
                errors.specifiedRecipientType
              }
            />
          )}

          <Field
            icon="business-outline"
            label="Organization Name"
            placeholder="Enter organization name"
            value={
              form.organizationName
            }
            onChangeText={(value: string) =>
              update(
                'organizationName',
                value,
              )
            }
            error={
              errors.organizationName
            }
          />

          <Field
            icon="document-text-outline"
            label="Organization Registration Number"
            placeholder="Registration number"
            value={
              form.organizationRegistrationNumber
            }
            onChangeText={(
              value: string,
            ) =>
              update(
                'organizationRegistrationNumber',
                value,
              )
            }
            error={
              errors.organizationRegistrationNumber
            }
          />

          <Field
            icon="person-outline"
            label="Authorized Person"
            placeholder="Full name"
            value={
              form.authorizedPerson
            }
            onChangeText={(value: string) =>
              update(
                'authorizedPerson',
                value,
              )
            }
            error={
              errors.authorizedPerson
            }
          />

          <Field
            icon="briefcase-outline"
            label="Position"
            placeholder="e.g. Coordinator"
            value={
              form.position
            }
            onChangeText={(value: string) =>
              update(
                'position',
                value,
              )
            }
            error={
              errors.position
            }
          />

          <Field
            icon="mail-outline"
            label="Email"
            placeholder="Optional"
            value={form.email}
            onChangeText={(value: string) =>
              update(
                'email',
                value,
              )
            }
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            optional
          />

          <Field
            icon="image-outline"
            label="Organization Logo URL"
            placeholder="Optional"
            value={
              form.organizationLogo
            }
            onChangeText={(value: string) =>
              update(
                'organizationLogo',
                value,
              )
            }
            optional
          />

          <Field
            icon="globe-outline"
            label="Website"
            placeholder="https://example.com"
            value={form.website}
            onChangeText={(value: string) =>
              update(
                'website',
                value,
              )
            }
            optional
          />

          <Field
            icon="document-outline"
            label="Description"
            placeholder="Tell us about your organization..."
            value={
              form.description
            }
            onChangeText={(value: string) =>
              update(
                'description',
                value,
              )
            }
            multiline
            optional
          />
        </>
      )}

      <Field
        icon="people-outline"
        label="Number of People Needing Food"
        placeholder="e.g. 5"
        value={
          form.peopleNeedingFood
        }
        onChangeText={(value: string) =>
          update(
            'peopleNeedingFood',
            value.replace(
              /[^0-9]/g,
              '',
            ),
          )
        }
        error={
          errors.peopleNeedingFood
        }
        keyboardType="number-pad"
      />

      <SelectionRow
        title="Food Requirements"
        options={FOOD_OPTIONS.map(
          (food) => ({
            label: food.label,
            value: food.label,
            icon: food.icon,
          }),
        )}
        selected={
          form.foodRequirements
        }
        onSelect={
          toggleFoodRequirement
        }
        multi
      />

      {errors.foodRequirements ? (
        <ErrorText
          text={
            errors.foodRequirements
          }
        />
      ) : null}

      <Field
        icon="alert-circle-outline"
        label="Special Requirements"
        placeholder="Allergies, dietary needs, or other information..."
        value={
          form.specialRequirements
        }
        onChangeText={(value: string) =>
          update(
            'specialRequirements',
            value,
          )
        }
        multiline
        optional
      />
    </>
  );
}

/* ============================================================
   NGO
============================================================ */

function NgoFields({
  form,
  update,
  errors,
}: any) {
  return (
    <>
      <SectionHeader
        icon="business-outline"
        title="Organization Information"
        subtitle="Provide your NGO details."
      />

      <Field
        icon="business-outline"
        label="Organization Name"
        placeholder="Enter organization name"
        value={
          form.organizationName
        }
        onChangeText={(value: string) =>
          update(
            'organizationName',
            value,
          )
        }
        error={
          errors.organizationName
        }
      />

      <Field
        icon="document-text-outline"
        label="NGO Registration Number"
        placeholder="Registration number"
        value={
          form.ngoRegistrationNumber
        }
        onChangeText={(value: string) =>
          update(
            'ngoRegistrationNumber',
            value,
          )
        }
        error={
          errors.ngoRegistrationNumber
        }
      />

      <SelectionRow
        title="Organization Type"
        options={NGO_TYPES}
        selected={
          form.organizationType
        }
        onSelect={(value) =>
          update(
            'organizationType',
            value,
          )
        }
      />

      {form.organizationType ===
        'OTHER' && (
        <Field
          icon="create-outline"
          label="Specify Organization Type"
          placeholder="Enter organization type"
          value={
            form.specifiedOrganizationType
          }
          onChangeText={(value: string) =>
            update(
              'specifiedOrganizationType',
              value,
            )
          }
          error={
            errors.specifiedOrganizationType
          }
        />
      )}

      <Field
        icon="person-outline"
        label="Authorized Person"
        placeholder="Full name"
        value={
          form.authorizedPerson
        }
        onChangeText={(value: string) =>
          update(
            'authorizedPerson',
            value,
          )
        }
        error={
          errors.authorizedPerson
        }
      />

      <Field
        icon="briefcase-outline"
        label="Position"
        placeholder="e.g. Director"
        value={form.position}
        onChangeText={(value: string) =>
          update(
            'position',
            value,
          )
        }
        error={errors.position}
      />

      <Field
        icon="mail-outline"
        label="Email"
        placeholder="organization@example.com"
        value={form.email}
        onChangeText={(value: string) =>
          update(
            'email',
            value,
          )
        }
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Field
        icon="image-outline"
        label="Organization Logo URL"
        placeholder="Optional"
        value={
          form.organizationLogo
        }
        onChangeText={(value: string) =>
          update(
            'organizationLogo',
            value,
          )
        }
        optional
      />

      <Field
        icon="globe-outline"
        label="Website"
        placeholder="https://example.com"
        value={form.website}
        onChangeText={(value: string) =>
          update(
            'website',
            value,
          )
        }
        optional
      />

      <Field
        icon="document-outline"
        label="Description"
        placeholder="Tell us about your organization..."
        value={form.description}
        onChangeText={(value: string) =>
          update(
            'description',
            value,
          )
        }
        multiline
        optional
      />
    </>
  );
}

/* ============================================================
   VOLUNTEER
============================================================ */

function VolunteerFields({
  form,
  update,
  errors,
  needsVehicleNumber,
}: any) {
  return (
    <>
      <SectionHeader
        icon="bicycle-outline"
        title="Volunteer Information"
        subtitle="Help move rescued food to people who need it."
      />

      <Field
        icon="person-outline"
        label="Full Name"
        placeholder="Enter your full name"
        value={form.fullName}
        onChangeText={(value: string) =>
          update(
            'fullName',
            value,
          )
        }
        error={errors.fullName}
      />

      <Field
        icon="mail-outline"
        label="Email"
        placeholder="you@example.com"
        value={form.email}
        onChangeText={(value: string) =>
          update(
            'email',
            value,
          )
        }
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Field
        icon="image-outline"
        label="Profile Picture URL"
        placeholder="Optional"
        value={
          form.profilePicture
        }
        onChangeText={(value: string) =>
          update(
            'profilePicture',
            value,
          )
        }
        optional
      />

      <SelectionRow
        title="Vehicle Type"
        options={VEHICLE_TYPES}
        selected={
          form.vehicleType
        }
        onSelect={(value) =>
          update(
            'vehicleType',
            value,
          )
        }
      />

      {needsVehicleNumber && (
        <Field
          icon="card-outline"
          label="Vehicle Number"
          placeholder="e.g. WP ABC-1234"
          value={
            form.vehicleNumber
          }
          onChangeText={(value: string) =>
            update(
              'vehicleNumber',
              value,
            )
          }
          error={
            errors.vehicleNumber
          }
        />
      )}

      <Field
        icon="navigate-outline"
        label="Preferred Delivery Area"
        placeholder="e.g. Colombo, Negombo"
        value={
          form.preferredDeliveryArea
        }
        onChangeText={(value: string) =>
          update(
            'preferredDeliveryArea',
            value,
          )
        }
        error={
          errors.preferredDeliveryArea
        }
      />

      <Field
        icon="time-outline"
        label="Preferred Delivery Time"
        placeholder="e.g. 9:00 AM - 12:00 PM"
        value={
          form.preferredDeliveryTime
        }
        onChangeText={(value: string) =>
          update(
            'preferredDeliveryTime',
            value,
          )
        }
        optional
      />
    </>
  );
}

/* ============================================================
   SECTION HEADER
============================================================ */

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        marginTop: Spacing.four,
        marginBottom:
          Spacing.three,
      }}
    >
      <View
        style={{
          flexDirection:
            'row',
          alignItems:
            'center',
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor:
              theme.primaryLight,
            alignItems:
              'center',
            justifyContent:
              'center',
            marginRight:
              Spacing.two,
          }}
        >
          <Ionicons
            name={icon}
            size={17}
            color={
              theme.primary
            }
          />
        </View>

        <View
          style={{
            flex: 1,
          }}
        >
          <Text
            style={{
              ...Typography.h3,
              color:
                theme.text,
            }}
          >
            {title}
          </Text>

          <Text
            style={{
              ...Typography.bodySmall,
              color:
                theme.textSecondary,
              marginTop: 1,
            }}
          >
            {subtitle}
          </Text>
        </View>
      </View>

      <View
        style={{
          height: 1,
          backgroundColor:
            theme.border,
          marginTop:
            Spacing.three,
        }}
      />
    </View>
  );
}

/* ============================================================
   SELECTION ROW
============================================================ */

function SelectionRow({
  title,
  options,
  selected,
  onSelect,
  multi = false,
}: {
  title: string;
  options: {
    label: string;
    value: string;
    icon: IconName;
  }[];
  selected: string | string[];
  onSelect: (value: string) => void;
  multi?: boolean;
}) {
  const theme = useTheme();

  const isSelected = (
    value: string,
  ) => {
    return multi
      ? (selected as string[]).includes(
          value,
        )
      : selected === value;
  };

  return (
    <View
      style={{
        marginBottom:
          Spacing.three,
      }}
    >
      <Text
        style={{
          ...Typography.label,
          color:
            theme.text,
          marginBottom:
            Spacing.two,
        }}
      >
        {title}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingRight:
            Spacing.two,
        }}
      >
        {options.map(
          (option) => {
            const active =
              isSelected(
                option.value,
              );

            return (
              <TouchableOpacity
                key={
                  option.value
                }
                onPress={() =>
                  onSelect(
                    option.value,
                  )
                }
                activeOpacity={
                  0.8
                }
                style={{
                  flexDirection:
                    'row',
                  alignItems:
                    'center',
                  paddingVertical:
                    9,
                  paddingHorizontal:
                    13,
                  borderRadius:
                    Radius.pill,
                  borderWidth:
                    1,
                  borderColor:
                    active
                      ? theme.primary
                      : theme.border,
                  backgroundColor:
                    active
                      ? theme.primary
                      : theme.backgroundElement,
                  marginRight:
                    Spacing.two,
                }}
              >
                <Ionicons
                  name={
                    option.icon
                  }
                  size={14}
                  color={
                    active
                      ? theme.textOnPrimary
                      : theme.textSecondary
                  }
                  style={{
                    marginRight: 6,
                  }}
                />

                <Text
                  style={{
                    ...Typography.button,
                    fontSize: 12,
                    color:
                      active
                        ? theme.textOnPrimary
                        : theme.text,
                  }}
                >
                  {option.label}
                </Text>

                {multi &&
                  active && (
                    <Ionicons
                      name="checkmark"
                      size={13}
                      color={
                        theme.textOnPrimary
                      }
                      style={{
                        marginLeft: 5,
                      }}
                    />
                  )}
              </TouchableOpacity>
            );
          },
        )}
      </ScrollView>
    </View>
  );
}

/* ============================================================
   INPUT FIELD
============================================================ */

function Field({
  label,
  error,
  editable,
  icon,
  optional,
  onFocus,
  onBlur,
  ...inputProps
}: {
  label: string;
  error?: string;
  editable?: boolean;
  icon?: IconName;
  optional?: boolean;
} & React.ComponentProps<
  typeof TextInput
>) {
  const theme = useTheme();

  const [focused, setFocused] =
    useState(false);

  const disabled =
    editable === false;

  const borderColor =
    error
      ? theme.error
      : focused
        ? theme.borderFocus
        : theme.border;

  return (
    <View
      style={{
        marginBottom:
          Spacing.three,
      }}
    >
      <View
        style={{
          flexDirection:
            'row',
          alignItems:
            'center',
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            ...Typography.label,
            color:
              theme.text,
          }}
        >
          {label}
        </Text>

        {optional && (
          <Text
            style={{
              ...Typography.bodySmall,
              color:
                theme.textSecondary,
              fontSize: 11,
              marginLeft: 5,
            }}
          >
            Optional
          </Text>
        )}
      </View>

      <View
        style={{
          flexDirection:
            'row',
          alignItems:
            inputProps.multiline
              ? 'flex-start'
              : 'center',
          minHeight:
            inputProps.multiline
              ? 110
              : 52,
          borderWidth:
            focused && !error
              ? 1.5
              : 1,
          borderColor,
          borderRadius:
            Radius.md,
          backgroundColor:
            disabled
              ? theme.backgroundElement
              : theme.surface,
          paddingHorizontal:
            Spacing.three,
          paddingVertical:
            inputProps.multiline
              ? Spacing.two
              : 0,
        }}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={
              error
                ? theme.error
                : focused
                  ? theme.primary
                  : theme.textSecondary
            }
            style={{
              marginRight:
                Spacing.two,
              marginTop:
                inputProps.multiline
                  ? 3
                  : 0,
            }}
          />
        )}

        <TextInput
          {...inputProps}
          editable={
            editable
          }
          placeholderTextColor={
            theme.inputPlaceholder
          }
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(
              event,
            );
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(
              event,
            );
          }}
          style={{
            ...Typography.input,
            flex: 1,
            color: disabled
              ? theme.textSecondary
              : theme.inputText,
            paddingVertical:
              inputProps.multiline
                ? Spacing.two
                : 0,
            minHeight:
              inputProps.multiline
                ? 85
                : undefined,
            textAlignVertical:
              inputProps.multiline
                ? 'top'
                : 'center',
          }}
        />
      </View>

      {error ? (
        <View
          style={{
            flexDirection:
              'row',
            alignItems:
              'center',
            marginTop: 5,
          }}
        >
          <Ionicons
            name="alert-circle"
            size={13}
            color={
              theme.error
            }
            style={{
              marginRight: 4,
            }}
          />

          <Text
            style={{
              ...Typography.bodySmall,
              color:
                theme.error,
              fontSize: 11,
              flex: 1,
            }}
          >
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/* ============================================================
   INLINE HINT
============================================================ */

function InlineHint({
  text,
}: {
  text: string;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection:
          'row',
        alignItems:
          'center',
        backgroundColor:
          theme.primaryLight,
        borderRadius:
          Radius.sm,
        paddingVertical:
          Spacing.two,
        paddingHorizontal:
          Spacing.three,
        marginBottom:
          Spacing.three,
      }}
    >
      <Ionicons
        name="information-circle-outline"
        size={16}
        color={
          theme.primary
        }
        style={{
          marginRight: 7,
        }}
      />

      <Text
        style={{
          ...Typography.bodySmall,
          color:
            theme.primaryDark,
          fontSize: 12,
          flex: 1,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

/* ============================================================
   ERROR
============================================================ */

function ErrorText({
  text,
}: {
  text: string;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection:
          'row',
        alignItems:
          'center',
        marginTop: -Spacing.one,
        marginBottom:
          Spacing.three,
      }}
    >
      <Ionicons
        name="alert-circle"
        size={13}
        color={
          theme.error
        }
        style={{
          marginRight: 4,
        }}
      />

      <Text
        style={{
          ...Typography.bodySmall,
          color:
            theme.error,
          fontSize: 11,
          flex: 1,
        }}
      >
        {text}
      </Text>
    </View>
  );
}