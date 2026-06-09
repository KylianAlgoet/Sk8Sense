import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useSessionStore from '../store/sessionStore';
import useAuthStore from '../store/authStore';
import useBleStore from '../store/bleStore';
import { BG, TEXT, LINE, ACCENT, PANEL, FONT, SPACE } from '../design-tokens';
import { V3Grid, V3RegStrip, V3SectionHead, V3StatGrid, V3MotionAI, V3MotionTip, V3Ticked, V3Chip, BoardLinkCard } from '../components/V3Shared';

const IS_WEB = Platform.OS === 'web';
const SCORE_COLORS = { Clean: '#4CAF50', Solid: '#3DD8F4', Shaky: '#FFB020', 'Needs work': '#FF4438' };
function scoreColor(label) { return SCORE_COLORS[label] || ACCENT; }
function normalizeTrick(trick) {
  if (trick === 'bs_shuv' || trick === 'fs_shuv') return 'pop_shuvit';
  return trick;
}
function trickLabel(trick) {
  const normalized = normalizeTrick(trick);
  if (normalized === 'pop_shuvit') return 'POP SHUVIT';
  return normalized.toUpperCase();
}

export default function HomeScreen({ navigation }) {
  const { sessions } = useSessionStore();
  const { user } = useAuthStore();
  const { connectedDevice, disconnect } = useBleStore();

  const handleDisconnect = () => {
    if (!IS_WEB) connectedDevice?.cancelConnection();
    disconnect();
  };

  const totalTricks  = sessions.reduce((acc, s) => acc + s.tricks.length, 0);
  const totalSeconds = sessions.reduce((acc, s) => acc + s.duration, 0);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const lastSession  = sessions[0];

  // Readiness Index — average clean score across the last 5 sessions' scored attempts.
  // Real number from real sensor data (see services/trickScore.js), not a placeholder counter.
  const recentScored = sessions.slice(0, 5).flatMap(sess => sess.tricks.filter(t => typeof t.cleanScore === 'number'));
  const readiness = recentScored.length
    ? Math.round(recentScored.reduce((acc, t) => acc + t.cleanScore, 0) / recentScored.length)
    : 0;
  const readinessTag = readiness >= 85 ? 'PEAK' : readiness >= 65 ? 'SOLID' : readiness >= 45 ? 'BUILDING' : readiness > 0 ? 'EARLY' : 'NO DATA';

  const lastScored = lastSession?.tricks.filter(t => typeof t.cleanScore === 'number') || [];
  const lastSessionScore = lastScored.length
    ? Math.round(lastScored.reduce((acc, t) => acc + t.cleanScore, 0) / lastScored.length)
    : null;
  const prevScored = sessions[1]?.tricks.filter(t => typeof t.cleanScore === 'number') || [];
  const prevSessionScore = prevScored.length
    ? Math.round(prevScored.reduce((acc, t) => acc + t.cleanScore, 0) / prevScored.length)
    : null;
  const scoreDelta = (lastSessionScore != null && prevSessionScore != null) ? lastSessionScore - prevSessionScore : null;

  // Cleanest attempt across the last 5 sessions — same deterministic cleanScore
  // data the Session Summary "standout attempts" card uses (services/trickScore.js).
  const cleanestAttempt = recentScored.length
    ? recentScored.reduce((a, b) => (b.cleanScore > a.cleanScore ? b : a))
    : null;

  const [heroPage, setHeroPage] = useState(0);
  const heroWidth = Dimensions.get('window').width - 36; // matches content's horizontal padding (18 * 2)
  const onHeroScrollEnd = (e) => {
    setHeroPage(Math.round(e.nativeEvent.contentOffset.x / heroWidth));
  };

  return (
    <View style={s.container}>
      <V3Grid />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* RegStrip */}
        <V3RegStrip scanId="SCN_0048" node="SK8.MIS" live={sessions.length > 0} />

        {/* Wordmark */}
        <View style={s.wordmarkRow}>
          <Text style={s.wordmark}>SKATESENSE</Text>
          <Text style={s.wordmarkSub}>.MOVEMENT INTELLIGENCE</Text>
        </View>

        {/* Board link status — same live/offline indicator as the Dashboard, so riders
            always know their connection state before they ever start a session */}
        <BoardLinkCard
          live={IS_WEB || !!connectedDevice}
          deviceName={connectedDevice?.name || (IS_WEB ? 'SK8Sense ESP32 (Demo)' : null)}
          simulated={IS_WEB}
          onPressConnect={() => navigation.navigate('Connect')}
          onPressDisconnect={handleDisconnect}
        />

        {/* Hero carousel — swipe between Readiness Index and your cleanest attempt */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onHeroScrollEnd}
          style={s.heroScroll}
          contentContainerStyle={{ width: heroWidth * 2 }}
        >
          <V3Ticked style={[s.hero, { width: heroWidth }]}>
            <View style={s.heroTop}>
              <View style={s.heroTopLeft}>
                <Text style={s.heroLabel}>· SKILL LEVEL ·</Text>
                <V3Chip label={readinessTag} variant="live" />
              </View>
            </View>
            <View style={s.heroMain}>
              <Text style={s.heroNum}>{readiness}</Text>
              <Text style={s.heroPct}>%</Text>
              <View style={s.heroRight}>
                <Text style={s.heroRightText}>LANDING{'\n'}CONSISTENCY</Text>
              </View>
            </View>
            <View style={s.heroDivider} />
            <View style={s.heroBottom}>
              <Text style={s.heroMetaLeft}>T−06:00</Text>
              <Text style={s.heroMetaCenter}>BALANCE VECTOR · 100HZ</Text>
              <Text style={s.heroMetaRight}>NOW</Text>
            </View>
          </V3Ticked>

          <V3Ticked style={[s.hero, { width: heroWidth }]}>
            <View style={s.heroTop}>
              <View style={s.heroTopLeft}>
                <Text style={s.heroLabel}>· CLEANEST ATTEMPT ·</Text>
                {cleanestAttempt && <V3Chip label={cleanestAttempt.cleanLabel.toUpperCase()} variant="live" />}
              </View>
            </View>
            {cleanestAttempt ? (
              <>
                <View style={s.heroMain}>
                  <Text style={[s.heroNum, { color: scoreColor(cleanestAttempt.cleanLabel), fontSize: 80 }]}>{cleanestAttempt.cleanScore}</Text>
                  <View style={s.heroRight}>
                    <Text style={s.heroRightText}>{trickLabel(cleanestAttempt.trick).replace(' ', '\n')}</Text>
                  </View>
                </View>
                <View style={s.heroDivider} />
                <View style={s.heroBottom}>
                  <Text style={s.heroMetaLeft}>BEST OF {recentScored.length}</Text>
                  <Text style={s.heroMetaCenter}>CLEAN-SCORE BREAKDOWN</Text>
                  <Text style={s.heroMetaRight}>LAST 5</Text>
                </View>
              </>
            ) : (
              <View style={s.heroEmptyMain}>
                <Text style={s.heroRightText}>Land your first trick to{'\n'}see your cleanest attempt here.</Text>
              </View>
            )}
          </V3Ticked>
        </ScrollView>

        {/* Page dots — hint that the hero card is swipeable */}
        <View style={s.heroDots}>
          {[0, 1].map((i) => (
            <View key={i} style={[s.heroDot, i === heroPage && s.heroDotActive]} />
          ))}
        </View>

        {/* SK8Sense AI Coach */}
        <V3MotionAI
          text={
            recentScored.length === 0
              ? "Connect your board to start tracking. The first rep is always the hardest."
              : readiness >= 85
                ? `${sessions.length}-session streak logged. Landings are clean and consistent — push for harder tricks.`
                : readiness >= 65
                  ? `${sessions.length}-session streak logged. Solid base — today's target is landing consistency.`
                  : `${sessions.length}-session streak logged. Lots of room to grow — focus on sticking the landing.`
          }
          cta="INITIATE SESSION"
          // Already paired (or on web demo)? Skip the handshake — go straight to the live board.
          // Only riders who genuinely aren't connected get routed through Connect first.
          onCta={() => {
            if (IS_WEB || connectedDevice) navigation.navigate('Dashboard');
            else navigation.navigate('Connect');
          }}
        />

        {/* Stats */}
        <V3StatGrid stats={[
          { value: totalTricks, label: 'DETECTIONS' },
          { value: sessions.length, label: 'SESSIONS' },
          { value: `${totalMinutes}M`, label: 'ON-BOARD' },
        ]} />

        {/* Latest session — or a first-run nudge for riders with no sessions yet */}
        {!lastSession ? (
          <>
            <V3SectionHead num="/04" label="LATEST SESSION" />
            <View style={s.emptyWrap}>
              <Ionicons name="bar-chart-outline" size={32} color={TEXT.t3} />
              <Text style={s.emptyTitle}>No sessions yet</Text>
              <Text style={s.emptyText}>Connect your board and start your first session — your stats will show up here.</Text>
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate('Profile', { screen: 'History' })}
              activeOpacity={0.75}
            >
              <V3SectionHead num="/04" label="LATEST SESSION" right="VIEW ALL ›" />
            </TouchableOpacity>
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
                <Text style={s.sessionScoreNum}>{lastSessionScore != null ? lastSessionScore : '--'}</Text>
                {scoreDelta != null && scoreDelta !== 0 && (
                  <Text style={[s.sessionScoreDelta, scoreDelta < 0 && { color: '#FF4438' }]}>
                    {scoreDelta > 0 ? `▲ +${scoreDelta}` : `▼ ${scoreDelta}`}
                  </Text>
                )}
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

  wordmarkRow: { alignItems: 'flex-start' },
  wordmark: { fontFamily: FONT.display, fontSize: 22, color: TEXT.t1, textTransform: 'uppercase', letterSpacing: -0.3 },
  wordmarkSub: { fontFamily: FONT.mono, fontSize: 9, color: TEXT.t3, letterSpacing: 3.5, textTransform: 'uppercase', marginTop: 3 },

  heroScroll: { flexGrow: 0 },
  heroEmptyMain: { paddingVertical: 28, alignItems: 'center', justifyContent: 'center' },
  heroDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: -4 },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: LINE.dim },
  heroDotActive: { backgroundColor: ACCENT, width: 16 },

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

  emptyWrap: { ...PANEL.base, alignItems: 'center', padding: 24, gap: 10 },
  emptyTitle: { fontFamily: FONT.bodySb, fontSize: 14, color: TEXT.t1 },
  emptyText: { fontFamily: FONT.body, fontSize: 12, color: TEXT.t3, textAlign: 'center', lineHeight: 18, maxWidth: 260 },
});
