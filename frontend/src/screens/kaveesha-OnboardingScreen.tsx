import React, { useRef, useState, useEffect } from 'react';
import {
  Animated,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  NativeScrollEvent,
  NativeSyntheticEvent,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NAVY = '#023047';
const ORANGE = '#FB8500';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#123044';
const TEXT_MUTED = '#667685';
const LIGHT_BG = '#F8FAFC';
const BORDER = '#E8EEF2';

const slides = [
  {
    id: '1',
    title: 'Save Good Food Before It Goes To Waste',
    description:
      'Connect restaurants, supermarkets, and donors with people who need food.',
    image: require('../../assets/images/onboarding01.jpg'),
  },
  {
    id: '2',
    title: 'Make Every Meal Count',
    description:
      'Donate excess food and support local communities, charities, and families.',
    image: require('../../assets/images/onboarding02.jpg'),
  },
  {
    id: '3',
    title: 'Fast, Safe & Transparent',
    description:
      'Volunteers and NGOs can manage pickups and deliveries with ease.',
    image: require('../../assets/images/onboarding03.jpg'),
  },
];

const WIDE_BREAKPOINT = 900;

// Image takes around 56% of the phone screen height.
const PHONE_IMAGE_RATIO = 0.56;

type Slide = (typeof slides)[number];

export default function OnboardingScreen({ navigation }: any) {
  const { width, height } = useWindowDimensions();

  const scrollRef = useRef<Animated.ScrollView>(null);

  const [page, setPage] = useState(0);
  const [stageH, setStageH] = useState(0);

  const isWide = width >= WIDE_BREAKPOINT;
  const isSmallPhone = width < 360;
  const isTablet = width >= 600 && !isWide;

  /*
   * ---------------------------------------------------------
   * SCROLL ANIMATION
   * ---------------------------------------------------------
   */

  const scrollX = useRef(new Animated.Value(0)).current;

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: true,
    },
  );

  /*
   * ---------------------------------------------------------
   * FIRST SCREEN ENTRANCE ANIMATION
   * ---------------------------------------------------------
   */

  const mountOpacity = useRef(new Animated.Value(0)).current;
  const mountRise = useRef(new Animated.Value(22)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mountOpacity, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.spring(mountRise, {
        toValue: 0,
        damping: 16,
        stiffness: 110,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  /*
   * ---------------------------------------------------------
   * FINISH ONBOARDING
   * ---------------------------------------------------------
   */

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    } catch (error) {
      // Non-fatal.
    }

    navigation.replace('Login');
  };

  /*
   * ---------------------------------------------------------
   * PAGE NAVIGATION
   * ---------------------------------------------------------
   */

  const goToPage = (index: number) => {
    scrollRef.current?.scrollTo({
      x: index * width,
      animated: true,
    });

    setPage(index);
  };

  const nextPage = () => {
    if (page < slides.length - 1) {
      goToPage(page + 1);
    } else {
      finishOnboarding();
    }
  };

  const onMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / width,
    );

    setPage(index);
  };

  /*
   * ---------------------------------------------------------
   * RESPONSIVE SIZING
   * ---------------------------------------------------------
   */

  const getTitleSize = () => {
    if (isWide) return 38;
    if (isTablet) return 30;
    if (isSmallPhone) return 23;
    return 26;
  };

  const getDescriptionSize = () => {
    if (isWide) return 17;
    if (isTablet) return 16;
    if (isSmallPhone) return 14.5;
    return 15.5;
  };

  const getHorizontalPadding = () => {
    if (isWide) return 56;
    if (isTablet) return 42;
    if (isSmallPhone) return 20;
    return 28;
  };

  /*
   * ---------------------------------------------------------
   * SLIDE TRANSITIONS
   * ---------------------------------------------------------
   */

  const getTransition = (index: number) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const scrollOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.94, 1, 0.94],
      extrapolate: 'clamp',
    });

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [18, 0, 18],
      extrapolate: 'clamp',
    });

    const imageScale = scrollX.interpolate({
      inputRange,
      outputRange: [1.08, 1, 1.08],
      extrapolate: 'clamp',
    });

    return {
      opacity: Animated.multiply(
        scrollOpacity,
        mountOpacity,
      ),

      transform: [
        { scale },
        {
          translateY: Animated.add(
            translateY,
            mountRise,
          ),
        },
      ],

      imageStyle: {
        transform: [{ scale: imageScale }],
      },
    };
  };

  /*
   * ---------------------------------------------------------
   * DOTS
   * ---------------------------------------------------------
   */

  const renderDots = () => (
    <View style={styles.dots}>
      {slides.map((_, index) => {
        const active = page === index;

        return (
          <TouchableOpacity
            key={index}
            onPress={() => goToPage(index)}
            activeOpacity={0.75}
            hitSlop={{
              top: 10,
              bottom: 10,
              left: 8,
              right: 8,
            }}
          >
            <Animated.View
              style={[
                styles.dot,
                active && styles.activeDot,
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  /*
   * ---------------------------------------------------------
   * BUTTON
   * ---------------------------------------------------------
   */

  const renderButton = (wide: boolean) => {
    const isLast = page === slides.length - 1;

    return (
      <TouchableOpacity
        style={[
          styles.button,
          wide && styles.buttonWide,
          !wide && isTablet && styles.buttonTablet,
        ]}
        onPress={nextPage}
        activeOpacity={0.86}
      >
        <Text style={styles.buttonText}>
          {isLast ? 'Get Started' : 'Next'}
        </Text>

        <Text style={styles.buttonArrow}>
          →
        </Text>
      </TouchableOpacity>
    );
  };

  /*
   * ---------------------------------------------------------
   * CONTENT
   * ---------------------------------------------------------
   */

  const renderContent = (
    item: Slide,
    wide: boolean,
  ) => (
    <View
      style={[
        wide
          ? styles.contentWideWrap
          : styles.contentPhoneWrap,
        !wide && {
          paddingHorizontal: getHorizontalPadding(),
        },
      ]}
    >
      {wide ? (
        <View style={styles.brandRow}>
          <View style={styles.brandMark} />

          <Text style={styles.eyebrow}>
            RESQMEAL
          </Text>
        </View>
      ) : (
        <View style={styles.accentRow}>
          <View style={styles.accentLine} />

          <View style={styles.accentDot} />

          <View style={styles.accentLine} />
        </View>
      )}

      <Text
        style={[
          styles.title,
          wide && styles.titleWide,
          {
            fontSize: getTitleSize(),
            lineHeight: isWide
              ? 46
              : getTitleSize() + 9,
          },
        ]}
      >
        {item.title}
      </Text>

      <Text
        style={[
          styles.description,
          wide && styles.descriptionWide,
          {
            fontSize: getDescriptionSize(),
          },
        ]}
      >
        {item.description}
      </Text>
    </View>
  );

  /*
   * ---------------------------------------------------------
   * SCREEN
   * ---------------------------------------------------------
   */

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={
          isWide
            ? 'dark-content'
            : 'light-content'
        }
        backgroundColor={
          isWide ? WHITE : NAVY
        }
      />

      {/* ---------------------------------------------------
          SKIP
      --------------------------------------------------- */}

      <TouchableOpacity
        style={[
          styles.skip,
          isWide
            ? styles.skipWide
            : styles.skipPhone,
        ]}
        onPress={finishOnboarding}
        activeOpacity={0.75}
        hitSlop={{
          top: 12,
          bottom: 12,
          left: 12,
          right: 12,
        }}
      >
        <Text
          style={[
            styles.skipText,
            isWide && styles.skipTextWide,
          ]}
        >
          Skip
        </Text>
      </TouchableOpacity>

      {/* ---------------------------------------------------
          SLIDES
      --------------------------------------------------- */}

      <View
        style={styles.stage}
        onLayout={(event) =>
          setStageH(
            event.nativeEvent.layout.height,
          )
        }
      >
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={
            onMomentumScrollEnd
          }
          decelerationRate="fast"
          bounces={false}
          style={styles.scroll}
        >
          {slides.map((item, index) => {
            const transition =
              getTransition(index);

            /*
             * =================================================
             * DESKTOP / LAPTOP
             * =================================================
             */

            if (isWide) {
              return (
                <View
                  key={item.id}
                  style={[
                    styles.wideSlide,
                    {
                      width,
                      height:
                        stageH ||
                        height,
                    },
                  ]}
                >
                  {/* IMAGE */}
                  <View
                    style={styles.wideImageCol}
                  >
                    <Animated.Image
                      source={item.image}
                      style={[
                        styles.image,
                        transition.imageStyle,
                      ]}
                      resizeMode="cover"
                    />

                    <View
                      style={
                        styles.desktopImageOverlay
                      }
                    />

                    <View
                      style={
                        styles.desktopImageBadge
                      }
                    >
                      <View
                        style={
                          styles.badgeDot
                        }
                      />

                      <Text
                        style={
                          styles.badgeText
                        }
                      >
                        FOOD • COMMUNITY • IMPACT
                      </Text>
                    </View>
                  </View>

                  {/* CONTENT */}
                  <View
                    style={
                      styles.wideContentCol
                    }
                  >
                    <Animated.View
                      style={[
                        styles.wideContentInner,
                        {
                          opacity:
                            transition.opacity,
                          transform:
                            transition.transform,
                        },
                      ]}
                    >
                      {renderContent(
                        item,
                        true,
                      )}

                      <View
                        style={
                          styles.wideFooter
                        }
                      >
                        {renderDots()}

                        {renderButton(
                          true,
                        )}
                      </View>
                    </Animated.View>
                  </View>
                </View>
              );
            }

            /*
             * =================================================
             * PHONE / TABLET
             * =================================================
             */

            return (
              <View
                key={item.id}
                style={[
                  styles.phoneSlide,
                  {
                    width,
                    height:
                      stageH ||
                      height,
                  },
                ]}
              >
                {/* IMAGE */}
                <View
                  style={[
                    styles.imageWrap,
                    {
                      height:
                        stageH
                          ? stageH *
                            PHONE_IMAGE_RATIO
                          : height *
                            PHONE_IMAGE_RATIO,
                    },
                  ]}
                >
                  <Animated.Image
                    source={item.image}
                    style={[
                      styles.image,
                      transition.imageStyle,
                    ]}
                    resizeMode="cover"
                  />

                  <View
                    style={
                      styles.imageGradient
                    }
                  />

                  {/* Small brand badge */}
                  <View
                    style={
                      styles.mobileBrandBadge
                    }
                  >
                    <View
                      style={
                        styles.mobileBrandDot
                      }
                    />

                    <Text
                      style={
                        styles.mobileBrandText
                      }
                    >
                      ResQMeal
                    </Text>
                  </View>
                </View>

                {/* CONTENT CARD */}
                <View
                  style={[
                    styles.card,
                    isTablet &&
                      styles.cardTablet,
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.cardTopBlock,
                      {
                        opacity:
                          transition.opacity,
                        transform:
                          transition.transform,
                      },
                    ]}
                  >
                    {renderContent(
                      item,
                      false,
                    )}
                  </Animated.View>

                  {/* FOOTER */}
                  <View
                    style={styles.phoneFooter}
                  >
                    {renderDots()}

                    {renderButton(
                      false,
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </Animated.ScrollView>
      </View>
    </View>
  );
}

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles = StyleSheet.create({
  /*
   * ----------------------------------------------------------
   * ROOT
   * ----------------------------------------------------------
   */

  root: {
    flex: 1,
    backgroundColor: WHITE,
  },

  stage: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  /*
   * ----------------------------------------------------------
   * SKIP
   * ----------------------------------------------------------
   */

  skip: {
    position: 'absolute',
    zIndex: 100,
  },

  skipPhone: {
    top: 22,
    right: 18,

    paddingHorizontal: 15,
    paddingVertical: 8,

    borderRadius: 999,

    backgroundColor:
      'rgba(2, 48, 71, 0.62)',

    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.18)',
  },

  skipWide: {
    top: 30,
    right: 42,

    paddingHorizontal: 4,
    paddingVertical: 6,
  },

  skipText: {
    color: WHITE,

    fontFamily:
      'Poppins_600SemiBold',

    fontSize: 14,
  },

  skipTextWide: {
    color: NAVY,

    fontSize: 15,

    fontFamily:
      'Poppins_600SemiBold',
  },

  /*
   * ----------------------------------------------------------
   * PHONE SLIDE
   * ----------------------------------------------------------
   */

  phoneSlide: {
    backgroundColor: WHITE,
  },

  /*
   * ----------------------------------------------------------
   * IMAGE
   * ----------------------------------------------------------
   */

  imageWrap: {
    width: '100%',

    overflow: 'hidden',

    backgroundColor: NAVY,
  },

  image: {
    width: '100%',
    height: '100%',
  },

  imageGradient: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      'rgba(2, 48, 71, 0.08)',
  },

  /*
   * ----------------------------------------------------------
   * MOBILE BRAND BADGE
   * ----------------------------------------------------------
   */

  mobileBrandBadge: {
    position: 'absolute',

    left: 20,
    bottom: 26,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 13,
    paddingVertical: 8,

    borderRadius: 999,

    backgroundColor:
      'rgba(2, 48, 71, 0.78)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.18)',
  },

  mobileBrandDot: {
    width: 7,
    height: 7,

    borderRadius: 7,

    backgroundColor: ORANGE,

    marginRight: 8,
  },

  mobileBrandText: {
    color: WHITE,

    fontFamily:
      'Poppins_600SemiBold',

    fontSize: 12,
  },

  /*
   * ----------------------------------------------------------
   * PHONE CARD
   * ----------------------------------------------------------
   */

  card: {
    flex: 1,

    backgroundColor: WHITE,

    marginTop: -30,

    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,

    paddingTop: 10,
    paddingBottom: 22,

    overflow: 'hidden',

    shadowColor: NAVY,
    shadowOpacity: 0.10,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: -5,
    },

    elevation: 10,

    justifyContent: 'space-between',
    alignItems: 'center',
  },

  cardTablet: {
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,

    paddingTop: 16,
    paddingBottom: 30,
  },

  cardTopBlock: {
    flex: 1,

    width: '100%',

    justifyContent: 'center',
    alignItems: 'center',
  },

  /*
   * ----------------------------------------------------------
   * PHONE CONTENT
   * ----------------------------------------------------------
   */

  contentPhoneWrap: {
    width: '100%',

    alignItems: 'center',
  },

  /*
   * ----------------------------------------------------------
   * ACCENT
   * ----------------------------------------------------------
   */

  accentRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 17,
  },

  accentLine: {
    width: 25,
    height: 2,

    borderRadius: 2,

    backgroundColor:
      'rgba(2, 48, 71, 0.12)',
  },

  accentDot: {
    width: 7,
    height: 7,

    borderRadius: 7,

    backgroundColor: ORANGE,

    marginHorizontal: 8,
  },

  /*
   * ----------------------------------------------------------
   * TITLE
   * ----------------------------------------------------------
   */

  title: {
    fontFamily:
      'Poppins_700Bold',

    color: NAVY,

    textAlign: 'center',

    letterSpacing: -0.5,

    marginBottom: 13,

    maxWidth: 360,
  },

  description: {
    fontFamily:
      'Poppins_400Regular',

    color: TEXT_MUTED,

    textAlign: 'center',

    lineHeight: 23,

    paddingHorizontal: 4,

    maxWidth: 360,
  },

  /*
   * ----------------------------------------------------------
   * PHONE FOOTER
   * ----------------------------------------------------------
   */

  phoneFooter: {
    width: '100%',

    alignItems: 'center',
  },

  /*
   * ----------------------------------------------------------
   * DESKTOP
   * ----------------------------------------------------------
   */

  wideSlide: {
    flexDirection: 'row',

    backgroundColor: WHITE,
  },

  wideImageCol: {
    width: '54%',
    height: '100%',

    backgroundColor: NAVY,

    overflow: 'hidden',

    position: 'relative',
  },

  desktopImageOverlay: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      'rgba(2, 48, 71, 0.08)',
  },

  /*
   * Desktop floating badge
   */

  desktopImageBadge: {
    position: 'absolute',

    left: 38,
    bottom: 36,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 16,
    paddingVertical: 10,

    borderRadius: 999,

    backgroundColor:
      'rgba(2, 48, 71, 0.82)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.18)',
  },

  badgeDot: {
    width: 8,
    height: 8,

    borderRadius: 8,

    backgroundColor: ORANGE,

    marginRight: 9,
  },

  badgeText: {
    color: WHITE,

    fontFamily:
      'Poppins_600SemiBold',

    fontSize: 11,

    letterSpacing: 0.7,
  },

  /*
   * ----------------------------------------------------------
   * DESKTOP CONTENT
   * ----------------------------------------------------------
   */

  wideContentCol: {
    width: '46%',
    height: '100%',

    backgroundColor: WHITE,

    justifyContent: 'center',
    alignItems: 'center',

    paddingHorizontal: 55,
  },

  wideContentInner: {
    width: '100%',

    maxWidth: 470,
  },

  contentWideWrap: {
    width: '100%',

    alignItems: 'flex-start',
  },

  /*
   * Desktop brand
   */

  brandRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 22,
  },

  brandMark: {
    width: 9,
    height: 9,

    borderRadius: 9,

    backgroundColor: ORANGE,

    marginRight: 10,
  },

  eyebrow: {
    fontFamily:
      'Poppins_700Bold',

    fontSize: 13,

    letterSpacing: 2.2,

    color: NAVY,
  },

  titleWide: {
    textAlign: 'left',

    maxWidth: 470,

    marginBottom: 17,
  },

  descriptionWide: {
    textAlign: 'left',

    lineHeight: 26,

    paddingHorizontal: 0,

    maxWidth: 430,
  },

  /*
   * ----------------------------------------------------------
   * DESKTOP FOOTER
   * ----------------------------------------------------------
   */

  wideFooter: {
    marginTop: 48,

    width: '100%',

    alignItems: 'flex-start',
  },

  /*
   * ----------------------------------------------------------
   * DOTS
   * ----------------------------------------------------------
   */

  dots: {
    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 18,
  },

  dot: {
    width: 8,
    height: 8,

    borderRadius: 8,

    backgroundColor: '#DDE5EA',

    marginHorizontal: 4,
  },

  activeDot: {
    width: 27,

    backgroundColor: ORANGE,
  },

  /*
   * ----------------------------------------------------------
   * BUTTON
   * ----------------------------------------------------------
   */

  button: {
    width: '100%',
    height: 57,

    borderRadius: 999,

    backgroundColor: ORANGE,

    flexDirection: 'row',

    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: ORANGE,

    shadowOpacity: 0.28,

    shadowRadius: 16,

    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 7,
  },

  buttonTablet: {
    maxWidth: 440,
    alignSelf: 'center',
  },

  buttonWide: {
    width: 225,

    alignSelf: 'flex-start',
  },

  buttonText: {
    color: WHITE,

    fontFamily:
      'Poppins_700Bold',

    fontSize: 16,

    letterSpacing: 0.1,
  },

  buttonArrow: {
    color: WHITE,

    fontFamily:
      'Poppins_700Bold',

    fontSize: 20,

    marginLeft: 10,

    marginTop: -2,
  },
});