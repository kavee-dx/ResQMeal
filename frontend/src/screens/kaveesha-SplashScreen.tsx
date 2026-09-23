import React, { useEffect, useRef } from 'react';

import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors } from '@/constants/theme';

import { useAppTypography } from '../hooks/kaveesha-useAppTypography';

import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Splash'
>;

export default function SplashScreen({
  navigation,
}: Props) {
  const T = useAppTypography();
  const { width, height } = useWindowDimensions();

  const isTablet = width >= 768;
  const isSmallScreen = height < 700;

  /*
   * Animations
   */

  const logoOpacity = useRef(
    new Animated.Value(0),
  ).current;

  const logoScale = useRef(
    new Animated.Value(0.75),
  ).current;

  const logoTranslateY = useRef(
    new Animated.Value(20),
  ).current;

  const contentOpacity = useRef(
    new Animated.Value(0),
  ).current;

  const contentTranslateY = useRef(
    new Animated.Value(25),
  ).current;

  const glowScale = useRef(
    new Animated.Value(0.9),
  ).current;

  const glowOpacity = useRef(
    new Animated.Value(0.5),
  ).current;

  const dotOne = useRef(
    new Animated.Value(0.35),
  ).current;

  const dotTwo = useRef(
    new Animated.Value(0.35),
  ).current;

  const dotThree = useRef(
    new Animated.Value(0.35),
  ).current;

  useEffect(() => {
    /*
     * Logo entrance
     */
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 45,
        useNativeDriver: true,
      }),

      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    /*
     * Text entrance
     */
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 800,
        delay: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 800,
        delay: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    /*
     * Background glow animation — soft pulse behind the logo
     */
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1.12,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.75,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),

        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 0.9,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.5,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();

    /*
     * Loading dots
     */

    Animated.loop(
      Animated.sequence([
        Animated.timing(dotOne, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),

        Animated.timing(dotOne, {
          toValue: 0.3,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.delay(180),

        Animated.timing(dotTwo, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),

        Animated.timing(dotTwo, {
          toValue: 0.3,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.delay(360),

        Animated.timing(dotThree, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),

        Animated.timing(dotThree, {
          toValue: 0.3,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    /*
     * Navigate to Login
     *
     * Increased from 3000ms so the splash isn't gone before it's
     * really been seen.
     */
    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 4500);

    return () => {
      clearTimeout(timer);
    };
  }, [
    navigation,
    logoOpacity,
    logoScale,
    logoTranslateY,
    contentOpacity,
    contentTranslateY,
    glowScale,
    glowOpacity,
    dotOne,
    dotTwo,
    dotThree,
  ]);

  /*
   * Responsive sizes
   *
   * The logo asset used here is the ICON-ONLY mark (no wordmark baked
   * into the image), since "ResQMeal" is already set as a text title
   * just below it.
   */

  const logoSize = isTablet
  ? 200
  : width < 360
    ? 135
    : 180;

  const glowSize = logoSize * 1.9;

  return (
    <View style={styles.container}>

      {/* =====================================================
          BACKGROUND DECORATION
          ===================================================== */}

      <View style={styles.backgroundTop} />
      <View style={styles.backgroundLeft} />
      <View style={styles.backgroundRight} />
      <View style={styles.backgroundBottom} />

      {/* Small decorative dots */}

      <View style={styles.smallDotOne} />
      <View style={styles.smallDotTwo} />
      <View style={styles.smallDotThree} />

      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <View
        style={[
          styles.mainContent,
          {
            paddingTop: isSmallScreen
              ? 12
              : 0,
          },
        ]}
      >

        {/* Logo, with a soft pulsing glow sitting behind it */}

        <View style={styles.logoWrapper}>
          <Animated.View
            style={[
              styles.logoGlow,
              {
                width: glowSize,
                height: glowSize,
                borderRadius: glowSize / 2,
                opacity: glowOpacity,
                transform: [
                  { scale: glowScale },
                ],
              },
            ]}
          />

          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [
                { scale: logoScale },
                { translateY: logoTranslateY },
              ],
            }}
          >
            <Image
              source={require('../../assets/images/ResQMeal_icon.png')}
              style={{
                width: logoSize,
                height: logoSize,
              }}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* =================================================
            TEXT CONTENT
            ================================================= */}

        <Animated.View
          style={[
            styles.textContent,
            {
              opacity: contentOpacity,
              transform: [
                {
                  translateY: contentTranslateY,
                },
              ],
            },
          ]}
        >

          {/* Brand title */}

          <Text
            style={[
              T.h1,
              styles.title,
              {
                fontSize: isTablet ? 44 : 34,
              },
            ]}
          >
            ResQMeal
          </Text>

          {/* Orange tagline */}

          <Text
            style={[
              T.body,
              styles.tagline,
              {
                fontSize: isTablet ? 19 : 16,
              },
            ]}
          >
            Rescue Food. Restore Hope.
          </Text>

          {/* Divider */}

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />

            <View style={styles.dividerDot} />

            <View style={styles.dividerLine} />
          </View>

          {/* Description */}

          <Text
            style={[
              T.bodySmall,
              styles.description,
              {
                fontSize: isTablet ? 16 : 14,
                lineHeight: isTablet ? 25 : 21,
              },
            ]}
          >
            Connecting donors, volunteers, NGOs
            {'\n'}
            and communities to reduce food waste
            {'\n'}
            and fight hunger.
          </Text>

        </Animated.View>
      </View>

      {/* =====================================================
          LOADING SECTION
          ===================================================== */}

      <View style={styles.loadingSection}>

        <View style={styles.loadingDots}>

          <Animated.View
            style={[
              styles.loadingDot,
              styles.whiteDot,
              {
                opacity: dotOne,
              },
            ]}
          />

          <Animated.View
            style={[
              styles.loadingDot,
              styles.orangeDot,
              {
                opacity: dotTwo,
              },
            ]}
          />

          <Animated.View
            style={[
              styles.loadingDot,
              styles.greenDot,
              {
                opacity: dotThree,
              },
            ]}
          />

        </View>

        {/*
          Only one closing message is kept — this section used to also
          show "Making every meal count" here, on top of the footer's
          "Together, we can make a difference." below. That single
          footer line now does the job.
        */}

      </View>

      {/* =====================================================
          FOOTER
          ===================================================== */}

      <View style={styles.footer}>

        <View style={styles.footerLine} />

        <Text style={styles.footerText}>
          Together, we can make a difference.
        </Text>

      </View>

    </View>
  );
}

/* =========================================================
   STYLES
   ========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#023047',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  /* =====================================================
     BACKGROUND — sized up for more presence
     ===================================================== */

  backgroundTop: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 420,
    backgroundColor: 'rgba(251, 133, 0, 0.10)',
    top: -220,
    right: -140,
  },

  backgroundLeft: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: 'rgba(42, 157, 143, 0.08)',
    top: '25%',
    left: -130,
  },

  backgroundRight: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 230,
    backgroundColor: 'rgba(251, 133, 0, 0.09)',
    bottom: '16%',
    right: -110,
  },

  backgroundBottom: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 360,
    backgroundColor: 'rgba(107, 142, 35, 0.13)',
    bottom: -210,
    left: -120,
  },

  /* =====================================================
     SMALL DECORATIVE DOTS
     ===================================================== */

  smallDotOne: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(251, 133, 0, 0.65)',
    top: '18%',
    left: '18%',
  },

  smallDotTwo: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    top: '13%',
    right: '20%',
  },

  smallDotThree: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 9,
    backgroundColor: 'rgba(107, 142, 35, 0.7)',
    bottom: '28%',
    left: '13%',
  },

  /* =====================================================
     MAIN CONTENT
     ===================================================== */

  mainContent: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 25,
    zIndex: 10,
  },

  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  logoGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(251, 133, 0, 0.16)',
  },

  textContent: {
    alignItems: 'center',
    width: '100%',
  },

  title: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.8,
    marginTop: 0,
  },

  tagline: {
    color: '#FB8500',
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: 0.1,
  },

  /* =====================================================
     DIVIDER
     ===================================================== */

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 18,
  },

  dividerLine: {
    width: 34,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  dividerDot: {
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: '#FB8500',
    marginHorizontal: 8,
  },

  /* =====================================================
     DESCRIPTION
     ===================================================== */

  description: {
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    maxWidth: 390,
    fontWeight: '400',
  },

  /* =====================================================
     LOADING
     ===================================================== */

  loadingSection: {
    position: 'absolute',
    bottom: 86,
    alignItems: 'center',
    zIndex: 20,
  },

  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 12,
    marginHorizontal: 5,
  },

  whiteDot: {
    backgroundColor: '#FFFFFF',
  },

  orangeDot: {
    backgroundColor: '#FB8500',
  },

  greenDot: {
    backgroundColor: '#6B8E23',
  },

  /* =====================================================
     FOOTER
     ===================================================== */

  footer: {
    position: 'absolute',
    bottom: 26,
    alignItems: 'center',
    zIndex: 20,
  },

  footerLine: {
    width: 35,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(251,133,0,0.55)',
    marginBottom: 8,
  },

  footerText: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});