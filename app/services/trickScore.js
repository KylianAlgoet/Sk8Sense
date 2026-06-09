// Deterministic "clean score" (0-100) computed from real sensor data captured during a trick.
// No AI guessing — same input always gives the same score, so it can be explained to the user.

// Mirrors the thresholds used in firmware/src/main.cpp
const KICK_THRESHOLD = 180;   // °/s — minimum peak gx for a flip to register
const SHUV_THRESHOLD = 160;   // °/s — minimum peak gz for a shove-it to register
const IDEAL_LANDING_G = 18;   // m/s² — a controlled, absorbed landing
const HARSH_LANDING_G = 30;   // m/s² — a hard, uncontrolled landing
const IDEAL_AIRTIME_MS = 260; // ms — comfortable airtime for a flip trick to fully rotate
const MIN_AIRTIME_MS = 80;    // ms — firmware's AIRTIME_MIN_MS

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Score how close a value is to an ideal range. Returns 0-1.
function rangeScore(value, idealLo, idealHi, hardLo, hardHi) {
  if (value >= idealLo && value <= idealHi) return 1;
  if (value < idealLo) {
    if (value <= hardLo) return 0;
    return (value - hardLo) / (idealLo - hardLo);
  }
  if (value >= hardHi) return 0;
  return (hardHi - value) / (hardHi - idealHi);
}

// landing: 0-1, lower impact = higher score (soft, controlled landing)
function landingScore(landingImpact) {
  if (!landingImpact) return 0.6; // unknown — neutral-ish, don't punish missing data
  if (landingImpact <= IDEAL_LANDING_G) return 1;
  if (landingImpact >= HARSH_LANDING_G) return 0;
  return 1 - (landingImpact - IDEAL_LANDING_G) / (HARSH_LANDING_G - IDEAL_LANDING_G);
}

// rotation: 0-1, did the board rotate enough (without wildly over-spinning) for this trick type
function rotationScore(trick, peakGx, peakGy, peakGz) {
  const ax = Math.abs(peakGx || 0);
  const ay = Math.abs(peakGy || 0);
  const az = Math.abs(peakGz || 0);

  if (trick === 'kickflip' || trick === 'heelflip') {
    // ideal: clears the threshold with some margin, doesn't wildly over-spin (2.5x)
    return rangeScore(ax, KICK_THRESHOLD * 1.05, KICK_THRESHOLD * 1.8, KICK_THRESHOLD * 0.5, KICK_THRESHOLD * 2.5);
  }
  if (trick === 'bs_shuv' || trick === 'fs_shuv' || trick === 'pop_shuvit') {
    return rangeScore(az, SHUV_THRESHOLD * 1.05, SHUV_THRESHOLD * 1.8, SHUV_THRESHOLD * 0.5, SHUV_THRESHOLD * 2.5);
  }
  // ollie — no required rotation; score on staying controlled (low spin = stable, locked-in board)
  const spin = Math.max(ax, ay);
  if (spin <= 60) return 1;
  if (spin >= 200) return 0;
  return 1 - (spin - 60) / 140;
}

// airtime: 0-1, enough hang time to execute the trick, not so long it suggests a sloppy/popped-too-hard ollie
function airtimeScore(trick, airtimeMs) {
  if (!airtimeMs) return 0.5; // unknown
  if (airtimeMs < MIN_AIRTIME_MS) return 0.2; // suspiciously short — likely a partial/half-hearted pop
  const idealLo = trick === 'ollie' ? 120 : IDEAL_AIRTIME_MS - 80;
  const idealHi = trick === 'ollie' ? 320 : IDEAL_AIRTIME_MS + 140;
  return rangeScore(airtimeMs, idealLo, idealHi, MIN_AIRTIME_MS, idealHi + 250);
}

// Returns { score, breakdown, label, weakestFactor }
export function computeCleanScore({ trick, peakGx, peakGy, peakGz, airtime, landingImpact, tailFsr }) {
  const landing  = landingScore(landingImpact);
  const rotation = rotationScore(trick, peakGx, peakGy, peakGz);
  const air      = airtimeScore(trick, airtime);

  // Landing matters most — it's what separates "landed" from "bailed"
  const weights = { landing: 0.5, rotation: 0.3, air: 0.2 };
  const raw = landing * weights.landing + rotation * weights.rotation + air * weights.air;
  const score = Math.round(clamp(raw, 0, 1) * 100);

  const breakdown = { landing, rotation, air };
  const weakestFactor = Object.entries(breakdown).sort((a, b) => a[1] - b[1])[0][0];

  let label = 'Needs work';
  if (score >= 85) label = 'Clean';
  else if (score >= 65) label = 'Solid';
  else if (score >= 45) label = 'Shaky';

  return { score, label, breakdown, weakestFactor };
}

// Was this attempt likely actually landed (vs. bailed)?
// Heuristic from real sensor data: a clean landing shows a sharp impact spike followed by
// the board settling near gravity (~9.8 m/s²) — a bail tends to show a much harsher,
// less controlled impact or no clear settle.
export function estimateLanded({ landingImpact, airtime }) {
  if (!airtime || airtime < MIN_AIRTIME_MS) return false; // no real airtime = no real trick
  if (!landingImpact) return true; // no impact data — assume landed, don't punish missing sensor reads
  return landingImpact < HARSH_LANDING_G * 1.2; // extremely hard hits usually mean a bail/slip-out
}

export function describeFactor(factor) {
  switch (factor) {
    case 'landing':  return 'landing control';
    case 'rotation': return 'rotation';
    case 'air':      return 'pop / airtime';
    default:         return factor;
  }
}
