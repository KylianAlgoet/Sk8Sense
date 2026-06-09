import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, Platform,
} from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useTrickStore from '../store/trickStore';
import useBleStore from '../store/bleStore';
import { computeCleanScore, estimateLanded, describeFactor } from '../services/trickScore';
import { getTrickTip } from '../services/aiCoach';
import { BG, TEXT, LINE, ACCENT, FONT, R } from '../design-tokens';
import { V3Grid } from '../components/V3Shared';

const IS_WEB = Platform.OS === 'web';
// Cap UI re-renders from the 100Hz BLE stream — same throttle as DashboardScreen.
// Without it, setSensorData fires up to 100x/sec and the JS thread can't keep up
// with touch events, making buttons appear completely unresponsive. Lowered from
// 10 to 6 (matches the Dashboard lag fix) — live pose/drag steps already add their
// own per-tick evaluation work on top of this, so the budget needs more headroom here.
const UI_HZ = 6;

// How long we'll wait for a physical attempt before giving up and asking to retry.
// Generous — the rider needs to set up, pop, land. Real attempts resolve in ~1-2s.
const ATTEMPT_TIMEOUT_MS = 7000;

// 'pose' steps need the right foot pattern held for this long before going green —
// long enough to filter out a foot just passing through on its way somewhere else,
// short enough that holding it doesn't feel like a chore.
const POSE_HOLD_MS = 500;

const SCORE_COLORS = { Clean: '#4CAF50', Solid: '#3DD8F4', Shaky: '#FFB020', 'Needs work': '#FF4438' };
function scoreColor(label) { return SCORE_COLORS[label] || TEXT.t2; }

const FSR_PRESS = 550;
const FSR_LABELS = { f1: 'NOSE', f2: 'TOE', f3: 'HEEL', f4: 'TAIL' };
const SHUV_ROTATION_MIN = 140;
const SHUV_MAX_FLIP_GX = 180;
const SHUV_WINDOW_MS = 900;

// Which firmware trick label(s) count as a hit for the trick the rider selected.
// The board only knows ollie/kickflip/heelflip/bs_shuv/fs_shuv — "Pop Shove-it" maps
// to either shuv direction since the rotation direction doesn't change the trick.
function matchesSelectedTrick(currentTrick, firmwareTrick) {
  if (!currentTrick || firmwareTrick === 'none') return false;
  if (Array.isArray(currentTrick.detectAs)) return currentTrick.detectAs.includes(firmwareTrick);
  return currentTrick.id === firmwareTrick;
}

// Convert accel (m/s²) → pitch/roll in degrees — mirrors DashboardScreen's calibration math
// so "zero" means the same thing on both screens.
function calcPitchRoll(ax, ay, az) {
  return {
    pitch: Math.atan2(ay, Math.sqrt(ax * ax + az * az)) * (180 / Math.PI),
    roll:  Math.atan2(-ax, az) * (180 / Math.PI),
  };
}

// Does this sensor frame satisfy every check in a pose spec?
// checks = [{ sensor: 'f4', min: 550 }, { sensor: 'f1', max: 450 }]
function checkSatisfied(data, { sensor, min, max, absMin, anyOf }) {
  if (anyOf) return anyOf.some((check) => checkSatisfied(data, check));
  const v = data[sensor] || 0;
  if (absMin != null && Math.abs(v) < absMin) return false;
  if (min != null && v < min) return false;
  if (max != null && v > max) return false;
  return true;
}

function poseSatisfied(data, checks) {
  return checks.every((check) => checkSatisfied(data, check));
}

export default function PracticeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { currentTrick, currentStep, completeStep, goToPreviousStep, addAttempt, startSession, endSession, resetPracticeSession, getRandomCoachingTip } = useTrickStore();
  const { connectedDevice, sensorData, setSensorData, calibration, setCalibration } = useBleStore();

  const [attemptState, setAttemptState] = useState('idle'); // 'idle' | 'listening' | 'result'
  const [lastResult, setLastResult] = useState(null);    // null | 'success' | 'fail' | 'timeout'
  const [lastScore, setLastScore] = useState(null);      // { score, label, weakestFactor, landed }
  const [aiTip, setAiTip] = useState('');
  const [aiTipLoading, setAiTipLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [calibApplied, setCalibApplied] = useState(false);

  // Live readout for 'pose'/'drag' steps — which checks are currently satisfied,
  // so the rider can see exactly what the board is reading while they hold the stance.
  const [liveChecks, setLiveChecks] = useState([]);   // [{ sensor, label, ok }]
  const [poseHolding, setPoseHolding] = useState(false); // base pose currently held (drag steps)
  const [stepCleared, setStepCleared] = useState(false); // green confirmation flash before auto-advance

  const timerRef = useRef(null);
  const detectOpacity = useRef(new Animated.Value(1)).current;
  const liveScale = useRef(new Animated.Value(1)).current;
  const detectLoopRef = useRef(null);

  // Live sensor tracking refs — same pattern as DashboardScreen, kept stable across renders
  const trickMetaRef   = useRef({});     // peakGx, peakGy, peakGz, airtime, tailFsr captured during airtime
  const aiTipRequestRef = useRef(0);
  const maxImpactRef   = useRef(0);      // peak impact magnitude for landing assessment
  const lastUiRef      = useRef(0);      // throttles setSensorData to UI_HZ so the JS thread stays free for touches
  const prevTrickRef   = useRef('none');
  const listeningRef   = useRef(false);  // true while we're armed and waiting for a physical attempt ('trick' steps)
  const timeoutRef     = useRef(null);
  const allowLeaveRef  = useRef(false);
  const calibTimeoutRef = useRef(null);
  const advanceTimeoutRef = useRef(null);
  const shuvCandidateRef = useRef({ tailAt: 0, peakGx: 0, peakGy: 0, peakGz: 0, peakImpact: 0, tailFsr: 0 });
  // Live pose/drag tracking — only relevant while the active step is 'pose' or 'drag'
  const poseHoldStartRef = useRef(null);  // timestamp when the base pose first became true
  const stepResolvedRef  = useRef(false); // guards against double-firing the auto-advance
  // Last pushed ok/holding "shape" — lets evaluatePoseStep skip setState when the
  // boolean result hasn't actually changed, even though raw FSR numbers jitter every tick.
  const liveChecksSigRef = useRef('');
  const poseHoldingRef   = useRef(false);
  // Screen-focus guard — mirrors DashboardScreen's fix: without it, the 100Hz BLE feed
  // keeps hammering setState/refs/AI-calls in the background after navigating to
  // PracticeSummary or another screen, piling onto that screen's own work and freezing the app.
  const focusedRef     = useRef(true);
  useEffect(() => { focusedRef.current = isFocused; }, [isFocused]);
  // Mirror of bleStore.calibration — same shared "zero" the Dashboard sets, so the
  // rider doesn't need to recalibrate per screen. Ref keeps the BLE closure fresh.
  const calibRef       = useRef(calibration);
  useEffect(() => { calibRef.current = calibration; }, [calibration]);

  const stepIndex = currentStep;
  const totalSteps = currentTrick?.steps?.length || 3;
  const isLastStep = stepIndex >= totalSteps - 1;
  const step = currentTrick?.steps?.[stepIndex];
  const detectType = step?.detect?.type; // 'pose' | 'drag' | 'trick' | undefined (legacy steps)

  // handleIncomingData is a plain function redefined every render, but the feed
  // subscription effect further down only runs once (mount) — its captured closure
  // freezes whatever `detectType`/`evaluatePoseStep` were AT THAT MOMENT, forever.
  // That's why live-detection silently did nothing on step 1: the subscription
  // locked onto an early render where detectType read `undefined`, so the pose/drag
  // branch never ran on any later tick. Routing through refs (same fix as
  // focusedRef/calibRef above) keeps the closure reading whatever is *actually*
  // current, no matter when the feed callback was first wired up.
  const detectTypeRef = useRef(detectType);
  useEffect(() => { detectTypeRef.current = detectType; }, [detectType]);
  const evaluatePoseStepRef = useRef(null);
  const handleIncomingDataRef = useRef(null);
  useEffect(() => { handleIncomingDataRef.current = handleIncomingData; });

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowLeaveRef.current) {
        resetPracticeSession();
        return;
      }

      const { currentStep: liveStep, goToPreviousStep: stepBack, resetPracticeSession: resetPractice } = useTrickStore.getState();
      if (liveStep > 0) {
        event.preventDefault();
        resetPracticeUi();
        stepBack();
        return;
      }

      event.preventDefault();
      quitPractice();
    });

    return unsubscribe;
  }, [navigation, resetPracticeSession]);

  useEffect(() => {
    const parent = navigation.getParent?.();
    if (!parent) return undefined;
    return parent.addListener('tabPress', (event) => {
      if (navigation.isFocused()) event.preventDefault();
    });
  }, [navigation]);

  // No board, no real practice — send the rider to connect first (web demo skips this).
  // Practice lives in LearnStack while Connect lives in BoardStack — must go through
  // the parent tab navigator to cross stacks (same pattern as HomeScreen's History link).
  // Pass returnTo so Connect routes back here (and not to the Dashboard) once paired —
  // the selected trick lives in trickStore, so no params need to travel with it.
  useEffect(() => {
    if (!IS_WEB && !connectedDevice) {
      navigation.getParent()?.navigate('Board', {
        screen: 'Connect',
        params: { returnTo: { stack: 'Learn', screen: 'Practice' } },
      });
    }
  }, [connectedDevice, navigation]);

  useEffect(() => {
    startSession();
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      clearInterval(timerRef.current);
      stopPracticeRuntime();
    };
  }, []);

  // Reset all live pose/drag tracking whenever the active step changes — a fresh
  // step means a fresh read, no carry-over from whatever the rider was just doing.
  useEffect(() => {
    poseHoldStartRef.current = null;
    stepResolvedRef.current = false;
    liveChecksSigRef.current = '';
    poseHoldingRef.current = false;
    setLiveChecks([]);
    setPoseHolding(false);
    setStepCleared(false);
    liveScale.setValue(1);
  }, [stepIndex, currentTrick?.id]);

  const handleCalibrate = () => {
    const { ax = 0, ay = 0, az = 9.8 } = sensorData;
    const raw = calcPitchRoll(ax, ay, az);
    const next = { pitch: raw.pitch, roll: raw.roll };
    calibRef.current = next;
    setCalibration(next);
    setCalibApplied(true);
    clearTimeout(calibTimeoutRef.current);
    calibTimeoutRef.current = setTimeout(() => setCalibApplied(false), 1500);
  };

  function formatTime(s) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  }

  // Step cleared — small celebratory pulse, then hand off to the existing step-advance logic.
  const clearStep = useCallback(() => {
    if (stepResolvedRef.current) return;
    stepResolvedRef.current = true;
    setStepCleared(true);
    clearTimeout(advanceTimeoutRef.current);
    Animated.sequence([
      Animated.timing(liveScale, { toValue: 1.06, duration: 180, useNativeDriver: true }),
      Animated.timing(liveScale, { toValue: 1,    duration: 180, useNativeDriver: true }),
    ]).start();

    advanceTimeoutRef.current = setTimeout(() => {
      if (!isLastStep) completeStep();
    }, 900);
  }, [isLastStep, completeStep, liveScale]);

  // All four sensors, always — the rider sees the whole board light up as it senses
  // pressure, not just the one or two the current step happens to check. A chip glows
  // once its sensor crosses FSR_PRESS, regardless of whether THAT sensor is the one
  // this step is grading; the grading itself still only looks at `detect.sensor`/`trigger`.
  const ALL_SENSORS = ['f1', 'f2', 'f3', 'f4'];

  // Build the all-four glow readout + a cheap signature string ("f1:0|f2:0|f3:1|f4:1")
  // used purely to detect whether any chip's lit state actually flipped — the raw FSR
  // numbers jitter near the threshold every tick, but the chip only needs to repaint
  // when its on/off state changes.
  function buildGlowChecks(data) {
    const checks = ALL_SENSORS.map(sensor => ({ sensor, label: FSR_LABELS[sensor], ok: (data[sensor] || 0) >= FSR_PRESS }));
    const sig = checks.map(c => `${c.sensor}:${c.ok ? 1 : 0}`).join('|');
    return { checks, sig };
  }

  // Live pose/drag evaluation — runs on every throttled UI tick while a 'pose' or
  // 'drag' step is active. The glow readout (`liveChecks`) always reflects all four
  // sensors; the pass/fail grading underneath looks only at the one sensor this step cares about.
  //
  // IMPORTANT: setLiveChecks/setPoseHolding only fire when the underlying ok/holding
  // booleans actually flip. Building a fresh array of objects every tick (10x/sec)
  // and pushing it to state regardless made React treat it as "changed" every time
  // — re-rendering the whole screen at UI_HZ even while the rider just stood still.
  // That was the new lag source (same shape as the Dashboard FlatList issue, just
  // here it's "new array reference -> setState -> re-render" instead of FlatList diffing).
  const evaluatePoseStep = useCallback((data) => {
    if (!step?.detect || stepResolvedRef.current) return;
    const { detect } = step;
    const now = Date.now();

    const { checks, sig } = buildGlowChecks(data);
    if (sig !== liveChecksSigRef.current) {
      liveChecksSigRef.current = sig;
      setLiveChecks(checks);
    }

    if (detect.type === 'pose') {
      // Single-sensor hold — e.g. "tail pressed past threshold" — nothing else matters.
      const held = poseSatisfied(data, [detect.sensor]);

      if (held !== poseHoldingRef.current) {
        poseHoldingRef.current = held;
        setPoseHolding(held);
      }

      if (held) {
        if (!poseHoldStartRef.current) poseHoldStartRef.current = now;
        else if (now - poseHoldStartRef.current >= (detect.holdMs || POSE_HOLD_MS)) clearStep();
      } else {
        poseHoldStartRef.current = null;
      }
      return;
    }

    if (detect.type === 'drag') {
      // Press-peak on the one sensor that captures this trick's flick/scoop/slide —
      // standing still, slow motion. No base-pose recheck: by this point the rider has
      // already proven they can hold the stance (step 1), and re-requiring it here just
      // made an already-felt motion register as "not detected" if their weight shifted mid-drag.
      const triggered = poseSatisfied(data, detect.trigger);
      if (triggered) clearStep();
    }
  }, [step, clearStep]);
  useEffect(() => { evaluatePoseStepRef.current = evaluatePoseStep; }, [evaluatePoseStep]);

  // ── Shared sensor feed — registers with bleStore's single subscription ───
  // Practice used to open its own monitorCharacteristicForService (or mock stream)
  // on top of Dashboard's — native-stack keeps Dashboard mounted in the background
  // when navigating to Learn, so both ran simultaneously and doubled all 100Hz
  // parsing/processing work, freezing the JS thread the moment a lesson started.
  // bleStore now owns the one true subscription; we just listen.
  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      const unsubscribe = useBleStore.getState().subscribeToRawData((data) => {
        handleIncomingDataRef.current?.(data);
      });
      return () => {
        focusedRef.current = false;
        stopPracticeRuntime();
        unsubscribe();
      };
    }, [])
  );

  // Resolve the in-flight attempt — shared by detection-success and timeout paths ('trick' steps).
  const resolveAttempt = useCallback((meta, firmwareTrick) => {
    if (!listeningRef.current) return;
    listeningRef.current = false;
    clearTimeout(timeoutRef.current);

    const trickId = currentTrick.id;
    const scoredMeta = meta;
    const computedScore = computeCleanScore({ trick: firmwareTrick || trickId, ...scoredMeta });
    const score = computedScore.score;
    const label = computedScore.label;
    const weakestFactor = computedScore.weakestFactor;
    const landed = estimateLanded(scoredMeta);

    setLastScore({ score, label, weakestFactor, landed });
    setLastResult(landed ? 'success' : 'fail');
    setAttemptState('result');
    addAttempt(landed);

    // AI coaching grounded in the real sensor read for THIS attempt
    setAiTip('');
    setAiTipLoading(true);
    const requestId = ++aiTipRequestRef.current;
    getTrickTip({ trick: firmwareTrick || trickId, ...scoredMeta, landed, cleanScore: score, weakestFactor })
      .then(tip => {
        if (requestId === aiTipRequestRef.current && focusedRef.current) setAiTip(tip || '');
      })
      .catch(() => {
        if (requestId === aiTipRequestRef.current && focusedRef.current) setAiTip('');
      })
      .finally(() => {
        if (requestId === aiTipRequestRef.current && focusedRef.current) setAiTipLoading(false);
      });

  }, [currentTrick, addAttempt]);

  const resolveTimeout = useCallback(() => {
    if (!listeningRef.current) return;
    listeningRef.current = false;
    setLastResult('timeout');
    setLastScore(null);
    setAiTip('');
    setAttemptState('result');
  }, []);

  // handleIncomingData — only refs + stable setters, mirrors DashboardScreen's pattern
  function stopPracticeRuntime() {
    aiTipRequestRef.current += 1;
    listeningRef.current = false;
    detectLoopRef.current?.stop();
    detectLoopRef.current = null;
    clearTimeout(timeoutRef.current);
    clearTimeout(calibTimeoutRef.current);
    clearTimeout(advanceTimeoutRef.current);
  }

  function resetLiveStepState() {
    poseHoldStartRef.current = null;
    stepResolvedRef.current = false;
    liveChecksSigRef.current = '';
    poseHoldingRef.current = false;
    setLiveChecks([]);
    setPoseHolding(false);
    setStepCleared(false);
    liveScale.stopAnimation();
    liveScale.setValue(1);
  }

  function resetPracticeUi() {
    stopPracticeRuntime();
    resetLiveStepState();
    setAttemptState('idle');
    setLastResult(null);
    setLastScore(null);
    setAiTip('');
    setAiTipLoading(false);
  }

  function detectAppSidePopShuvit(data, impact, now) {
    if (currentTrick?.id !== 'pop_shuvit') return null;
    const s = shuvCandidateRef.current;
    const tail = data.f4 || 0;
    if (tail >= FSR_PRESS) {
      s.tailAt = now;
      s.peakGx = 0;
      s.peakGy = 0;
      s.peakGz = 0;
      s.peakImpact = impact;
      s.tailFsr = Math.max(s.tailFsr || 0, tail);
      return null;
    }
    if (!s.tailAt) return null;
    if (now - s.tailAt > SHUV_WINDOW_MS) {
      shuvCandidateRef.current = { tailAt: 0, peakGx: 0, peakGy: 0, peakGz: 0, peakImpact: 0, tailFsr: 0 };
      return null;
    }

    const gx = data.gx || 0;
    const gy = data.gy || 0;
    const gz = data.gz || 0;
    if (Math.abs(gx) > Math.abs(s.peakGx)) s.peakGx = gx;
    if (Math.abs(gy) > Math.abs(s.peakGy)) s.peakGy = gy;
    if (Math.abs(gz) > Math.abs(s.peakGz)) s.peakGz = gz;
    s.peakImpact = Math.max(s.peakImpact || 0, impact);

    if (Math.abs(s.peakGz) >= SHUV_ROTATION_MIN && Math.abs(s.peakGx) <= SHUV_MAX_FLIP_GX) {
      const meta = {
        peakGx: s.peakGx || 0,
        peakGy: s.peakGy || 0,
        peakGz: s.peakGz || 0,
        airtime: trickMetaRef.current.airtime || 180,
        tailFsr: Math.max(s.tailFsr || 0, trickMetaRef.current.tailFsr || 0),
        landingImpact: Math.max(maxImpactRef.current || 0, s.peakImpact || 0),
      };
      shuvCandidateRef.current = { tailAt: 0, peakGx: 0, peakGy: 0, peakGz: 0, peakImpact: 0, tailFsr: 0 };
      return meta;
    }
    return null;
  }

  function quitPractice() {
    allowLeaveRef.current = true;
    resetPracticeUi();
    resetPracticeSession();
    useBleStore.getState().resetRawDataStream();
    navigation.goBack();
  }

  function handleIncomingData(data) {
    // Screen lost focus (e.g. rider is now on PracticeSummary) — the BLE link stays
    // alive so reconnecting stays instant, but stop doing any rendering/detection work.
    if (!focusedRef.current) return;

    const m = trickMetaRef.current;
    if (Math.abs(data.gx || 0) > Math.abs(m.peakGx || 0)) m.peakGx = data.gx;
    if (Math.abs(data.gy || 0) > Math.abs(m.peakGy || 0)) m.peakGy = data.gy;
    if (Math.abs(data.gz || 0) > Math.abs(m.peakGz || 0)) m.peakGz = data.gz;
    m.tailFsr = Math.max(m.tailFsr || 0, data.f4 || 0);
    if (!m.airtimeStart && data.trick !== 'none') m.airtimeStart = Date.now();
    if (m.airtimeStart && data.trick === 'none') {
      m.airtime = Date.now() - m.airtimeStart;
      m.airtimeStart = null;
    }

    const impact = Math.sqrt((data.ax || 0) ** 2 + (data.ay || 0) ** 2 + (data.az || 0) ** 2);
    if (listeningRef.current && impact > maxImpactRef.current) maxImpactRef.current = impact;

    const now = Date.now();
    const trick = data.trick;
    // Rising edge: airtime just finished (trick → none) while we were armed and watching —
    // this is the moment a real attempt completes, whether it matched or not.
    if (listeningRef.current && trick === 'none' && prevTrickRef.current !== 'none') {
      const detected = prevTrickRef.current;
      const meta = {
        peakGx: trickMetaRef.current.peakGx || 0,
        peakGy: trickMetaRef.current.peakGy || 0,
        peakGz: trickMetaRef.current.peakGz || 0,
        airtime: trickMetaRef.current.airtime || 0,
        tailFsr: trickMetaRef.current.tailFsr || 0,
        landingImpact: maxImpactRef.current,
      };
      trickMetaRef.current = {};
      resolveAttempt(meta, matchesSelectedTrick(currentTrick, detected) ? detected : currentTrick?.id);
    } else if (listeningRef.current && trick === 'none') {
      const shuvMeta = detectAppSidePopShuvit(data, impact, now);
      if (shuvMeta) {
        trickMetaRef.current = {};
        resolveAttempt(shuvMeta, 'pop_shuvit');
      }
    }
    prevTrickRef.current = trick;

    // Pose/drag steps need full-rate reads: a scoop/flick can be a short gyro/FSR
    // peak that disappears between two throttled UI frames.
    const liveDetectType = detectTypeRef.current;
    if (liveDetectType === 'pose' || liveDetectType === 'drag') {
      evaluatePoseStepRef.current?.(data);
    }

    // Throttled UI update — detection logic above already runs on every 100Hz sample
    // via refs; only the visible sensorData (board viewer / badges) needs to be capped.
    if (now - lastUiRef.current >= 1000 / UI_HZ) {
      lastUiRef.current = now;
      setSensorData(data);
    }
  }

  // Arm detection — the rider has set up and is about to go for it ('trick' steps only).
  const startListening = useCallback(() => {
    setAttemptState('listening');
    setLastResult(null);
    setLastScore(null);
    setAiTip('');
    trickMetaRef.current = {};
    shuvCandidateRef.current = { tailAt: 0, peakGx: 0, peakGy: 0, peakGz: 0, peakImpact: 0, tailFsr: 0 };
    maxImpactRef.current = 0;
    prevTrickRef.current = 'none';
    listeningRef.current = true;
    clearTimeout(timeoutRef.current);

    detectLoopRef.current?.stop();
    detectLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(detectOpacity, { toValue: 0.35, duration: 450, useNativeDriver: true }),
        Animated.timing(detectOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ])
    );
    detectLoopRef.current.start();

    timeoutRef.current = setTimeout(resolveTimeout, ATTEMPT_TIMEOUT_MS);
  }, [detectOpacity, resolveTimeout]);

  // Stop the pulse animation once we leave the listening state
  useEffect(() => {
    if (attemptState !== 'listening') {
      detectLoopRef.current?.stop();
      detectLoopRef.current = null;
      detectOpacity.stopAnimation();
      Animated.timing(detectOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [attemptState, detectOpacity]);

  const handleEndSession = useCallback(() => {
    aiTipRequestRef.current += 1;
    clearInterval(timerRef.current);
    listeningRef.current = false;
    clearTimeout(timeoutRef.current);
    clearTimeout(calibTimeoutRef.current);
    clearTimeout(advanceTimeoutRef.current);
    const result = endSession();
    allowLeaveRef.current = true;
    navigation.replace('PracticeSummary', { result, trickId: currentTrick.id });
  }, [currentTrick?.id, endSession, navigation]);

  const continueAfterResult = useCallback(() => {
    const wasSuccess = lastResult === 'success';
    const wasCompletedFinalAttempt = isLastStep && (lastResult === 'success' || lastResult === 'fail');
    setAttemptState('idle');
    setLastResult(null);
    setLastScore(null);
    setAiTip('');

    if (wasCompletedFinalAttempt) {
      handleEndSession();
    } else if (wasSuccess) {
      completeStep();
    }
  }, [lastResult, isLastStep, completeStep, handleEndSession]);

  // Top-bar back arrow — steps back through the walkthrough instead of bailing
  // out of Practice entirely. From any step but the first, go back one step;
  // from step 1, leave to TrickIntro.
  const handleBack = () => {
    resetPracticeUi();
    if (currentStep > 0) {
      goToPreviousStep();
      return;
    }
    quitPractice();
  };

  if (!currentTrick) return null;
  if (!IS_WEB && !connectedDevice) return null; // redirecting to Connect

  const isListening = attemptState === 'listening';
  const showingResult = attemptState === 'result';
  const isLiveStep = detectType === 'pose' || detectType === 'drag';

  let cardBorder = LINE.dim;
  if (stepCleared) cardBorder = '#4CAF50';
  else if (showingResult) {
    cardBorder = lastResult === 'success' ? ACCENT
      : lastResult === 'fail' ? '#FF4438'
      : '#FFB020'; // timeout
  } else if (isListening || (isLiveStep && poseHolding)) {
    cardBorder = '#3DD8F4';
  }

  return (
    <View style={styles.container}>
      <V3Grid />
      <View style={{ height: insets.top, backgroundColor: BG.base }} />
      <StatusBar barStyle="light-content" backgroundColor={BG.base} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={18} color={TEXT.t2} />
        </TouchableOpacity>
        <Text style={styles.trickTitle}>{currentTrick.name}</Text>
        <TouchableOpacity onPress={handleCalibrate} style={styles.calibBtn}>
          <Text style={[styles.calibText, calibApplied && { color: '#4CAF50' }]}>
            {calibApplied ? '✓ CALIBRATED' : '◎ CALIBRATE'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        <TouchableOpacity onPress={quitPractice} style={styles.leaveBtn}>
          <Text style={styles.leaveText}>LEAVE</Text>
        </TouchableOpacity>
      </View>

      {/* Step bar */}
      <View style={styles.stepBar}>
        <Text style={styles.stepLabel}>STEP {String(stepIndex + 1).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}</Text>
        <View style={styles.stepDots}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View key={i} style={[
              styles.stepDot,
              i < stepIndex   && { backgroundColor: ACCENT },
              i === stepIndex && { backgroundColor: ACCENT, width: 18 },
              i > stepIndex   && { backgroundColor: BG.b4 },
            ]} />
          ))}
        </View>
      </View>

      {/* Instruction / live-read / listening / result card */}
      <Animated.View style={[styles.instructionCard, { borderColor: cardBorder, opacity: detectOpacity, transform: [{ scale: liveScale }] }]}>
        {stepCleared ? (
          <View style={styles.resultRow}>
            <View style={[styles.resultDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={[styles.resultText, { color: '#4CAF50' }]}>NAILED IT — NEXT UP</Text>
          </View>
        ) : showingResult && (
          <View style={styles.resultRow}>
            <View style={[styles.resultDot, { backgroundColor: lastResult === 'success' ? ACCENT : lastResult === 'fail' ? '#FF4438' : '#FFB020' }]} />
            <Text style={[styles.resultText, { color: lastResult === 'success' ? ACCENT : lastResult === 'fail' ? '#FF4438' : '#FFB020' }]}>
              {lastResult === 'success' ? (isLastStep ? 'LANDED' : 'GOT IT') : lastResult === 'fail' ? 'BAILED' : 'NO READ — TRY AGAIN'}
            </Text>
            {lastScore && (
              <Text style={[styles.resultScore, { color: scoreColor(lastScore.label) }]}>{lastScore.score}</Text>
            )}
          </View>
        )}

        {isListening ? (
          <>
            <Text style={styles.instructionTitle}>GO FOR IT</Text>
            <Text style={styles.instructionTip}>Pop, land, ride out — we're reading the board live. No need to press anything else.</Text>
          </>
        ) : showingResult ? (
          <>
            <Text style={styles.instructionTitle}>
              {lastResult === 'timeout' ? 'NOTHING DETECTED' : lastScore ? `${lastScore.label.toUpperCase()} · ${describeFactor(lastScore.weakestFactor).toUpperCase()}` : step.title}
            </Text>
            <Text style={styles.instructionTip}>
              {lastResult === 'timeout'
                ? "The board didn't pick up a clear attempt — make sure it's connected and give it another go."
                : aiTipLoading
                  ? 'Reading your attempt…'
                  : (aiTip || step.tip)}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.instructionTitle}>
              {step.title}
            </Text>
            <Text style={styles.instructionTip}>
              {step.tip}
            </Text>

            {/* Live FSR readout — only for pose/drag steps, shows exactly what the
                board is reading right now so the rider can adjust their stance live */}
            {isLiveStep && !stepCleared && liveChecks.length > 0 && (
              <View style={styles.liveReadWrap}>
                <Text style={styles.liveReadLabel}>{step.liveLabel}</Text>
                <View style={styles.liveReadRow}>
                  {liveChecks.map((c, i) => (
                    <View key={`${c.sensor}-${i}`} style={[styles.liveChip, c.ok && styles.liveChipOk]}>
                      <View style={[styles.liveDot, { backgroundColor: c.ok ? '#4CAF50' : TEXT.t4 }]} />
                      <Text style={[styles.liveChipText, c.ok && styles.liveChipTextOk]}>{c.label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.liveReadHint}>
                  {detectType === 'pose'
                    ? (poseHolding ? 'Hold it… reading your stance' : 'Get into position — we\'re watching live')
                    : 'Go for the motion — we\'re watching live'}
                </Text>
              </View>
            )}
          </>
        )}
      </Animated.View>

      {/* Sensor badge */}
      <View style={styles.sensorBadge}>
        <View style={[styles.sensorDot, { backgroundColor: connectedDevice || IS_WEB ? '#4CAF50' : '#FFB020' }]} />
        <Text style={[styles.sensorText, { color: connectedDevice || IS_WEB ? '#4CAF50' : '#FFB020' }]}>
          {connectedDevice ? 'LIVE SENSOR' : IS_WEB ? 'SIMULATED' : 'NOT CONNECTED'}
        </Text>
      </View>

      {/* CTA — pose/drag steps read live with no button; 'trick' steps still need the rider to arm detection */}
      <View style={[styles.ctaWrap, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {isLiveStep ? (
          !stepCleared && (
            <View style={styles.liveCta}>
              <Ionicons name="radio-outline" size={15} color={TEXT.t3} />
              <Text style={styles.liveCtaText}>Watching the board — no need to press anything</Text>
            </View>
          )
        ) : showingResult ? (
          <View style={styles.resultCtaRow}>
            <TouchableOpacity style={[styles.ctaBtn, styles.ctaBtnFlex]} onPress={startListening} activeOpacity={0.85}>
              <Text style={styles.ctaBtnText}>TRY AGAIN</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ctaBtnGhost, styles.ctaBtnFlex]} onPress={continueAfterResult} activeOpacity={0.85}>
              <Text style={styles.ctaBtnGhostText}>
                {isLastStep && (lastResult === 'success' || lastResult === 'fail')
                  ? 'FINISH LESSON'
                  : lastResult === 'success'
                    ? 'NEXT STEP'
                    : 'CONTINUE'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.ctaBtn, isListening && styles.ctaBtnDisabled]}
            onPress={startListening}
            disabled={isListening}
            activeOpacity={0.85}
          >
            <Text style={[styles.ctaBtnText, isListening && { color: TEXT.t3 }]}>
              {isListening ? 'WATCHING THE BOARD…' : 'I\'M READY — GO'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.base },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, gap: 12 },
  backBtn: { width: 34, height: 34, borderRadius: R, backgroundColor: BG.b2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: LINE.dim },
  trickTitle: { fontFamily: FONT.display, fontSize: 18, color: TEXT.t1, textTransform: 'uppercase', letterSpacing: -0.5, flex: 1 },
  calibBtn: { backgroundColor: BG.b2, borderWidth: 1, borderColor: LINE.dim, borderRadius: R, paddingHorizontal: 9, paddingVertical: 4, marginRight: 10 },
  calibText: { color: ACCENT, fontSize: 9, fontFamily: FONT.mono, letterSpacing: 1 },
  timer: { color: TEXT.t3, fontFamily: FONT.mono, fontSize: 14 },
  leaveBtn: { backgroundColor: BG.b2, borderWidth: 1, borderColor: LINE.mid, borderRadius: R, paddingHorizontal: 8, paddingVertical: 5 },
  leaveText: { color: TEXT.t2, fontSize: 9, fontFamily: FONT.mono, letterSpacing: 1, textTransform: 'uppercase' },

  stepBar: { paddingHorizontal: 18, paddingBottom: 8 },
  stepLabel: { color: TEXT.t3, fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, marginBottom: 7, textTransform: 'uppercase' },
  stepDots: { flexDirection: 'row', gap: 5 },
  stepDot: { width: 8, height: 4, borderRadius: 0 },

  instructionCard: { marginHorizontal: 18, marginTop: 8, backgroundColor: BG.b2, borderRadius: R, padding: 16, borderWidth: 1, marginBottom: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  resultDot: { width: 6, height: 6 },
  resultText: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', flex: 1 },
  resultScore: { fontFamily: FONT.display, fontSize: 20, letterSpacing: -0.8 },
  instructionTitle: { color: TEXT.t1, fontFamily: FONT.display, fontSize: 17, textTransform: 'uppercase', letterSpacing: -0.3, marginBottom: 5 },
  instructionTip: { color: TEXT.t2, fontFamily: FONT.body, fontSize: 13, lineHeight: 19 },

  // Live FSR readout — chips light up green as the rider's stance matches what the step needs
  liveReadWrap: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: LINE.dim },
  liveReadLabel: { color: TEXT.t3, fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 9 },
  liveReadRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BG.b1, borderWidth: 1, borderColor: LINE.dim, borderRadius: R, paddingHorizontal: 10, paddingVertical: 6 },
  liveChipOk: { borderColor: '#4CAF5060', backgroundColor: '#4CAF5014' },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveChipText: { color: TEXT.t3, fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1 },
  liveChipTextOk: { color: '#4CAF50' },
  liveReadHint: { color: TEXT.t3, fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.5, marginTop: 10 },

  sensorBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', marginBottom: 8, backgroundColor: BG.b2, borderRadius: R, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: LINE.dim },
  sensorDot: { width: 6, height: 6, borderRadius: 3 },
  sensorText: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },

  ctaWrap: { paddingHorizontal: 18, paddingTop: 4, minHeight: 64, justifyContent: 'center' },
  liveCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  liveCtaText: { color: TEXT.t3, fontFamily: FONT.mono, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  ctaBtn: { backgroundColor: ACCENT, borderRadius: R, paddingVertical: 15, alignItems: 'center' },
  ctaBtnDisabled: { backgroundColor: BG.b4 },
  ctaBtnText: { color: '#0A0A0B', fontFamily: FONT.display, fontSize: 14, letterSpacing: 0.5, textTransform: 'uppercase' },
  ctaBtnGhost: { borderWidth: 1, borderColor: LINE.mid, borderRadius: R, paddingVertical: 15, alignItems: 'center' },
  ctaBtnGhostText: { color: TEXT.t1, fontFamily: FONT.display, fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase' },
  resultCtaRow: { flexDirection: 'row', gap: 10 },
  ctaBtnFlex: { flex: 1 },

});
