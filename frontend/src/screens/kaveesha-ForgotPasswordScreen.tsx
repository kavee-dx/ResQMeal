import React, { useState } from 'react';
import { requestPasswordReset } from '../services/api';

import {
  ActivityIndicator,
  Image,
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

import { useAppTypography } from '../hooks/kaveesha-useAppTypography';
import type { RootStackParamList } from '../navigation/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

type StatusBanner = {
  type: 'success' | 'error';
  message: string;
} | null;

// ------------------------------------------------------------------
// Same brand palette as LoginScreen — keeps every auth screen
// visually consistent (navy / teal / amber / orange).
// ------------------------------------------------------------------
const C = {
  navy: "#023047",
  navyDeep: "#011C2E",
  teal: "#126782",
  amber: "#FFB703",
  orange: "#FB8500",
  green: "#6B8E23",
  white: "#FFFFFF",
  offWhite: "#F6F8FA",
  cardBorder: "#E4E9ED",
  textMuted: "#6B7B85",
  success: "#2E8B57",
  successSoft: "#E9F6EF",
  error: "#D64545",
  errorSoft: "#FBEAEA",
};

const DESKTOP_BREAKPOINT = 900;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const T = useAppTypography();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [banner, setBanner] = useState<StatusBanner>(null);
  const [submitting, setSubmitting] = useState(false);

  function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function validate(): boolean {
    const next: { email?: string } = {};

    if (!email.trim()) {
      next.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      next.email = 'Enter a valid email address.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    setBanner(null);
    setErrors({});

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const data = await requestPasswordReset(normalizedEmail);

      if (data.success) {
        setBanner({
          type: 'success',
          message: data.message ?? 'Reset code sent! Check your inbox.',
        });

        setTimeout(() => {
          navigation.navigate('VerifyResetOtp', { email: normalizedEmail });
        }, 900);
      } else {
        setBanner({
          type: 'error',
          message: data.message ?? 'Something went wrong. Please try again.',
        });
      }
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: 'Unable to connect to the server. Please check your connection.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  // =================================================================
  // DESKTOP LAYOUT
  // =================================================================
  if (isDesktop) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.white }}>
        <BrandPanel />

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
          <View style={{ width: '100%', maxWidth: 420, paddingHorizontal: 20 }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={8}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 22 }}
            >
              <Ionicons name="arrow-back" size={18} color={C.textMuted} />
              <Text style={{ ...T.label, color: C.textMuted, marginLeft: 6 }}>
                Back to login
              </Text>
            </TouchableOpacity>

            <Text style={{ ...T.h2, color: C.navy, marginBottom: 6 }}>
              Reset your password
            </Text>

            <Text style={{ ...T.body, color: C.textMuted, marginBottom: 28 }}>
              Enter the email linked to your account and we&apos;ll send you a
              code to reset your password.
            </Text>

            <FormFields
              T={T}
              email={email}
              errors={errors}
              banner={banner}
              submitting={submitting}
              setEmail={setEmail}
              setBanner={setBanner}
              handleSubmit={handleSubmit}
            />
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
      style={{ flex: 1, backgroundColor: C.white }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      >
        {/* ------------------------------------------------------
            HERO HEADER
        ------------------------------------------------------ */}
        <View
          style={{
            backgroundColor: C.navy,
            paddingTop: 64,
            paddingBottom: 56,
            paddingHorizontal: 24,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            overflow: 'hidden',
            alignItems: 'center',
          }}
        >
          <Blobs />

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={10}
            activeOpacity={0.7}
            style={{
              position: 'absolute',
              top: 40,
              left: 20,
              zIndex: 10,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.14)',
            }}
          >
            <Ionicons name="arrow-back" size={16} color={C.white} />
            <Text style={{ ...T.bodySmall, color: C.white, marginLeft: 5 }}>
              Back
            </Text>
          </TouchableOpacity>

          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
            }}
          >
            <Ionicons name="key-outline" size={32} color={C.amber} />
          </View>

          <Text style={{ ...T.h1, color: C.white, textAlign: 'center' }}>
            Reset your password
          </Text>

          <Text
            style={{
              ...T.body,
              color: 'rgba(255,255,255,0.75)',
              textAlign: 'center',
              marginTop: 6,
              maxWidth: 300,
            }}
          >
            Enter the email linked to your account and we&apos;ll send you a
            code to reset your password.
          </Text>
        </View>

        {/* ------------------------------------------------------
            FORM CARD
        ------------------------------------------------------ */}
        <View
          style={{
            marginTop: -32,
            marginHorizontal: 20,
            backgroundColor: C.white,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: C.cardBorder,
            padding: 24,
            shadowColor: C.navy,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 20,
            elevation: 6,
          }}
        >
          <FormFields
            T={T}
            email={email}
            errors={errors}
            banner={banner}
            submitting={submitting}
            setEmail={setEmail}
            setBanner={setBanner}
            handleSubmit={handleSubmit}
          />
        </View>

        {/* ------------------------------------------------------
            FOOTER
        ------------------------------------------------------ */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 24,
          }}
        >
          <Ionicons name="shield-checkmark-outline" size={15} color={C.teal} />

          <Text style={{ ...T.bodySmall, color: C.textMuted, marginLeft: 5 }}>
            Your account stays safe with us.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ------------------------------------------------------------------
// Brand Panel (desktop left column) — identical to LoginScreen's,
// so both auth screens feel like one continuous experience.
// ------------------------------------------------------------------
function BrandPanel() {
  const T = useAppTypography();

  return (
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

      <Image
        source={require('../../assets/images/ResQMeal_icon.png')}
        style={{ width: 200, height: 200, marginBottom: 8 }}
        resizeMode="contain"
      />

      <Text
        style={{
          ...T.h1,
          color: C.white,
          textAlign: 'center',
          marginBottom: 12,
        }}
      >
        ResQMeal
      </Text>

      <Text
        style={{
          ...T.body,
          color: 'rgba(255,255,255,0.75)',
          textAlign: 'center',
          maxWidth: 380,
        }}
      >
        Connecting donors, volunteers, NGOs and communities to rescue
        surplus food and fight hunger — together.
      </Text>
    </View>
  );
}

// ------------------------------------------------------------------
// Decorative blobs — shared visual language with the login & splash
// screens.
// ------------------------------------------------------------------
function Blobs() {
  return (
    <>
      <View
        style={{
          position: 'absolute',
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
          position: 'absolute',
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
          position: 'absolute',
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

// ------------------------------------------------------------------
// Status Message (success / error banner) — same as LoginScreen.
// ------------------------------------------------------------------
function StatusMessage({
  type,
  message,
  T,
}: {
  type: 'success' | 'error';
  message: string;
  T: ReturnType<typeof useAppTypography>;
}) {
  const isSuccess = type === 'success';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: isSuccess ? C.successSoft : C.errorSoft,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isSuccess ? C.success : C.error,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 18,
      }}
    >
      <Ionicons
        name={isSuccess ? 'checkmark-circle' : 'alert-circle'}
        size={18}
        color={isSuccess ? C.success : C.error}
        style={{ marginRight: 8, marginTop: 1 }}
      />

      <Text
        style={{
          ...T.bodySmall,
          color: isSuccess ? C.success : C.error,
          flex: 1,
        }}
      >
        {message}
      </Text>
    </View>
  );
}

// ------------------------------------------------------------------
// Form Fields — email + submit button + back-to-login link.
// Shared between the desktop panel and the mobile card.
// ------------------------------------------------------------------
type FormFieldsProps = {
  T: ReturnType<typeof useAppTypography>;
  email: string;
  errors: { email?: string };
  banner: StatusBanner;
  submitting: boolean;
  setEmail: (value: string) => void;
  setBanner: (value: StatusBanner) => void;
  handleSubmit: () => void;
};

function FormFields({
  T,
  email,
  errors,
  banner,
  submitting,
  setEmail,
  setBanner,
  handleSubmit,
}: FormFieldsProps) {
  return (
    <>
      {banner && (
        <StatusMessage type={banner.type} message={banner.message} T={T} />
      )}

      <Field
        icon="mail-outline"
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setBanner(null);
        }}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        T={T}
      />

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.88}
        style={{
          minHeight: 56,
          borderRadius: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.orange,
          opacity: submitting ? 0.7 : 1,
          marginTop: 4,
          shadowColor: C.orange,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.28,
          shadowRadius: 12,
          elevation: 5,
        }}
      >
        {submitting ? (
          <ActivityIndicator color={C.white} />
        ) : (
          <>
            <Ionicons
              name="paper-plane-outline"
              size={19}
              color={C.white}
              style={{ marginRight: 8 }}
            />

            <Text style={{ ...T.button, color: C.white }}>
              Send Reset Link
            </Text>
          </>
        )}
      </TouchableOpacity>
    </>
  );
}

// ------------------------------------------------------------------
// Field — a single labeled input with an icon and inline error.
// Same component as LoginScreen's, for identical look and feel.
// ------------------------------------------------------------------
function Field({
  label,
  error,
  icon,
  T,
  ...inputProps
}: {
  label: string;
  error?: string;
  icon?: IconName;
  T: ReturnType<typeof useAppTypography>;
} & React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);

  const borderColor = error ? C.error : focused ? C.teal : C.cardBorder;

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ ...T.label, color: C.navy, marginBottom: 6 }}>
        {label}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 54,
          borderWidth: 1.5,
          borderColor,
          borderRadius: 14,
          backgroundColor: C.offWhite,
          paddingHorizontal: 16,
        }}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={error ? C.error : focused ? C.teal : C.textMuted}
            style={{ marginRight: 10 }}
          />
        )}

        <TextInput
          {...inputProps}
          placeholderTextColor={C.textMuted}
          onFocus={(event) => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
          style={{
            ...T.input,
            flex: 1,
            color: C.navy,
          }}
          selectionColor={C.teal}
        />
      </View>

      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
          <Ionicons name="alert-circle" size={13} color={C.error} style={{ marginRight: 4 }} />
          <Text style={{ ...T.bodySmall, color: C.error, fontSize: 11, flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}