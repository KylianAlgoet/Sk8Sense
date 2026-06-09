import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useTrickStore from '../store/trickStore';
import { BG, TEXT, LINE, ACCENT, FONT, R, BAR } from '../design-tokens';
import { V3Grid, V3StatGrid, V3SectionHead } from '../components/V3Shared';

const NEXT_SESSION_TIPS = {
  ollie:      'Next time: focus on making the pop louder — height follows sound.',
  kickflip:   'Next time: finish the flip before you catch it — the board only came halfway around.',
  heelflip:   'Next time: kick your heel further forward, not just to the side.',
  pop_shuvit: 'Next time: scoop back AND off the tail in one motion — not two.',
};

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return `${m}m ${sec}s`;
}

export default function PracticeSummaryScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { tricks } = useTrickStore();
  const { result, trickId } = route.params || {};

  const trick = tricks.find((t) => t.id === trickId);
  if (!trick || !result) return null;

  const { duration, total, landed } = result;
  const pct = total > 0 ? Math.round((landed / total) * 100) : 0;
  const missed = Math.max(total - landed, 0);
  const consistencyLabel = pct >= 90 ? 'LOCKED IN' : pct >= 70 ? 'BUILDING' : 'NEEDS REPS';

  const stats = [
    { value: formatTime(duration), label: 'DURATION' },
    { value: total, label: 'ATTEMPTS' },
    { value: landed, label: 'LANDED', hot: true },
  ];

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <V3Grid />
      <StatusBar barStyle="light-content" backgroundColor={BG.base} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.navigate('TrickList')} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={TEXT.t2} />
        </TouchableOpacity>
        <Text style={s.headerLabel}>/ PRACTICE · SUMMARY</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={s.titleBlock}>
          <View style={s.titleTickTL} /><View style={s.titleTickBR} />
          <Text style={[s.sessionLabel, { color: trick.color }]}>· SESSION COMPLETE ·</Text>
          <Text style={s.title}>{trick.name.toUpperCase()}</Text>
        </View>

        {/* Stats */}
        <V3StatGrid stats={stats} />

        <View style={{ height: 22 }} />

        {/* Success rate */}
        <V3SectionHead num="/01" label="SUCCESS RATE" right={`${pct}%`} />
        <View style={s.rateCard}>
          <View style={[BAR.track, BAR.trackLg]}>
            <View style={[BAR.fill, { width: `${pct}%`, backgroundColor: trick.color }]} />
          </View>
          <Text style={s.rateText}>{landed} clean landings from {total} recorded attempts.</Text>
        </View>

        <View style={{ height: 22 }} />

        {/* Session data */}
        <V3SectionHead num="/02" label="SESSION DATA" />
        <View style={s.dataCard}>
          <View style={s.dataRow}>
            <Text style={s.dataLabel}>Consistency</Text>
            <Text style={[s.dataValue, { color: trick.color }]}>{consistencyLabel}</Text>
          </View>
          <View style={s.dataRow}>
            <Text style={s.dataLabel}>Clean reps</Text>
            <Text style={s.dataValue}>{landed}/{total}</Text>
          </View>
          <View style={s.dataRow}>
            <Text style={s.dataLabel}>Retries</Text>
            <Text style={s.dataValue}>{missed}</Text>
          </View>
        </View>

        <View style={{ height: 22 }} />

        {/* Next session tip */}
        <V3SectionHead num="/03" label="SK8SENSE AI COACH" />
        <View style={s.tipCard}>
          <View style={s.tipDiamond} />
          <Text style={s.tipText}>{NEXT_SESSION_TIPS[trickId]}</Text>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* CTA */}
      <View style={[s.ctaWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.navigate('TrickList')} activeOpacity={0.85}>
          <Text style={s.ctaBtnText}>BACK TO TRICKS</Text>
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
  sessionLabel: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' },
  title: { fontFamily: FONT.display, fontSize: 32, color: TEXT.t1, textTransform: 'uppercase', letterSpacing: -1.2 },

  rateCard: { backgroundColor: BG.b2, borderWidth: 1, borderColor: LINE.dim, borderRadius: R, padding: 16, gap: 14 },
  rateText: { fontFamily: FONT.mono, fontSize: 11, color: TEXT.t2, letterSpacing: 0.5, textTransform: 'uppercase' },

  dataCard: { backgroundColor: BG.b2, borderWidth: 1, borderColor: LINE.dim, borderRadius: R, overflow: 'hidden' },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: LINE.dim },
  dataLabel: { fontFamily: FONT.mono, fontSize: 10, color: TEXT.t3, letterSpacing: 1.1, textTransform: 'uppercase' },
  dataValue: { fontFamily: FONT.display, fontSize: 14, color: TEXT.t1, letterSpacing: 0.2, textTransform: 'uppercase' },

  tipCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: BG.b2, borderLeftWidth: 2, borderLeftColor: ACCENT, borderRadius: R,
    padding: 14, paddingLeft: 16,
  },
  tipDiamond: { width: 10, height: 10, backgroundColor: ACCENT, transform: [{ rotate: '45deg' }], marginTop: 4, flexShrink: 0 },
  tipText: { fontFamily: FONT.body, fontSize: 13, color: TEXT.t1, lineHeight: 19, flex: 1 },

  ctaWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 18, paddingTop: 12, backgroundColor: BG.base, borderTopWidth: 1, borderTopColor: LINE.dim },
  ctaBtn: { backgroundColor: ACCENT, borderRadius: R, paddingVertical: 15, alignItems: 'center' },
  ctaBtnText: { fontFamily: FONT.display, fontSize: 13, color: '#0A0A0B', letterSpacing: 0.5, textTransform: 'uppercase' },
});
