import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useTrickStore from '../store/trickStore';
import { BG, TEXT, LINE, ACCENT, FONT, R } from '../design-tokens';
import { V3Grid, V3SectionHead, V3Chip } from '../components/V3Shared';

const DIFFICULTIES = ['', 'BEGINNER', 'EASY', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

function StepCard({ step, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity
      style={[s.stepCard, expanded && { borderColor: `${ACCENT}55` }]}
      onPress={() => setExpanded(v => !v)}
      activeOpacity={0.8}
    >
      <View style={s.stepHeader}>
        <Text style={s.stepCode}>M.{String(index + 1).padStart(2, '0')}</Text>
        <Text style={s.stepTitle}>{step.title}</Text>
        <Ionicons name={expanded ? 'remove' : 'add'} size={16} color={TEXT.t3} />
      </View>
      {expanded && <Text style={s.stepTip}>{step.tip}</Text>}
    </TouchableOpacity>
  );
}

export default function TrickIntroScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { currentTrick } = useTrickStore();

  if (!currentTrick) return null;

  const detectable = ['ollie', 'kickflip', 'heelflip', 'pop_shuvit'].includes(currentTrick.id);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <V3Grid />
      <StatusBar barStyle="light-content" backgroundColor={BG.base} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={TEXT.t2} />
        </TouchableOpacity>
        <Text style={s.headerLabel}>/ TRICK · BRIEFING</Text>
        {detectable && <V3Chip label="DETECTABLE" variant="live" />}
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={s.titleBlock}>
          <View style={s.titleTickTL} /><View style={s.titleTickBR} />
          <View style={s.titleTop}>
            <Text style={s.trickCode}>T.{String(currentTrick.id === 'ollie' ? 1 : currentTrick.id === 'kickflip' ? 2 : 3).padStart(2, '0')}</Text>
            <View style={[s.diffBadge, { borderColor: `${currentTrick.color}55`, backgroundColor: `${currentTrick.color}14` }]}>
              <Text style={[s.diffText, { color: currentTrick.color }]}>{DIFFICULTIES[currentTrick.difficulty]}</Text>
            </View>
            <View style={s.catBadge}><Text style={s.catText}>{currentTrick.category?.toUpperCase()}</Text></View>
          </View>
          <Text style={s.trickName}>{currentTrick.name}</Text>
        </View>

        {/* What is it */}
        <V3SectionHead num="/01" label="WHAT IS IT" />
        <Text style={s.description}>{currentTrick.description}</Text>

        <View style={{ height: 20 }} />

        {/* Steps */}
        <V3SectionHead num="/02" label="MOVEMENT BREAKDOWN" right={`${currentTrick.steps.length} STEPS`} />
        {currentTrick.steps.map((step, i) => (
          <StepCard key={i} step={step} index={i} />
        ))}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* CTA */}
      <View style={[s.ctaWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.navigate('Practice')} activeOpacity={0.85}>
          <Text style={s.ctaBtnText}>START PRACTICE →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.base },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: R, backgroundColor: BG.b2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: LINE.dim },
  headerLabel: { flex: 1, fontFamily: FONT.mono, fontSize: 9, color: TEXT.t3, letterSpacing: 1.5, textTransform: 'uppercase' },

  content: { paddingHorizontal: 18, paddingTop: 8 },

  titleBlock: { backgroundColor: BG.b2, borderWidth: 1, borderColor: LINE.dim, borderRadius: R, padding: 16, marginBottom: 22, position: 'relative' },
  titleTickTL: { position: 'absolute', top: -1, left: -1, width: 8, height: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: ACCENT },
  titleTickBR: { position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: ACCENT },
  titleTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  trickCode: { fontFamily: FONT.mono, fontSize: 9, color: ACCENT, letterSpacing: 0.9 },
  diffBadge: { borderWidth: 1, borderRadius: R, paddingHorizontal: 7, paddingVertical: 3 },
  diffText: { fontFamily: FONT.mono, fontSize: 8, letterSpacing: 0.9, textTransform: 'uppercase' },
  catBadge: { backgroundColor: BG.b4, borderRadius: R, paddingHorizontal: 7, paddingVertical: 3 },
  catText: { fontFamily: FONT.mono, fontSize: 8, color: TEXT.t3, letterSpacing: 0.9 },
  trickName: { fontFamily: FONT.display, fontSize: 44, color: TEXT.t1, textTransform: 'uppercase', letterSpacing: -1.5 },

  description: { fontFamily: FONT.body, fontSize: 14, color: TEXT.t2, lineHeight: 21 },

  stepCard: { backgroundColor: BG.b2, borderRadius: R, padding: 14, marginBottom: 7, borderWidth: 1, borderColor: LINE.dim },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepCode: { fontFamily: FONT.mono, fontSize: 9, color: ACCENT, letterSpacing: 0.6, width: 32 },
  stepTitle: { fontFamily: FONT.bodySb, fontSize: 14, color: TEXT.t1, flex: 1 },
  stepTip: { fontFamily: FONT.body, fontSize: 13, color: TEXT.t2, lineHeight: 19, marginTop: 10, paddingLeft: 44 },

  ctaWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 18, paddingTop: 12, backgroundColor: BG.base, borderTopWidth: 1, borderTopColor: LINE.dim },
  ctaBtn: { backgroundColor: ACCENT, borderRadius: R, paddingVertical: 15, alignItems: 'center' },
  ctaBtnText: { fontFamily: FONT.display, fontSize: 13, color: '#0A0A0B', letterSpacing: 0.5, textTransform: 'uppercase' },
});
