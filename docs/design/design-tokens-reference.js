// ════════════════════════════════════════════════════════════
// SKATESENSE · MIS v3 — Design Tokens
// React Native / Expo drop-in
//
// Usage:
//   import T from './design-tokens';
//   <View style={T.panel}> ... </View>
//   <Text style={T.label}>SESSION</Text>
//
// Fonts needed (add to app.json / expo-font):
//   "Archivo_800ExtraBold"   → expo-google-fonts/archivo
//   "IBMPlexMono_400Regular" → expo-google-fonts/ibm-plex-mono
//   "IBMPlexMono_500Medium"
//   "SpaceGrotesk_400Regular"→ expo-google-fonts/space-grotesk
//   "SpaceGrotesk_500Medium"
//   "SpaceGrotesk_600SemiBold"
// ════════════════════════════════════════════════════════════

// ── Accent ─────────────────────────────────────────────────
export const ACCENT = '#FF6A3D';        // signal orange — change here to retheme
export const ACCENT_INK = '#0A0A0B';   // text on accent backgrounds

// ── Backgrounds (Void tone) ────────────────────────────────
export const BG = {
  base:  '#0A0A0B',   // --bg    deepest black
  b1:    '#0D0D0F',   // --bg-1  inset panels
  b2:    '#121215',   // --bg-2  cards
  b3:    '#18181C',   // --bg-3  raised cards
  b4:    '#202026',   // --bg-4  bar tracks / very dim fills
};

// ── Text ───────────────────────────────────────────────────
export const TEXT = {
  t1: '#ECECE8',   // primary  — off-white
  t2: '#8C8C92',   // secondary — grey
  t3: '#56565C',   // tertiary  — dim
  t4: '#2C2C31',   // ghost     — very dim
};

// ── Lines / borders ────────────────────────────────────────
export const LINE = {
  dim:    'rgba(255,255,255,0.075)',  // default border
  mid:    'rgba(255,255,255,0.13)',   // slightly visible
  bright: 'rgba(255,255,255,0.22)',   // corner ticks etc.
};

// ── Accent transparencies ──────────────────────────────────
// React Native doesn't support color-mix — use hex with opacity
export const ACCENT_ALPHA = {
  a08: `${ACCENT}14`,   // 8%
  a14: `${ACCENT}24`,   // 14%
  a22: `${ACCENT}38`,   // 22%
  a35: `${ACCENT}59`,   // 35%
};

// ── Semantic colors ────────────────────────────────────────
export const RED   = '#FF4438';
export const AMBER = '#FFB020';
export const CYAN  = '#3DD8F4';
export const PURPLE= '#BF5AF2';

// ── Border radius ──────────────────────────────────────────
export const RADIUS = {
  sharp: 2,
  soft:  7,
  pill:  999,
};
// active selection — matches mockup defaults (soft)
export const R = RADIUS.soft;

// ── Spacing scale ──────────────────────────────────────────
export const SPACE = {
  xs: 5,
  sm: 9,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 36,
};

// ── Typography ─────────────────────────────────────────────
export const FONT = {
  display: 'Archivo_800ExtraBold',
  mono:    'IBMPlexMono_400Regular',
  monoMd:  'IBMPlexMono_500Medium',
  body:    'SpaceGrotesk_400Regular',
  bodyMd:  'SpaceGrotesk_500Medium',
  bodySb:  'SpaceGrotesk_600SemiBold',
};

// ── Text styles ────────────────────────────────────────────
// Use these as StyleSheet fragments: style={[T.display, { fontSize: 72 }]}
export const TYPE = {
  display: {
    fontFamily: FONT.display,
    color: TEXT.t1,
    textTransform: 'uppercase',
    letterSpacing: -1.5,
    lineHeight: undefined, // set per-use
  },
  title: {
    fontFamily: FONT.display,
    fontSize: 30,
    color: TEXT.t1,
    textTransform: 'uppercase',
    letterSpacing: -0.9,
    lineHeight: 27,
  },
  num: {
    fontFamily: FONT.display,
    color: TEXT.t1,
    letterSpacing: -1.2,
  },
  label: {
    fontFamily: FONT.mono,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1.26,  // 0.14em @ 9px
    textTransform: 'uppercase',
    color: TEXT.t3,
  },
  labelAccent: {
    fontFamily: FONT.mono,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1.62,
    textTransform: 'uppercase',
    color: ACCENT,
  },
  labelT2: {
    fontFamily: FONT.mono,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1.62,
    textTransform: 'uppercase',
    color: TEXT.t2,
  },
  mono: {
    fontFamily: FONT.mono,
    color: TEXT.t1,
  },
  body: {
    fontFamily: FONT.body,
    fontSize: 13,
    color: TEXT.t1,
    lineHeight: 19.5,
  },
  bodyDim: {
    fontFamily: FONT.body,
    fontSize: 13,
    color: TEXT.t2,
    lineHeight: 19.5,
  },
};

// ── Panels ─────────────────────────────────────────────────
export const PANEL = {
  base: {
    backgroundColor: BG.b2,
    borderWidth: 1,
    borderColor: LINE.dim,
    borderRadius: R,
  },
  raised: {
    backgroundColor: BG.b3,
    borderWidth: 1,
    borderColor: LINE.mid,
    borderRadius: R,
  },
  inset: {
    backgroundColor: BG.b1,
    borderWidth: 1,
    borderColor: LINE.dim,
    borderRadius: R,
  },
  accent: {
    backgroundColor: BG.b2,
    borderWidth: 1,
    borderColor: ACCENT_ALPHA.a22,
    borderRadius: R,
  },
};

// ── Buttons ────────────────────────────────────────────────
export const BTN = {
  base: {
    borderRadius: R,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primary: {
    backgroundColor: ACCENT,
  },
  primaryText: {
    fontFamily: FONT.display,
    fontSize: 12,
    letterSpacing: 0.48,
    textTransform: 'uppercase',
    color: ACCENT_INK,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: LINE.mid,
  },
  ghostText: {
    fontFamily: FONT.display,
    fontSize: 12,
    letterSpacing: 0.48,
    textTransform: 'uppercase',
    color: TEXT.t1,
  },
  danger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: RED,
  },
  dangerText: {
    fontFamily: FONT.display,
    fontSize: 12,
    letterSpacing: 0.48,
    textTransform: 'uppercase',
    color: RED,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: R,
    backgroundColor: BG.b2,
    borderWidth: 1,
    borderColor: LINE.dim,
    alignItems: 'center',
    justifyContent: 'center',
  },
};

// ── Chips / tags ───────────────────────────────────────────
export const CHIP = {
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: R,
    backgroundColor: BG.b3,
    borderWidth: 1,
    borderColor: LINE.mid,
  },
  text: {
    fontFamily: FONT.mono,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: TEXT.t2,
  },
  accent: {
    backgroundColor: ACCENT_ALPHA.a14,
    borderColor: ACCENT_ALPHA.a35,
  },
  accentText: {
    color: ACCENT,
  },
  solid: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  solidText: {
    color: ACCENT_INK,
    fontWeight: '600',
  },
};

// ── Progress bar ───────────────────────────────────────────
export const BAR = {
  track: {
    height: 6,
    backgroundColor: BG.b4,
    borderWidth: 1,
    borderColor: LINE.dim,
    borderRadius: 0,    // sharp bars — intentional
    overflow: 'hidden',
  },
  trackLg: {
    height: 10,
  },
  fill: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0,
    backgroundColor: ACCENT,
  },
};

// ── Tab bar ────────────────────────────────────────────────
export const TABBAR = {
  container: {
    height: 80,
    backgroundColor: `${BG.base}EB`,  // ~92% opacity
    borderTopWidth: 1,
    borderTopColor: LINE.mid,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRightWidth: 1,
    borderRightColor: LINE.dim,
    paddingBottom: 10,
  },
  tabActive: {
    backgroundColor: ACCENT_ALPHA.a08,
  },
  activeBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    backgroundColor: ACCENT,
  },
  tabLabel: {
    fontFamily: FONT.mono,
    fontSize: 7,
    letterSpacing: 0.98,
    textTransform: 'uppercase',
    color: TEXT.t3,
  },
  tabLabelActive: {
    color: ACCENT,
  },
  tabCode: {
    fontFamily: FONT.mono,
    fontWeight: '500',
    fontSize: 7,
    letterSpacing: 0.7,
    color: TEXT.t4,
  },
  tabCodeActive: {
    color: ACCENT,
  },
};

// ── Section header ─────────────────────────────────────────
export const SECTION_HEAD = {
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  num: {
    fontFamily: FONT.monoMd,
    fontSize: 10,
    color: ACCENT,
    letterSpacing: 0.6,
  },
  label: {
    fontFamily: FONT.mono,
    fontSize: 9,
    letterSpacing: 1.62,
    textTransform: 'uppercase',
    color: TEXT.t2,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: LINE.dim,
  },
  right: {
    fontFamily: FONT.mono,
    fontSize: 9,
    color: TEXT.t3,
    letterSpacing: 0.9,
  },
};

// ── Stat grid cell ─────────────────────────────────────────
export const STAT = {
  grid: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: LINE.dim,
    borderRadius: R,
    overflow: 'hidden',
  },
  cell: {
    flex: 1,
    padding: 13,
    backgroundColor: BG.b2,
    borderRightWidth: 1,
    borderRightColor: LINE.dim,
  },
  cellLast: {
    borderRightWidth: 0,
  },
  num: {
    fontFamily: FONT.display,
    fontSize: 26,
    letterSpacing: -1.0,
    color: TEXT.t1,
  },
  numAccent: {
    color: ACCENT,
  },
  unit: {
    fontFamily: FONT.mono,
    fontSize: 10,
    color: TEXT.t3,
  },
};

// ── Motion AI card ─────────────────────────────────────────
export const AI_CARD = {
  container: {
    backgroundColor: BG.b2,
    borderWidth: 1,
    borderColor: ACCENT_ALPHA.a22,
    borderRadius: R,
    padding: 15,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'flex-start',
  },
  label: {
    fontFamily: FONT.mono,
    fontSize: 9,
    letterSpacing: 1.62,
    textTransform: 'uppercase',
    color: ACCENT,
    marginBottom: 7,
  },
  text: {
    fontFamily: FONT.body,
    fontSize: 13,
    color: TEXT.t1,
    lineHeight: 19.5,
  },
};

// ── Reg strip (coordinate header) ─────────────────────────
export const REG_STRIP = {
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  text: {
    fontFamily: FONT.mono,
    fontSize: 9,
    color: TEXT.t3,
    letterSpacing: 1.08,
  },
  status: {
    fontFamily: FONT.mono,
    fontSize: 9,
    color: TEXT.t3,
    letterSpacing: 1.08,
  },
  statusLive: {
    color: ACCENT,
  },
};

// ── Screen padding ─────────────────────────────────────────
export const SCREEN = {
  pad: {
    paddingTop: 60,
    paddingHorizontal: 18,
    paddingBottom: 96,
    backgroundColor: BG.base,
    flex: 1,
  },
};

// ── Default export (everything) ────────────────────────────
const T = {
  ACCENT, ACCENT_INK, ACCENT_ALPHA,
  BG, TEXT, LINE,
  RED, AMBER, CYAN, PURPLE,
  RADIUS, R, SPACE,
  FONT, TYPE,
  PANEL, BTN, CHIP, BAR,
  TABBAR, SECTION_HEAD, STAT,
  AI_CARD, REG_STRIP, SCREEN,
};

export default T;
