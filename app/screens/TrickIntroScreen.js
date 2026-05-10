import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useTrickStore from '../store/trickStore';

const DIFFICULTIES = ['', 'Beginner', 'Easy', 'Intermediate', 'Advanced', 'Expert'];

function StepCard({ step, index, trickColor }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity
      style={[styles.stepCard, expanded && { borderColor: trickColor + '55' }]}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.8}
    >
      <View style={styles.stepHeader}>
        <View style={[styles.stepNum, { backgroundColor: trickColor + '22', borderColor: trickColor + '44' }]}>
          <Text style={[styles.stepNumText, { color: trickColor }]}>{index + 1}</Text>
        </View>
        <Text style={styles.stepTitle}>{step.title}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#555"
        />
      </View>
      {expanded && (
        <Text style={styles.stepTip}>{step.tip}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function TrickIntroScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { currentTrick } = useTrickStore();

  if (!currentTrick) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#888" />
        </TouchableOpacity>
        {currentTrick.id === 'ollie' || currentTrick.id === 'kickflip' || currentTrick.id === 'heelflip' ? (
          <View style={styles.sensorBadge}>
            <Ionicons name="bluetooth" size={11} color={currentTrick.color} />
            <Text style={[styles.sensorText, { color: currentTrick.color }]}>SK8Sense detectable</Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title block */}
        <View style={[styles.titleBlock, { borderLeftColor: currentTrick.color }]}>
          <Text style={styles.trickName}>{currentTrick.name}</Text>
          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: currentTrick.color + '22', borderColor: currentTrick.color + '44' }]}>
              <Text style={[styles.tagText, { color: currentTrick.color }]}>
                {DIFFICULTIES[currentTrick.difficulty]}
              </Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{currentTrick.category}</Text>
            </View>
          </View>
        </View>

        {/* What is it */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WHAT IS IT</Text>
          <Text style={styles.description}>{currentTrick.description}</Text>
        </View>

        {/* Steps */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>STEPS</Text>
          {currentTrick.steps.map((step, i) => (
            <StepCard key={i} step={step} index={i} trickColor={currentTrick.color} />
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* CTA */}
      <View style={[styles.ctaWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => navigation.navigate('Practice')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>START PRACTICE →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  sensorBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#141414', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  sensorText: { fontSize: 11, fontWeight: '600' },

  content: { paddingHorizontal: 20 },

  titleBlock: {
    borderLeftWidth: 3, paddingLeft: 14, marginBottom: 28, marginTop: 8,
  },
  trickName: {
    color: '#f5f5f0', fontSize: 36, fontWeight: 'bold', letterSpacing: -0.5, marginBottom: 10,
  },
  tagRow: { flexDirection: 'row', gap: 8 },
  tag: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 6, backgroundColor: '#141414',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  tagText: { color: '#888', fontSize: 12, fontWeight: '600' },

  section: { marginBottom: 28 },
  sectionLabel: {
    color: '#555', fontSize: 11, fontWeight: 'bold',
    letterSpacing: 2, marginBottom: 12,
  },
  description: { color: '#aaa', fontSize: 15, lineHeight: 23 },

  stepCard: {
    backgroundColor: '#141414', borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  stepNumText: { fontSize: 13, fontWeight: 'bold' },
  stepTitle: { color: '#f5f5f0', fontSize: 14, fontWeight: '600', flex: 1 },
  stepTip: {
    color: '#888', fontSize: 13, lineHeight: 20,
    marginTop: 10, paddingLeft: 40,
  },

  ctaWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1, borderTopColor: '#141414',
  },
  ctaBtn: {
    backgroundColor: '#d4ff3d', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  ctaBtnText: { color: '#0a0a0a', fontSize: 15, fontWeight: 'bold', letterSpacing: 1 },
});
