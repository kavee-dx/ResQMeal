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
  useWindowDimensions,
} from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Ionicons } from '@expo/vector-icons';

import {
  Radius,
  Spacing,
} from '@/constants/theme';
import api, { resendVerificationCode } from '../services/api';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';

// ------------------------------------------------------------------
// Admin-style color palette (matching AdminLoginScreen)
// ------------------------------------------------------------------
const C = {
  navy: "#023047",
  navyDeep: "#011C2E",
  teal: "#126782",
  amber: "#FFB703",
  orange: "#FB8500",
  white: "#FFFFFF",
  offWhite: "#F6F8FA",
  cardBorder: "#E4E9ED",
  textMuted: "#6B7B85",
  error: "#D64545",
  errorSoft: "#FBEAEA",
};

const DESKTOP_BREAKPOINT = 900;

// ------------------------------------------------------------------
// Decorative blobs (matching Admin login screen)
// ------------------------------------------------------------------
function Blobs() {
  return (
    <>
      <View
        style={{
          position: "absolute",
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: C.teal,
          opacity: 0.35,
          top: -60,
          right: -60,
        }}
      />

      <View
        style={{
          position: "absolute",
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: C.orange,
          opacity: 0.25,
          bottom: -40,
          left: -40,
        }}
      />

      <View
        style={{
          position: "absolute",
          width: 90,
          height: 90,
          borderRadius: 45,
          backgroundColor: C.amber,
          opacity: 0.2,
          bottom: 60,
          right: 30,
        }}
      />
    </>
  );
}

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
  { label: 'Individual', value: 'INDIVIDUAL', icon: 'person-outline' },
  { label: 'Hotel', value: 'HOTEL', icon: 'bed-outline' },
  { label: 'Restaurant', value: 'RESTAURANT', icon: 'restaurant-outline' },
  { label: 'Bakery', value: 'BAKERY', icon: 'fast-food-outline' },
  { label: 'Supermarket', value: 'SUPERMARKET', icon: 'cart-outline' },
  { label: 'Catering', value: 'CATERING', icon: 'restaurant-outline' },
  {
    label: 'Event Organizer',
    value: 'EVENT_ORGANIZER',
    icon: 'calendar-outline',
  },
  { label: 'Other', value: 'OTHER', icon: 'ellipsis-horizontal-outline' },
];

const RECIPIENT_TYPES: {
  label: string;
  value: RecipientType;
  icon: IconName;
}[] = [
  { label: 'Individual', value: 'INDIVIDUAL', icon: 'person-outline' },
  { label: 'Family', value: 'FAMILY', icon: 'people-outline' },
  { label: 'Charity', value: 'CHARITY', icon: 'heart-outline' },
  {
    label: 'Community Center',
    value: 'COMMUNITY_CENTER',
    icon: 'home-outline',
  },
  { label: 'School', value: 'SCHOOL', icon: 'school-outline' },
  {
    label: 'Disaster Relief',
    value: 'DISASTER_RELIEF_ORGANIZATION',
    icon: 'alert-circle-outline',
  },
  { label: 'Other', value: 'OTHER', icon: 'ellipsis-horizontal-outline' },
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
  { label: 'Charity', value: 'CHARITY', icon: 'heart-outline' },
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
  { label: 'Other', value: 'OTHER', icon: 'ellipsis-horizontal-outline' },
];

const VEHICLE_TYPES: {
  label: string;
  value: VehicleType;
  icon: IconName;
}[] = [
  { label: 'Walking', value: 'WALKING', icon: 'walk-outline' },
  { label: 'Bicycle', value: 'BICYCLE', icon: 'bicycle-outline' },
  { label: 'Motorbike', value: 'MOTORBIKE', icon: 'speedometer-outline' },
  {
    label: 'Three-Wheeler',
    value: 'THREE_WHEELER',
    icon: 'car-sport-outline',
  },
  { label: 'Car', value: 'CAR', icon: 'car-outline' },
  { label: 'Van', value: 'VAN', icon: 'bus-outline' },
  { label: 'Other', value: 'OTHER', icon: 'ellipsis-horizontal-outline' },
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
  { label: 'Rice', icon: 'restaurant-outline' },
  { label: 'Vegetables', icon: 'leaf-outline' },
  { label: 'Fruits', icon: 'nutrition-outline' },
  { label: 'Bread', icon: 'fast-food-outline' },
  { label: 'Milk', icon: 'cafe-outline' },
  { label: 'Dry Rations', icon: 'cube-outline' },
  { label: 'Meal Packets', icon: 'bag-handle-outline' },
  { label: 'Drinking Water', icon: 'water-outline' },
];

type FormState = {
  role: Role;

  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;

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
  website: string;
  description: string;

  recipientType: RecipientType;
  specifiedRecipientType: string;
  organizationName: string;
  organizationRegistrationNumber: string;
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
  website: '',
  description: '',

  recipientType: 'INDIVIDUAL',
  specifiedRecipientType: '',
  organizationName: '',
  organizationRegistrationNumber: '',
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

/**
 * ============================================================
 * REGISTER SCREEN
 * ============================================================
 *
 * Uses Admin login color palette and typography for consistency.
 * Features two-column layout on desktop with decorative elements.
 */
export default function RegisterScreen({ navigation }: Props) {
  const T = useAppTypography();
  const { width } = useWindowDimensions();

  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [form, setForm] = useState<FormState>(INITIAL_STATE);

  const [errors, setErrors] =
    useState<Record<string, string>>({});

  const [touched, setTouched] =
    useState<Record<string, boolean>>({});

  const [submitting, setSubmitting] = useState(false);

  const isBusinessDonor =
    form.role === 'DONOR' &&
    form.donorType !== 'INDIVIDUAL';

  const isOrganizationRecipient =
    form.role === 'RECIPIENT' &&
    form.recipientType !== 'INDIVIDUAL' &&
    form.recipientType !== 'FAMILY';

  const needsVehicleNumber =
    VEHICLE_TYPES_REQUIRING_NUMBER.includes(form.vehicleType);

  // ----------------------------------------------------------------
  // Form content renderer (shared between desktop and mobile)
  // ----------------------------------------------------------------
  function renderFormContent(
    T: ReturnType<typeof useAppTypography>,
    formState: FormState,
    updateFn: <K extends keyof FormState>(field: K, value: FormState[K]) => void,
    errorState: Record<string, string>,
    touchedState: Record<string, boolean>,
    submittingState: boolean,
    isBusiness: boolean,
    isOrg: boolean,
    needsVehicleNum: boolean,
    toggleFoodFn: (item: string) => void,
    handleFn: () => void,
    nav: Props['navigation']
  ) {
    return (
      <>
        <View
          style={{
            backgroundColor: C.white,
            borderRadius: Radius.xl,
            borderWidth: 1,
            borderColor: C.cardBorder,
            padding: Spacing.four,
            shadowColor: C.navy,
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 4,
          }}
        >
          <SectionHeader
            icon="people-outline"
            title="Account Type"
            subtitle="Choose how you want to participate in ResQMeal."
          />

          <RoleGrid
            options={ROLES}
            selected={formState.role}
            onSelect={(value) => updateFn('role', value as Role)}
          />

          {formState.role === 'DONOR' && (
            <DonorFields
              form={formState}
              update={updateFn}
              errors={errorState}
              isBusiness={isBusiness}
            />
          )}

          {formState.role === 'RECIPIENT' && (
            <RecipientFields
              form={formState}
              update={updateFn}
              errors={errorState}
              isOrganization={isOrg}
              toggleFoodRequirement={toggleFoodFn}
            />
          )}

          {formState.role === 'NGO' && (
            <NgoFields
              form={formState}
              update={updateFn}
              errors={errorState}
            />
          )}

          {formState.role === 'VOLUNTEER' && (
            <VolunteerFields
              form={formState}
              update={updateFn}
              errors={errorState}
              needsVehicleNumber={needsVehicleNum}
            />
          )}

          <SectionHeader
            icon="shield-checkmark-outline"
            title="Contact & Security"
            subtitle="Keep your account secure and reachable."
          />

          <Field
            icon="call-outline"
            label="Phone Number"
            placeholder="+94 77 123 4567"
            value={formState.phoneNumber}
            onChangeText={(value) => {
              const digits = value.replace(/\D/g, '').slice(0, 10);
              updateFn('phoneNumber', digits);
            }}
            error={errorState.phoneNumber}
            keyboardType="number-pad"
            maxLength={10}
          />

          <Field
            icon="lock-closed-outline"
            label="Password"
            placeholder="Create a strong password"
            value={formState.password}
            onChangeText={(value) => updateFn('password', value)}
            error={errorState.password}
            secureTextEntry
          />

          <Field
            icon="lock-closed-outline"
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={formState.confirmPassword}
            onChangeText={(value) => updateFn('confirmPassword', value)}
            error={errorState.confirmPassword}
            secureTextEntry
          />

          <SectionHeader
            icon="location-outline"
            title="Location"
            subtitle="Tell us where you are based."
          />

          <Field
            icon="location-outline"
            label="Address"
            placeholder="Enter your address"
            value={formState.address}
            onChangeText={(value) => updateFn('address', value)}
            error={errorState.address}
          />

          <View
            style={{
              flexDirection: 'row',
              gap: Spacing.two,
            }}
          >
            <View style={{ flex: 1 }}>
              <Field
                icon="map-outline"
                label="District"
                placeholder="District"
                value={formState.district}
                onChangeText={(value) => updateFn('district', value)}
                error={errorState.district}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Field
                icon="business-outline"
                label="City"
                placeholder="City"
                value={formState.city}
                onChangeText={(value) => updateFn('city', value)}
                error={errorState.city}
              />
            </View>
          </View>

          {/* REGISTER */}

          <TouchableOpacity
            onPress={() => {
              console.log('Create Account pressed');
              handleFn();
            }}
            disabled={submittingState}
            activeOpacity={0.88}
            style={{
              minHeight: 56,
              borderRadius: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.orange,
              opacity: submittingState ? 0.7 : 1,
              shadowColor: C.orange,
              shadowOffset: {
                width: 0,
                height: 6,
              },
              shadowOpacity: 0.28,
              shadowRadius: 12,
              elevation: 5,
              marginTop: Spacing.two,
            }}
          >
            {submittingState ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={C.white}
                  style={{
                    marginRight: 8,
                  }}
                />

                <Text
                  style={{
                    ...T.button,
                    color: C.white,
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
                ...T.bodySmall,
                color: C.textMuted,
              }}
            >
              Already have an account?
            </Text>

            <TouchableOpacity
              onPress={() => nav.navigate('Login')}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  ...T.label,
                  color: C.navy,
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
            color={C.teal}
          />

          <Text
            style={{
              ...T.bodySmall,
              color: C.textMuted,
              marginLeft: 5,
            }}
          >
            Together, we can reduce food waste.
          </Text>
        </View>
      </>
    );
  }

  const sriLankanPhonePrefixes = {
    mobile: ['070', '071', '072', '074', '075', '076', '077', '078', '079'],
    landline: [
      '011', '021', '023', '024', '025', '026', '027', '031', '032', '033', '034',
      '035', '036', '037', '038', '041', '045', '047', '052', '054', '055', '057',
      '058', '061', '062', '063', '064', '065', '066', '067', '068', '069',
    ],
  } as const;

  function isValidSriLankanPhone(value: string): boolean {
    const digits = value.replace(/\D/g, '');

    if (!/^\d{10}$/.test(digits)) {
      return false;
    }

    const prefix = digits.slice(0, 3);

    return (
      sriLankanPhonePrefixes.mobile.includes(prefix as (typeof sriLankanPhonePrefixes.mobile)[number]) ||
      sriLankanPhonePrefixes.landline.includes(prefix as (typeof sriLankanPhonePrefixes.landline)[number])
    );
  }

  const freeEmailDomains = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'protonmail.com',
  ];

  function isAllowedEmailAddress(value: string): boolean {
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return false;
    }

    const domain = value.split('@')[1]?.toLowerCase();
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
      return false;
    }

    if (freeEmailDomains.includes(domain)) {
      return true;
    }

    return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(
      domain,
    );
  }

  function hasStrongPassword(value: string): boolean {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
  }

  function hasLettersAndNumbers(value: string): boolean {
    return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9\s,./#-]+$/.test(value.trim());
  }

  function getValidationErrors(
    nextForm: FormState,
    touchedFields: Record<string, boolean> = {},
  ): Record<string, string> {
    const next: Record<string, string> = {};
    const isTouched = (field: string) =>
      Object.keys(touchedFields).length === 0 || !!touchedFields[field];

    const req = (
      value: string,
      field: string,
      message: string,
    ) => {
      if (isTouched(field) && (!value || value.trim().length < 2)) {
        next[field] = message;
      }
    };

    if (
      isTouched('phoneNumber') &&
      nextForm.phoneNumber.trim().length > 0 &&
      !isValidSriLankanPhone(nextForm.phoneNumber)
    ) {
      next.phoneNumber = 'Enter a valid 10-digit local phone number.';
    }

    if (
      isTouched('password') &&
      nextForm.password.length > 0 &&
      !hasStrongPassword(nextForm.password)
    ) {
      next.password = 'Password must be 8+ chars with lowercase, uppercase and a number.';
    }

    if (
      isTouched('confirmPassword') &&
      nextForm.confirmPassword.length > 0 &&
      nextForm.password !== nextForm.confirmPassword
    ) {
      next.confirmPassword = 'Passwords do not match.';
    }

    if (isTouched('address') && nextForm.address.trim().length > 0 && !hasLettersAndNumbers(nextForm.address)) {
      next.address = 'Address must contain both letters and numbers.';
    }
    req(nextForm.address, 'address', 'Address is required.');
    req(nextForm.district, 'district', 'District is required.');
    req(nextForm.city, 'city', 'City is required.');

    if (nextForm.role === 'DONOR') {
      if (nextForm.donorType === 'INDIVIDUAL') {
        req(nextForm.fullName, 'fullName', 'Full name is required.');

        if (
          isTouched('email') &&
          nextForm.email &&
          !isAllowedEmailAddress(nextForm.email)
        ) {
          next.email = 'Use a valid business email or free webmail address.';
        }
      } else {
        if (nextForm.donorType === 'OTHER') {
          req(
            nextForm.specifiedDonorType,
            'specifiedDonorType',
            'Please specify your donor type.',
          );
        }

        req(
          nextForm.businessName,
          'businessName',
          'Business name is required.',
        );
        req(
          nextForm.authorizedPerson,
          'authorizedPerson',
          'Authorized person is required.',
        );
        req(
          nextForm.position,
          'position',
          'Position is required.',
        );
        req(
          nextForm.businessRegistrationNumber,
          'businessRegistrationNumber',
          'Business registration number is required.',
        );

        if (
          isTouched('businessContactNumber') &&
          nextForm.businessContactNumber.trim() &&
          !isValidSriLankanPhone(nextForm.businessContactNumber)
        ) {
          next.businessContactNumber =
            'Enter a valid 10-digit local business number.';
        }
        req(
          nextForm.businessEmail,
          'businessEmail',
          'Business or personal email is required.',
        );

        if (
          isTouched('businessEmail') &&
          nextForm.businessEmail &&
          !isAllowedEmailAddress(nextForm.businessEmail)
        ) {
          next.businessEmail = 'Enter a valid business or personal email address.';
        }
        if (nextForm.businessEmail && !isAllowedEmailAddress(nextForm.businessEmail)) {
          next.businessEmail = 'Enter a valid business or personal email address.';
        }
      }
    }

    if (nextForm.role === 'RECIPIENT') {
      if (!isOrganizationRecipient) {
        req(nextForm.fullName, 'fullName', 'Full name is required.');

        if (
          isTouched('email') &&
          nextForm.email &&
          !isAllowedEmailAddress(nextForm.email)
        ) {
          next.email = 'Use a valid business email or free webmail address.';
        }
      } else {
        if (nextForm.recipientType === 'OTHER') {
          req(
            nextForm.specifiedRecipientType,
            'specifiedRecipientType',
            'Please specify your recipient type.',
          );
        }

        req(
          nextForm.organizationName,
          'organizationName',
          'Organization name is required.',
        );
        req(
          nextForm.organizationRegistrationNumber,
          'organizationRegistrationNumber',
          'Organization registration number is required.',
        );
        req(
          nextForm.authorizedPerson,
          'authorizedPerson',
          'Authorized person is required.',
        );
        req(
          nextForm.position,
          'position',
          'Position is required.',
        );

        req(
          nextForm.email,
          'email',
          'Business or personal email is required.',
        );

        if (nextForm.email && !isAllowedEmailAddress(nextForm.email)) {
          next.email = 'Use a valid business email or free webmail address.';
        }
      }

      const people = Number(nextForm.peopleNeedingFood);
      if (
        isTouched('peopleNeedingFood') &&
        (!Number.isInteger(people) || people < 1)
      ) {
        next.peopleNeedingFood = 'Enter the number of people needing food.';
      }

      if (
        isTouched('foodRequirements') &&
        nextForm.foodRequirements.length === 0
      ) {
        next.foodRequirements = 'Select at least one food requirement.';
      }
    }

    if (nextForm.role === 'NGO') {
      req(
        nextForm.organizationName,
        'organizationName',
        'Organization name is required.',
      );
      req(
        nextForm.ngoRegistrationNumber,
        'ngoRegistrationNumber',
        'NGO registration number is required.',
      );

      if (nextForm.organizationType === 'OTHER') {
        req(
          nextForm.specifiedOrganizationType,
          'specifiedOrganizationType',
          'Please specify your organization type.',
        );
      }

      req(
        nextForm.authorizedPerson,
        'authorizedPerson',
        'Authorized person is required.',
      );
      req(
        nextForm.position,
        'position',
        'Position is required.',
      );

      req(
        nextForm.email,
        'email',
        'Business or personal email is required.',
      );

      if (nextForm.email && !isAllowedEmailAddress(nextForm.email)) {
        next.email = 'Use a valid business email or free webmail address.';
      }
    }

    if (nextForm.role === 'VOLUNTEER') {
      req(nextForm.fullName, 'fullName', 'Full name is required.');

      if (
        isTouched('email') &&
        nextForm.email &&
        !isAllowedEmailAddress(nextForm.email)
      ) {
        next.email = 'Use a valid business email or free webmail address.';
      }

      if (
        isTouched('vehicleNumber') &&
        needsVehicleNumber &&
        !nextForm.vehicleNumber.trim()
      ) {
        next.vehicleNumber =
          'Vehicle number is required for this vehicle type.';
      }

      req(
        nextForm.preferredDeliveryArea,
        'preferredDeliveryArea',
        'Preferred delivery area is required.',
      );
    }

    return next;
  }

  function update<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((prev) => {
      const nextForm = {
        ...prev,
        [field]: value,
      } as FormState;

      const nextTouched = {
        ...touched,
        [field as string]: true,
      };

      setTouched(nextTouched);
      setErrors(getValidationErrors(nextForm, nextTouched));

      return nextForm;
    });
  }

  function toggleFoodRequirement(item: string) {
    setForm((prev) => {
      const has = prev.foodRequirements.includes(item);

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

  function validate(): boolean {
    const allTouched = Object.keys(form).reduce(
      (acc, key) => ({
        ...acc,
        [key]: true,
      }),
      {} as Record<string, boolean>,
    );

    const next = getValidationErrors(form, allTouched);
    setTouched(allTouched);
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    console.log('handleSubmit invoked', { submitting, form });
    if (!validate()) {
      const firstErrors = Object.values(
        getValidationErrors(form, Object.keys(form).reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<string, boolean>)),
      );
      Alert.alert(
        'Fix form errors',
        firstErrors.length > 0
          ? firstErrors.slice(0, 4).join('\n')
          : 'Please review the form and fill all required fields.',
      );
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        role: form.role,
        phoneNumber: form.phoneNumber,
        password: form.password,
        confirmPassword: form.confirmPassword,
        address: form.address,
        district: form.district,
        city: form.city,
      };

      if (form.role === 'DONOR') {
        payload.donorType = form.donorType;

        if (form.donorType === 'INDIVIDUAL') {
          payload.fullName = form.fullName;
          payload.email = form.email;
        } else {
          payload.specifiedDonorType =
            form.donorType === 'OTHER'
              ? form.specifiedDonorType
              : undefined;

          payload.businessName = form.businessName;
          payload.authorizedPerson =
            form.authorizedPerson;
          payload.position = form.position;
          payload.businessRegistrationNumber =
            form.businessRegistrationNumber;
          payload.businessContactNumber =
            form.businessContactNumber;
          payload.businessEmail =
            form.businessEmail || undefined;
          payload.email = form.businessEmail || undefined;
          payload.website =
            form.website || undefined;
          payload.description =
            form.description || undefined;
        }
      }

      if (form.role === 'RECIPIENT') {
        payload.recipientType = form.recipientType;

        payload.peopleNeedingFood =
          Number(form.peopleNeedingFood);

        payload.foodRequirements =
          form.foodRequirements;

        payload.specialRequirements =
          form.specialRequirements || undefined;

        if (!isOrganizationRecipient) {
          payload.fullName = form.fullName;
          payload.email = form.email;
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

          payload.position = form.position;

          payload.email =
            form.email || undefined;

          payload.website =
            form.website || undefined;

          payload.description =
            form.description || undefined;
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

        payload.position = form.position;

        payload.email = form.email;

        payload.website =
          form.website || undefined;

        payload.description =
          form.description || undefined;
      }

      if (form.role === 'VOLUNTEER') {
        payload.fullName = form.fullName;
        payload.email = form.email;
        payload.vehicleType = form.vehicleType;

        payload.vehicleNumber =
          needsVehicleNumber
            ? form.vehicleNumber
            : undefined;

        payload.preferredDeliveryArea =
          form.preferredDeliveryArea;

        payload.preferredDeliveryTime =
          form.preferredDeliveryTime || undefined;
      }

      console.log(
        'Registration payload:',
        payload,
      );

      const response = await api.post(
        '/auth/register',
        payload,
      );

      console.log('Registration response:', response);
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);

      // Check for successful registration - handle different response structures
      const isSuccess = response?.data?.success || response?.data?.status === 'success' || response?.status === 200 || response?.status === 201;

      console.log('Is success:', isSuccess);

      if (isSuccess) {
        const verificationEmail =
          (payload as any).email || form.email || form.businessEmail;

        // Individual accounts have fullName directly; business/organization
        // accounts don't, so fall back to the org/business name for the
        // greeting shown on the "pending approval" screen after verification.
        const displayName =
          form.fullName ||
          form.businessName ||
          form.organizationName ||
          form.authorizedPerson ||
          undefined;

        console.log('Navigating to VerifyAccount with:', { email: verificationEmail, fullName: displayName });
        console.log('Navigation object:', navigation);

        // Backend already sends the verification code on successful registration,
        // so do not call resend here to avoid duplicate OTP emails.
        try {
          // Use replace instead of navigate to replace the current screen
          navigation?.replace?.('VerifyAccount', {
            email: verificationEmail,
            fullName: displayName,
          });
          console.log('Navigation successful');
        } catch (navError) {
          console.error('Navigation error:', navError);
          // Fallback to navigate if replace doesn't work
          try {
            navigation?.navigate?.('VerifyAccount', {
              email: verificationEmail,
              fullName: displayName,
            });
            console.log('Navigation with navigate successful');
          } catch (navError2) {
            console.error('Navigate error:', navError2);
            Alert.alert('Navigation Error', 'Could not navigate to verification screen. Please try again.');
          }
        }
      } else {
        Alert.alert('Registration', response.data?.message ?? 'Registration completed.');
      }
    } catch (err: any) {
        console.error('Registration error', err?.response?.status, err?.response?.data || err?.message);

        const status = err?.response?.status;
        const body = err?.response?.data;
        const message = body?.message ?? err?.message ?? 'Something went wrong.';
        // Map backend conflict errors to inline form errors when possible
        if (status === 409) {
          const lower = String(message).toLowerCase();
          if (lower.includes('email')) {
            setErrors((prev) => ({
              ...prev,
              email: 'Email is already registered.',
              businessEmail: 'Email is already registered.',
            }));
            Alert.alert('Registration failed', 'Email is already registered.');
            return;
          }

          if (lower.includes('phone')) {
            setErrors((prev) => ({
              ...prev,
              phoneNumber: 'Phone number is already registered.',
              businessContactNumber: 'Phone number is already registered.',
            }));
            Alert.alert('Registration failed', 'Phone number is already registered.');
            return;
          }
        }

        Alert.alert(
          `Registration failed${status ? ` (${status})` : ''}`,
          message + (body?.details ? `\n${body.details}` : ''),
        );
    } finally {
      setSubmitting(false);
    }
  }

  // =================================================================
  // DESKTOP LAYOUT
  // =================================================================
  if (isDesktop) {
    return (
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          backgroundColor: C.white,
        }}
      >
        {/* ----------------------------------------------------------
            LEFT BRANDING PANEL
        ---------------------------------------------------------- */}
        <View
          style={{
            flex: 1,
            backgroundColor: C.navy,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 60,
          }}
        >
          <Blobs />

          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 26,
              backgroundColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
            }}
          >
            <Ionicons
              name="restaurant"
              size={40}
              color={C.amber}
            />
          </View>

          <Text
            style={{
              ...T.h1,
              color: C.white,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            Join ResQMeal
          </Text>

          <Text
            style={{
              ...T.body,
              color: 'rgba(255,255,255,0.75)',
              textAlign: 'center',
              maxWidth: 380,
            }}
          >
            Create your account and help redirect surplus food to where it is needed most. Join our community of donors, recipients, NGOs, and volunteers.
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 32,
            }}
          >
            <View
              style={{
                width: 32,
                height: 3,
                borderRadius: 3,
                backgroundColor: C.white,
                opacity: 0.5,
              }}
            />

            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 8,
                backgroundColor: C.amber,
                marginHorizontal: 8,
              }}
            />

            <View
              style={{
                width: 32,
                height: 3,
                borderRadius: 3,
                backgroundColor: C.white,
                opacity: 0.5,
              }}
            />
          </View>
        </View>

        {/* ----------------------------------------------------------
            RIGHT FORM PANEL
        ---------------------------------------------------------- */}
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 48,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 480,
              paddingHorizontal: 20,
            }}
          >
            <Text
              style={{
                ...T.h2,
                color: C.navy,
                marginBottom: 6,
              }}
            >
              Create your account
            </Text>

            <Text
              style={{
                ...T.body,
                color: C.textMuted,
                marginBottom: 32,
              }}
            >
              Choose your role and provide your details to get started.
            </Text>

            {renderFormContent(T, form, update, errors, touched, submitting, isBusinessDonor, isOrganizationRecipient, needsVehicleNumber, toggleFoodRequirement, handleSubmit, navigation)}
          </View>
        </ScrollView>
      </View>
    );
  }

  // =================================================================
  // MOBILE LAYOUT
  // =================================================================
  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: C.white,
      }}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
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
                backgroundColor: C.offWhite,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: Spacing.three,
              }}
            >
              <Ionicons
                name="restaurant"
                size={32}
                color={C.navy}
              />
            </View>

            <Text
              style={{
                ...T.h1,
                color: C.navy,
                textAlign: 'center',
              }}
            >
              Create your account
            </Text>

            <Text
              style={{
                ...T.body,
                color: C.textMuted,
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
                  backgroundColor: C.navy,
                }}
              />

              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 8,
                  backgroundColor: C.amber,
                  marginHorizontal: 8,
                }}
              />

              <View
                style={{
                  width: 32,
                  height: 3,
                  borderRadius: 3,
                  backgroundColor: C.navy,
                }}
              />
            </View>
          </View>

          {/* MAIN FORM */}
          {renderFormContent(T, form, update, errors, touched, submitting, isBusinessDonor, isOrganizationRecipient, needsVehicleNumber, toggleFoodRequirement, handleSubmit, navigation)}
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
  const T = useAppTypography();

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
              onSelect(option.value)
            }
            activeOpacity={0.82}
            style={{
              width: '48%',
              minHeight: 104,
              padding: Spacing.three,
              borderRadius: 14,
              borderWidth: active ? 1.5 : 1,
              borderColor: active
                ? C.teal
                : C.cardBorder,

              backgroundColor: active
                ? C.offWhite
                : C.offWhite,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active
                    ? C.teal
                    : C.white,
                }}
              >
                <Ionicons
                  name={option.icon}
                  size={19}
                  color={active
                    ? C.white
                    : C.navy}
                />
              </View>

              {active && (
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 20,
                    backgroundColor: C.teal,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color={C.white}
                  />
                </View>
              )}
            </View>

            <Text
              style={{
                ...T.label,
                color: C.navy,
                marginTop: Spacing.two,
              }}
            >
              {option.label}
            </Text>

            <Text
              style={{
                ...T.bodySmall,
                color: C.textMuted,
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
          update('donorType', value)
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
              update('fullName', value)
            }
            error={errors.fullName}
          />

          <Field
            icon="mail-outline"
            label="Email"
            placeholder="you@example.com"
            value={form.email}
            onChangeText={(value: string) =>
              update('email', value)
            }
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />


        </>
      ) : (
        <>
          {form.donorType === 'OTHER' && (
            <Field
              icon="create-outline"
              label="Specify Donor Type"
              placeholder="Enter donor type"
              value={form.specifiedDonorType}
              onChangeText={(value: string) =>
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
            value={form.businessName}
            onChangeText={(value: string) =>
              update('businessName', value)
            }
            error={errors.businessName}
          />

          <InlineHint
            text={`Business Type: ${
              form.donorType === 'OTHER'
                ? form.specifiedDonorType ||
                  'Not specified'
                : form.donorType
            }`}
          />

          <Field
            icon="person-outline"
            label="Authorized Person"
            placeholder="Full name"
            value={form.authorizedPerson}
            onChangeText={(value: string) =>
              update(
                'authorizedPerson',
                value,
              )
            }
            error={errors.authorizedPerson}
          />

          <Field
            icon="briefcase-outline"
            label="Position"
            placeholder="e.g. Manager"
            value={form.position}
            onChangeText={(value: string) =>
              update('position', value)
            }
            error={errors.position}
          />

          <Field
            icon="document-text-outline"
            label="Business Registration Number"
            placeholder="Registration number"
            value={
              form.businessRegistrationNumber
            }
            onChangeText={(value: string) =>
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
            placeholder="077 123 4567"
            value={form.businessContactNumber}
            onChangeText={(value: string) => {
              const digits = value.replace(/\D/g, '').slice(0, 10);
              update('businessContactNumber', digits);
            }}
            error={errors.businessContactNumber}
            keyboardType="number-pad"
            maxLength={10}
          />

          <Field
            icon="mail-outline"
            label="Business or personal email"
            placeholder="you@business.com"
            value={form.businessEmail}
            onChangeText={(value: string) =>
              update('businessEmail', value)
            }
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            error={errors.businessEmail}
          />

          <Field
            icon="globe-outline"
            label="Website"
            placeholder="https://example.com"
            value={form.website}
            onChangeText={(value: string) =>
              update('website', value)
            }
            optional
          />

          <Field
            icon="document-outline"
            label="Description"
            placeholder="Tell us about your business..."
            value={form.description}
            onChangeText={(value: string) =>
              update('description', value)
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
          update('recipientType', value)
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
              update('fullName', value)
            }
            error={errors.fullName}
          />

          <Field
            icon="mail-outline"
            label="Email"
            placeholder="you@example.com"
            value={form.email}
            onChangeText={(value: string) =>
              update('email', value)
            }
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />


        </>
      ) : (
        <>
          {form.recipientType === 'OTHER' && (
            <Field
              icon="create-outline"
              label="Specify Recipient Type"
              placeholder="Enter recipient type"
              value={form.specifiedRecipientType}
              onChangeText={(value: string) =>
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
            value={form.organizationName}
            onChangeText={(value: string) =>
              update('organizationName', value)
            }
            error={errors.organizationName}
          />

          <Field
            icon="document-text-outline"
            label="Organization Registration Number"
            placeholder="Registration number"
            value={
              form.organizationRegistrationNumber
            }
            onChangeText={(value: string) =>
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
            value={form.authorizedPerson}
            onChangeText={(value: string) =>
              update(
                'authorizedPerson',
                value,
              )
            }
            error={errors.authorizedPerson}
          />

          <Field
            icon="briefcase-outline"
            label="Position"
            placeholder="e.g. Coordinator"
            value={form.position}
            onChangeText={(value: string) =>
              update('position', value)
            }
            error={errors.position}
          />

          <Field
            icon="mail-outline"
            label="Email"
            placeholder="Optional"
            value={form.email}
            onChangeText={(value: string) =>
              update('email', value)
            }
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            optional
          />

          <Field
            icon="globe-outline"
            label="Website"
            placeholder="https://example.com"
            value={form.website}
            onChangeText={(value: string) =>
              update('website', value)
            }
            optional
          />

          <Field
            icon="document-outline"
            label="Description"
            placeholder="Tell us about your organization..."
            value={form.description}
            onChangeText={(value: string) =>
              update('description', value)
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
        value={form.peopleNeedingFood}
        onChangeText={(value: string) =>
          update(
            'peopleNeedingFood',
            value.replace(/[^0-9]/g, ''),
          )
        }
        error={errors.peopleNeedingFood}
        keyboardType="number-pad"
      />

      <SelectionRow
        title="Food Requirements"
        options={FOOD_OPTIONS.map((food) => ({
          label: food.label,
          value: food.label,
          icon: food.icon,
        }))}
        selected={form.foodRequirements}
        onSelect={toggleFoodRequirement}
        multi
      />

      {errors.foodRequirements ? (
        <ErrorText text={errors.foodRequirements} />
      ) : null}

      <Field
        icon="alert-circle-outline"
        label="Special Requirements"
        placeholder="Allergies, dietary needs, or other information..."
        value={form.specialRequirements}
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
        value={form.organizationName}
        onChangeText={(value: string) =>
          update('organizationName', value)
        }
        error={errors.organizationName}
      />

      <Field
        icon="document-text-outline"
        label="NGO Registration Number"
        placeholder="Registration number"
        value={form.ngoRegistrationNumber}
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
        selected={form.organizationType}
        onSelect={(value) =>
          update(
            'organizationType',
            value,
          )
        }
      />

      {form.organizationType === 'OTHER' && (
        <Field
          icon="create-outline"
          label="Specify Organization Type"
          placeholder="Enter organization type"
          value={form.specifiedOrganizationType}
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
        value={form.authorizedPerson}
        onChangeText={(value: string) =>
          update(
            'authorizedPerson',
            value,
          )
        }
        error={errors.authorizedPerson}
      />

      <Field
        icon="briefcase-outline"
        label="Position"
        placeholder="e.g. Director"
        value={form.position}
        onChangeText={(value: string) =>
          update('position', value)
        }
        error={errors.position}
      />

      <Field
        icon="mail-outline"
        label="Email"
        placeholder="organization@example.com"
        value={form.email}
        onChangeText={(value: string) =>
          update('email', value)
        }
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Field
        icon="globe-outline"
        label="Website"
        placeholder="https://example.com"
        value={form.website}
        onChangeText={(value: string) =>
          update('website', value)
        }
        optional
      />

      <Field
        icon="document-outline"
        label="Description"
        placeholder="Tell us about your organization..."
        value={form.description}
        onChangeText={(value: string) =>
          update('description', value)
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
          update('fullName', value)
        }
        error={errors.fullName}
      />

      <Field
        icon="mail-outline"
        label="Email"
        placeholder="you@example.com"
        value={form.email}
        onChangeText={(value: string) =>
          update('email', value)
        }
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <SelectionRow
        title="Vehicle Type"
        options={VEHICLE_TYPES}
        selected={form.vehicleType}
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
          value={form.vehicleNumber}
          onChangeText={(value: string) =>
            update(
              'vehicleNumber',
              value,
            )
          }
          error={errors.vehicleNumber}
        />
      )}

      <Field
        icon="navigate-outline"
        label="Preferred Delivery Area"
        placeholder="e.g. Colombo, Negombo"
        value={form.preferredDeliveryArea}
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
        value={form.preferredDeliveryTime}
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
  const T = useAppTypography();

  return (
    <View
      style={{
        marginTop: Spacing.four,
        marginBottom: Spacing.three,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: C.offWhite,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: Spacing.two,
          }}
        >
          <Ionicons
            name={icon}
            size={17}
            color={C.navy}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              ...T.h3,
              color: C.navy,
            }}
          >
            {title}
          </Text>

          <Text
            style={{
              ...T.bodySmall,
              color: C.textMuted,
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
          backgroundColor: C.cardBorder,
          marginTop: Spacing.three,
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
  const T = useAppTypography();

  const isSelected = (value: string) => {
    return multi
      ? (selected as string[]).includes(value)
      : selected === value;
  };

  return (
    <View
      style={{
        marginBottom: Spacing.three,
      }}
    >
      <Text
        style={{
          ...T.label,
          color: C.navy,
          marginBottom: Spacing.two,
        }}
      >
        {title}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingRight: Spacing.two,
        }}
      >
        {options.map((option) => {
          const active =
            isSelected(option.value);

          return (
            <TouchableOpacity
              key={option.value}
              onPress={() =>
                onSelect(option.value)
              }
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 9,
                paddingHorizontal: 13,
                borderRadius: 999,
                borderWidth: 1,

                borderColor: active
                  ? C.teal
                  : C.cardBorder,

                backgroundColor: active
                  ? C.teal
                  : C.offWhite,

                marginRight: Spacing.two,
              }}
            >
              <Ionicons
                name={option.icon}
                size={14}
                color={active
                  ? C.white
                  : C.textMuted}
                style={{
                  marginRight: 6,
                }}
              />

              <Text
                style={{
                  ...T.button,
                  fontSize: 12,
                  color: active
                    ? C.white
                    : C.navy,
                }}
              >
                {option.label}
              </Text>

              {multi && active && (
                <Ionicons
                  name="checkmark"
                  size={13}
                  color={C.white}
                  style={{
                    marginLeft: 5,
                  }}
                />
              )}
            </TouchableOpacity>
          );
        })}
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
} & React.ComponentProps<typeof TextInput>) {
  const T = useAppTypography();

  const [focused, setFocused] =
    useState(false);
  const [showPassword, setShowPassword] =
    useState(false);

  const disabled =
    editable === false;
  const isSecureField =
    inputProps.secureTextEntry === true;
  const borderColor = error
    ? C.error
    : focused
      ? C.teal
      : C.cardBorder;

  return (
    <View
      style={{
        marginBottom: Spacing.three,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            ...T.label,
            color: C.navy,
          }}
        >
          {label}
        </Text>

        {optional && (
          <Text
            style={{
              ...T.bodySmall,
              color: C.textMuted,
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
          flexDirection: 'row',
          alignItems:
            inputProps.multiline
              ? 'flex-start'
              : 'center',

          minHeight:
            inputProps.multiline
              ? 110
              : 54,

          borderWidth:
            focused && !error
              ? 1.5
              : 1,

          borderColor,

          borderRadius: 14,

          backgroundColor: disabled
            ? C.offWhite
            : C.offWhite,

          paddingHorizontal: 16,

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
                ? C.error
                : focused
                  ? C.teal
                  : C.textMuted
            }
            style={{
              marginRight: 10,
              marginTop:
                inputProps.multiline
                  ? 3
                  : 0,
            }}
          />
        )}

        <TextInput
          {...inputProps}
          editable={editable}
          placeholderTextColor={C.textMuted}
          secureTextEntry={
            isSecureField && !showPassword
          }
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={{
            ...T.input,
            flex: 1,

            color: disabled
              ? C.textMuted
              : C.navy,

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

            shadowColor: 'transparent',
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
            backgroundColor: 'transparent',
          }}
          selectionColor={C.teal}
        />

        {isSecureField && (
          <TouchableOpacity
            onPress={() =>
              setShowPassword((prev) => !prev)
            }
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              showPassword
                ? 'Hide password'
                : 'Show password'
            }
            style={{
              marginLeft: 10,
            }}
          >
            <Ionicons
              name={
                showPassword
                  ? 'eye-off-outline'
                  : 'eye-outline'
              }
              size={18}
              color={
                error
                  ? C.error
                  : focused
                    ? C.teal
                    : C.textMuted
              }
            />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 5,
          }}
        >
          <Ionicons
            name="alert-circle"
            size={13}
            color={C.error}
            style={{
              marginRight: 4,
            }}
          />

          <Text
            style={{
              ...T.bodySmall,
              color: C.error,
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
  const T = useAppTypography();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.offWhite,
        borderRadius: 10,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
        marginBottom: Spacing.three,
      }}
    >
      <Ionicons
        name="information-circle-outline"
        size={16}
        color={C.navy}
        style={{
          marginRight: 7,
        }}
      />

      <Text
        style={{
          ...T.bodySmall,
          color: C.navy,
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
  const T = useAppTypography();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -Spacing.one,
        marginBottom: Spacing.three,
      }}
    >
      <Ionicons
        name="alert-circle"
        size={13}
        color={C.error}
        style={{
          marginRight: 4,
        }}
      />

      <Text
        style={{
          ...T.bodySmall,
          color: C.error,
          fontSize: 11,
          flex: 1,
        }}
      >
        {text}
      </Text>
    </View>
  );
}