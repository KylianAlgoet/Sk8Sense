import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BG, TEXT, LINE, ACCENT, FONT, R, BTN, SPACE } from '../design-tokens';
import { V3Grid, V3Ticked } from '../components/V3Shared';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'rocket-outline',
    tag: 'WELCOME',
    title: 'Welcome to SK8Sense',
    body: 'The first AI-powered skateboard coach. Mount the sensor on your board and let it do the work.',
  },
  {
    icon: 'bluetooth-outline',
    tag: 'CONNECTIVITY',
    title: 'Wireless & Real-Time',
    body: 'The ESP32 sensor connects via Bluetooth and streams live data to your phone at 100 times per second.',
  },
  {
    icon: 'analytics-outline',
    tag: 'SK8SENSE AI COACH',
    title: 'AI Trick Detection',
    body: 'SK8Sense detects your tricks automatically — ollie, kickflip, heelflip — and gives you a coaching tip after every attempt.',
  },
  {
    icon: 'trending-up-outline',
    tag: 'PROGRESS',
    title: 'Track Your Progress',
    body: 'Every session is saved. See your trick count, session duration and history over time.',
  },
];

export default function OnboardingScreen({ onComplete }) {
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goTo = (next) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setIndex(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      goTo(index + 1);
    } else {
      onComplete();
    }
  };

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <View style={s.container}>
      <V3Grid />

      {/* Skip */}
      <TouchableOpacity style={s.skip} onPress={onComplete}>
        <Text style={s.skipText}>SKIP</Text>
      </TouchableOpacity>

      {/* Content */}
      <Animated.View style={[s.contentWrap, { opacity: fadeAnim }]}>
        <V3Ticked style={s.card}>
          <View style={s.iconWrap}>
            <Ionicons name={slide.icon} size={30} color={ACCENT} />
          </View>
          <Text style={s.tag}>· {slide.tag} ·</Text>
          <Text style={s.title}>{slide.title}</Text>
          <Text style={s.body}>{slide.body}</Text>
        </V3Ticked>
      </Animated.View>

      {/* Dots */}
      <View style={s.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[s.dot, i === index && s.dotActive]} />
        ))}
      </View>

      {/* Button */}
      <TouchableOpacity style={s.btn} onPress={next} activeOpacity={0.85}>
        <Text style={s.btnText}>{isLast ? "LET'S SKATE" : 'NEXT'}</Text>
        <Ionicons name="arrow-forward" size={15} color="#0A0A0B" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: BG.base,
    alignItems: 'center', justifyContent: 'center',
    padding: SPACE.xl,
  },
  skip: { position: 'absolute', top: 60, right: 24, zIndex: 10 },
  skipText: { fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.6, color: TEXT.t3 },

  contentWrap: { width: '100%', alignItems: 'center', marginBottom: 40 },
  card: { width: '100%', maxWidth: width * 0.86, padding: 24, alignItems: 'center', gap: 14 },
  iconWrap: {
    width: 60, height: 60, borderRadius: R,
    backgroundColor: `${ACCENT}14`, borderWidth: 1, borderColor: `${ACCENT}38`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  tag: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: ACCENT },
  title: {
    fontFamily: FONT.display, fontSize: 22, color: TEXT.t1,
    textTransform: 'uppercase', letterSpacing: -0.4, textAlign: 'center',
  },
  body: {
    fontFamily: FONT.body, fontSize: 14, color: TEXT.t2,
    textAlign: 'center', lineHeight: 21,
  },

  dots: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BG.b4, borderWidth: 1, borderColor: LINE.dim },
  dotActive: { backgroundColor: ACCENT, borderColor: ACCENT, width: 24 },

  btn: { ...BTN.base, ...BTN.primary, width: '100%', shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 6 },
  btnText: { fontFamily: FONT.display, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: '#0A0A0B' },
});
