import { ANTHROPIC_API_KEY, AI_MODEL } from '../config/ai';
import { describeFactor } from './trickScore';

const KICK_THRESHOLD = 180; // °/s — mirrors firmware/src/main.cpp, used to call out under/over-rotation
const SHUV_THRESHOLD = 160; // °/s — mirrors firmware/src/main.cpp, shove-it rotation (gz axis)

const REQUEST_TIMEOUT_MS = 12000; // bounded so a flaky connection can't hang the UI forever

// Send a message to Claude and get coaching feedback.
// Returns null on any failure (missing key, network error, timeout, bad response) —
// callers already render a deterministic fallback, so silent null keeps the demo smooth
// instead of surfacing a stuck "Analysing…" state or a thrown error.
async function callClaude(prompt, maxTokens = 150) {
  if (!ANTHROPIC_API_KEY) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch {
    return null; // network error, timeout/abort, or malformed JSON
  } finally {
    clearTimeout(timeout);
  }
}

// Translate raw rotation speed into a verdict the AI (and the user) can act on —
// keeps the model from inventing its own interpretation of the numbers.
function rotationVerdict(trick, peakGx, peakGy, peakGz) {
  if (trick === 'kickflip' || trick === 'heelflip') {
    const peak = Math.abs(peakGx) || 0;
    if (peak < KICK_THRESHOLD * 0.85) return 'under-rotated — flick was too soft, board barely completed the flip';
    if (peak > KICK_THRESHOLD * 2.2) return 'over-rotated — flicked way harder than needed, board spun past catch point';
    return 'flip speed was in the right window';
  }
  if (trick === 'bs_shuv' || trick === 'fs_shuv' || trick === 'pop_shuvit') {
    const peak = Math.abs(peakGz) || 0;
    if (peak < SHUV_THRESHOLD * 0.85) return 'under-rotated — scoop was too soft, board barely came around 180°';
    if (peak > SHUV_THRESHOLD * 2.2) return 'over-spun — scooped way harder than needed, board spun past where your feet were waiting';
    return 'scoop speed was in the right window';
  }
  return null;
}

function landingVerdict(landingImpact) {
  if (!landingImpact) return null;
  const g = landingImpact / 9.81;
  if (g < 1.8) return `soft, controlled landing (${g.toFixed(1)}g)`;
  if (g > 3.0) return `harsh impact on landing (${g.toFixed(1)}g) — knees absorbed too little`;
  return `landing impact was reasonable (${g.toFixed(1)}g)`;
}

// Quick tip after a single trick (called live during session).
// Grounded in the deterministic clean-score breakdown so the AI explains the
// SAME verdict the score already shows, instead of freelancing its own read of the data.
export async function getTrickTip({ trick, peakGx, peakGy, peakGz, airtime, tailFsr, landingImpact, landed, cleanScore, weakestFactor }) {
  const rotation = rotationVerdict(trick, peakGx, peakGy, peakGz);
  const landing = landingVerdict(landingImpact);

  const facts = [
    landed === false ? 'Looks like this one was bailed, not landed clean.' : null,
    rotation ? `Rotation: ${rotation}.` : null,
    landing ? `Landing: ${landing}.` : null,
    airtime ? `Airtime: ${airtime}ms.` : null,
    weakestFactor ? `Weakest part of this attempt: ${describeFactor(weakestFactor)}.` : null,
  ].filter(Boolean).join(' ');

  const prompt = `You are a pro skateboarding coach watching live sensor data from a board. Give ONE short coaching tip (max 14 words) in direct skate culture language. Use external focus cues ("get closer to the board", not "bend your knees"). Base your tip ONLY on the facts below — don't invent numbers.

Trick: ${trick}${cleanScore != null ? ` (clean score: ${cleanScore}/100)` : ''}
Facts: ${facts || 'No clear sensor read on this attempt.'}

One tip:`;
  return callClaude(prompt, 60);
}

// Full session analysis (called after session ends).
// Surfaces the cleanest trick, the one that needs the most work, and a landed/bailed
// breakdown — all computed deterministically — so the AI narrates real findings.
export async function getSessionAnalysis({ tricks, duration, maxImpact }) {
  if (!tricks.length) {
    const prompt = `You are a pro skateboarding coach. The rider did a session but landed zero tricks. Give one short, encouraging line (max 2 sentences) pushing them to keep at it. Direct skate culture language, no fluff.`;
    return callClaude(prompt, 80);
  }

  const counts = tricks.reduce((acc, t) => { acc[t.trick] = (acc[t.trick] || 0) + 1; return acc; }, {});
  const countsStr = Object.entries(counts).map(([k, v]) => `${k}: ${v}x`).join(', ');
  const landedCount = tricks.filter(t => t.landed !== false).length;

  const scored = tricks.filter(t => typeof t.cleanScore === 'number');
  const cleanest = scored.length ? scored.reduce((a, b) => (b.cleanScore > a.cleanScore ? b : a)) : null;
  const weakest = scored.length ? scored.reduce((a, b) => (b.cleanScore < a.cleanScore ? b : a)) : null;

  const prompt = `You are a pro skateboarding coach. Give a session analysis in 3-4 sentences max. Direct, honest skate culture language. External focus cues only. End with one specific thing to focus on next session, referencing the weakest-scoring trick if given.

Session data:
- Duration: ${Math.floor(duration / 60)}min ${duration % 60}s
- Attempts detected: ${tricks.length} (${countsStr || 'none'}) — ${landedCount}/${tricks.length} landed clean
- Max impact: ${maxImpact ? (maxImpact / 9.81).toFixed(1) + 'g' : 'unknown'}
${cleanest ? `- Cleanest trick: ${cleanest.trick} scored ${cleanest.cleanScore}/100 (${cleanest.cleanLabel}), weakest factor was ${describeFactor(cleanest.weakestFactor)}` : ''}
${weakest && weakest !== cleanest ? `- Needs the most work: ${weakest.trick} scored ${weakest.cleanScore}/100 (${weakest.cleanLabel}), held back mainly by ${describeFactor(weakest.weakestFactor)}` : ''}

Analysis:`;
  return callClaude(prompt, 200);
}
