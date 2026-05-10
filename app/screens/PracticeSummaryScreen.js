import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useTrickStore from '../store/trickStore';

const TRICK_ORDER = ['ollie', 'kickflip', 'heelflip'];

const NEXT_SESSION_TIPS = {
  ollie:    'Next time: focus on making the pop louder — height follows sound.',
  kickflip: 'Next time: flick off the corner of the board, not the flat part.',
  heelflip: 'Next time: kick your heel further forward, not just to the side.',
};

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return `${m}m ${sec}s`;
}

export default function PracticeSummaryScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { tricks } = useTrickStore();
  const { result, trickId } = route.params || {};

  const trick = tricks.find((t) => t.id === trickId);
  if (!trick || !result) return null;

  const { duration, total, landed } = result;
  const pct = total > 0 ? Math.round((landed / total) * 100) : 0;
  const xp = landed * 10;

  // Unlock next trick if >= 70%
  const currentIdx = TRICK_ORDER.indexOf(trickId);
  const nextTrick = pct >= 70 && currentIdx < TRICK_ORDER.length - 1
    ? tricks.find((t) => t.id === TRICK_ORDER[currentIdx + 1])
    : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <View style={styles.header}>
        <Text style={styles.label}>SESSION COMPLETE</Text>
        <Text style={[styles.trickName, { color: trick.color }]}>{trick.name}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatTime(duration)}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{total}</Text>
          <Text style={styles.statLabel}>Attempts</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: trick.color }]}>{landed}</Text>
          <Text style={styles.statLabel}>Landed</Text>
        </View>
      </View>

      {/* Success rate */}
      <View style={styles.section}>
        <View style={styles.rateHeader}>
          <Text style={styles.sectionLabel}>SUCCESS RATE</Text>
          <Text style={[styles.rateValue, { color: trick.color }]}>{pct}%</Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: trick.color }]} />
        </View>
      </View>

      {/* XP */}
      <View style={styles.xpRow}>
        <Ionicons name="flash" size={16} color="#d4ff3d" />
        <Text style={styles.xpText}>+{xp} XP earned</Text>
        {pct === 100 && <Text style={styles.xpBonus}> +50 BONUS</Text>}
      </View>

      {/* Unlock message */}
      {nextTrick && (
        <View style={[styles.unlockCard, { borderColor: nextTrick.color + '44' }]}>
          <Ionicons name="lock-open-outline" size={16} color={nextTrick.color} />
          <Text style={[styles.unlockText, { color: nextTrick.color }]}>
            {nextTrick.name} unlocked — you're ready for the next step.
          </Text>
        </View>
      )}

      {/* Next session tip */}
      <View style={styles.tipCard}>
        <Text style={styles.tipLabel}>NEXT SESSION</Text>
        <Text style={styles.tipText}>{NEXT_SESSION_TIPS[trickId]}</Text>
      </View>

      {/* Back button */}
      <View style={[styles.ctaWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => navigation.navigate('TrickList')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>BACK TO TRICKS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', paddingHorizontal: 20 },

  header: { marginTop: 16, marginBottom: 28 },
  label: { color: '#555', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 },
  trickName: { fontSize: 36, fontWeight: 'bold' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statBox: {
    flex: 1, backgroundColor: '#141414', borderRadius: 12,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  statValue: { color: '#f5f5f0', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { color: '#555', fontSize: 11 },

  section: { marginBottom: 20 },
  rateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionLabel: { color: '#555', fontSize: 11, fontWeight: 'bold', letterSpacing: 2 },
  rateValue: { fontSize: 18, fontWeight: 'bold' },
  progressBg: { height: 8, backgroundColor: '#2a2a2a', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  xpRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 20,
  },
  xpText: { color: '#d4ff3d', fontSize: 14, fontWeight: '600' },
  xpBonus: { color: '#d4ff3d', fontSize: 12, fontWeight: 'bold' },

  unlockCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#141414', borderRadius: 12,
    padding: 14, marginBottom: 16,
    borderWidth: 1,
  },
  unlockText: { fontSize: 13, flex: 1, lineHeight: 18 },

  tipCard: {
    backgroundColor: '#141414', borderRadius: 12,
    padding: 16, marginBottom: 'auto',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  tipLabel: { color: '#555', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 },
  tipText: { color: '#888', fontSize: 14, lineHeight: 20 },

  ctaWrap: { paddingTop: 16 },
  ctaBtn: {
    backgroundColor: '#d4ff3d', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  ctaBtnText: { color: '#0a0a0a', fontSize: 15, fontWeight: 'bold', letterSpacing: 1 },
});
