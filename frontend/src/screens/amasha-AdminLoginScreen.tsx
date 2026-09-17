import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { BackHandler } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import api from "../services/api";
import { saveAdminSession } from "../utils/amasha-admin-authStorage";
import { useAppTypography } from "../hooks/kaveesha-useAppTypography";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "AdminLogin">;

// ------------------------------------------------------------------
// Scoped palette for this screen only
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
// Error Banner
// IMPORTANT: This is outside AdminLoginScreen.
// ------------------------------------------------------------------
type ErrorBannerProps = {
  error: string | null;
  T: ReturnType<typeof useAppTypography>;
};

function ErrorBanner({ error, T }: ErrorBannerProps) {
  if (!error) {
    return null;
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: C.errorSoft,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.error,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 18,
      }}
    >
      <Ionicons
        name="alert-circle"
        size={18}
        color={C.error}
        style={{ marginRight: 8, marginTop: 1 }}
      />

      <Text
        style={{
          ...T.bodySmall,
          color: C.error,
          flex: 1,
        }}
      >
        {error}
      </Text>
    </View>
  );
}

// ------------------------------------------------------------------
// Restricted Notice
// IMPORTANT: This is outside AdminLoginScreen.
// ------------------------------------------------------------------
type RestrictedNoticeProps = {
  light?: boolean;
  T: ReturnType<typeof useAppTypography>;
};

function RestrictedNotice({
  light = false,
  T,
}: RestrictedNoticeProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 24,
      }}
    >
      <Ionicons
        name="shield-checkmark-outline"
        size={14}
        color={C.amber}
      />

      <Text
        style={{
          ...T.bodySmall,
          color: light ? "rgba(255,255,255,0.75)" : C.textMuted,
          marginLeft: 5,
        }}
      >
        Restricted access — authorized staff only.
      </Text>
    </View>
  );
}

// ------------------------------------------------------------------
// Back To Login
// IMPORTANT: This is outside AdminLoginScreen.
// ------------------------------------------------------------------
type BackToLoginProps = {
  navigation: Props["navigation"];
  isDesktop: boolean;
  T: ReturnType<typeof useAppTypography>;
  light?: boolean;
};

function BackToLogin({
  navigation,
  isDesktop,
  T,
  light = false,
}: BackToLoginProps) {
  return (
    <TouchableOpacity
      onPress={() =>
        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      }
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        marginBottom: isDesktop ? 28 : 20,
      }}
    >
      <Ionicons
        name="arrow-back"
        size={18}
        color={light ? "rgba(255,255,255,0.85)" : C.textMuted}
      />

      <Text
        style={{
          ...T.bodySmall,
          color: light ? "rgba(255,255,255,0.85)" : C.textMuted,
          marginLeft: 6,
        }}
      >
         {/* loginBack to user */}
      </Text>
    </TouchableOpacity>
  );
}

// ------------------------------------------------------------------
// Form Fields
//
// IMPORTANT FIX:
// This component is now OUTSIDE AdminLoginScreen.
//
// Therefore typing in TextInput does not create a new component
// instance on every keystroke, so the TextInput keeps its focus.
// ------------------------------------------------------------------
type FormFieldsProps = {
  T: ReturnType<typeof useAppTypography>;
  email: string;
  password: string;
  showPassword: boolean;
  emailFocused: boolean;
  passwordFocused: boolean;
  submitting: boolean;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setEmailFocused: (value: boolean) => void;
  setPasswordFocused: (value: boolean) => void;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  handleAdminLogin: () => void;
};

function FormFields({
  T,
  email,
  password,
  showPassword,
  emailFocused,
  passwordFocused,
  submitting,
  setEmail,
  setPassword,
  setEmailFocused,
  setPasswordFocused,
  setShowPassword,
  handleAdminLogin,
}: FormFieldsProps) {
  return (
    <>
      {/* ----------------------------------------------------------
          Email
      ---------------------------------------------------------- */}
      <Text
        style={{
          ...T.label,
          color: C.navy,
          marginBottom: 6,
        }}
      >
        Admin email
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: 54,
          borderWidth: 1.5,
          borderColor: emailFocused ? C.teal : C.cardBorder,
          borderRadius: 14,
          backgroundColor: C.offWhite,
          paddingHorizontal: 16,
          marginBottom: 18,
        }}
      >
        <Ionicons
          name="mail-outline"
          size={18}
          color={emailFocused ? C.teal : C.textMuted}
          style={{ marginRight: 10 }}
        />

        <TextInput
          value={email}
          onChangeText={setEmail}
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
          placeholder="admin@resqmeal.com"
          placeholderTextColor={C.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          style={{
            ...T.input,
            flex: 1,
            color: C.navy,
          }}
          selectionColor={C.teal}
        />
      </View>

      {/* ----------------------------------------------------------
          Password
      ---------------------------------------------------------- */}
      <Text
        style={{
          ...T.label,
          color: C.navy,
          marginBottom: 6,
        }}
      >
        Password
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: 54,
          borderWidth: 1.5,
          borderColor: passwordFocused ? C.teal : C.cardBorder,
          borderRadius: 14,
          backgroundColor: C.offWhite,
          paddingHorizontal: 16,
          marginBottom: 26,
        }}
      >
        <Ionicons
          name="lock-closed-outline"
          size={18}
          color={passwordFocused ? C.teal : C.textMuted}
          style={{ marginRight: 10 }}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          onFocus={() => setPasswordFocused(true)}
          onBlur={() => setPasswordFocused(false)}
          placeholder="Enter your password"
          placeholderTextColor={C.textMuted}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={handleAdminLogin}
          style={{
            ...T.input,
            flex: 1,
            color: C.navy,
          }}
          selectionColor={C.teal}
        />

        <TouchableOpacity
          onPress={() => setShowPassword((prev) => !prev)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            showPassword ? "Hide password" : "Show password"
          }
        >
          <Ionicons
            name={
              showPassword
                ? "eye-off-outline"
                : "eye-outline"
            }
            size={18}
            color={C.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* ----------------------------------------------------------
          Login Button
      ---------------------------------------------------------- */}
      <TouchableOpacity
        onPress={handleAdminLogin}
        disabled={submitting}
        activeOpacity={0.88}
        style={{
          minHeight: 56,
          borderRadius: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: C.orange,
          opacity: submitting ? 0.7 : 1,
          shadowColor: C.orange,
          shadowOffset: {
            width: 0,
            height: 6,
          },
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

            <Text
              style={{
                ...T.button,
                color: C.white,
              }}
            >
              Log In
            </Text>
          </>
        )}
      </TouchableOpacity>
    </>
  );
}

// ------------------------------------------------------------------
// Decorative blobs
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

// ==================================================================
// MAIN SCREEN
// ==================================================================
export default function AdminLoginScreen({
  navigation,
}: Props) {
  const T = useAppTypography();

  const { width } = useWindowDimensions();

  const isDesktop =
    width >= DESKTOP_BREAKPOINT;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [emailFocused, setEmailFocused] =
    useState(false);

  const [passwordFocused, setPasswordFocused] =
    useState(false);

  // ----------------------------------------------------------------
  // Android hardware back button
  // ----------------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }],
        });

        return true;
      };

      const subscription =
        BackHandler.addEventListener(
          "hardwareBackPress",
          onBackPress
        );

      return () => subscription.remove();
    }, [navigation])
  );

  // ----------------------------------------------------------------
  // Admin Login
  // ----------------------------------------------------------------
  const handleAdminLogin = useCallback(
    async () => {
      setError(null);

      if (!email.trim() || !password) {
        setError(
          "Email and password are required."
        );
        return;
      }

      setSubmitting(true);

      try {
        const response = await api.post(
          "/admin/login",
          {
            email: email
              .trim()
              .toLowerCase(),
            password,
          }
        );

        const data = response.data ?? {};

        const token = data.token;

        const fullName =
          data.admin?.fullName ?? "Admin";

        if (!token) {
          throw new Error(
            "Login succeeded but no token was returned."
          );
        }

        await saveAdminSession(
          token,
          fullName
        );

        navigation.reset({
          index: 0,
          routes: [
            {
              name: "AdminDashboard",
            },
          ],
        });
      } catch (err: any) {
        const status =
          err?.response?.status;

        const serverMessage =
          err?.response?.data?.message;

        if (!err?.response) {
          setError(
            "Unable to connect to the server. Please check your internet connection."
          );
        } else if (status === 401) {
          setError(
            "Incorrect email or password."
          );
        } else if (serverMessage) {
          setError(serverMessage);
        } else {
          setError(
            "Something went wrong. Please try again."
          );
        }
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, navigation]
  );

  // =================================================================
  // DESKTOP LAYOUT
  // =================================================================
  if (isDesktop) {
    return (
      <View
        style={{
          flex: 1,
          flexDirection: "row",
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
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 60,
          }}
        >
          <Blobs />

          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 26,
              backgroundColor:
                "rgba(255,255,255,0.1)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 28,
            }}
          >
            <Ionicons
              name="shield-checkmark"
              size={40}
              color={C.amber}
            />
          </View>

          <Text
            style={{
              ...T.h1,
              color: C.white,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            ResQMeal Admin
          </Text>

          <Text
            style={{
              ...T.body,
              color:
                "rgba(255,255,255,0.75)",
              textAlign: "center",
              maxWidth: 380,
            }}
          >
            Review pending registrations,
            monitor community activity, and
            keep ResQMeal running smoothly
            all from one dashboard.
          </Text>
        </View>

        {/* ----------------------------------------------------------
            RIGHT FORM PANEL
        ---------------------------------------------------------- */}
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios"
              ? "interactive"
              : "on-drag"
          }
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 48,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 400,
              paddingHorizontal: 20,
            }}
          >
            <BackToLogin
              navigation={navigation}
              isDesktop={isDesktop}
              T={T}
            />

            <Text
              style={{
                ...T.h2,
                color: C.navy,
                marginBottom: 6,
              }}
            >
              Sign in
            </Text>

            <Text
              style={{
                ...T.body,
                color: C.textMuted,
                marginBottom: 32,
              }}
            >
              Enter your admin credentials to
              continue.
            </Text>

            <ErrorBanner
              error={error}
              T={T}
            />

            <FormFields
              T={T}
              email={email}
              password={password}
              showPassword={showPassword}
              emailFocused={emailFocused}
              passwordFocused={passwordFocused}
              submitting={submitting}
              setEmail={setEmail}
              setPassword={setPassword}
              setEmailFocused={setEmailFocused}
              setPasswordFocused={
                setPasswordFocused
              }
              setShowPassword={
                setShowPassword
              }
              handleAdminLogin={
                handleAdminLogin
              }
            />

            <RestrictedNotice T={T} />
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
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
      keyboardVerticalOffset={
        Platform.OS === "ios" ? 0 : 20
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={
          Platform.OS === "ios"
            ? "interactive"
            : "on-drag"
        }
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 20,
        }}
      >
        {/* ----------------------------------------------------------
            HERO HEADER
        ---------------------------------------------------------- */}
        <View
          style={{
            backgroundColor: C.navy,
            paddingTop: 64,
            paddingBottom: 56,
            paddingHorizontal: 24,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            overflow: "hidden",
            alignItems: "center",
          }}
        >
          <Blobs />

          <TouchableOpacity
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              })
            }
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
              marginBottom: 24,
            }}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color="rgba(255,255,255,0.85)"
            />

            <Text
              style={{
                ...T.bodySmall,
                color:
                  "rgba(255,255,255,0.85)",
                marginLeft: 6,
              }}
            >
              {/* Back to user login */}
            </Text>
          </TouchableOpacity>

          <View
            style={{
              width: 68,
              height: 68,
              borderRadius: 22,
              backgroundColor:
                "rgba(255,255,255,0.12)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={32}
              color={C.amber}
            />
          </View>

          <Text
            style={{
              ...T.h1,
              color: C.white,
              textAlign: "center",
            }}
          >
            Admin Login
          </Text>

          <Text
            style={{
              ...T.body,
              color:
                "rgba(255,255,255,0.75)",
              textAlign: "center",
              marginTop: 6,
              maxWidth: 300,
            }}
          >
            Sign in to review and verify
            pending registrations.
          </Text>
        </View>

        {/* ----------------------------------------------------------
            FORM CARD
        ---------------------------------------------------------- */}
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
            shadowOffset: {
              width: 0,
              height: 8,
            },
            shadowOpacity: 0.12,
            shadowRadius: 20,
            elevation: 6,
          }}
        >
          <ErrorBanner
            error={error}
            T={T}
          />

          <FormFields
            T={T}
            email={email}
            password={password}
            showPassword={showPassword}
            emailFocused={emailFocused}
            passwordFocused={passwordFocused}
            submitting={submitting}
            setEmail={setEmail}
            setPassword={setPassword}
            setEmailFocused={setEmailFocused}
            setPasswordFocused={
              setPasswordFocused
            }
            setShowPassword={
              setShowPassword
            }
            handleAdminLogin={
              handleAdminLogin
            }
          />
        </View>

        <RestrictedNotice T={T} />

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
