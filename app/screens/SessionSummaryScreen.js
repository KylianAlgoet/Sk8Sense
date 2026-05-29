import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { getSessionAnalysis } from '../services/aiCoach';
import T, { BG, TEXT, LINE, ACCENT, PANEL, BTN, FONT, SPACE, R } from '../design-tokens';

const TRICK_COLORS = {
  ollie:    '#4CAF50',
  kickflip: '#2196F3',
  heelflip: '#FF9800',
};

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function trickCounts(tricks) {
  return tricks.reduce((acc, { trick }) => {
    acc[trick] = (acc[trick] || 0) + 1;
    return acc;
  }, {});
}

export default function SessionSummaryScreen({ navigation, route }) {
  const { session } = route.params;
  const counts = trickCounts(session.tricks);
  const tpm = session.duration > 0
    ? (session.tricks.length / (session.duration / 60)).toFixed(1)
    : '0.0';
  const maxImpact = session.maxImpact ? (session.maxImpact / 9.81).toFixed(1) : null;

  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    getSessionAnalysis({
      tricks: session.tricks,
      duration: session.duration,
      maxImpact: session.maxImpact,
    }).then(text => { setAiAnalysis(text || ''); setAiLoading(false); })
      .catch(() => setAiLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Complete</Text>
      <Text style={styles.date}>{new Date(session.startTime).toLocaleDateString('nl-BE', {
        weekday: 'long', day: 'numeric', month: 'long',
      })}</Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatDuration(session.duration)}</Text>
          <Text style={styles.statLabel}>Duur</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{session.tricks.length}</Text>
          <Text style={styles.statLabel}>Tricks</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{tpm}</Text>
          <Text style={styles.statLabel}>Tricks/min</Text>
        </View>
        {maxImpact && (
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#FF9800' }]}>{maxImpact}g</Text>
            <Text style={styles.statLabel}>Max impact</Text>
          </View>
        )}
      </View>

      {/* AI Coach analysis */}
      <View style={styles.aiBox}>
        <Text style={styles.aiLabel}>🤖 AI COACH</Text>
        {aiLoading ? (
          <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginTop:4 }}>
            <ActivityIndicator size="small" color={T.CYAN} />
            <Text style={styles.aiLoading}>Analysing your session...</Text>
          </View>
        ) : (
          <Text style={styles.aiText}>{aiAnalysis || 'No data to analyse yet.'}</Text>
        )}
      </View>

      {/* Trick breakdown */}
      <Text style={styles.sectionTitle}>Trick Breakdown</Text>
      {Object.entries(counts).length === 0 ? (
        <Text style={styles.emptyText}>Geen tricks gedetecteerd</Text>
      ) : (
        Object.entries(counts).map(([trick, count]) => (
          <View key={trick} style={styles.breakdownRow}>
            <View style={[styles.dot, { backgroundColor: TRICK_COLORS[trick] || TEXT.t1 }]} />
            <Text style={styles.breakdownTrick}>{trick.toUpperCase()}</Text>
            <Text style={styles.breakdownCount}>×{count}</Text>
          </View>
        ))
      )}

      {/* Trick log */}
      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Trick Log</Text>
      <FlatList
        data={session.tricks}
        keyExtractor={(_, i) => i.toString()}
        style={styles.log}
        ListEmptyComponent={<Text style={styles.emptyText}>Geen tricks</Text>}
        renderItem={({ item, index }) => (
          <View style={styles.logRow}>
            <Text style={styles.logIndex}>#{index + 1}</Text>
            <View style={[styles.dot, { backgroundColor: TRICK_COLORS[item.trick] || TEXT.t1 }]} />
            <Text style={styles.logTrick}>{item.trick.toUpperCase()}</Text>
            <Text style={styles.logTime}>
              {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Text>
          </View>
        )}
      />

      <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.btnText}>TERUG NAAR HOME</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.base, padding: SPACE.xl, paddingTop: 56 },
  title: { color: ACCENT, fontSize: 28, fontFamily: FONT.display, textTransform: 'uppercase', letterSpacing: -0.5, marginBottom: 4 },
  date: { color: TEXT.t2, fontSize: 14, fontFamily: FONT.body, marginBottom: SPACE.xl, textTransform: 'capitalize' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: SPACE.xl },
  statBox: { flex: 1, ...PANEL.base, padding: 16, alignItems: 'center' },
  statValue: { color: TEXT.t1, fontSize: 24, fontFamily: FONT.display, letterSpacing: -0.8 },
  statLabel: { color: TEXT.t2, fontSize: 12, fontFamily: FONT.mono, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionTitle: { color: TEXT.t2, fontSize: 12, fontFamily: FONT.mono, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  emptyText: { color: TEXT.t3, fontSize: 13, fontFamily: FONT.body, marginBottom: 8 },

  breakdownRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    ...PANEL.base, padding: 12, marginBottom: 6,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  breakdownTrick: { color: TEXT.t1, fontFamily: FONT.bodySb, textTransform: 'uppercase', flex: 1 },
  breakdownCount: { color: TEXT.t2, fontSize: 14, fontFamily: FONT.mono },

  log: { flex: 1 },
  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: LINE.dim,
  },
  logIndex: { color: TEXT.t3, fontSize: 12, fontFamily: FONT.mono, width: 28 },
  logTrick: { color: TEXT.t1, fontSize: 13, fontFamily: FONT.bodySb, textTransform: 'uppercase', flex: 1 },
  logTime: { color: TEXT.t3, fontSize: 12, fontFamily: FONT.mono },

  aiBox: { ...PANEL.accent, padding: 14, marginBottom: 20 },
  aiLabel: { color: T.CYAN, fontSize: 10, fontFamily: FONT.mono, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  aiText: { color: TEXT.t1, fontSize: 13, fontFamily: FONT.body, lineHeight: 20 },
  aiLoading: { color: TEXT.t3, fontSize: 12, fontFamily: FONT.body },
  btn: {
    ...BTN.base, ...BTN.primary, marginTop: 16,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, elevation: 6,
  },
  btnText: { ...BTN.primaryText, fontSize: 14 },
});
