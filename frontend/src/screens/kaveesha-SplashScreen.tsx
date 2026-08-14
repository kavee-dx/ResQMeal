import React, { useEffect, useRef } from 'react';

import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Ionicons } from '@expo/vector-icons';

import {
  Colors,
  Radius,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';

type Props = NativeStackScreenProps<any, 'Splash'>;

/**
 * ============================================================
 * SPLASH SCREEN
 * ============================================================
 *
 * Shows the ResQMeal brand mark with a soft fade + scale in,
 * then automatically redirects to Login after a short delay.
 *
 * Uses Colors.light directly (same convention as RegisterScreen)
 * and useAppTypography() so text renders in Poppins on every
 * platform, matching the rest of the app.
 */
export default function SplashScreen({ navigation }: Props) {
  const theme = Colors.light;
  const T = useAppTypography();

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const dotFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(dotFade, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(dotFade, {
          toValue: 0.3,
          duration: 550,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      {/* Decorative background blobs */}
      <View
        style={[
          styles.blobTop,
          { backgroundColor: theme.primaryLight },
        ]}
      />
      <View
        style={[
          styles.blobBottom,
          { backgroundColor: theme.secondaryLight },
        ]}
      />

      <Animated.View
        style={{
          opacity: fade,
          transform: [{ scale }],
          alignItems: 'center',
        }}
      >
        <View
          style={[
            styles.logoCircle,
            {
              backgroundColor: theme.primary,
              ...Shadows.button,
            },
          ]}
        >
          <Ionicons
            name="restaurant"
            size={46}
            color={theme.textOnPrimary}
          />
        </View>

        <Text
          style={[
            styles.title,
            T.h1,
            { color: theme.text },
          ]}
        >
          ResQMeal
        </Text>

        <Text
          style={[
            styles.tagline,
            T.body,
            { color: theme.textSecondary },
          ]}
        >
          Rescue food. Restore hope.
        </Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: theme.primary,
                opacity: dotFade,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: theme.secondary,
                opacity: dotFade,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: theme.primary,
                opacity: dotFade,
              },
            ]}
          />
        </View>

        <Text
          style={[
            styles.footerText,
            T.bodySmall,
            { color: theme.textMuted },
          ]}
        >
          Connecting donors, volunteers &amp; communities
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  blobTop: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 320,
    top: -140,
    right: -100,
    opacity: 0.6,
  },

  blobBottom: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 260,
    bottom: -110,
    left: -90,
    opacity: 0.6,
  },

  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },

  title: {
    letterSpacing: 0.3,
  },

  tagline: {
    marginTop: Spacing.one,
  },

  footer: {
    position: 'absolute',
    bottom: Spacing.six,
    alignItems: 'center',
  },

  dotsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.two,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },

  footerText: {
    fontSize: 11,
  },
});