import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useSessionStore from '../store/sessionStore';
import useAuthStore from '../store/authStore';
import T, { BG, TEXT, LINE, ACCENT, PANEL, BTN, FONT, SPACE, R } from '../design-tokens';

function StatCard({ value, label, color = TEXT.t1 }) {
  return (
    <View style={s.statCard}>
      <Text style={[s.statVal, { color }]}>{value}</Text>
      <Text style={s.statLbl}>{label}</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { sessions } = useSessionStore();
  const { user } = useAuthStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulse2Anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(pulse2Anim, { toValue: 1.32, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(pulse2Anim, { toValue: 1.0, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();
  }, []);

  const totalTricks  = sessions.reduce((acc, s) => acc + s.tricks.length, 0);
  const totalSeconds = sessions.reduce((acc, s) => acc + s.duration, 0);
  const totalMinutes = Math.floor(totalSeconds / 60);

  const firstName = user?.displayName?.split(' ')[0] || 'Skater';
  const lastSession = sessions[0];

  return (
    <View style={s.container}>
      {/* Greeting */}
      <View style={s.greeting}>
        <Text style={s.greetSmall}>Hey, {firstName} 👋</Text>
        <Text style={s.greetBig}>SK8SENSE</Text>
        <Text style={s.greetSub}>AI Skateboard Coach</Text>
      </View>

      {/* Stats row */}
      <View style={s.statsRow}>
        <StatCard value={sessions.length} label="Sessions" />
        <StatCard value={totalTricks} label="Tricks" color={ACCENT} />
        <StatCard value={totalMinutes > 0 ? `${totalMinutes}m` : '0m'} label="Time" />
      </View>

      {/* Last session preview */}
      {lastSession && (
        <TouchableOpacity
          style={s.lastSessionCard}
          onPress={() => navigation.getParent()?.navigate('Profile', { screen: 'History' })}
          activeOpacity={0.8}
        >
          <View style={s.lastSessionLeft}>
            <Text style={s.lastSessionLabel}>LAST SESSION</Text>
            <Text style={s.lastSessionDate}>
              {new Date(lastSession.startTime).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
          </View>
          <View style={s.lastSessionRight}>
            <Text style={s.lastSessionTricks}>{lastSession.tricks.length} tricks</Text>
            <Ionicons name="chevron-forward" size={16} color={TEXT.t3} />
          </View>
        </TouchableOpacity>
      )}

      {/* Scan button with pulse rings */}
      <View style={s.scanWrap}>
        <Animated.View style={[s.ring2, { transform: [{ scale: pulse2Anim }] }]} />
        <Animated.View style={[s.ring1, { transform: [{ scale: pulseAnim }] }]} />
        <TouchableOpacity
          style={s.scanBtn}
          onPress={() => navigation.navigate('Connect')}
          activeOpacity={0.85}
        >
          <Ionicons name="radio-outline" size={28} color={T.ACCENT_INK} />
          <Text style={s.scanBtnText}>SCAN FOR BOARD</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: BG.base,
    paddingHorizontal: SPACE.xl, paddingTop: 56,
    gap: 20,
  },

  greeting: { gap: 2 },
  greetSmall: { color: TEXT.t3, fontSize: 14, fontFamily: FONT.body },
  greetBig: { color: ACCENT, fontSize: 42, fontFamily: FONT.display, letterSpacing: 3, textTransform: 'uppercase' },
  greetSub: { color: TEXT.t3, fontSize: 13, fontFamily: FONT.body },

  statsRow: { flexDirection: 'row', gap: SPACE.sm },
  statCard: {
    flex: 1, ...PANEL.base,
    padding: SPACE.md, alignItems: 'center',
  },
  statVal: { color: TEXT.t1, fontSize: 24, fontFamily: FONT.display, letterSpacing: -0.5 },
  statLbl: { color: TEXT.t2, fontSize: 10, marginTop: 3, letterSpacing: 0.5, fontFamily: FONT.mono, textTransform: 'uppercase' },

  lastSessionCard: {
    ...PANEL.base,
    padding: SPACE.md, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  lastSessionLeft: { gap: 3 },
  lastSessionLabel: { color: TEXT.t3, fontSize: 10, fontFamily: FONT.mono, letterSpacing: 1.5, textTransform: 'uppercase' },
  lastSessionDate: { color: TEXT.t1, fontSize: 15, fontFamily: FONT.bodySb, textTransform: 'capitalize' },
  lastSessionRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lastSessionTricks: { color: ACCENT, fontSize: 14, fontFamily: FONT.bodySb },

  scanWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring1: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: `${ACCENT}14`, borderWidth: 1, borderColor: `${ACCENT}26`,
  },
  ring2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: `${ACCENT}0A`, borderWidth: 1, borderColor: `${ACCENT}14`,
  },
  scanBtn: {
    backgroundColor: ACCENT, width: 104, height: 104, borderRadius: 52,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 12,
  },
  scanBtnText: { color: T.ACCENT_INK, fontSize: 10, fontFamily: FONT.display, letterSpacing: 1, textTransform: 'uppercase' },
});
