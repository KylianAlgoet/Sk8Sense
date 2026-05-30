// SkateSense MIS v3 — Shared Components
import React from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { BG, TEXT, LINE, ACCENT, FONT, R, PANEL } from '../design-tokens';

// ── Background Grid ────────────────────────────────────────────────────────
export function V3Grid() {
  return (
    <View style={grid.container} pointerEvents="none">
      {/* Horizontal lines */}
      {Array.from({ length: 20 }).map((_, i) => (
        <View key={`h${i}`} style={[grid.hLine, { top: i * 46 }]} />
      ))}
      {/* Vertical lines */}
      {Array.from({ length: 10 }).map((_, i) => (
        <View key={`v${i}`} style={[grid.vLine, { left: i * 46 }]} />
      ))}
    </View>
  );
}

const grid = StyleSheet.create({
  container: { position: 'absolute', inset: 0, overflow: 'hidden' },
  hLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  vLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
});

// ── RegStrip ───────────────────────────────────────────────────────────────
export function V3RegStrip({ scanId = 'SCN_0048', node = 'SK8.MIS', live = true }) {
  return (
    <View style={rs.row}>
      <View style={rs.left}>
        <View style={[rs.dot, live && rs.dotLive]} />
        <Text style={rs.text}>{scanId} · {node}</Text>
      </View>
      <Text style={[rs.status, live && rs.statusLive]}>{live ? '● ONLINE' : '○ SYNCED'}</Text>
    </View>
  );
}

const rs = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 5, height: 5, backgroundColor: TEXT.t3 },
  dotLive: { backgroundColor: ACCENT },
  text: { fontFamily: FONT.mono, fontSize: 9, color: TEXT.t3, letterSpacing: 1.08 },
  status: { fontFamily: FONT.mono, fontSize: 9, color: TEXT.t3, letterSpacing: 1.08 },
  statusLive: { color: ACCENT },
});

// ── Section Header ─────────────────────────────────────────────────────────
export function V3SectionHead({ num, label, right }) {
  return (
    <View style={sh.row}>
      <Text style={sh.num}>{num}</Text>
      <Text style={sh.label}>{label}</Text>
      <View style={sh.line} />
      {right && <Text style={sh.right}>{right}</Text>}
    </View>
  );
}

const sh = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  num: { fontFamily: FONT.monoMd || FONT.mono, fontSize: 10, color: ACCENT, letterSpacing: 0.6 },
  label: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.62, textTransform: 'uppercase', color: TEXT.t2 },
  line: { flex: 1, height: 1, backgroundColor: LINE.dim },
  right: { fontFamily: FONT.mono, fontSize: 9, color: TEXT.t3, letterSpacing: 0.9 },
});

// ── Stat Grid ──────────────────────────────────────────────────────────────
export function V3StatGrid({ stats }) {
  // stats = [{ value, unit, label, hot }]
  return (
    <View style={sg.grid}>
      {stats.map((s, i) => (
        <View key={i} style={[sg.cell, i === stats.length - 1 && sg.cellLast]}>
          <View style={sg.numRow}>
            <Text style={[sg.num, s.hot && sg.numHot]}>{s.value}</Text>
            {s.unit && <Text style={sg.unit}>{s.unit}</Text>}
          </View>
          <Text style={sg.label}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const sg = StyleSheet.create({
  grid: { flexDirection: 'row', borderWidth: 1, borderColor: LINE.dim, borderRadius: R, overflow: 'hidden' },
  cell: { flex: 1, padding: 13, backgroundColor: BG.b2, borderRightWidth: 1, borderRightColor: LINE.dim },
  cellLast: { borderRightWidth: 0 },
  numRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  num: { fontFamily: FONT.display, fontSize: 26, letterSpacing: -1.0, color: TEXT.t1 },
  numHot: { color: ACCENT },
  unit: { fontFamily: FONT.mono, fontSize: 10, color: TEXT.t3, marginBottom: 3 },
  label: { fontFamily: FONT.mono, fontSize: 7, letterSpacing: 1.1, textTransform: 'uppercase', color: TEXT.t3, marginTop: 4 },
});

// ── Motion AI Card ─────────────────────────────────────────────────────────
export function V3MotionAI({ text, cta, onCta }) {
  return (
    <View style={ai.container}>
      <View style={ai.row}>
        <View style={ai.glyph}>
          <View style={ai.diamond} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={ai.labelRow}>
            <Text style={ai.labelAccent}>MOTION AI</Text>
            <Text style={ai.labelSub}>MIS.CORE</Text>
          </View>
          <Text style={ai.body}>{text}</Text>
        </View>
      </View>
      {cta && (
        <TouchableOpacity style={ai.ctaWrap} onPress={onCta} activeOpacity={0.85}>
          <Text style={ai.ctaBtn}>{cta}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const ai = StyleSheet.create({
  container: { backgroundColor: BG.b2, borderWidth: 1, borderColor: `${ACCENT}38`, borderRadius: R, padding: 15, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: 13, alignItems: 'flex-start' },
  glyph: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  diamond: { width: 14, height: 14, backgroundColor: ACCENT, transform: [{ rotate: '45deg' }] },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labelAccent: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.62, textTransform: 'uppercase', color: ACCENT },
  labelSub: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.62, textTransform: 'uppercase', color: TEXT.t4 },
  body: { fontFamily: FONT.body, fontSize: 13, color: TEXT.t1, lineHeight: 19.5 },
  ctaWrap: { marginTop: 12, backgroundColor: ACCENT, borderRadius: R, paddingVertical: 12, alignItems: 'center' },
  ctaBtn: { fontFamily: FONT.display, fontSize: 12, letterSpacing: 0.48, textTransform: 'uppercase', color: '#0A0A0B' },
});

// ── Motion Tip ─────────────────────────────────────────────────────────────
export function V3MotionTip({ text }) {
  return (
    <View style={mt.container}>
      <View style={mt.diamond} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={mt.label}>MOTION AI · ADVISORY</Text>
        <Text style={mt.body}>{text}</Text>
      </View>
    </View>
  );
}

const mt = StyleSheet.create({
  container: { flexDirection: 'row', gap: 12, backgroundColor: BG.b2, borderLeftWidth: 2, borderLeftColor: ACCENT, borderRadius: R, padding: 11, paddingLeft: 13 },
  diamond: { width: 10, height: 10, backgroundColor: ACCENT, transform: [{ rotate: '45deg' }], marginTop: 2, flexShrink: 0 },
  label: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.62, textTransform: 'uppercase', color: ACCENT },
  body: { fontFamily: FONT.body, fontSize: 12.5, color: TEXT.t1, lineHeight: 18.5 },
});

// ── Ticked Panel ───────────────────────────────────────────────────────────
export function V3Ticked({ children, style }) {
  return (
    <View style={[tp.panel, style]}>
      {/* Top-left corner tick */}
      <View style={tp.tlTick} />
      {/* Bottom-right corner tick */}
      <View style={tp.brTick} />
      {children}
    </View>
  );
}

const tp = StyleSheet.create({
  panel: { ...PANEL.base, position: 'relative' },
  tlTick: { position: 'absolute', top: -1, left: -1, width: 8, height: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: ACCENT },
  brTick: { position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: ACCENT },
});

// ── Chip ───────────────────────────────────────────────────────────────────
export function V3Chip({ label, variant = 'default' }) {
  const styles = {
    default: { bg: BG.b3, border: LINE.mid, color: TEXT.t2 },
    live: { bg: `${ACCENT}24`, border: `${ACCENT}59`, color: ACCENT },
    solid: { bg: ACCENT, border: ACCENT, color: '#0A0A0B' },
  };
  const st = styles[variant] || styles.default;
  return (
    <View style={[chip.base, { backgroundColor: st.bg, borderColor: st.border }]}>
      {variant === 'live' && <View style={chip.dot} />}
      <Text style={[chip.text, { color: st.color }]}>{label}</Text>
    </View>
  );
}

const chip = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 8, borderRadius: R, borderWidth: 1 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: ACCENT },
  text: { fontFamily: FONT.mono, fontSize: 9, fontWeight: '500', letterSpacing: 0.9, textTransform: 'uppercase' },
});
