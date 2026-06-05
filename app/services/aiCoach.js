import { ANTHROPIC_API_KEY, AI_MODEL } from '../config/ai';

// Send a message to Claude and get coaching feedback
async function callClaude(prompt) {
  if (!ANTHROPIC_API_KEY) return null;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text?.trim() || null;
}

// Quick tip after a single trick (called live during session)
// Returns 1 short sentence in skate culture language
export async function getTrickTip({ trick, peakGx, peakGy, airtime, tailFsr, landingImpact }) {
  const prompt = `You are a pro skateboarding coach. Give ONE short coaching tip (max 12 words) in direct skate culture language. Use external focus cues ("get closer to the board", not "bend your knees"). No fluff.

Trick: ${trick}
Sensor data:
- Airtime: ${airtime}ms
- Tail pressure at pop: ${tailFsr}/1023
- Peak flip rotation (gx): ${peakGx?.toFixed(0)}°/s
- Peak spin rotation (gy): ${peakGy?.toFixed(0)}°/s
- Landing impact: ${landingImpact?.toFixed(1)} m/s²

One tip:`;
  return callClaude(prompt);
}

// Full session analysis (called after session ends)
export async function getSessionAnalysis({ tricks, duration, maxImpact, trickStats }) {
  const trickList = tricks.map(t => t.trick).join(', ') || 'none';
  const counts = tricks.reduce((acc, t) => { acc[t.trick] = (acc[t.trick]||0)+1; return acc; }, {});
  const countsStr = Object.entries(counts).map(([k,v]) => `${k}: ${v}x`).join(', ');

  const prompt = `You are a pro skateboarding coach. Give a session analysis in 3-4 sentences max. Direct, honest skate culture language. External focus cues only. End with one thing to focus on next session.

Session data:
- Duration: ${Math.floor(duration/60)}min ${duration%60}s
- Tricks landed: ${tricks.length} (${countsStr || 'none'})
- Max impact: ${maxImpact ? (maxImpact/9.81).toFixed(1)+'g' : 'unknown'}
- Most common: ${Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'none'}

Analysis:`;
  return callClaude(prompt);
}
