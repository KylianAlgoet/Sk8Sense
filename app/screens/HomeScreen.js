import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useSessionStore from '../store/sessionStore';
import useAuthStore from '../store/authStore';
import { BG, TEXT, LINE, ACCENT, PANEL, BTN, FONT, SPACE, R } from '../design-tokens';
import { V3Grid, V3RegStrip, V3SectionHead, V3StatGrid, V3MotionAI, V3MotionTip, V3Ticked, V3Chip } from '../components/V3Shared';

export default function HomeScreen({ navigation }) {
  const { sessions } = useSessionStore();
  const { user } = useAuthStore();

  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const totalTricks  = sessions.reduce((acc, s) => acc + s.tricks.length, 0);
  const totalSeconds = sessions.reduce((acc, s) => acc + s.duration, 0);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const lastSession  = sessions[0];

  const readiness = sessions.length > 0 ? Math.min(82 + sessions.length, 99) : 0;

  return (
    <View style={s.container}>
      <V3Grid />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* RegStrip */}
        <V3RegStrip scanId="SCN_0048" node="SK8.MIS" live={sessions.length > 0} />

        {/* Wordmark */}
        <View style={s.wordmarkRow}>
          <View>
            <Text style={s.wordmark}>SKATESENSE</Text>
            <Text style={s.wordmarkSub}>.MOVEMENT INTELLIGENCE</Text>
          </View>
          <TouchableOpacity style={s.iconBtn}>
            <Ionicons name="notifications-outline" size={15} color={TEXT.t2} />
          </TouchableOpacity>
        </View>

        {/* Readiness hero */}
        <V3Ticked style={s.hero}>
          <View style={s.heroTop}>
            <View style={s.heroTopLeft}>
              <Text style={s.heroLabel}>· READINESS INDEX ·</Text>
              <V3Chip label="PEAK" variant="live" />
            </View>
          </View>
          <View style={s.heroMain}>
            <Text style={s.heroNum}>{readiness}</Text>
            <Text style={s.heroPct}>%</Text>
            <View style={s.heroRight}>
              <Text style={s.heroRightText}>MOTION{'\n'}STABILITY</Text>
            </View>
          </View>
          <View style={s.heroDivider} />
          <View style={s.heroBottom}>
            <Text style={s.heroMetaLeft}>T−06:00</Text>
            <Text style={s.heroMetaCenter}>BALANCE VECTOR · 100HZ</Text>
            <Text style={s.heroMetaRight}>NOW</Text>
          </View>
        </V3Ticked>

        {/* Motion AI */}
        <V3MotionAI
          text={sessions.length > 0
            ? `${sessions.length}-session streak logged. Pop telemetry is strong — today's target is landing consistency.`
            : "Connect your board to start tracking. The first rep is always the hardest."}
          cta="INITIATE SESSION"
          onCta={() => navigation.navigate('Connect')}
        />

        {/* Stats */}
        <V3StatGrid stats={[
          { value: totalTricks, label: 'DETECTIONS' },
          { value: sessions.length, label: 'SESSIONS' },
          { value: `${totalMinutes}M`, label: 'ON-BOARD' },
        ]} />

        {/* Analyze button */}
        <TouchableOpacity style={s.ghostBtn}>
          <Ionicons name="camera-outline" size={14} color={TEXT.t1} />
          <Text style={s.ghostBtnText}>ANALYZE MOVEMENT</Text>
        </TouchableOpacity>

        {/* Latest session */}
        {lastSession && (
          <>
            <V3SectionHead num="/04" label="LATEST SESSION" right="VIEW ALL ›" />
            <TouchableOpacity
              style={s.sessionRow}
              onPress={() => navigation.getParent()?.navigate('Profile', { screen: 'History' })}
              activeOpacity={0.8}
            >
              <View style={s.sessionIndex}>
                <Text style={s.sessionIndexLabel}>SES</Text>
                <Text style={s.sessionIndexNum}>{String(sessions.length).padStart(3, '0')}</Text>
              </View>
              <View style={s.sessionBody}>
                <Text style={s.sessionDate}>
                  {new Date(lastSession.startTime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                </Text>
                <Text style={s.sessionMeta}>{lastSession.tricks.length} DETECTIONS · {Math.floor(lastSession.duration / 60)}MIN</Text>
              </View>
              <View style={s.sessionScore}>
                <Text style={s.sessionScoreNum}>{lastSession.tricks.length > 0 ? 82 : '--'}</Text>
                <Text style={s.sessionScoreDelta}>{lastSession.tricks.length > 0 ? '▲ +6' : ''}</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.base },
  content: { paddingTop: 60, paddingHorizontal: 18, paddingBottom: 96, gap: 14 },

  wordmarkRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  wordmark: { fontFamily: FONT.display, fontSize: 22, color: TEXT.t1, textTransform: 'uppercase', letterSpacing: -0.3 },
  wordmarkSub: { fontFamily: FONT.mono, fontSize: 9, color: TEXT.t3, letterSpacing: 3.5, textTransform: 'uppercase', marginTop: 3 },
  iconBtn: { width: 34, height: 34, backgroundColor: BG.b2, borderWidth: 1, borderColor: LINE.dim, borderRadius: R, alignItems: 'center', justifyContent: 'center' },

  hero: { padding: 16, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroLabel: { fontFamily: FONT.mono, fontSize: 9, color: ACCENT, letterSpacing: 2, textTransform: 'uppercase' },
  heroMain: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  heroNum: { fontFamily: FONT.display, fontSize: 80, color: ACCENT, letterSpacing: -3, lineHeight: 80 },
  heroPct: { fontFamily: FONT.mono, fontSize: 13, color: TEXT.t3, marginBottom: 10 },
  heroRight: { flex: 1, alignItems: 'flex-end', marginBottom: 6 },
  heroRightText: { fontFamily: FONT.display, fontSize: 18, color: TEXT.t1, textTransform: 'uppercase', textAlign: 'right', lineHeight: 20 },
  heroDivider: { height: 1, backgroundColor: LINE.dim },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  heroMetaLeft: { fontFamily: FONT.mono, fontSize: 8, color: TEXT.t4 },
  heroMetaCenter: { fontFamily: FONT.mono, fontSize: 8, color: TEXT.t4 },
  heroMetaRight: { fontFamily: FONT.mono, fontSize: 8, color: TEXT.t4 },

  ghostBtn: { ...BTN.base, ...BTN.ghost, justifyContent: 'center', gap: 8 },
  ghostBtnText: { fontFamily: FONT.display, fontSize: 12, letterSpacing: 0.48, textTransform: 'uppercase', color: TEXT.t1 },

  sessionRow: { flexDirection: 'row', ...PANEL.raised, overflow: 'hidden' },
  sessionIndex: { width: 42, backgroundColor: BG.b1, borderRightWidth: 1, borderRightColor: LINE.dim, padding: 13, justifyContent: 'flex-end', gap: 2 },
  sessionIndexLabel: { fontFamily: FONT.mono, fontSize: 8, color: TEXT.t3, textTransform: 'uppercase' },
  sessionIndexNum: { fontFamily: FONT.display, fontSize: 11, color: ACCENT },
  sessionBody: { flex: 1, padding: 13, gap: 4, justifyContent: 'center' },
  sessionDate: { fontFamily: FONT.display, fontSize: 13, color: TEXT.t1, letterSpacing: -0.2 },
  sessionMeta: { fontFamily: FONT.mono, fontSize: 9, color: TEXT.t3, letterSpacing: 1 },
  sessionScore: { padding: 13, alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
  sessionScoreNum: { fontFamily: FONT.display, fontSize: 28, color: ACCENT, letterSpacing: -1 },
  sessionScoreDelta: { fontFamily: FONT.mono, fontSize: 9, color: ACCENT },
});
