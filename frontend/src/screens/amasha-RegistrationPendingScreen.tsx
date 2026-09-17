import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RegistrationPending'>;

export default function RegistrationPendingScreen({ navigation, route }: Props) {
  const theme = Colors.light;
  const T = useAppTypography();
  const fullName = route.params?.fullName;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.four,
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: theme.formBackground,
          borderRadius: Radius.xl,
          borderWidth: 1,
          borderColor: theme.border,
          padding: Spacing.five,
          alignItems: 'center',
          ...Shadows.card,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 24,
            backgroundColor: theme.primaryLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: Spacing.four,
          }}
        >
          <Ionicons name="time-outline" size={34} color={theme.primary} />
        </View>

        <Text style={{ ...T.h1, color: theme.text, textAlign: 'center' }}>
          {fullName ? `Thanks, ${fullName}!` : 'Registration received!'}
        </Text>

        <Text
          style={{
            ...T.body,
            color: theme.textSecondary,
            textAlign: 'center',
            marginTop: Spacing.three,
            lineHeight: 22,
          }}
        >
          Your account has been created and your email verified. Our team now needs to
          review your details before you can log in, this usually takes a short while.
          You'll get an email as soon as your account is approved.
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.primaryLight,
            borderRadius: Radius.md,
            paddingVertical: Spacing.two,
            paddingHorizontal: Spacing.three,
            marginTop: Spacing.four,
            width: '100%',
          }}
        >
          <Ionicons
            name="mail-outline"
            size={18}
            color={theme.primaryDark ?? theme.primary}
            style={{ marginRight: 8 }}
          />
          <Text style={{ ...T.bodySmall, color: theme.primaryDark ?? theme.primary, flex: 1 }}>
            Check your email for approval updates.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
          activeOpacity={0.85}
          style={{
            minHeight: 54,
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.secondary,
            borderRadius: Radius.md,
            marginTop: Spacing.five,
            ...Shadows.button,
          }}
        >
          <Ionicons name="log-in-outline" size={20} color={theme.textOnPrimary} style={{ marginRight: 8 }} />
          <Text style={{ ...T.button, color: theme.textOnPrimary }}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}