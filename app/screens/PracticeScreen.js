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
      <View style={{ height: insets.top, backgroundColor: '#0a0a0a' }} />
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={18} color="#555" />
        </TouchableOpacity>
        <Text style={[styles.trickTitle, { color: currentTrick.color }]}>{currentTrick.name}</Text>
        <Text style={styles.timer}>{formatTime(elapsed)}</Text>
      </View>

      {isCombine ? (
        <View style={styles.combineBar}>
          <Text style={styles.combineLabel}>FULL ATTEMPT</Text>
          <Text style={styles.roundCount}>{roundAttempts.length}/{ROUND_SIZE}</Text>
        </View>
      ) : (
        <View style={styles.stepBar}>
          <Text style={styles.stepLabel}>Step {stepIndex + 1} of {totalSteps}</Text>
          <View style={styles.stepDots}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View key={i} style={[
                styles.stepDot,
                i < stepIndex   && { backgroundColor: currentTrick.color },
                i === stepIndex && { backgroundColor: currentTrick.color, transform: [{ scale: 1.4 }] },
                i > stepIndex   && { backgroundColor: '#2a2a2a' },
              ]} />
            ))}
          </View>
        </View>
      )}

      <SkateboardGL
        stepIndex={stepIndex}
        phase={phase}
        trickColor={currentTrick.color}
        style={styles.board}
      />

      <Animated.View style={[styles.instructionCard, {
        borderColor: lastResult === 'success' ? currentTrick.color
          : lastResult === 'fail' ? '#e94560' : '#2a2a2a',
        opacity: detectOpacity,
      }]}>
        {lastResult && (
          <View style={styles.resultRow}>
            <Ionicons
              name={lastResult === 'success' ? 'checkmark-circle' : 'refresh'}
              size={16}
              color={lastResult === 'success' ? currentTrick.color : '#e94560'}
            />
            <Text style={[styles.resultText, { color: lastResult === 'success' ? currentTrick.color : '#e94560' }]}>
              {lastResult === 'success' ? (isCombine ? 'LANDED' : 'GOT IT') : 'TRY AGAIN'}
            </Text>
          </View>
        )}
        <Text style={styles.instructionTitle}>
          {isCombine ? 'Put it all together' : step.title}
        </Text>
        <Text style={styles.instructionTip}>
          {isCombine ? (currentTip || currentTrick.coachingTips[0]) : step.tip}
        </Text>
      </Animated.View>

      <View style={[styles.sensorBadge, connectedDevice && { borderColor: '#4CAF5033' }]}>
        <Ionicons name="bluetooth" size={11} color={connectedDevice ? '#4CAF50' : '#FF9800'} />
        <Text style={[styles.sensorText, { color: connectedDevice ? '#4CAF50' : '#FF9800' }]}>
          {connectedDevice ? 'CONNECTED' : 'SIMULATED'}
        </Text>
      </View>

      <View style={[styles.ctaWrap, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <TouchableOpacity
          style={[styles.ctaBtn, detecting && styles.ctaBtnDisabled]}
          onPress={runDetection}
          disabled={detecting}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>{detecting ? 'DETECTING...' : 'I TRIED IT'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showPauseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>ROUND DONE</Text>
            <Text style={[styles.modalScore, { color: currentTrick.color }]}>{landedInRound}/{ROUND_SIZE}</Text>
            <Text style={styles.modalPct}>{Math.round((landedInRound / ROUND_SIZE) * 100)}% success rate</Text>
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
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, gap: 12 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2a2a2a' },
  trickTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  timer: { color: '#444', fontSize: 14, fontWeight: '600' },
  stepBar: { paddingHorizontal: 20, paddingBottom: 8 },
  stepLabel: { color: '#444', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 7 },
  stepDots: { flexDirection: 'row', gap: 6 },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  combineBar: { paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  combineLabel: { color: '#d4ff3d', fontSize: 11, fontWeight: 'bold', letterSpacing: 2 },
  roundCount: { color: '#444', fontSize: 13, fontWeight: '600' },
  board: { height: 240 },
  instructionCard: { marginHorizontal: 20, backgroundColor: '#141414', borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  resultText: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  instructionTitle: { color: '#f5f5f0', fontSize: 17, fontWeight: 'bold', marginBottom: 5 },
  instructionTip: { color: '#666', fontSize: 13, lineHeight: 19 },
  sensorBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', marginBottom: 8, backgroundColor: '#141414', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#2a2a2a' },
  sensorText: { fontSize: 11, fontWeight: '600' },
  ctaWrap: { paddingHorizontal: 20, paddingTop: 4 },
  ctaBtn: { backgroundColor: '#d4ff3d', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  ctaBtnDisabled: { backgroundColor: '#2a2a2a' },
  ctaBtnText: { color: '#0a0a0a', fontSize: 15, fontWeight: 'bold', letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: '#000000cc', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#141414', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40, alignItems: 'center', borderTopWidth: 1, borderColor: '#2a2a2a' },
  modalTitle: { color: '#444', fontSize: 11, fontWeight: 'bold', letterSpacing: 3, marginBottom: 16 },
  modalScore: { fontSize: 52, fontWeight: 'bold', lineHeight: 60 },
  modalPct: { color: '#444', fontSize: 14, marginBottom: 10 },
  modalMsg: { color: '#888', fontSize: 15, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalPrimaryBtn: { backgroundColor: '#d4ff3d', borderRadius: 12, width: '100%', paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  modalPrimaryText: { color: '#0a0a0a', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  modalSecondaryBtn: { borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 12, width: '100%', paddingVertical: 14, alignItems: 'center' },
  modalSecondaryText: { color: '#555', fontSize: 14 },
});
