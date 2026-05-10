import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Platform, Animated } from 'react-native';
import { Buffer } from 'buffer';
import useBleStore, { SERVICE_UUID, CHAR_UUID } from '../store/bleStore';
import useSessionStore from '../store/sessionStore';
import { startMockSensor } from '../store/mockBle';
import LiveBoardViewer from '../components/LiveBoardViewer';

const IS_WEB = Platform.OS === 'web';
const UI_HZ = 10;

const TRICK_COLORS = {
  ollie:    '#4CAF50',
  kickflip: '#2196F3',
  heelflip: '#FF9800',
};

const COACHING_TIPS = {
  ollie:    'Stay over the board on landing',
  kickflip: 'Flick harder off the pocket',
  heelflip: 'Kick out more with your heel',
};

// Trick state machine labels
const TRICK_STATE_LABELS = {
  waiting: 'Waiting',
  pop:     'Pop detected',
  airtime: 'Ollie attempt',
  landing: 'Landing detected',
  ollie:   'Ollie!',
};
const TRICK_STATE_COLORS = {
  waiting: '#333',
  pop:     '#FF9800',
  airtime: '#2196F3',
  landing: '#FF5722',
  ollie:   '#4CAF50',
};

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Convert raw accel (m/s²) to pitch/roll in degrees
function calcPitchRoll(ax, ay, az) {
  const pitch = Math.atan2(ay, Math.sqrt(ax * ax + az * az)) * (180 / Math.PI);
  const roll  = Math.atan2(-ax, az) * (180 / Math.PI);
  return { pitch, roll };
}

export default function DashboardScreen({ navigation }) {
  const { connectedDevice, sensorData, setSensorData, disconnect } = useBleStore();
  const { isActive, tricks, startSession, addTrick, stopSession } = useSessionStore();

  const subscriptionRef  = useRef(null);
  const prevTrickRef     = useRef('none');
  const lastUiUpdateRef  = useRef(0);
  const isActiveRef      = useRef(isActive);
  const trickStateRef    = useRef('waiting');
  const maxImpactRef     = useRef(0);
  const rawPitchRef      = useRef(0);
  const rawRollRef       = useRef(0);

  const [elapsed, setElapsed]       = useState(0);
  const [currentTip, setCurrentTip] = useState('');
  const [lastTrick, setLastTrick]   = useState('');

  // Live rotation for 3D viewer (calibrated)
  const [pitch, setPitch]       = useState(0);
  const [roll, setRoll]         = useState(0);
  const [calibOffset, setCalibOffset] = useState({ pitch: 0, roll: 0 });

  // Debug values (throttled)
  const [debugPitch, setDebugPitch]   = useState(0);
  const [debugRoll, setDebugRoll]     = useState(0);
  const [debugImpact, setDebugImpact] = useState(0);
  const [trickState, setTrickState]   = useState('waiting');
  const [trickGlow, setTrickGlow]     = useState(0);

  const timerRef    = useRef(null);
  const tipTimerRef = useRef(null);
  const bannerScale   = useRef(new Animated.Value(1)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  function triggerTrickAnimation(trick) {
    setLastTrick(trick);
    setCurrentTip(COACHING_TIPS[trick] || '');
    setTrickGlow(1);
    setTimeout(() => setTrickGlow(0), 800);

    bannerScale.setValue(1.25);
    bannerOpacity.setValue(1);
    Animated.spring(bannerScale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();

    clearTimeout(tipTimerRef.current);
    tipTimerRef.current = setTimeout(() => {
      Animated.timing(bannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
        .start(() => setCurrentTip(''));
    }, 2500);
  }

  // BLE / mock sensor subscription
  useEffect(() => {
    if (IS_WEB) {
      const stop = startMockSensor((data) => handleIncomingData(data));
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
    const { ax, ay, az } = data;

    // ── Existing trick detection (from ESP32 firmware) ──────────────────────
    const trick = data.trick;
    if (isActiveRef.current && trick !== 'none' && prevTrickRef.current === 'none') {
      addTrick(trick);
      triggerTrickAnimation(trick);
    }
    prevTrickRef.current = trick;

    // ── IMU → pitch/roll conversion ──────────────────────────────────────────
    const { pitch: rawPitch, roll: rawRoll } = calcPitchRoll(ax, ay, az);
    rawPitchRef.current = rawPitch;
    rawRollRef.current  = rawRoll;

    // ── Impact magnitude ──────────────────────────────────────────────────────
    const impact = Math.sqrt(ax * ax + ay * ay + az * az);
    if (isActiveRef.current && impact > maxImpactRef.current) {
      maxImpactRef.current = impact;
    }

    // ── App-side trick state machine ─────────────────────────────────────────
    // Uses raw IMU to show granular states beyond what ESP32 firmware reports
    const prev = trickStateRef.current;
    let next = prev;
    if (impact > 20 && az < 5)                      next = 'pop';
    else if (impact < 4)                             next = 'airtime';
    else if (impact > 18 && prev === 'airtime')      next = 'landing';
    else if (impact < 12 && prev === 'landing')      next = 'ollie';
    else if (impact < 12 && prev === 'ollie')        next = 'waiting';
    else if (impact < 12 && prev === 'pop')          next = 'waiting';

    if (next !== prev) {
      trickStateRef.current = next;
      setTrickState(next);
    }

    // ── UI update (throttled to UI_HZ) ────────────────────────────────────────
    const now = Date.now();
    if (now - lastUiUpdateRef.current >= 1000 / UI_HZ) {
      lastUiUpdateRef.current = now;
      setSensorData(data);

      // Calibrated pitch/roll for 3D viewer
      const calPitch = rawPitch - calibOffset.pitch;
      const calRoll  = rawRoll  - calibOffset.roll;
      setPitch(calPitch);
      setRoll(calRoll);

      // Debug display
      setDebugPitch(calPitch);
      setDebugRoll(calRoll);
      setDebugImpact(impact);
    }
  }

  // Session timer
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
      maxImpactRef.current = 0;
      startSession();
    } else {
      const session = stopSession();
      session.maxImpact = maxImpactRef.current;
      navigation.navigate('SessionSummary', { session });
    }
  }, [isActive]);

  const handleDisconnect = () => {
    subscriptionRef.current?.remove();
    clearInterval(timerRef.current);
    clearTimeout(tipTimerRef.current);
    if (!IS_WEB) connectedDevice?.cancelConnection();
    disconnect();
    navigation.navigate('Home');
  };

  // Calibrate: store current raw pitch/roll as zero offset
  const handleCalibrate = () => {
    setCalibOffset({ pitch: rawPitchRef.current, roll: rawRollRef.current });
  };

  const trickActive = sensorData.trick !== 'none';
  const isSimulated = IS_WEB || !connectedDevice;

  return (
    <View style={styles.container}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        {IS_WEB && <Text style={styles.demoTag}>DEMO</Text>}
        <TouchableOpacity onPress={handleCalibrate} style={styles.calibBtn}>
          <Text style={styles.calibText}>◎ Calibrate</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDisconnect}>
          <Text style={styles.disconnectText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* ── Session bar ───────────────────────────────────────────────────── */}
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

      {/* ── Live 3D board viewer ─────────────────────────────────────────── */}
      <LiveBoardViewer
        pitch={pitch}
        roll={roll}
        yaw={0}
        trickGlow={trickGlow}
        simulated={isSimulated}
        style={styles.boardViewer}
      />

      {/* ── Sensor debug + trick state row ───────────────────────────────── */}
      <View style={styles.debugRow}>
        <View style={styles.debugCell}>
          <Text style={styles.debugLabel}>PITCH</Text>
          <Text style={styles.debugValue}>{debugPitch.toFixed(1)}°</Text>
        </View>
        <View style={styles.debugCell}>
          <Text style={styles.debugLabel}>ROLL</Text>
          <Text style={styles.debugValue}>{debugRoll.toFixed(1)}°</Text>
        </View>
        <View style={styles.debugCell}>
          <Text style={styles.debugLabel}>IMPACT</Text>
          <Text style={styles.debugValue}>{debugImpact.toFixed(1)}</Text>
        </View>
        <View style={[styles.stateCell, { backgroundColor: TRICK_STATE_COLORS[trickState] + '22', borderColor: TRICK_STATE_COLORS[trickState] + '55' }]}>
          <Text style={[styles.stateText, { color: TRICK_STATE_COLORS[trickState] }]}>
            {TRICK_STATE_LABELS[trickState]}
          </Text>
        </View>
      </View>

      {/* ── Trick banner ─────────────────────────────────────────────────── */}
      {trickActive && (
        <Animated.View
          style={[
            styles.trickBanner,
            { backgroundColor: TRICK_COLORS[sensorData.trick] || '#FFD700' },
            { transform: [{ scale: bannerScale }], opacity: bannerOpacity },
          ]}
        >
          <Text style={styles.trickText}>🛹 {sensorData.trick.toUpperCase()}</Text>
        </Animated.View>
      )}

      {/* ── Coaching tip ─────────────────────────────────────────────────── */}
      {currentTip !== '' && (
        <Animated.View style={[styles.tipBox, { opacity: bannerOpacity }]}>
          <Text style={styles.tipLabel}>💡 COACH</Text>
          <Text style={styles.tipText}>{currentTip}</Text>
        </Animated.View>
      )}

      {/* ── Live trick feed ───────────────────────────────────────────────── */}
      <Text style={styles.feedTitle}>LIVE TRICK FEED</Text>
      <FlatList
        data={[...tricks].reverse()}
        keyExtractor={(_, i) => i.toString()}
        style={styles.feed}
        ListEmptyComponent={
          <Text style={styles.feedEmpty}>
            {isActive ? 'Waiting for tricks...' : 'Press START SESSION'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.feedItem}>
            <View style={[styles.feedDot, { backgroundColor: TRICK_COLORS[item.trick] || '#fff' }]} />
            <Text style={styles.feedTrick}>{item.trick.toUpperCase()}</Text>
            <Text style={styles.feedTip}>{COACHING_TIPS[item.trick]}</Text>
            <Text style={styles.feedTime}>{formatTime(item.time)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 16, paddingTop: 48 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  title: { color: '#e94560', fontSize: 20, fontWeight: 'bold', flex: 1 },
  demoTag: { color: '#FFD700', fontSize: 10, fontWeight: 'bold', letterSpacing: 2 },
  calibBtn: { backgroundColor: '#16213e', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#2a4a7a' },
  calibText: { color: '#4488ff', fontSize: 11, fontWeight: '600' },
  disconnectText: { color: '#555', fontSize: 16, paddingLeft: 4 },

  sessionBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#16213e', borderRadius: 10,
    padding: 10, marginBottom: 10, gap: 10,
  },
  sessionBarActive: { borderWidth: 1, borderColor: '#e94560' },
  sessionTimer: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1 },
  sessionTrickCount: { color: '#aaa', fontSize: 12 },
  sessionBtn: { backgroundColor: '#e94560', paddingVertical: 7, paddingHorizontal: 14, borderRadius: 6 },
  sessionBtnStop: { backgroundColor: '#555' },
  sessionBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  // 3D viewer
  boardViewer: { height: 190, marginBottom: 8 },

  // Debug row
  debugRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  debugCell: { flex: 1, backgroundColor: '#16213e', borderRadius: 7, padding: 7, alignItems: 'center' },
  debugLabel: { color: '#4488ff', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  debugValue: { color: '#fff', fontSize: 13, fontWeight: '600' },
  stateCell: { flex: 2, borderRadius: 7, padding: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  stateText: { fontSize: 11, fontWeight: 'bold' },

  trickBanner: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', marginBottom: 6 },
  trickText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

  tipBox: { backgroundColor: '#0f3460', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipLabel: { color: '#FFD700', fontSize: 10, fontWeight: 'bold' },
  tipText: { color: '#fff', fontSize: 12, flex: 1 },

  feedTitle: { color: '#aaa', fontSize: 10, fontWeight: 'bold', letterSpacing: 2, marginBottom: 5 },
  feed: { flex: 1 },
  feedEmpty: { color: '#444', textAlign: 'center', marginTop: 16, fontSize: 12 },
  feedItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 6, padding: 9, marginBottom: 5, gap: 8 },
  feedDot: { width: 8, height: 8, borderRadius: 4 },
  feedTrick: { color: '#fff', fontWeight: 'bold', fontSize: 12, width: 65 },
  feedTip: { color: '#555', fontSize: 10, flex: 1 },
  feedTime: { color: '#444', fontSize: 10 },
});
