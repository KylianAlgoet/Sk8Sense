import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Platform } from 'react-native';
import { Buffer } from 'buffer';
import useBleStore, { SERVICE_UUID, CHAR_UUID } from '../store/bleStore';
import useSessionStore from '../store/sessionStore';
import { startMockSensor } from '../store/mockBle';

const IS_WEB = Platform.OS === 'web';
const SENSOR_KEYS = ['ax', 'ay', 'az', 'gx', 'gy', 'gz'];
const UI_HZ = 10; // render sensor grid at 10Hz max

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

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function DashboardScreen({ navigation }) {
  const { connectedDevice, sensorData, setSensorData, disconnect } = useBleStore();
  const { isActive, tricks, startSession, addTrick, stopSession } = useSessionStore();

  const subscriptionRef = useRef(null);
  const prevTrickRef = useRef('none');
  const lastUiUpdateRef = useRef(0);
  const isActiveRef = useRef(isActive);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // Keep ref in sync so BLE callback always sees latest value without re-subscribing
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  // BLE / mock sensor feed
  useEffect(() => {
    if (IS_WEB) {
      const stop = startMockSensor((data) => {
        handleIncomingData(data);
      });
      subscriptionRef.current = { remove: stop };
      return stop;
    }
    if (!connectedDevice) return;
    subscriptionRef.current = connectedDevice.monitorCharacteristicForService(
      SERVICE_UUID, CHAR_UUID,
      (error, characteristic) => {
        if (error || !characteristic?.value) return;
        try {
          const json = Buffer.from(characteristic.value, 'base64').toString('utf8');
          handleIncomingData(JSON.parse(json));
        } catch {}
      }
    );
    return () => subscriptionRef.current?.remove();
  }, [connectedDevice]);

  function handleIncomingData(data) {
    // Trick detection on every frame
    const trick = data.trick;
    if (isActiveRef.current && trick !== 'none' && prevTrickRef.current === 'none') {
      addTrick(trick);
    }
    prevTrickRef.current = trick;

    // Throttle UI updates to 10Hz
    const now = Date.now();
    if (now - lastUiUpdateRef.current >= 1000 / UI_HZ) {
      lastUiUpdateRef.current = now;
      setSensorData(data);
    }
  }

  // Session timer — clean interval, no deps on sensor data
  useEffect(() => {
    if (isActive) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive]);

  const handleStartStop = useCallback(() => {
    if (!isActive) {
      startSession();
    } else {
      const session = stopSession();
      navigation.navigate('SessionSummary', { session });
    }
  }, [isActive]);

  const handleDisconnect = () => {
    subscriptionRef.current?.remove();
    clearInterval(timerRef.current);
    if (!IS_WEB) connectedDevice?.cancelConnection();
    disconnect();
    navigation.navigate('Home');
  };

  const trickActive = sensorData.trick !== 'none';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        {IS_WEB && <Text style={styles.demoTag}>DEMO</Text>}
        <TouchableOpacity onPress={handleDisconnect}>
          <Text style={styles.disconnectText}>✕ Disconnect</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.sessionBar, isActive && styles.sessionBarActive]}>
        <Text style={styles.sessionTimer}>{formatDuration(elapsed)}</Text>
        <Text style={styles.sessionTrickCount}>{tricks.length} tricks</Text>
        <TouchableOpacity
          style={[styles.sessionBtn, isActive && styles.sessionBtnStop]}
          onPress={handleStartStop}
        >
          <Text style={styles.sessionBtnText}>{isActive ? 'STOP' : 'START SESSION'}</Text>
        </TouchableOpacity>
      </View>

      {trickActive && (
        <View style={[styles.trickBanner, { backgroundColor: TRICK_COLORS[sensorData.trick] || '#FFD700' }]}>
          <Text style={styles.trickText}>🛹 {sensorData.trick.toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.grid}>
        {SENSOR_KEYS.map((key) => (
          <View key={key} style={styles.cell}>
            <Text style={styles.cellLabel}>{key.toUpperCase()}</Text>
            <Text style={styles.cellValue}>
              {typeof sensorData[key] === 'number' ? sensorData[key].toFixed(2) : sensorData[key]}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.feedTitle}>LIVE TRICK FEED</Text>
      <FlatList
        data={[...tricks].reverse()}
        keyExtractor={(_, i) => i.toString()}
        style={styles.feed}
        ListEmptyComponent={
          <Text style={styles.feedEmpty}>
            {isActive ? 'Wacht op tricks...' : 'Druk START SESSION'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.feedItem}>
            <View style={[styles.feedDot, { backgroundColor: TRICK_COLORS[item.trick] || '#fff' }]} />
            <Text style={styles.feedTrick}>{item.trick.toUpperCase()}</Text>
            <Text style={styles.feedTime}>{formatTime(item.time)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 20, paddingTop: 52 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  title: { color: '#e94560', fontSize: 22, fontWeight: 'bold', flex: 1 },
  demoTag: { color: '#FFD700', fontSize: 10, fontWeight: 'bold', letterSpacing: 2, marginRight: 12 },
  disconnectText: { color: '#555', fontSize: 13 },

  sessionBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#16213e', borderRadius: 10,
    padding: 12, marginBottom: 12, gap: 10,
  },
  sessionBarActive: { borderWidth: 1, borderColor: '#e94560' },
  sessionTimer: { color: '#fff', fontSize: 20, fontWeight: 'bold', flex: 1 },
  sessionTrickCount: { color: '#aaa', fontSize: 13 },
  sessionBtn: {
    backgroundColor: '#e94560', paddingVertical: 8,
    paddingHorizontal: 16, borderRadius: 6,
  },
  sessionBtnStop: { backgroundColor: '#555' },
  sessionBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  trickBanner: {
    borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16,
    alignItems: 'center', marginBottom: 12,
  },
  trickText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  cell: { backgroundColor: '#16213e', borderRadius: 8, padding: 10, width: '30%', alignItems: 'center' },
  cellLabel: { color: '#e94560', fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
  cellValue: { color: '#fff', fontSize: 14, fontWeight: '600' },

  feedTitle: { color: '#aaa', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 6 },
  feed: { flex: 1 },
  feedEmpty: { color: '#444', textAlign: 'center', marginTop: 20, fontSize: 13 },
  feedItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#16213e', borderRadius: 6,
    padding: 10, marginBottom: 6, gap: 10,
  },
  feedDot: { width: 8, height: 8, borderRadius: 4 },
  feedTrick: { color: '#fff', fontWeight: 'bold', fontSize: 14, flex: 1 },
  feedTime: { color: '#555', fontSize: 12 },
});
