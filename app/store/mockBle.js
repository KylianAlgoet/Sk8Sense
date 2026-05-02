// Simulates the ESP32 ollie state machine for web demo mode

const PHASES = [
  { name: 'idle',       ms: 2500, ax: 0,    ay: 0,    az: 9.8,  gx: 0,   gy: 0,   gz: 0,   trick: 'none'  },
  { name: 'tail_press', ms: 100,  ax: 0,    ay: 0,    az: 6.0,  gx: 0,   gy: 0,   gz: 200, trick: 'none'  },
  { name: 'pop',        ms: 50,   ax: 0,    ay: 0,    az: 18.0, gx: 0,   gy: 0,   gz: 800, trick: 'none'  },
  { name: 'airtime',    ms: 300,  ax: 0,    ay: 0,    az: 0.1,  gx: 0,   gy: 0,   gz: 0,   trick: 'ollie' },
  { name: 'landing',    ms: 150,  ax: 0,    ay: 0,    az: 20.0, gx: 0,   gy: 0,   gz: 0,   trick: 'ollie' },
];

function noise(range) {
  return (Math.random() * 2 - 1) * range;
}

export function startMockSensor(onData) {
  let phaseIndex = 0;
  let cancelled = false;

  function runPhase() {
    if (cancelled) return;
    const phase = PHASES[phaseIndex];

    const data = {
      ax: +(phase.ax + noise(0.1)).toFixed(2),
      ay: +(phase.ay + noise(0.1)).toFixed(2),
      az: +(phase.az + noise(0.1)).toFixed(2),
      gx: +(phase.gx + noise(2)).toFixed(2),
      gy: +(phase.gy + noise(2)).toFixed(2),
      gz: +(phase.gz + noise(5)).toFixed(2),
      trick: phase.trick,
    };

    onData(data);

    const interval = setInterval(() => {
      if (cancelled) { clearInterval(interval); return; }
      onData({
        ax: +(phase.ax + noise(0.1)).toFixed(2),
        ay: +(phase.ay + noise(0.1)).toFixed(2),
        az: +(phase.az + noise(0.1)).toFixed(2),
        gx: +(phase.gx + noise(2)).toFixed(2),
        gy: +(phase.gy + noise(2)).toFixed(2),
        gz: +(phase.gz + noise(5)).toFixed(2),
        trick: phase.trick,
      });
    }, 10);

    setTimeout(() => {
      clearInterval(interval);
      phaseIndex = (phaseIndex + 1) % PHASES.length;
      runPhase();
    }, phase.ms);
  }

  runPhase();
  return () => { cancelled = true; };
}
