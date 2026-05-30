import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BG, TEXT, LINE, ACCENT, FONT, R } from '../design-tokens';
import { V3Grid, V3RegStrip, V3SectionHead, V3Chip } from '../components/V3Shared';
import useTrickStore from '../store/trickStore';

const FEATURED = [
  {
    id: 'ollie',
    name: 'OLLIE',
    difficulty: 'BEGINNER',
    diffColor: '#4CAF50',
    category: 'FLATGROUND',
    code: 'T.01',
    steps: 5,
    description: 'The foundation. Master this first — everything else builds on it.',
  },
  {
    id: 'kickflip',
    name: 'KICKFLIP',
    difficulty: 'INTERMEDIATE',
    diffColor: ACCENT,
    category: 'FLATGROUND',
    code: 'T.02',
    steps: 5,
    description: 'Flick off the pocket and keep your shoulders level.',
  },
  {
    id: 'pop_shuvit',
    name: 'POP SHOVE-IT',
    difficulty: 'EASY',
    diffColor: '#FFB020',
    category: 'FLATGROUND',
    code: 'T.03',
    steps: 5,
    description: 'Scoop the tail and let the board rotate under you.',
  },
];

const COMING_SOON = [
  { code: 'T.04', name: 'HEELFLIP' },
  { code: 'T.05', name: 'FS 180' },
  { code: 'T.06', name: 'BS 180' },
  { code: 'T.07', name: 'FS SHUV-IT' },
  { code: 'T.08', name: 'VARIAL FLIP' },
  { code: 'T.09', name: '360 FLIP' },
];

export default function LearningScreen({ navigation }) {
  const { setCurrentTrick } = useTrickStore();

  const handleSelect = (trick) => {
    setCurrentTrick(trick.id);
    navigation.navigate('TrickIntro', { trickId: trick.id });
  };

  return (
    <View style={s.container}>
      <V3Grid />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <V3RegStrip scanId="SCN_0048" node="LEARN.MIS" live={false} />

        <View style={s.header}>
          <View>
            <Text style={s.headerLabel}>· MOVEMENT LIBRARY ·</Text>
            <Text style={s.headerTitle}>TRICKS</Text>
          </View>
          <V3Chip label="MVP" variant="live" />
        </View>

        <V3SectionHead num="/03" label="AVAILABLE NOW" right="3 TRICKS" />

        {FEATURED.map((trick) => (
          <TouchableOpacity key={trick.id} style={s.card} onPress={() => handleSelect(trick)} activeOpacity={0.8}>
            <View style={s.tickTL} /><View style={s.tickBR} />

            <View style={s.cardTop}>
              <Text style={s.code}>{trick.code}</Text>
              <View style={[s.diffBadge, { borderColor: `${trick.diffColor}55`, backgroundColor: `${trick.diffColor}14` }]}>
                <Text style={[s.diffText, { color: trick.diffColor }]}>{trick.difficulty}</Text>
              </View>
              <View style={s.catBadge}><Text style={s.catText}>{trick.category}</Text></View>
              <Ionicons name="arrow-forward" size={15} color={TEXT.t3} style={{ marginLeft: 'auto' }} />
            </View>

            <Text style={s.name}>{trick.name}</Text>
            <Text style={s.desc}>{trick.description}</Text>

            <View style={s.cardFoot}>
              <Text style={s.steps}>{trick.steps} STEPS</Text>
              <View style={s.dots}>{Array.from({ length: trick.steps }).map((_, i) => <View key={i} style={s.dot} />)}</View>
            </View>
          </TouchableOpacity>
        ))}

        <V3SectionHead num="/··" label="MORE TRICKS" right="COMING SOON" />

        <View style={s.csGrid}>
          {COMING_SOON.map((t) => (
            <View key={t.code} style={s.csCard}>
              <Text style={s.csCode}>{t.code}</Text>
              <Text style={s.csName}>{t.name}</Text>
              <Ionicons name="lock-closed" size={9} color={TEXT.t4} style={s.csLock} />
            </View>
          ))}
        </View>

        <View style={s.csBanner}>
          <View style={s.csDiamond} />
          <View style={{ flex: 1 }}>
            <Text style={s.csBannerLabel}>MOTION AI · ROADMAP</Text>
            <Text style={s.csBannerText}>Heelflips and shove-its are next. More tricks unlock as detection improves.</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.base },
  content: { paddingTop: 60, paddingHorizontal: 18, paddingBottom: 96, gap: 12 },

  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  headerLabel: { fontFamily: FONT.mono, fontSize: 9, color: TEXT.t3, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  headerTitle: { fontFamily: FONT.display, fontSize: 34, color: TEXT.t1, textTransform: 'uppercase', letterSpacing: -1 },

  card: { backgroundColor: BG.b2, borderWidth: 1, borderColor: LINE.dim, borderRadius: R, padding: 16, gap: 8, position: 'relative' },
  tickTL: { position: 'absolute', top: -1, left: -1, width: 8, height: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: ACCENT },
  tickBR: { position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: ACCENT },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  code: { fontFamily: FONT.mono, fontSize: 9, color: ACCENT, letterSpacing: 0.9 },
  diffBadge: { borderWidth: 1, borderRadius: R, paddingHorizontal: 7, paddingVertical: 3 },
  diffText: { fontFamily: FONT.mono, fontSize: 8, letterSpacing: 0.9, textTransform: 'uppercase' },
  catBadge: { backgroundColor: BG.b4, borderRadius: R, paddingHorizontal: 7, paddingVertical: 3 },
  catText: { fontFamily: FONT.mono, fontSize: 8, color: TEXT.t3, letterSpacing: 0.9, textTransform: 'uppercase' },

  name: { fontFamily: FONT.display, fontSize: 28, color: TEXT.t1, textTransform: 'uppercase', letterSpacing: -0.8 },
  desc: { fontFamily: FONT.body, fontSize: 13, color: TEXT.t2, lineHeight: 18 },

  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: LINE.dim },
  steps: { fontFamily: FONT.mono, fontSize: 9, color: TEXT.t3, letterSpacing: 1 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 5, height: 5, backgroundColor: `${ACCENT}55`, borderRadius: 1 },

  csGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  csCard: { width: '30%', backgroundColor: BG.b1, borderWidth: 1, borderColor: LINE.dim, borderRadius: R, padding: 12, gap: 4, opacity: 0.45 },
  csCode: { fontFamily: FONT.mono, fontSize: 8, color: TEXT.t4, letterSpacing: 0.9 },
  csName: { fontFamily: FONT.display, fontSize: 11, color: TEXT.t3, textTransform: 'uppercase', letterSpacing: -0.2 },
  csLock: { position: 'absolute', top: 8, right: 8 },

  csBanner: { flexDirection: 'row', gap: 12, backgroundColor: BG.b2, borderLeftWidth: 2, borderLeftColor: `${ACCENT}55`, borderRadius: R, padding: 13, alignItems: 'flex-start' },
  csDiamond: { width: 10, height: 10, backgroundColor: `${ACCENT}55`, transform: [{ rotate: '45deg' }], marginTop: 3, flexShrink: 0 },
  csBannerLabel: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.62, textTransform: 'uppercase', color: `${ACCENT}88`, marginBottom: 4 },
  csBannerText: { fontFamily: FONT.body, fontSize: 12.5, color: TEXT.t2, lineHeight: 18 },
});
