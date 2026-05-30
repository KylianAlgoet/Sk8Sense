import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Platform, Animated } from 'react-native';
import { Buffer } from 'buffer';
import useBleStore, { SERVICE_UUID, CHAR_UUID } from '../store/bleStore';
import useSessionStore from '../store/sessionStore';
import { startMockSensor } from '../store/mockBle';
import LiveBoardViewer from '../components/LiveBoardViewer';
import { getTrickTip } from '../services/aiCoach';
import T, { BG, TEXT, LINE, ACCENT, PANEL, BTN, FONT, SPACE, R } from '../design-tokens';
import { V3Grid, V3RegStrip, V3SectionHead, V3MotionTip, V3Chip } from '../components/V3Shared';

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
      <V3Grid />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleCalibrate} style={styles.calibBtn}>
          <Text style={[styles.calibText, calibApplied && { color: '#4CAF50' }]}>
            {calibApplied ? '✓ CALIBRATED' : '◎ CALIBRATE'}
          </Text>
        </TouchableOpacity>
        {IS_WEB && <V3Chip label="DEMO" variant="live" />}
        {isActive && <V3Chip label="REC · ACTIVE" variant="live" />}
        <TouchableOpacity onPress={handleDisconnect} style={styles.exitBtn}>
          <Text style={styles.exitText}>← EXIT</Text>
        </TouchableOpacity>
      </View>

      {/* Session time hero */}
      <View style={styles.timeHero}>
        <Text style={styles.timeLabel}>· SESSION TIME ·</Text>
        <Text style={styles.timerBig}>{formatDuration(elapsed)}</Text>
        <View style={styles.detectRow}>
          <Text style={styles.detectCount}>{tricks.length}</Text>
          <Text style={styles.detectLabel}>DETECTIONS</Text>
          <View style={styles.detectDivider} />
          <Text style={styles.detectHz}>100HZ</Text>
        </View>
      </View>

      {/* Detection banner */}
      {trickActive ? (
        <Animated.View style={[styles.detectionBanner, { transform:[{scale:bannerScale}], opacity:bannerOpacity }]}>
          <View>
            <Text style={styles.detectionCode}>› DETECTION · CODE</Text>
            <Text style={styles.detectionTrick}>{sensorData.trick.toUpperCase()}</Text>
          </View>
          <Text style={styles.detectionScore}>82</Text>
        </Animated.View>
      ) : (
        <View style={styles.listeningBanner}>
          <Text style={styles.listeningText}>// LISTENING FOR MOVEMENT</Text>
          <View style={[styles.stateChip, { borderColor: TRICK_STATE_COLORS[trickState]+'55' }]}>
            <Text style={[styles.stateChipText, { color: TRICK_STATE_COLORS[trickState] }]}>
              {TRICK_STATE_LABELS[trickState]}
            </Text>
          </View>
        </View>
      )}

      {/* Board viewer */}
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

      {/* IMU strip */}
      <View style={styles.imuStrip}>
        {[
          { label: 'PITCH', value: `${livePitch.toFixed(1)}°`, hot: Math.abs(livePitch) > 20 },
          { label: 'ROLL',  value: `${liveRoll.toFixed(1)}°`,  hot: Math.abs(liveRoll) > 20 },
          { label: 'TAIL',  value: `${Math.round((sensorData.f4||0)/40.95)}%`, hot: (sensorData.f4||0) > 1800 },
          { label: 'IMPACT',value: `${liveImpact.toFixed(1)}`, hot: liveImpact > 15 },
        ].map(({ label, value, hot }, i) => (
          <View key={label} style={[styles.imuCell, i === 3 && styles.imuCellLast]}>
            <Text style={[styles.imuLabel, hot && { color: ACCENT }]}>{label}</Text>
            <Text style={[styles.imuValue, hot && { color: ACCENT }]}>{value}</Text>
          </View>
        ))}
      </View>

      {/* FSR bars */}
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

      {/* AI tip */}
      {(aiTip || currentTip) && (
        <V3MotionTip text={aiTip || currentTip} />
      )}

      {/* Feed */}
      <V3SectionHead num="/·" label="DETECTION FEED" right={`${tricks.length} LOGGED`} />
      <FlatList
        data={[...tricks].reverse()}
        keyExtractor={(_,i) => i.toString()}
        style={styles.feed}
        ListEmptyComponent={
          <Text style={styles.feedEmpty}>{isActive ? '// waiting for movement...' : 'Press START SESSION'}</Text>
        }
        renderItem={({ item, index }) => (
          <View style={styles.feedItem}>
            <Text style={styles.feedIndex}>#{String(tricks.length - index).padStart(2,'0')}</Text>
            <View style={[styles.feedDot, { backgroundColor: TRICK_COLORS[item.trick]||ACCENT }]} />
            <Text style={styles.feedTrick}>{item.trick.toUpperCase()}</Text>
            <Text style={styles.feedScore}>82</Text>
          </View>
        )}
      />

      {/* Start/Stop */}
      <TouchableOpacity
        style={[styles.sessionBtn, isActive && styles.sessionBtnStop]}
        onPress={handleStartStop}
      >
        <Text style={styles.sessionBtnText}>{isActive ? '■ END SESSION' : '▶ START SESSION'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:BG.base, paddingTop:52, paddingHorizontal:16, paddingBottom:8 },

  topBar: { flexDirection:'row', alignItems:'center', marginBottom:10, gap:8 },
  calibBtn: { ...PANEL.base, paddingHorizontal:9, paddingVertical:4 },
  calibText: { color:ACCENT, fontSize:9, fontFamily:FONT.mono, letterSpacing:1 },
  exitBtn: { marginLeft:'auto' },
  exitText: { color:TEXT.t2, fontSize:10, fontFamily:FONT.mono, letterSpacing:0.5 },

  timeHero: { marginBottom:10, gap:3 },
  timeLabel: { fontFamily:FONT.mono, fontSize:9, color:TEXT.t3, letterSpacing:2, textTransform:'uppercase' },
  timerBig: { fontFamily:FONT.display, fontSize:64, color:TEXT.t1, letterSpacing:-2, lineHeight:64 },
  detectRow: { flexDirection:'row', alignItems:'center', gap:10 },
  detectCount: { fontFamily:FONT.display, fontSize:20, color:ACCENT, letterSpacing:-0.5 },
  detectLabel: { fontFamily:FONT.mono, fontSize:9, color:TEXT.t3, letterSpacing:1, textTransform:'uppercase' },
  detectDivider: { width:1, height:12, backgroundColor:LINE.dim },
  detectHz: { fontFamily:FONT.mono, fontSize:9, color:TEXT.t3 },

  detectionBanner: { backgroundColor:ACCENT, borderRadius:R, paddingVertical:12, paddingHorizontal:16, flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  detectionCode: { fontFamily:FONT.mono, fontSize:9, color:'rgba(10,10,11,0.6)', letterSpacing:1, textTransform:'uppercase' },
  detectionTrick: { fontFamily:FONT.display, fontSize:26, color:'#0A0A0B', letterSpacing:-0.5 },
  detectionScore: { fontFamily:FONT.display, fontSize:38, color:'#0A0A0B', letterSpacing:-1 },

  listeningBanner: { ...PANEL.base, paddingVertical:12, paddingHorizontal:14, flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8, height:52 },
  listeningText: { fontFamily:FONT.mono, fontSize:9, color:TEXT.t3, letterSpacing:2, textTransform:'uppercase' },
  stateChip: { borderWidth:1, borderRadius:R, paddingHorizontal:8, paddingVertical:3 },
  stateChipText: { fontFamily:FONT.mono, fontSize:9, letterSpacing:1, textTransform:'uppercase' },

  boardViewer: { height:180, marginBottom:8, borderRadius:R, overflow:'hidden' },

  imuStrip: { flexDirection:'row', borderWidth:1, borderColor:LINE.dim, borderRadius:R, overflow:'hidden', marginBottom:8 },
  imuCell: { flex:1, padding:9, backgroundColor:BG.b2, borderRightWidth:1, borderRightColor:LINE.dim },
  imuCellLast: { borderRightWidth:0 },
  imuLabel: { fontFamily:FONT.mono, fontSize:8, color:ACCENT, letterSpacing:0.6, textTransform:'uppercase' },
  imuValue: { fontFamily:FONT.mono, fontSize:13, color:TEXT.t1, marginTop:2 },

  fsrRow: { flexDirection:'row', gap:6, marginBottom:8 },
  fsrCell: { flex:1, gap:3 },
  fsrLabel: { fontSize:8, fontFamily:FONT.mono, letterSpacing:1, textTransform:'uppercase', textAlign:'center' },
  fsrBarBg: { height:4, backgroundColor:BG.b4, borderRadius:0, overflow:'hidden' },
  fsrBarFill: { height:'100%' },

  sessionBtn: { ...BTN.base, ...BTN.primary, justifyContent:'center', marginTop:8 },
  sessionBtnStop: { ...BTN.base, ...BTN.danger, justifyContent:'center', marginTop:8 },
  sessionBtnText: { ...BTN.primaryText },

  feed: { flex:1, marginTop:4 },
  feedEmpty: { color:TEXT.t3, textAlign:'center', marginTop:12, fontFamily:FONT.mono, fontSize:10, letterSpacing:1 },
  feedItem: { flexDirection:'row', alignItems:'center', paddingVertical:8, borderBottomWidth:1, borderBottomColor:LINE.dim, gap:8 },
  feedIndex: { color:TEXT.t4, fontSize:9, fontFamily:FONT.mono, width:24 },
  feedDot: { width:5, height:5 },
  feedTrick: { color:TEXT.t1, fontSize:12, fontFamily:FONT.display, flex:1, letterSpacing:-0.2 },
  feedScore: { color:ACCENT, fontSize:14, fontFamily:FONT.display, letterSpacing:-0.5 },

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
