import React, { useState } from 'react';
import {
  ActivityIndicator,
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

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import api from '../services/api';
import { saveAdminSession } from '../utils/amasha-admin-authStorage';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';
import type { RootStackParamList } from '../navigation/types';

const WARNING = '#E0A526'; // fallback if theme.warning isn't defined yet

type Props = NativeStackScreenProps<RootStackParamList, 'AdminLogin'>;

export default function AdminLoginScreen({ navigation }: Props) {
  const theme = Colors.light;
  const T = useAppTypography();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdminLogin() {
    setError(null);

    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post('/admin/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      const data = response.data ?? {};
      const token = data.token;
      const fullName = data.admin?.fullName ?? 'Admin';

      if (!token) {
        throw new Error('Login succeeded but no token was returned.');
      }

      await saveAdminSession(token, fullName);

      navigation.reset({
        index: 0,
        routes: [{ name: 'AdminDashboard' }],
      });
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMessage = err?.response?.data?.message;

      if (!err?.response) {
        setError('Unable to connect to the server. Please check your internet connection.');
      } else if (status === 401) {
        setError('Incorrect email or password.');
      } else if (serverMessage) {
        setError(serverMessage);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: Spacing.three,
          paddingTop: Spacing.six,
          paddingBottom: Spacing.seven,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: '100%', maxWidth: 480 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={{ alignSelf: 'flex-start', marginBottom: Spacing.four }}
          >
            <Ionicons name="arrow-back" size={22} color={theme.textSecondary} />
          </TouchableOpacity>

          <View style={{ alignItems: 'center', marginBottom: Spacing.five }}>
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 22,
                backgroundColor: theme.primaryLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: Spacing.three,
              }}
            >
              <Ionicons name="shield-checkmark-outline" size={32} color={theme.primary} />
            </View>

            <Text style={{ ...T.h1, color: theme.text, textAlign: 'center' }}>
              Admin Login
            </Text>

            <Text
              style={{
                ...T.body,
                color: theme.textSecondary,
                textAlign: 'center',
                marginTop: Spacing.one,
                maxWidth: 340,
              }}
            >
              Sign in to review and verify pending registrations.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: theme.formBackground,
              borderRadius: Radius.xl,
              borderWidth: 1,
              borderColor: theme.border,
              padding: Spacing.four,
              ...Shadows.card,
            }}
          >
            {error && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  backgroundColor: theme.errorSoft,
                  borderRadius: Radius.md,
                  borderWidth: 1,
                  borderColor: theme.error,
                  paddingVertical: Spacing.two,
                  paddingHorizontal: Spacing.three,
                  marginBottom: Spacing.four,
                }}
              >
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color={theme.error}
                  style={{ marginRight: 8, marginTop: 1 }}
                />
                <Text style={{ ...T.bodySmall, color: theme.error, flex: 1 }}>{error}</Text>
              </View>
            )}

            <Text style={{ ...T.label, color: theme.text, marginBottom: 6 }}>Admin email</Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                minHeight: 52,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: Radius.md,
                backgroundColor: theme.inputBackground,
                paddingHorizontal: Spacing.three,
                marginBottom: Spacing.three,
              }}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={theme.textSecondary}
                style={{ marginRight: Spacing.two }}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="admin@resqmeal.com"
                placeholderTextColor={theme.inputPlaceholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={{ ...T.input, flex: 1, color: theme.inputText }}
                selectionColor={theme.primary}
              />
            </View>

            <Text style={{ ...T.label, color: theme.text, marginBottom: 6 }}>Password</Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                minHeight: 52,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: Radius.md,
                backgroundColor: theme.inputBackground,
                paddingHorizontal: Spacing.three,
                marginBottom: Spacing.four,
              }}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={theme.textSecondary}
                style={{ marginRight: Spacing.two }}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={theme.inputPlaceholder}
                secureTextEntry={!showPassword}
                style={{ ...T.input, flex: 1, color: theme.inputText }}
                selectionColor={theme.primary}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleAdminLogin}
              disabled={submitting}
              activeOpacity={0.85}
              style={{
                minHeight: 54,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.primary,
                borderRadius: Radius.md,
                opacity: submitting ? 0.7 : 1,
                ...Shadows.button,
              }}
            >
              {submitting ? (
                <ActivityIndicator color={theme.textOnPrimary} />
              ) : (
                <>
                  <Ionicons
                    name="log-in-outline"
                    size={20}
                    color={theme.textOnPrimary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ ...T.button, color: theme.textOnPrimary }}>Log In</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: Spacing.four,
            }}
          >
            <Ionicons name="lock-closed-outline" size={14} color={WARNING} />
            <Text style={{ ...T.bodySmall, color: theme.textSecondary, marginLeft: 5 }}>
              Restricted access — authorized staff only.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}