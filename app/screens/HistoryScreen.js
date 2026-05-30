import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import useSessionStore from '../store/sessionStore';
import useAuthStore from '../store/authStore';

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function topTrick(tricks) {
  if (!tricks.length) return null;
  const counts = tricks.reduce((acc, { trick }) => {
    acc[trick] = (acc[trick] || 0) + 1;
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
  const { sessions, loadSessions } = useSessionStore();
  const { user } = useAuthStore();
  const [loadingCloud, setLoadingCloud] = useState(false);

  useEffect(() => {
    if (user) {
      setLoadingCloud(true);
      loadSessions().finally(() => setLoadingCloud(false));
    }
  }, [user]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>History</Text>
      </View>

      {loadingCloud && (
        <ActivityIndicator color="#e94560" style={{ marginBottom: 8, marginHorizontal: 24 }} />
      )}

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<TrickChart sessions={sessions} />}
        ListEmptyComponent={
          !loadingCloud ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🛹</Text>
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
                  <Text style={styles.cardStatLabel}>duration</Text>
                </View>
                <View style={styles.cardStat}>
                  <Text style={styles.cardStatValue}>{item.tricks.length}</Text>
                  <Text style={styles.cardStatLabel}>tricks</Text>
                </View>
                <View style={styles.cardStat}>
                  <Text style={[styles.cardStatValue, { color: '#e94560' }]}>
                    {best ? best.toUpperCase() : '—'}
                  </Text>
                  <Text style={styles.cardStatLabel}>top trick</Text>
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
    backgroundColor: '#16213e', borderRadius: 12,
    padding: 16, marginBottom: 16,
  },
  title: { color: '#aaa', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 12 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 88, gap: 6 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  barCount: { color: '#fff', fontSize: 10, fontWeight: 'bold', height: 14 },
  bar: { width: '100%', backgroundColor: '#e94560', borderRadius: 3 },
  barLabel: { color: '#444', fontSize: 9, textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', paddingTop: 52 },
  header: { paddingHorizontal: 24, marginBottom: 20 },
  back: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  title: { color: '#e94560', fontSize: 28, fontWeight: 'bold' },

  list: { padding: 24, paddingTop: 0 },

  emptyWrap: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { color: '#555', fontSize: 14, textAlign: 'center' },

  card: { backgroundColor: '#16213e', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardDate: { color: '#fff', fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  cardTime: { color: '#555', fontSize: 13 },
  cardStats: { flexDirection: 'row', gap: 12 },
  cardStat: { flex: 1, alignItems: 'center' },
  cardStatValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cardStatLabel: { color: '#555', fontSize: 11, marginTop: 2 },
});
