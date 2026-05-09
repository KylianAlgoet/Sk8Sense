import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import useSessionStore from '../store/sessionStore';

export default function HomeScreen({ navigation }) {
  const { sessions } = useSessionStore();

  const totalTricks = sessions.reduce((acc, s) => acc + s.tricks.length, 0);
  const totalMinutes = sessions.reduce((acc, s) => acc + s.duration, 0);

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Text style={styles.logo}>SK8SENSE</Text>
        <Text style={styles.subtitle}>AI Skateboard Coach</Text>
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
          <Text style={styles.statValue}>
            {totalMinutes > 0 ? Math.floor(totalMinutes / 60) + 'm' : '0m'}
          </Text>
          <Text style={styles.statLabel}>Time</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.navigate('Connect')}
      >
        <Text style={styles.primaryBtnText}>🛹 SCAN FOR BOARD</Text>
      </TouchableOpacity>

      {sessions.length > 0 && (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.getParent()?.navigate('Profile', { screen: 'History' })}
        >
          <Text style={styles.secondaryBtnText}>Session History ({sessions.length})</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#1a1a2e',
    alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 20,
  },
  logoWrap: { alignItems: 'center', marginBottom: 12 },
  logo: { color: '#e94560', fontSize: 48, fontWeight: 'bold', letterSpacing: 4 },
  subtitle: { color: '#aaa', fontSize: 16, marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  statBox: {
    flex: 1, backgroundColor: '#16213e',
    borderRadius: 10, padding: 14, alignItems: 'center',
  },
  statValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: '#555', fontSize: 11, marginTop: 2 },

  primaryBtn: {
    backgroundColor: '#e94560', width: '100%',
    paddingVertical: 16, borderRadius: 10, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

  secondaryBtn: {
    borderWidth: 1, borderColor: '#333', width: '100%',
    paddingVertical: 12, borderRadius: 10, alignItems: 'center',
  },
  secondaryBtnText: { color: '#aaa', fontSize: 14 },
});
