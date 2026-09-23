import React, { useState } from 'react';
import { saveSession } from '../utils/kaveesha-authStorage';
import type { RootStackParamList, Role } from "../navigation/types";
import { getHomeRouteForRole } from "../navigation/types";

function isValidRole(value: unknown): value is Role {
  return (
    value === "DONOR" ||
    value === "RECIPIENT" ||
    value === "NGO" ||
    value === "VOLUNTEER"
  );
}

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

import api from '../services/api';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = NativeStackScreenProps<
  RootStackParamList,
  "Login"
>;

type StatusBanner = {
  type: 'success' | 'error';
  message: string;
} | null;

// ------------------------------------------------------------------
// Scoped brand palette for this screen — matches the splash & admin
// login screens (navy / teal / amber / orange).
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

export default function LoginScreen({ navigation }: Props) {
  const T = useAppTypography();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const [banner, setBanner] = useState<StatusBanner>(null);
  const [submitting, setSubmitting] = useState(false);

  function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function validate(): boolean {
    const next: { email?: string; password?: string } = {};

    if (!email.trim()) {
      next.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      next.email = 'Enter a valid email address.';
    }

    if (!password) {
      next.password = 'Password is required.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleLogin() {
    setBanner(null);
    setErrors({});

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const data = response.data ?? {};

      const token = data.token;

      const rawRole =
        data.role ??
        data.user?.role;

      const fullName: string =
        data.user?.fullName ?? "";

      if (!token) {
        throw new Error(
          "Login succeeded but the server did not return an authentication token.",
        );
      }

      if (!isValidRole(rawRole)) {
        throw new Error(
          "Login succeeded but the server returned an invalid user role.",
        );
      }

      await saveSession(token, rawRole, fullName);

      setBanner({
        type: "success",
        message:
          data.message ??
          "Login successful! Welcome back to ResQMeal.",
      });

      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: getHomeRouteForRole(rawRole),
              params: { fullName },
            },
          ],
        });
      }, 1000);
    } catch (err: any) {
      const status = err?.response?.status;

      const serverMessage =
        err?.response?.data?.message;

      let message =
        "Something went wrong. Please try again.";

      if (!err?.response) {
        message =
          "Unable to connect to the server. Please check your internet connection.";
      } else if (status === 401) {
        message =
          "Incorrect email or password. Please try again.";
      } else if (status === 403) {
        message =
          serverMessage ??
          "Your account has not been verified yet. Please verify your account first.";
      } else if (status === 429) {
        message =
          "Too many login attempts. Please wait a few minutes and try again.";
      } else if (status >= 500) {
        message =
          "The server is temporarily unavailable. Please try again later.";
      } else if (serverMessage) {
        message = serverMessage;
      } else if (err?.message) {
        message = err.message;
      }

      setBanner({
        type: "error",
        message,
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
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 48,
          }}
        >
          <View style={{ width: '100%', maxWidth: 420, paddingHorizontal: 20 }}>
            <Text style={{ ...T.h2, color: C.navy, marginBottom: 6 }}>
              Welcome back
            </Text>

            <Text style={{ ...T.body, color: C.textMuted, marginBottom: 28 }}>
              Log in to continue rescuing food with ResQMeal.
            </Text>

            <FormFields
              T={T}
              email={email}
              password={password}
              showPassword={showPassword}
              errors={errors}
              banner={banner}
              submitting={submitting}
              setEmail={setEmail}
              setPassword={setPassword}
              setShowPassword={setShowPassword}
              setBanner={setBanner}
              handleLogin={handleLogin}
              navigation={navigation}
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
        keyboardDismissMode={
          Platform.OS === 'ios' ? 'interactive' : 'on-drag'
        }
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

          <Image
            source={require('../../assets/images/ResQMeal_icon.png')}
            style={{ width: 180, height: 180, marginBottom: 5 }}
            resizeMode="contain"
          />

          <Text style={{ ...T.h1, color: C.white, textAlign: 'center' }}>
            Welcome back
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
            Log in to continue rescuing food with ResQMeal.
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
            password={password}
            showPassword={showPassword}
            errors={errors}
            banner={banner}
            submitting={submitting}
            setEmail={setEmail}
            setPassword={setPassword}
            setShowPassword={setShowPassword}
            setBanner={setBanner}
            handleLogin={handleLogin}
            navigation={navigation}
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
          <Ionicons name="leaf-outline" size={15} color={C.teal} />

          <Text style={{ ...T.bodySmall, color: C.textMuted, marginLeft: 5 }}>
            Together, we can reduce food waste.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ------------------------------------------------------------------
// Brand Panel (desktop left column)
// IMPORTANT: outside LoginScreen so it isn't recreated on rerender.
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
// Decorative blobs — shared visual language with the splash & admin
// login screens.
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
// Status Message (success / error banner)
// IMPORTANT: outside LoginScreen.
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
// Form Fields — email, password, links and the submit button.
// IMPORTANT: outside LoginScreen so TextInput never loses focus.
// Shared between the desktop panel and the mobile card.
// ------------------------------------------------------------------
type FormFieldsProps = {
  T: ReturnType<typeof useAppTypography>;
  email: string;
  password: string;
  showPassword: boolean;
  errors: { email?: string; password?: string };
  banner: StatusBanner;
  submitting: boolean;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  setBanner: (value: StatusBanner) => void;
  handleLogin: () => void;
  navigation: Props['navigation'];
};

function FormFields({
  T,
  email,
  password,
  showPassword,
  errors,
  banner,
  submitting,
  setEmail,
  setPassword,
  setShowPassword,
  setBanner,
  handleLogin,
  navigation,
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

      <Field
        icon="lock-closed-outline"
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setBanner(null);
        }}
        error={errors.password}
        secureTextEntry={!showPassword}
        showPassword={showPassword}
        onToggleSecure={() => setShowPassword((prev) => !prev)}
        T={T}
      />

      <TouchableOpacity
        onPress={() => navigation.navigate('ForgotPassword')}
        activeOpacity={0.7}
        style={{ alignSelf: 'flex-end', marginBottom: 22, marginTop: -6 }}
      >
        <Text style={{ ...T.label, color: C.teal }}>
          Forgot password?
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleLogin}
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
              name="log-in-outline"
              size={20}
              color={C.white}
              style={{ marginRight: 8 }}
            />

            <Text style={{ ...T.button, color: C.white }}>Log In</Text>
          </>
        )}
      </TouchableOpacity>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 22,
        }}
      >
        <Text style={{ ...T.bodySmall, color: C.textMuted }}>
          Don&apos;t have an account?
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.7}
        >
          <Text style={{ ...T.label, color: C.teal, marginLeft: 5 }}>
            Register here
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: C.cardBorder,
          marginTop: 20,
          paddingTop: 16,
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('AdminLogin')}
          activeOpacity={0.7}
        >
          <Text
            style={{
              ...T.bodySmall,
              color: C.textMuted,
              textDecorationLine: 'underline',
            }}
          >
            Admin Login
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// ------------------------------------------------------------------
// Field — a single labeled input with an icon and inline error.
// IMPORTANT: outside LoginScreen.
// ------------------------------------------------------------------
function Field({
  label,
  error,
  icon,
  showPassword,
  onToggleSecure,
  T,
  ...inputProps
}: {
  label: string;
  error?: string;
  icon?: IconName;
  showPassword?: boolean;
  onToggleSecure?: () => void;
  T: ReturnType<typeof useAppTypography>;
} & React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);

  const isSecureField = inputProps.secureTextEntry !== undefined;

  const borderColor = error
    ? C.error
    : focused
      ? C.teal
      : C.cardBorder;

  return (
    <View style={{ marginBottom: 18 }}>
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
          secureTextEntry={isSecureField ? !showPassword : undefined}
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

        {isSecureField && (
          <TouchableOpacity
            onPress={onToggleSecure}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? 'Hide password' : 'Show password'
            }
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={error ? C.error : focused ? C.teal : C.textMuted}
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
            style={{ marginRight: 4 }}
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