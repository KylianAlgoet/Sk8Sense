// SkateSense MIS v3 — Shared Components
import React, { memo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Easing } from 'react-native';
import { BG, TEXT, LINE, ACCENT, FONT, R, PANEL, BTN } from '../design-tokens';

// ── Background Grid ────────────────────────────────────────────────────────
const GRID_H_LINES = Array.from({ length: 20 }, (_, i) => i * 46);
const GRID_V_LINES = Array.from({ length: 10 }, (_, i) => i * 46);

export const V3Grid = memo(function V3Grid() {
  return (
    <View style={grid.container} pointerEvents="none">
      {/* Horizontal lines */}
      {GRID_H_LINES.map((top, i) => (
        <View key={`h${i}`} style={[grid.hLine, { top }]} />
      ))}
      {/* Vertical lines */}
      {GRID_V_LINES.map((left, i) => (
        <View key={`v${i}`} style={[grid.vLine, { left }]} />
      ))}
    </View>
  );
});

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

// ── SK8SENSE AI Coach Card ─────────────────────────────────────────────────
export function V3MotionAI({ text, summaryItems, detailText, cta, onCta }) {
  const [showDetails, setShowDetails] = React.useState(false);
  const hasDetails = !!detailText;
  return (
    <View style={ai.container}>
      <View style={ai.row}>
        <View style={ai.glyph}>
          <View style={ai.diamond} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={ai.labelRow}>
            <Text style={ai.labelAccent}>SK8SENSE AI COACH</Text>
            <Text style={ai.labelSub}>LIVE FEEDBACK</Text>
          </View>
          {summaryItems?.length ? (
            <View style={ai.summaryList}>
              {summaryItems.map((item, index) => (
                <View key={`${item.label}-${index}`} style={ai.summaryRow}>
                  <Text style={ai.summaryLabel}>{item.label}</Text>
                  <Text style={ai.summaryText}>{item.text}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={ai.body}>{text}</Text>
          )}
          {hasDetails && (
            <>
              <TouchableOpacity onPress={() => setShowDetails(v => !v)} activeOpacity={0.75}>
                <Text style={ai.detailToggle}>{showDetails ? 'HIDE DETAILS' : 'MORE DETAILS'}</Text>
              </TouchableOpacity>
              {showDetails && <Text style={ai.detailText}>{detailText}</Text>}
            </>
          )}
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
  summaryList: { gap: 9 },
  summaryRow: { gap: 2 },
  summaryLabel: { fontFamily: FONT.mono, fontSize: 8, letterSpacing: 1.2, textTransform: 'uppercase', color: TEXT.t3 },
  summaryText: { fontFamily: FONT.body, fontSize: 13, color: TEXT.t1, lineHeight: 18.5 },
  detailToggle: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.2, color: ACCENT, textTransform: 'uppercase', marginTop: 3 },
  detailText: { fontFamily: FONT.body, fontSize: 12.5, color: TEXT.t2, lineHeight: 18.5, marginTop: 2 },
  ctaWrap: { marginTop: 12, backgroundColor: ACCENT, borderRadius: R, paddingVertical: 12, alignItems: 'center' },
  ctaBtn: { fontFamily: FONT.display, fontSize: 12, letterSpacing: 0.48, textTransform: 'uppercase', color: '#0A0A0B' },
});

// ── Motion Tip ─────────────────────────────────────────────────────────────
export function V3MotionTip({ text }) {
  return (
    <View style={mt.container}>
      <View style={mt.diamond} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={mt.label}>SK8SENSE AI COACH · ADVISORY</Text>
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

// ── Board Link Card — live/offline connection status, no fabricated metrics ────
// Shows the real BLE link state (pulsing dot + device name) and a Connect CTA when offline.
// Shared between Home and Dashboard so the rider always knows whether their board is live.
export function BoardLinkCard({ live, deviceName, simulated, onPressConnect, onPressDisconnect }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let pulseLoop;
    pulse.stopAnimation();
    if (live) {
      pulse.setValue(0);
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 1300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
      pulseLoop.start();
    } else {
      pulse.setValue(0);
    }
    return () => {
      pulseLoop?.stop();
      pulse.stopAnimation();
    };
  }, [live, pulse]);

  const ringStyle = {
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
    opacity: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.2, 0] }),
  };

  const statusColor = live ? '#4CAF50' : '#FF5722';
  const statusLabel = live ? (simulated ? 'LIVE · DEMO FEED' : 'LIVE · STREAMING') : 'OFFLINE';

  return (
    <View style={[link.card, { borderColor: statusColor + '40' }]}>
      <View style={link.dotWrap}>
        {live && <Animated.View style={[link.pulseRing, { borderColor: statusColor }, ringStyle]} />}
        <View style={[link.dot, { backgroundColor: statusColor }]} />
      </View>
      <View style={link.info}>
        <Text style={[link.status, { color: statusColor }]}>{statusLabel}</Text>
        <Text style={link.name} numberOfLines={1}>{deviceName || 'No board paired'}</Text>
      </View>
      {!live ? (
        <TouchableOpacity style={link.connectBtn} onPress={onPressConnect} activeOpacity={0.85}>
          <Text style={link.connectBtnText}>CONNECT</Text>
        </TouchableOpacity>
      ) : (
        !simulated && onPressDisconnect && (
          <TouchableOpacity style={link.disconnectBtn} onPress={onPressDisconnect} activeOpacity={0.85}>
            <Text style={link.disconnectBtnText}>DISCONNECT</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const link = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: BG.b2, borderWidth: 1, borderRadius: R,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  dotWrap: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  pulseRing: { position: 'absolute', width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  info: { flex: 1 },
  status: { fontFamily: FONT.mono, fontSize: 9, fontWeight: '600', letterSpacing: 1.2, marginBottom: 2 },
  name: { color: TEXT.t1, fontFamily: FONT.mono, fontSize: 12, fontWeight: '600' },
  connectBtn: { ...BTN.ghost, paddingHorizontal: 12, paddingVertical: 6 },
  connectBtnText: { color: ACCENT, fontFamily: FONT.mono, fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  disconnectBtn: { ...BTN.ghost, borderColor: '#FF572240', paddingHorizontal: 12, paddingVertical: 6 },
  disconnectBtnText: { color: '#FF5722', fontFamily: FONT.mono, fontSize: 10, fontWeight: '600', letterSpacing: 1 },
});
