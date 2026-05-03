import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🛹',
    title: 'Welcome to SK8Sense',
    body: 'The first AI-powered skateboard coach. Mount the sensor on your board and let it do the work.',
  },
  {
    emoji: '📡',
    title: 'Wireless & Real-Time',
    body: 'The ESP32 sensor connects via Bluetooth and streams live data to your phone at 100 times per second.',
  },
  {
    emoji: '🤖',
    title: 'AI Trick Detection',
    body: 'SK8Sense detects your tricks automatically — ollie, kickflip, heelflip — and gives you a coaching tip after every attempt.',
  },
  {
    emoji: '📊',
    title: 'Track Your Progress',
    body: 'Every session is saved. See your trick count, session duration and history over time.',
  },
];

export default function OnboardingScreen({ navigation }) {
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
      navigation.replace('Home');
    }
  };

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      {/* Skip */}
      <TouchableOpacity style={styles.skip} onPress={() => navigation.replace('Home')}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </Animated.View>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      {/* Button */}
      <TouchableOpacity style={styles.btn} onPress={next}>
        <Text style={styles.btnText}>{isLast ? "LET'S SKATE" : 'NEXT'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#1a1a2e',
    alignItems: 'center', justifyContent: 'center',
    padding: 32,
  },
  skip: { position: 'absolute', top: 56, right: 24 },
  skipText: { color: '#555', fontSize: 14 },

  content: { alignItems: 'center', marginBottom: 48 },
  emoji: { fontSize: 72, marginBottom: 24 },
  title: {
    color: '#e94560', fontSize: 26, fontWeight: 'bold',
    textAlign: 'center', marginBottom: 16,
  },
  body: {
    color: '#aaa', fontSize: 16, textAlign: 'center',
    lineHeight: 24, maxWidth: width * 0.8,
  },

  dots: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
  dotActive: { backgroundColor: '#e94560', width: 24 },

  btn: {
    backgroundColor: '#e94560', width: '100%',
    paddingVertical: 16, borderRadius: 10, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
});
