import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import useAuthStore from '../store/authStore';
import useSessionStore from '../store/sessionStore';

const TRICK_COLORS = {
  ollie: '#4CAF50',
  kickflip: '#2196F3',
  heelflip: '#FF9800',
};

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const { sessions } = useSessionStore();

  const totalTricks = sessions.reduce((acc, s) => acc + s.tricks.length, 0);
  const totalMinutes = Math.floor(sessions.reduce((acc, s) => acc + s.duration, 0) / 60);

  const trickCounts = sessions
    .flatMap((s) => s.tricks)
    .reduce((acc, { trick }) => {
      acc[trick] = (acc[trick] || 0) + 1;
      return acc;
    }, {});

  const maxTrickCount = Math.max(...Object.values(trickCounts), 1);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.displayName ? user.displayName[0].toUpperCase() : '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.displayName || 'Skater'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{sessions.length}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalTricks}</Text>
          <Text style={styles.statLabel}>Tricks</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalMinutes}m</Text>
          <Text style={styles.statLabel}>On board</Text>
        </View>
      </View>

      {Object.keys(trickCounts).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ALL-TIME TRICK COUNT</Text>
          {Object.entries(trickCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([trick, count]) => (
              <View key={trick} style={styles.trickRow}>
                <View style={[styles.trickDot, { backgroundColor: TRICK_COLORS[trick] || '#e94560' }]} />
                <Text style={styles.trickName}>{trick.toUpperCase()}</Text>
                <View style={styles.trickBarWrap}>
                  <View
                    style={[
                      styles.trickBar,
                      {
                        width: `${(count / maxTrickCount) * 100}%`,
                        backgroundColor: TRICK_COLORS[trick] || '#e94560',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.trickCount}>×{count}</Text>
              </View>
            ))}
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>SIGN OUT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 24, paddingTop: 52, paddingBottom: 48 },

  header: { marginBottom: 32 },
  back: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  title: { color: '#e94560', fontSize: 28, fontWeight: 'bold' },

  avatarWrap: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#e94560', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  name: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  email: { color: '#555', fontSize: 14 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statBox: { flex: 1, backgroundColor: '#16213e', borderRadius: 10, padding: 14, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: '#555', fontSize: 11, marginTop: 2 },

  section: { backgroundColor: '#16213e', borderRadius: 12, padding: 16, marginBottom: 32 },
  sectionTitle: { color: '#aaa', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 14 },
  trickRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  trickDot: { width: 8, height: 8, borderRadius: 4 },
  trickName: { color: '#fff', fontSize: 12, fontWeight: 'bold', width: 62 },
  trickBarWrap: { flex: 1, height: 6, backgroundColor: '#0f3460', borderRadius: 3, overflow: 'hidden' },
  trickBar: { height: '100%', borderRadius: 3 },
  trickCount: { color: '#aaa', fontSize: 12, width: 32, textAlign: 'right' },

  logoutBtn: {
    borderWidth: 1, borderColor: '#333', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  logoutText: { color: '#555', fontSize: 14, letterSpacing: 1 },
});
