import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { getSessionAnalysis } from '../services/aiCoach';

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
            <ActivityIndicator size="small" color="#4488ff" />
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
            <View style={[styles.dot, { backgroundColor: TRICK_COLORS[trick] || '#fff' }]} />
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
            <View style={[styles.dot, { backgroundColor: TRICK_COLORS[item.trick] || '#fff' }]} />
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
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 24, paddingTop: 56 },
  title: { color: '#e94560', fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  date: { color: '#aaa', fontSize: 14, marginBottom: 24, textTransform: 'capitalize' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: '#16213e', borderRadius: 10, padding: 16, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#aaa', fontSize: 12, marginTop: 4 },

  sectionTitle: { color: '#aaa', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 10 },
  emptyText: { color: '#444', fontSize: 13, marginBottom: 8 },

  breakdownRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#16213e', borderRadius: 8, padding: 12, marginBottom: 6,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  breakdownTrick: { color: '#fff', fontWeight: 'bold', flex: 1 },
  breakdownCount: { color: '#aaa', fontSize: 14 },

  log: { flex: 1 },
  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#222',
  },
  logIndex: { color: '#555', fontSize: 12, width: 28 },
  logTrick: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  logTime: { color: '#555', fontSize: 12 },

  aiBox: { backgroundColor:'#0a1628', borderRadius:10, padding:14, marginBottom:20, borderWidth:1, borderColor:'#1e3a5f' },
  aiLabel: { color:'#4488ff', fontSize:10, fontWeight:'bold', letterSpacing:2, marginBottom:8 },
  aiText: { color:'#ccd9ff', fontSize:13, lineHeight:20 },
  aiLoading: { color:'#444', fontSize:12 },
  btn: {
    backgroundColor: '#e94560', borderRadius: 8,
    paddingVertical: 14, alignItems: 'center', marginTop: 16,
  },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
});
