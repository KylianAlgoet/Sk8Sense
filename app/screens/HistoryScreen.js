import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useSessionStore from '../store/sessionStore';
import useAuthStore from '../store/authStore';
import { BG, TEXT, LINE, ACCENT, FONT, R } from '../design-tokens';
import { V3Grid, V3SectionHead } from '../components/V3Shared';

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function normalizeTrick(trick) {
  if (trick === 'bs_shuv' || trick === 'fs_shuv') return 'pop_shuvit';
  return trick;
}

function trickLabel(trick) {
  const normalized = normalizeTrick(trick);
  if (normalized === 'pop_shuvit') return 'POP SHUVIT';
  return normalized.toUpperCase();
}

function topTrick(tricks) {
  if (!tricks.length) return null;
  const counts = tricks.reduce((acc, { trick }) => {
    const normalized = normalizeTrick(trick);
    acc[normalized] = (acc[normalized] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function TrickChart({ sessions }) {
  const recent = [...sessions].slice(0, 7).reverse();
  if (!recent.length) return null;
  const maxTricks = Math.max(...recent.map((s) => s.tricks.length), 1);

  return (
    <View style={chart.container}>
      <View style={chart.titleTickTL} /><View style={chart.titleTickBR} />
      <Text style={chart.title}>TRICKS PER SESSION</Text>
      <View style={chart.bars}>
        {recent.map((session) => {
          const barHeight = Math.max((session.tricks.length / maxTricks) * 64, 4);
          return (
            <View key={session.id} style={chart.barWrap}>
              <Text style={chart.barCount}>{session.tricks.length || ''}</Text>
              <View style={[chart.bar, { height: barHeight }]} />
              <Text style={chart.barLabel}>
                {new Date(session.startTime).toLocaleDateString('nl-BE', { day: 'numeric', month: 'numeric' })}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function HistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { sessions, loadSessions } = useSessionStore();
  const { user } = useAuthStore();
  const [loadingCloud, setLoadingCloud] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (user) {
      setLoadingCloud(true);
      loadSessions().finally(() => {
        if (mountedRef.current) setLoadingCloud(false);
      });
    }
  }, [user]);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <V3Grid />
      <StatusBar barStyle="light-content" backgroundColor={BG.base} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={TEXT.t2} />
        </TouchableOpacity>
        <Text style={styles.headerLabel}>/ SESSIONS · HISTORY</Text>
      </View>

      {loadingCloud && (
        <ActivityIndicator color={ACCENT} style={{ marginBottom: 8, marginHorizontal: 18 }} />
      )}

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>HISTORY</Text>
            <TrickChart sessions={sessions} />
            {sessions.length > 0 && <V3SectionHead num="/01" label="ALL SESSIONS" right={`${sessions.length} TOTAL`} />}
          </>
        }
        ListEmptyComponent={
          !loadingCloud ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="bar-chart-outline" size={40} color={TEXT.t3} />
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptyText}>Connect your board and start a session</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const best = topTrick(item.tricks);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('SessionSummary', { session: item })}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardDate}>
                  {new Date(item.startTime).toLocaleDateString('nl-BE', {
                    weekday: 'short', day: 'numeric', month: 'short',
                  })}
                </Text>
                <Text style={styles.cardTime}>
                  {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.cardStats}>
                <View style={styles.cardStat}>
                  <Text style={styles.cardStatValue}>{formatDuration(item.duration)}</Text>
                  <Text style={styles.cardStatLabel}>DURATION</Text>
                </View>
                <View style={styles.cardStat}>
                  <Text style={styles.cardStatValue}>{item.tricks.length}</Text>
                  <Text style={styles.cardStatLabel}>TRICKS</Text>
                </View>
                <View style={styles.cardStat}>
                  <Text style={[styles.cardStatValue, { color: ACCENT }]}>
                    {best ? trickLabel(best) : '—'}
                  </Text>
                  <Text style={styles.cardStatLabel}>TOP TRICK</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const chart = StyleSheet.create({
  container: {
    backgroundColor: BG.b2, borderWidth: 1, borderColor: LINE.dim, borderRadius: R,
    padding: 16, marginBottom: 22, position: 'relative',
  },
  titleTickTL: { position: 'absolute', top: -1, left: -1, width: 8, height: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: ACCENT },
  titleTickBR: { position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: ACCENT },
  title: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.62, textTransform: 'uppercase', color: TEXT.t2, marginBottom: 14 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 88, gap: 6 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  barCount: { fontFamily: FONT.mono, fontSize: 10, color: TEXT.t1, height: 14 },
  bar: { width: '100%', backgroundColor: ACCENT, borderRadius: 3 },
  barLabel: { fontFamily: FONT.mono, fontSize: 9, color: TEXT.t3, textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.base },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: R, backgroundColor: BG.b2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: LINE.dim },
  headerLabel: { flex: 1, fontFamily: FONT.mono, fontSize: 9, color: TEXT.t3, letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { fontFamily: FONT.display, fontSize: 32, color: ACCENT, textTransform: 'uppercase', letterSpacing: -1.2, marginBottom: 18 },

  list: { paddingHorizontal: 18, paddingBottom: 24 },

  emptyWrap: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyTitle: { fontFamily: FONT.bodySb, fontSize: 16, color: TEXT.t1 },
  emptyText: { fontFamily: FONT.body, fontSize: 13, color: TEXT.t3, textAlign: 'center' },

  card: { backgroundColor: BG.b2, borderWidth: 1, borderColor: LINE.dim, borderRadius: R, padding: 16, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  cardDate: { fontFamily: FONT.bodySb, fontSize: 14, color: TEXT.t1, textTransform: 'capitalize' },
  cardTime: { fontFamily: FONT.mono, fontSize: 11, color: TEXT.t3 },
  cardStats: { flexDirection: 'row', gap: 12 },
  cardStat: { flex: 1, alignItems: 'center' },
  cardStatValue: { fontFamily: FONT.display, fontSize: 17, color: TEXT.t1, letterSpacing: -0.5 },
  cardStatLabel: { fontFamily: FONT.mono, fontSize: 8, letterSpacing: 1, color: TEXT.t3, marginTop: 4 },
});
