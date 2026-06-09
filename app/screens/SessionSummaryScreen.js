import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, InteractionManager } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSessionAnalysis } from '../services/aiCoach';
import { describeFactor } from '../services/trickScore';
import { BG, TEXT, LINE, ACCENT, FONT, R } from '../design-tokens';
import { V3Grid, V3SectionHead, V3StatGrid, V3MotionAI } from '../components/V3Shared';

const SCORE_COLORS = { Clean: '#4CAF50', Solid: '#3DD8F4', Shaky: '#FFB020', 'Needs work': '#FF4438' };
function scoreColor(label) { return SCORE_COLORS[label] || TEXT.t2; }

const TRICK_COLORS = {
  ollie:    '#4CAF50',
  kickflip: '#2196F3',
  heelflip: '#FF9800',
  pop_shuvit: ACCENT,
  bs_shuv:  ACCENT,
  fs_shuv:  '#9C27B0',
};

function normalizeTrick(trick) {
  if (trick === 'bs_shuv' || trick === 'fs_shuv') return 'pop_shuvit';
  return trick;
}

function trickLabel(trick) {
  const normalized = normalizeTrick(trick);
  if (normalized === 'pop_shuvit') return 'POP SHUVIT';
  return normalized.toUpperCase();
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function trickCounts(tricks) {
  return tricks.reduce((acc, { trick }) => {
    const normalized = normalizeTrick(trick);
    acc[normalized] = (acc[normalized] || 0) + 1;
    return acc;
  }, {});
}

function buildCoachSummary({ session, cleanest, weakest, landedCount }) {
  if (!session.tricks.length) {
    return [
      { label: 'Read', text: 'No clear tricks were logged in this run.' },
      { label: 'Next rep', text: 'Get one clean pop and ride away before chasing rotation.' },
    ];
  }

  const items = [
    { label: 'Session read', text: `${landedCount}/${session.tricks.length} attempts landed. Keep the setup calm before the pop.` },
  ];

  if (cleanest) {
    items.push({
      label: 'Best attempt',
      text: `${trickLabel(cleanest.trick)} looked best at ${cleanest.cleanScore}. Keep that catch point.`,
    });
  }

  if (weakest && weakest !== cleanest) {
    items.push({
      label: 'Focus',
      text: `${trickLabel(weakest.trick)} needs ${describeFactor(weakest.weakestFactor)}. Get the board fully around before committing feet.`,
    });
  } else {
    items.push({ label: 'Focus', text: 'Repeat the same timing and keep the board under you after catch.' });
  }

  return items;
}

export default function SessionSummaryScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { session } = route.params;
  const counts = trickCounts(session.tricks);
  const tpm = session.duration > 0
    ? (session.tricks.length / (session.duration / 60)).toFixed(1)
    : '0.0';
  const maxImpact = session.maxImpact ? (session.maxImpact / 9.81).toFixed(1) : null;

  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(true);

  const handleHome = () => {
    const parent = navigation.getParent?.();
    if (parent) parent.navigate('Board', { screen: 'Home' });
    else navigation.navigate('Home');
  };

  useEffect(() => {
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      getSessionAnalysis({
        tricks: session.tricks,
        duration: session.duration,
        maxImpact: session.maxImpact,
      }).then(text => {
        if (!cancelled) {
          setAiAnalysis(text || '');
          setAiLoading(false);
        }
      }).catch(() => {
        if (!cancelled) setAiLoading(false);
      });
    });

    return () => {
      cancelled = true;
      task.cancel?.();
    };
  }, [session]);

  const stats = [
    { value: formatDuration(session.duration), label: 'DURATION' },
    { value: session.tricks.length, label: 'TRICKS' },
    { value: tpm, label: 'TRICKS/MIN' },
  ];
  if (maxImpact) stats.push({ value: maxImpact, unit: 'G', label: 'MAX IMPACT', hot: true });

  // Best/worst scored attempts — computed deterministically in sessionStore via trickScore.js
  const scored = session.tricks.filter(t => typeof t.cleanScore === 'number');
  const cleanest = scored.length ? scored.reduce((a, b) => (b.cleanScore > a.cleanScore ? b : a)) : null;
  const weakest = scored.length > 1 ? scored.reduce((a, b) => (b.cleanScore < a.cleanScore ? b : a)) : null;
  const landedCount = session.tricks.filter(t => t.landed !== false).length;
  const coachSummary = buildCoachSummary({ session, cleanest, weakest, landedCount });

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <V3Grid />
      <StatusBar barStyle="light-content" backgroundColor={BG.base} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={TEXT.t2} />
        </TouchableOpacity>
        <Text style={s.headerLabel}>/ SESSION · SUMMARY</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={s.titleBlock}>
          <View style={s.titleTickTL} /><View style={s.titleTickBR} />
          <Text style={s.dateLabel}>{new Date(session.startTime).toLocaleDateString('nl-BE', {
            weekday: 'long', day: 'numeric', month: 'long',
          })}</Text>
          <Text style={s.title}>SESSION COMPLETE</Text>
        </View>

        {/* Stats */}
        <V3StatGrid stats={stats} />

        <View style={{ height: 20 }} />

        {/* SK8Sense AI Coach */}
        <V3MotionAI
          summaryItems={coachSummary}
          detailText={aiLoading
            ? 'Analysing your session...'
            : (aiAnalysis || 'Detailed cloud coaching is offline right now. The summary above is based on the session score, landed attempts and weakest factor.')}
        />

        <View style={{ height: 24 }} />

        {/* Best / worst attempts — from deterministic clean-score analysis */}
        {(cleanest || weakest) && (
          <>
            <V3SectionHead num="/01" label="STANDOUT ATTEMPTS" right={`${landedCount}/${session.tricks.length} LANDED`} />
            <View style={s.standoutRow}>
              {cleanest && (
                <View style={[s.standoutCard, { borderColor: `${scoreColor(cleanest.cleanLabel)}55` }]}>
                  <Text style={s.standoutTag}>CLEANEST</Text>
                  <Text style={s.standoutTrick}>{trickLabel(cleanest.trick)}</Text>
                  <Text style={[s.standoutScore, { color: scoreColor(cleanest.cleanLabel) }]}>{cleanest.cleanScore}</Text>
                  <Text style={s.standoutLabel}>{cleanest.cleanLabel.toUpperCase()}</Text>
                </View>
              )}
              {weakest && (
                <View style={[s.standoutCard, { borderColor: `${scoreColor(weakest.cleanLabel)}55` }]}>
                  <Text style={s.standoutTag}>NEEDS WORK</Text>
                  <Text style={s.standoutTrick}>{trickLabel(weakest.trick)}</Text>
                  <Text style={[s.standoutScore, { color: scoreColor(weakest.cleanLabel) }]}>{weakest.cleanScore}</Text>
                  <Text style={s.standoutLabel}>
                    {weakest.weakestFactor ? `WORK ON ${describeFactor(weakest.weakestFactor).toUpperCase()}` : weakest.cleanLabel.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ height: 24 }} />
          </>
        )}

        {/* Trick breakdown */}
        <V3SectionHead num="/02" label="TRICK BREAKDOWN" />
        {Object.entries(counts).length === 0 ? (
          <Text style={s.emptyText}>No tricks detected</Text>
        ) : (
          Object.entries(counts).map(([trick, count]) => (
            <View key={trick} style={s.breakdownRow}>
              <View style={[s.dot, { backgroundColor: TRICK_COLORS[normalizeTrick(trick)] || TEXT.t1 }]} />
              <Text style={s.breakdownTrick}>{trickLabel(trick)}</Text>
              <Text style={s.breakdownCount}>×{count}</Text>
            </View>
          ))
        )}

        <View style={{ height: 20 }} />

        {/* Trick log */}
        <V3SectionHead num="/03" label="TRICK LOG" right={`${session.tricks.length} TOTAL`} />
        {session.tricks.length === 0 ? (
          <Text style={s.emptyText}>No tricks</Text>
        ) : (
          session.tricks.map((item, index) => (
            <View key={index} style={s.logRow}>
              <Text style={s.logIndex}>#{index + 1}</Text>
              <View style={[s.dot, { backgroundColor: TRICK_COLORS[normalizeTrick(item.trick)] || TEXT.t1 }]} />
              <Text style={s.logTrick}>{trickLabel(item.trick)}</Text>
              {item.landed === false && (
                <View style={s.bailedChip}><Text style={s.bailedChipText}>BAILED</Text></View>
              )}
              {typeof item.cleanScore === 'number' && (
                <Text style={[s.logScore, { color: scoreColor(item.cleanLabel) }]}>{item.cleanScore}</Text>
              )}
              <Text style={s.logTime}>
                {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Text>
            </View>
          ))
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* CTA */}
      <View style={[s.ctaWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={s.ctaBtn} onPress={handleHome} activeOpacity={0.85}>
          <Text style={s.ctaBtnText}>BACK TO HOME</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.base },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: R, backgroundColor: BG.b2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: LINE.dim },
  headerLabel: { flex: 1, fontFamily: FONT.mono, fontSize: 9, color: TEXT.t3, letterSpacing: 1.5, textTransform: 'uppercase' },

  content: { paddingHorizontal: 18, paddingTop: 8 },

  titleBlock: { backgroundColor: BG.b2, borderWidth: 1, borderColor: LINE.dim, borderRadius: R, padding: 16, marginBottom: 22, position: 'relative' },
  titleTickTL: { position: 'absolute', top: -1, left: -1, width: 8, height: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: ACCENT },
  titleTickBR: { position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: ACCENT },
  dateLabel: { fontFamily: FONT.mono, fontSize: 9, color: ACCENT, letterSpacing: 0.9, marginBottom: 8, textTransform: 'capitalize' },
  title: { fontFamily: FONT.display, fontSize: 32, color: TEXT.t1, textTransform: 'uppercase', letterSpacing: -1.2 },

  emptyText: { fontFamily: FONT.body, fontSize: 13, color: TEXT.t3, marginBottom: 8 },

  standoutRow: { flexDirection: 'row', gap: 10 },
  standoutCard: {
    flex: 1, backgroundColor: BG.b2, borderWidth: 1, borderRadius: R,
    padding: 14, alignItems: 'center', gap: 4,
  },
  standoutTag: { fontFamily: FONT.mono, fontSize: 8, letterSpacing: 1.4, color: TEXT.t3, textTransform: 'uppercase' },
  standoutTrick: { fontFamily: FONT.bodySb, fontSize: 13, color: TEXT.t1, textTransform: 'uppercase', marginTop: 2 },
  standoutScore: { fontFamily: FONT.display, fontSize: 30, letterSpacing: -1, marginTop: 4 },
  standoutLabel: { fontFamily: FONT.mono, fontSize: 8, letterSpacing: 1, color: TEXT.t3, textTransform: 'uppercase', textAlign: 'center', marginTop: 2 },

  breakdownRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: BG.b2, borderWidth: 1, borderColor: LINE.dim, borderRadius: R,
    padding: 12, marginBottom: 7,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  breakdownTrick: { fontFamily: FONT.bodySb, fontSize: 13, color: TEXT.t1, textTransform: 'uppercase', flex: 1 },
  breakdownCount: { fontFamily: FONT.mono, fontSize: 13, color: TEXT.t2 },

  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: LINE.dim,
  },
  logIndex: { fontFamily: FONT.mono, fontSize: 11, color: TEXT.t3, width: 28 },
  logTrick: { fontFamily: FONT.bodySb, fontSize: 13, color: TEXT.t1, textTransform: 'uppercase', flex: 1 },
  logScore: { fontFamily: FONT.display, fontSize: 14, letterSpacing: -0.5, marginRight: 4 },
  logTime: { fontFamily: FONT.mono, fontSize: 11, color: TEXT.t3 },

  bailedChip: { borderWidth: 1, borderColor: '#FF443855', borderRadius: R, paddingHorizontal: 6, paddingVertical: 2 },
  bailedChipText: { fontFamily: FONT.mono, fontSize: 8, letterSpacing: 1, color: '#FF4438' },

  ctaWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 18, paddingTop: 12, backgroundColor: BG.base, borderTopWidth: 1, borderTopColor: LINE.dim },
  ctaBtn: { backgroundColor: ACCENT, borderRadius: R, paddingVertical: 15, alignItems: 'center' },
  ctaBtnText: { fontFamily: FONT.display, fontSize: 13, color: '#0A0A0B', letterSpacing: 0.5, textTransform: 'uppercase' },
});
