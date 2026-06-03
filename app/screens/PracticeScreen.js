import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Modal, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useTrickStore from '../store/trickStore';
import useBleStore from '../store/bleStore';
import SkateboardGL from '../components/SkateboardGL';
import { BG, TEXT, LINE, ACCENT, FONT, R } from '../design-tokens';
import { V3Grid } from '../components/V3Shared';

const ROUND_SIZE = 5;

const ROUND_MESSAGES = {
  0: "Rough round. Your body is still figuring it out.",
  1: "Progress happening. Stay with it.",
  2: "Progress happening. Stay with it.",
  3: "Solid round. Getting consistent.",
  4: "Solid round. Getting consistent.",
  5: "Clean. That's the standard.",
};

export default function PracticeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { currentTrick, currentStep, completeStep, addAttempt, startSession, endSession, getRandomCoachingTip } = useTrickStore();
  const { connectedDevice } = useBleStore();

  const [phase, setPhase] = useState('steps');
  const [detecting, setDetecting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [currentTip, setCurrentTip] = useState('');
  const [roundAttempts, setRoundAttempts] = useState([]);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef(null);
  const detectOpacity = useRef(new Animated.Value(1)).current;

  const stepIndex = currentStep;
  const totalSteps = currentTrick?.steps?.length || 5;
  const isLastStep = stepIndex >= totalSteps - 1;

  useEffect(() => {
    startSession();
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  function formatTime(s) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  }

  const runDetection = useCallback(() => {
    setDetecting(true);
    setLastResult(null);

    Animated.loop(
      Animated.sequence([
        Animated.timing(detectOpacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.timing(detectOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      { iterations: 3 }
    ).start(() => {
      const successRate = phase === 'combine' ? 0.6 : 0.75;
      const landed = Math.random() < successRate;

      setDetecting(false);
      setLastResult(landed ? 'success' : 'fail');
      addAttempt(landed);

      if (phase === 'combine') {
        setCurrentTip(getRandomCoachingTip());
        const newRound = [...roundAttempts, landed];
        setRoundAttempts(newRound);
        if (newRound.length >= ROUND_SIZE) {
          setTimeout(() => setShowPauseModal(true), 900);
        }
      } else if (landed) {
        if (isLastStep) {
          setTimeout(() => { setPhase('combine'); setLastResult(null); }, 900);
        } else {
          setTimeout(() => { completeStep(); setLastResult(null); }, 700);
        }
      }
    });
  }, [phase, isLastStep, roundAttempts]);

  const handleEndSession = () => {
    setShowPauseModal(false);
    clearInterval(timerRef.current);
    const result = endSession();
    navigation.replace('PracticeSummary', { result, trickId: currentTrick.id });
  };

  if (!currentTrick) return null;

  const isCombine = phase === 'combine';
  const step = currentTrick.steps[stepIndex];
  const landedInRound = roundAttempts.filter(Boolean).length;

  return (
    <View style={styles.container}>
      <V3Grid />
      <View style={{ height: insets.top, backgroundColor: BG.base }} />
      <StatusBar barStyle="light-content" backgroundColor={BG.base} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={18} color={TEXT.t2} />
        </TouchableOpacity>
        <Text style={styles.trickTitle}>{currentTrick.name}</Text>
        <Text style={styles.timer}>{formatTime(elapsed)}</Text>
      </View>

      {/* Step / combine bar */}
      {isCombine ? (
        <View style={styles.combineBar}>
          <Text style={styles.combineLabel}>· FULL ATTEMPT ·</Text>
          <Text style={styles.roundCount}>{roundAttempts.length}/{ROUND_SIZE}</Text>
        </View>
      ) : (
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
      )}

      {/* Board */}
      <SkateboardGL stepIndex={stepIndex} phase={phase} trickColor={ACCENT} style={styles.board} />

      {/* Instruction card */}
      <Animated.View style={[styles.instructionCard, {
        borderColor: lastResult === 'success' ? ACCENT
          : lastResult === 'fail' ? '#FF4438' : LINE.dim,
        opacity: detectOpacity,
      }]}>
        {lastResult && (
          <View style={styles.resultRow}>
            <View style={[styles.resultDot, { backgroundColor: lastResult === 'success' ? ACCENT : '#FF4438' }]} />
            <Text style={[styles.resultText, { color: lastResult === 'success' ? ACCENT : '#FF4438' }]}>
              {lastResult === 'success' ? (isCombine ? 'LANDED' : 'GOT IT') : 'TRY AGAIN'}
            </Text>
          </View>
        )}
        <Text style={styles.instructionTitle}>
          {isCombine ? 'PUT IT ALL TOGETHER' : step.title}
        </Text>
        <Text style={styles.instructionTip}>
          {isCombine ? (currentTip || currentTrick.coachingTips[0]) : step.tip}
        </Text>
      </Animated.View>

      {/* Sensor badge */}
      <View style={styles.sensorBadge}>
        <View style={[styles.sensorDot, { backgroundColor: connectedDevice ? '#4CAF50' : '#FFB020' }]} />
        <Text style={[styles.sensorText, { color: connectedDevice ? '#4CAF50' : '#FFB020' }]}>
          {connectedDevice ? 'LIVE SENSOR' : 'SIMULATED'}
        </Text>
      </View>

      {/* CTA */}
      <View style={[styles.ctaWrap, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <TouchableOpacity
          style={[styles.ctaBtn, detecting && styles.ctaBtnDisabled]}
          onPress={runDetection}
          disabled={detecting}
          activeOpacity={0.85}
        >
          <Text style={[styles.ctaBtnText, detecting && { color: TEXT.t3 }]}>
            {detecting ? 'DETECTING...' : 'I TRIED IT'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Round pause modal */}
      <Modal visible={showPauseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTickTL} /><View style={styles.modalTickBR} />
            <Text style={styles.modalTitle}>· ROUND DONE ·</Text>
            <Text style={styles.modalScore}>{landedInRound}/{ROUND_SIZE}</Text>
            <Text style={styles.modalPct}>{Math.round((landedInRound / ROUND_SIZE) * 100)}% SUCCESS RATE</Text>
            <Text style={styles.modalMsg}>{ROUND_MESSAGES[Math.min(landedInRound, 5)]}</Text>
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => {
              setRoundAttempts([]); setLastResult(null); setCurrentTip(''); setShowPauseModal(false);
            }}>
              <Text style={styles.modalPrimaryText}>ANOTHER ROUND</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSecondaryBtn} onPress={handleEndSession}>
              <Text style={styles.modalSecondaryText}>END SESSION</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.base },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, gap: 12 },
  backBtn: { width: 34, height: 34, borderRadius: R, backgroundColor: BG.b2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: LINE.dim },
  trickTitle: { fontFamily: FONT.display, fontSize: 18, color: TEXT.t1, textTransform: 'uppercase', letterSpacing: -0.5, flex: 1 },
  timer: { color: TEXT.t3, fontFamily: FONT.mono, fontSize: 14 },

  stepBar: { paddingHorizontal: 18, paddingBottom: 8 },
  stepLabel: { color: TEXT.t3, fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, marginBottom: 7, textTransform: 'uppercase' },
  stepDots: { flexDirection: 'row', gap: 5 },
  stepDot: { width: 8, height: 4, borderRadius: 0 },

  combineBar: { paddingHorizontal: 18, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  combineLabel: { color: ACCENT, fontFamily: FONT.mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' },
  roundCount: { color: TEXT.t3, fontFamily: FONT.mono, fontSize: 13 },

  board: { height: 220, marginHorizontal: 18, borderRadius: R, overflow: 'hidden' },

  instructionCard: { marginHorizontal: 18, marginTop: 8, backgroundColor: BG.b2, borderRadius: R, padding: 16, borderWidth: 1, marginBottom: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  resultDot: { width: 6, height: 6 },
  resultText: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' },
  instructionTitle: { color: TEXT.t1, fontFamily: FONT.display, fontSize: 17, textTransform: 'uppercase', letterSpacing: -0.3, marginBottom: 5 },
  instructionTip: { color: TEXT.t2, fontFamily: FONT.body, fontSize: 13, lineHeight: 19 },

  sensorBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', marginBottom: 8, backgroundColor: BG.b2, borderRadius: R, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: LINE.dim },
  sensorDot: { width: 6, height: 6, borderRadius: 3 },
  sensorText: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },

  ctaWrap: { paddingHorizontal: 18, paddingTop: 4 },
  ctaBtn: { backgroundColor: ACCENT, borderRadius: R, paddingVertical: 15, alignItems: 'center' },
  ctaBtnDisabled: { backgroundColor: BG.b4 },
  ctaBtnText: { color: '#0A0A0B', fontFamily: FONT.display, fontSize: 14, letterSpacing: 0.5, textTransform: 'uppercase' },

  modalOverlay: { flex: 1, backgroundColor: '#000000cc', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: BG.b2, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 28, paddingBottom: 40, alignItems: 'center', borderTopWidth: 1, borderColor: LINE.mid, position: 'relative' },
  modalTickTL: { position: 'absolute', top: -1, left: 18, width: 8, height: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: ACCENT },
  modalTickBR: { position: 'absolute', top: -1, right: 18, width: 8, height: 8, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: ACCENT },
  modalTitle: { color: TEXT.t3, fontFamily: FONT.mono, fontSize: 9, letterSpacing: 3, marginBottom: 16, textTransform: 'uppercase' },
  modalScore: { fontFamily: FONT.display, fontSize: 52, color: ACCENT, lineHeight: 56, letterSpacing: -2 },
  modalPct: { color: TEXT.t3, fontFamily: FONT.mono, fontSize: 11, marginBottom: 10, marginTop: 4, letterSpacing: 1 },
  modalMsg: { color: TEXT.t2, fontFamily: FONT.body, fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 21 },
  modalPrimaryBtn: { backgroundColor: ACCENT, borderRadius: R, width: '100%', paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  modalPrimaryText: { color: '#0A0A0B', fontFamily: FONT.display, fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase' },
  modalSecondaryBtn: { borderWidth: 1, borderColor: LINE.mid, borderRadius: R, width: '100%', paddingVertical: 14, alignItems: 'center' },
  modalSecondaryText: { color: TEXT.t2, fontFamily: FONT.mono, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
});
