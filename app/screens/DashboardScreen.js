import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Platform, Animated } from 'react-native';
import { Buffer } from 'buffer';
import useBleStore, { SERVICE_UUID, CHAR_UUID } from '../store/bleStore';
import useSessionStore from '../store/sessionStore';
import { startMockSensor } from '../store/mockBle';
import LiveBoardViewer from '../components/LiveBoardViewer';
import { getTrickTip } from '../services/aiCoach';
import T, { BG, TEXT, LINE, ACCENT, PANEL, BTN, FONT, SPACE, R } from '../design-tokens';

const IS_WEB = Platform.OS === 'web';
const UI_HZ = 10;

const TRICK_COLORS = {
  ollie:    '#4CAF50',
  kickflip: '#2196F3',
  heelflip: '#FF9800',
  bs_shuv:  ACCENT,
  fs_shuv:  '#9C27B0',
};
const COACHING_TIPS = {
  ollie:    'Stay over the board on landing',
  kickflip: 'Flick harder off the pocket',
  heelflip: 'Kick out more with your heel',
  bs_shuv:  'Scoop the tail back harder',
  fs_shuv:  'Scoop forward and stay centered',
};
const TRICK_STATE_LABELS = {
  waiting: 'Waiting', pop: 'Loading...',
  airtime: 'In the air!', landing: 'Landing', ollie: 'Landed!',
};
const TRICK_STATE_COLORS = {
  waiting: TEXT.t3, pop: '#FF9800',
  airtime: '#2196F3', landing: '#FF5722', ollie: '#4CAF50',
};

function formatDuration(s) {
  return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
}
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}
// Convert accel (m/s²) → pitch/roll in degrees
function calcPitchRoll(ax, ay, az) {
  return {
    pitch: Math.atan2(ay, Math.sqrt(ax*ax + az*az)) * (180/Math.PI),
    roll:  Math.atan2(-ax, az) * (180/Math.PI),
  };
}

export default function DashboardScreen({ navigation }) {
  const { connectedDevice, sensorData, setSensorData, disconnect } = useBleStore();
  const { isActive, tricks, startSession, addTrick, stopSession } = useSessionStore();

  const subscriptionRef = useRef(null);
  const prevTrickRef    = useRef('none');
  const lastUiRef       = useRef(0);
  const boardRef        = useRef(null); // direct 100Hz path to 3D viewer
  const trickMetaRef    = useRef({});   // live sensor context during airtime
  const [aiTip, setAiTip] = useState('');
  const isActiveRef     = useRef(isActive);
  const trickStateRef   = useRef('waiting');
  const maxImpactRef    = useRef(0);
  const calibRef        = useRef({ pitch: 0, roll: 0 }); // use ref so BLE closure always sees latest

  const [elapsed, setElapsed]       = useState(0);
  const [currentTip, setCurrentTip] = useState('');
  const [lastTrick, setLastTrick]   = useState('');
  const [trickState, setTrickState]     = useState('waiting');
  const [trickGlow, setTrickGlow]       = useState(0);
  const [calibApplied, setCalibApplied] = useState(false);

  const timerRef    = useRef(null);
  const tipTimerRef = useRef(null);
  const bannerScale   = useRef(new Animated.Value(1)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  // ── Compute live values from sensorData directly in render ──────────────
  const { ax, ay, az, f1 = 0, f2 = 0, f3 = 0, f4 = 0 } = sensorData;
  const raw = calcPitchRoll(ax, ay, az);
  const livePitch  = raw.pitch - calibRef.current.pitch;
  const liveRoll   = raw.roll  - calibRef.current.roll;
  const liveImpact = Math.sqrt(ax*ax + ay*ay + az*az);
  // FSR: threshold 300 to ignore floating-pin noise on unconnected sensors
  const fsrNose = Math.max(0, f1 - 300);
  const fsrHeel = Math.max(0, f2 - 300);
  const fsrToe  = Math.max(0, f3 - 300);
  const fsrTail = Math.max(0, f4 - 300);
  const anyFsr  = fsrNose > 0 || fsrHeel > 0 || fsrToe > 0 || fsrTail > 0;

  // ── Calibrate: store current orientation as zero ─────────────────────────
  const handleCalibrate = () => {
    calibRef.current = { pitch: raw.pitch, roll: raw.roll };
    setCalibApplied(true);           // force re-render so livePitch/liveRoll update instantly
    setTimeout(() => setCalibApplied(false), 1500);
  };

  function triggerTrickAnimation(trick) {
    setLastTrick(trick);
    setCurrentTip(COACHING_TIPS[trick] || '');
    setTrickGlow(t => t + 1); // increment to trigger effect
    bannerScale.setValue(1.25); bannerOpacity.setValue(1);
    Animated.spring(bannerScale, { toValue:1, friction:4, tension:120, useNativeDriver:true }).start();
    clearTimeout(tipTimerRef.current);
    tipTimerRef.current = setTimeout(() => {
      Animated.timing(bannerOpacity, { toValue:0, duration:400, useNativeDriver:true })
        .start(() => setCurrentTip(''));
    }, 2500);
  }

  // ── BLE / mock sensor subscription ───────────────────────────────────────
  useEffect(() => {
    if (IS_WEB) {
      const stop = startMockSensor(handleIncomingData);
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

  // handleIncomingData uses only refs + stable Zustand setters → no stale closure
  function handleIncomingData(data) {
    // ── Direct 100Hz update to 3D board viewer (bypasses React state throttle) ──
    const { ax: dax, ay: day, az: daz } = data;
    const directRaw = calcPitchRoll(dax||0, day||0, daz||9.8);
    boardRef.current?.update(
      directRaw.pitch - calibRef.current.pitch,
      directRaw.roll  - calibRef.current.roll,
      data.f1||0, data.f2||0, data.f3||0, data.f4||0
    );

    // Track peak sensor values for AI coaching
    const m = trickMetaRef.current;
    if (Math.abs(data.gx||0) > Math.abs(m.peakGx||0)) m.peakGx = data.gx;
    if (Math.abs(data.gy||0) > Math.abs(m.peakGy||0)) m.peakGy = data.gy;
    m.tailFsr = Math.max(m.tailFsr||0, data.f4||0);
    if (!m.airtimeStart && data.trick !== 'none') m.airtimeStart = Date.now();
    if (m.airtimeStart && data.trick === 'none') {
      m.airtime = Date.now() - m.airtimeStart;
      m.airtimeStart = null;
    }

    // Existing trick detection (from ESP32 firmware)
    const trick = data.trick;
    if (isActiveRef.current && trick !== 'none' && prevTrickRef.current === 'none') {
      addTrick(trick);
      triggerTrickAnimation(trick);
      // Get AI tip for this trick (async, non-blocking)
      const meta = { ...trickMetaRef.current };
      trickMetaRef.current = {}; // reset for next trick
      getTrickTip({
        trick,
        peakGx: meta.peakGx || 0,
        peakGy: meta.peakGy || 0,
        airtime: meta.airtime || 0,
        tailFsr: meta.tailFsr || 0,
        landingImpact: maxImpactRef.current,
      }).then(tip => { if (tip) setAiTip(tip); }).catch(() => {});
    }
    prevTrickRef.current = trick;

    // Max impact tracking for session summary
    const impact = Math.sqrt((data.ax||0)**2 + (data.ay||0)**2 + (data.az||0)**2);
    if (isActiveRef.current && impact > maxImpactRef.current) maxImpactRef.current = impact;

    // App-side trick state machine (more granular than ESP32 firmware)
    // Trick state — driven by ESP32 firmware output + FSR tail for pop hint
    const tailRaw = data.f4 || 0;
    const tailActive = tailRaw > 600; // FSR tail pressed (low threshold)
    const prev = trickStateRef.current;
    let next = prev;

    if (trick !== 'none') {
      // ESP32 detected active airtime/landing phase
      next = trick === 'ollie' ? 'airtime'
           : trick === 'kickflip' ? 'airtime'
           : trick === 'heelflip' ? 'airtime'
           : 'airtime';
    } else if (prev === 'airtime') {
      // Just completed trick — show result briefly
      next = 'ollie';
      setTimeout(() => { trickStateRef.current = 'waiting'; setTrickState('waiting'); }, 1500);
    } else if (tailActive) {
      next = 'pop';    // tail FSR pressed = loading pop
    } else if (prev === 'pop' && !tailActive) {
      next = 'waiting'; // released tail without airtime = just standing
    }

    if (next !== prev) { trickStateRef.current = next; setTrickState(next); }

    // Throttled UI update — updates sensorData in bleStore → triggers re-render
    // pitch/roll/impact are then computed from fresh sensorData in the render above
    const now = Date.now();
    if (now - lastUiRef.current >= 1000 / UI_HZ) {
      lastUiRef.current = now;
      setSensorData(data); // ← bleStore update → component re-renders → livePitch/liveRoll update
    }
  }

  // Session timer
  useEffect(() => {
    if (isActive) { setElapsed(0); timerRef.current = setInterval(() => setElapsed(e => e+1), 1000); }
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [isActive]);

  const handleStartStop = useCallback(() => {
    if (!isActive) { maxImpactRef.current = 0; startSession(); }
    else {
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

  const trickActive  = sensorData.trick !== 'none';
  const isSimulated  = IS_WEB || !connectedDevice;

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        {IS_WEB && <Text style={styles.demoTag}>DEMO</Text>}
        <TouchableOpacity
          style={[styles.calibBtn, calibApplied && styles.calibBtnDone]}
          onPress={handleCalibrate}
        >
          <Text style={[styles.calibText, calibApplied && { color: '#4CAF50' }]}>
            {calibApplied ? '✓ Calibrated' : '◎ Calibrate'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDisconnect}>
          <Text style={styles.disconnectText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Session bar */}
      <View style={[styles.sessionBar, isActive && styles.sessionBarActive]}>
        <Text style={styles.sessionTimer}>{formatDuration(elapsed)}</Text>
        <Text style={styles.sessionTrickCount}>{tricks.length} tricks</Text>
        <TouchableOpacity style={[styles.sessionBtn, isActive && styles.sessionBtnStop]} onPress={handleStartStop}>
          <Text style={styles.sessionBtnText}>{isActive ? 'STOP' : 'START SESSION'}</Text>
        </TouchableOpacity>
      </View>

      {/* Live 3D board — pitch/roll + FSR zones */}
      <LiveBoardViewer
        ref={boardRef}
        pitch={livePitch}
        roll={liveRoll}
        f1={sensorData.f1 || 0}
        f2={sensorData.f2 || 0}
        f3={sensorData.f3 || 0}
        f4={sensorData.f4 || 0}
        simulated={isSimulated}
        style={styles.boardViewer}
      />

      {/* IMU + FSR debug row */}
      <View style={styles.debugRow}>
        <View style={styles.debugCell}>
          <Text style={styles.debugLabel}>PITCH</Text>
          <Text style={styles.debugValue}>{livePitch.toFixed(1)}°</Text>
        </View>
        <View style={styles.debugCell}>
          <Text style={styles.debugLabel}>ROLL</Text>
          <Text style={styles.debugValue}>{liveRoll.toFixed(1)}°</Text>
        </View>
        <View style={styles.debugCell}>
          <Text style={styles.debugLabel}>TAIL</Text>
          <Text style={[styles.debugValue, (sensorData.f4||0) > 1800 && { color: '#FF9800' }]}>
            {Math.round((sensorData.f4||0) / 40.95)}%
          </Text>
        </View>
        <View style={[styles.stateCell, { backgroundColor: TRICK_STATE_COLORS[trickState]+'22', borderColor: TRICK_STATE_COLORS[trickState]+'55' }]}>
          <Text style={[styles.stateText, { color: TRICK_STATE_COLORS[trickState] }]}>
            {TRICK_STATE_LABELS[trickState]}
          </Text>
        </View>
      </View>

      {/* FSR pressure bars */}
      <View style={styles.fsrRow}>
        {[
          { label: 'NOSE', value: fsrNose, color: '#4CAF50' },
          { label: 'HEEL', value: fsrHeel, color: '#2196F3' },
          { label: 'TOE',  value: fsrToe,  color: '#FF9800' },
          { label: 'TAIL', value: fsrTail, color: ACCENT },
        ].map(({ label, value, color }) => {
          const pct = Math.min(value / 700, 1);
          return (
            <View key={label} style={styles.fsrCell}>
              <Text style={[styles.fsrLabel, { color: pct > 0.1 ? color : TEXT.t4 }]}>{label}</Text>
              <View style={styles.fsrBarBg}>
                <View style={[styles.fsrBarFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
              </View>
            </View>
          );
        })}
      </View>

      {/* Trick banner */}
      {trickActive && (
        <Animated.View style={[styles.trickBanner, { backgroundColor: TRICK_COLORS[sensorData.trick]||'#FFD700' }, { transform:[{scale:bannerScale}], opacity:bannerOpacity }]}>
          <Text style={styles.trickText}>🛹 {sensorData.trick.toUpperCase()}</Text>
        </Animated.View>
      )}

      {/* Coaching tip */}
      {currentTip !== '' && (
        <Animated.View style={[styles.tipBox, { opacity:bannerOpacity }]}>
          <Text style={styles.tipLabel}>💡 COACH</Text>
          <Text style={styles.tipText}>{currentTip}</Text>
        </Animated.View>
      )}

      {/* AI Coach tip */}
      {aiTip !== '' && (
        <View style={styles.aiTipBox}>
          <Text style={styles.aiTipLabel}>🤖 AI COACH</Text>
          <Text style={styles.aiTipText}>{aiTip}</Text>
        </View>
      )}

      {/* Live trick feed */}
      <Text style={styles.feedTitle}>LIVE TRICK FEED</Text>
      <FlatList
        data={[...tricks].reverse()}
        keyExtractor={(_,i) => i.toString()}
        style={styles.feed}
        ListEmptyComponent={<Text style={styles.feedEmpty}>{isActive ? 'Waiting for tricks...' : 'Press START SESSION'}</Text>}
        renderItem={({ item }) => (
          <View style={styles.feedItem}>
            <View style={[styles.feedDot, { backgroundColor: TRICK_COLORS[item.trick]||TEXT.t1 }]} />
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
  container: { flex:1, backgroundColor:BG.base, padding:16, paddingTop:48 },
  header: { flexDirection:'row', alignItems:'center', marginBottom:12, gap:8 },
  title: { color:ACCENT, fontSize:20, fontFamily:FONT.display, textTransform:'uppercase', letterSpacing:-0.5, flex:1 },
  demoTag: { color:T.AMBER, fontSize:10, fontFamily:FONT.mono, letterSpacing:2, textTransform:'uppercase' },
  calibBtn: { ...PANEL.base, paddingHorizontal:10, paddingVertical:5 },
  calibBtnDone: { borderColor:'#4CAF5055', backgroundColor:'#0a2a0a' },
  calibText: { color:T.CYAN, fontSize:11, fontFamily:FONT.mono },
  disconnectText: { color:TEXT.t2, fontSize:16, paddingLeft:4, fontFamily:FONT.mono },
  sessionBar: { flexDirection:'row', alignItems:'center', ...PANEL.base, borderRadius:R, padding:10, marginBottom:10, gap:10 },
  sessionBarActive: { borderColor:ACCENT },
  sessionTimer: { color:TEXT.t1, fontSize:18, fontFamily:FONT.display, letterSpacing:-0.5, flex:1 },
  sessionTrickCount: { color:TEXT.t2, fontSize:12, fontFamily:FONT.mono },
  sessionBtn: { ...BTN.base, ...BTN.primary, paddingVertical:7, paddingHorizontal:14 },
  sessionBtnStop: { backgroundColor:BG.b4, borderWidth:1, borderColor:LINE.mid },
  sessionBtnText: { ...BTN.primaryText, fontSize:12 },
  boardViewer: { height:220, marginBottom:8 },
  debugRow: { flexDirection:'row', gap:6, marginBottom:8 },
  debugCell: { flex:1, ...PANEL.base, padding:7, alignItems:'center' },
  debugLabel: { color:T.CYAN, fontSize:9, fontFamily:FONT.mono, letterSpacing:1, textTransform:'uppercase' },
  debugValue: { color:TEXT.t1, fontSize:13, fontFamily:FONT.bodySb },
  stateCell: { flex:2, borderRadius:R, padding:7, alignItems:'center', justifyContent:'center', borderWidth:1 },
  stateText: { fontSize:11, fontFamily:FONT.bodySb },
  trickBanner: { borderRadius:R, paddingVertical:10, paddingHorizontal:16, alignItems:'center', marginBottom:6 },
  trickText: { color:T.ACCENT_INK, fontSize:22, fontFamily:FONT.display, letterSpacing:-0.5, textTransform:'uppercase' },
  tipBox: { ...PANEL.base, paddingVertical:7, paddingHorizontal:12, marginBottom:8, flexDirection:'row', alignItems:'center', gap:8 },
  tipLabel: { color:T.AMBER, fontSize:10, fontFamily:FONT.mono, letterSpacing:1, textTransform:'uppercase' },
  tipText: { color:TEXT.t1, fontSize:12, fontFamily:FONT.body, flex:1 },
  fsrRow: { flexDirection:'row', gap:6, marginBottom:8 },
  fsrCell: { flex:1, gap:3 },
  fsrLabel: { fontSize:8, fontFamily:FONT.mono, letterSpacing:1, textTransform:'uppercase', textAlign:'center' },
  fsrBarBg: { height:5, backgroundColor:BG.b4, borderRadius:3, overflow:'hidden' },
  fsrBarFill: { height:'100%', borderRadius:3 },
  aiTipBox: { ...PANEL.accent, paddingVertical:8, paddingHorizontal:12, marginBottom:8, flexDirection:'row', alignItems:'center', gap:8 },
  aiTipLabel: { color:T.CYAN, fontSize:9, fontFamily:FONT.mono, letterSpacing:1, textTransform:'uppercase' },
  aiTipText: { color:TEXT.t1, fontSize:12, fontFamily:FONT.body, flex:1, lineHeight:18 },
  feedTitle: { color:TEXT.t2, fontSize:10, fontFamily:FONT.mono, letterSpacing:2, textTransform:'uppercase', marginBottom:5 },
  feed: { flex:1 },
  feedEmpty: { color:TEXT.t3, fontFamily:FONT.body, textAlign:'center', marginTop:16, fontSize:12 },
  feedItem: { flexDirection:'row', alignItems:'center', ...PANEL.base, borderRadius:R, padding:9, marginBottom:5, gap:8 },
  feedDot: { width:8, height:8, borderRadius:4 },
  feedTrick: { color:TEXT.t1, fontFamily:FONT.bodySb, fontSize:12, width:65, textTransform:'uppercase' },
  feedTip: { color:TEXT.t3, fontSize:10, fontFamily:FONT.body, flex:1 },
  feedTime: { color:TEXT.t3, fontSize:10, fontFamily:FONT.mono },
});
