// Simulates ESP32 sensor output with 3 tricks cycling randomly

const IDLE_MS = 2500;

const TRICK_SEQUENCES = {
  ollie: [
    { ms: 100,  ax: 0,   ay: 0,   az: 6.0,  gx: 0,    gy: 0,   gz: 200,  trick: 'none'    },
    { ms: 50,   ax: 0,   ay: 0,   az: 18.0, gx: 0,    gy: 0,   gz: 800,  trick: 'none'    },
    { ms: 300,  ax: 0,   ay: 0,   az: 0.1,  gx: 0,    gy: 0,   gz: 0,    trick: 'ollie'   },
    { ms: 150,  ax: 0,   ay: 0,   az: 20.0, gx: 0,    gy: 0,   gz: 0,    trick: 'ollie'   },
  ],
  kickflip: [
    { ms: 100,  ax: 0,   ay: 0,   az: 6.0,  gx: 0,    gy: 0,   gz: 200,  trick: 'none'    },
    { ms: 50,   ax: 0,   ay: 0,   az: 18.0, gx: 0,    gy: 0,   gz: 800,  trick: 'none'    },
    { ms: 350,  ax: 0,   ay: 0,   az: 0.1,  gx: 420,  gy: 0,   gz: 0,    trick: 'kickflip'},
    { ms: 150,  ax: 0,   ay: 0,   az: 20.0, gx: 0,    gy: 0,   gz: 0,    trick: 'kickflip'},
  ],
  heelflip: [
    { ms: 100,  ax: 0,   ay: 0,   az: 6.0,  gx: 0,    gy: 0,   gz: 200,  trick: 'none'    },
    { ms: 50,   ax: 0,   ay: 0,   az: 18.0, gx: 0,    gy: 0,   gz: 800,  trick: 'none'    },
    { ms: 350,  ax: 0,   ay: 0,   az: 0.1,  gx: -420, gy: 0,   gz: 0,    trick: 'heelflip'},
    { ms: 150,  ax: 0,   ay: 0,   az: 20.0, gx: 0,    gy: 0,   gz: 0,    trick: 'heelflip'},
  ],
  bs_shuv: [
    { ms: 100,  ax: 0,   ay: 0,   az: 6.0,  gx: 0,    gy: 0,   gz: 200,  trick: 'none'    },
    { ms: 50,   ax: 0,   ay: 0,   az: 18.0, gx: 0,    gy: 0,   gz: 800,  trick: 'none'    },
    { ms: 350,  ax: 0,   ay: 0,   az: 0.1,  gx: 0,    gy: 380, gz: 0,    trick: 'bs_shuv' },
    { ms: 150,  ax: 0,   ay: 0,   az: 20.0, gx: 0,    gy: 0,   gz: 0,    trick: 'bs_shuv' },
  ],
  fs_shuv: [
    { ms: 100,  ax: 0,   ay: 0,   az: 6.0,  gx: 0,    gy: 0,   gz: 200,  trick: 'none'    },
    { ms: 50,   ax: 0,   ay: 0,   az: 18.0, gx: 0,    gy: 0,   gz: 800,  trick: 'none'    },
    { ms: 350,  ax: 0,   ay: 0,   az: 0.1,  gx: 0,    gy: -380, gz: 0,   trick: 'fs_shuv' },
    { ms: 150,  ax: 0,   ay: 0,   az: 20.0, gx: 0,    gy: 0,   gz: 0,    trick: 'fs_shuv' },
  ],
};

const TRICK_NAMES = Object.keys(TRICK_SEQUENCES);

function noise(range) {
  return (Math.random() * 2 - 1) * range;
}

function makeFrame(phase) {
  // Tail FSR (f4) spikes during the pop phase (the loud az transient before liftoff),
  // mirrors what the real board reads when the rider loads the tail to pop.
  const isPop = Math.abs(phase.az - 18.0) < 0.5;
  return {
    ax: +(phase.ax + noise(0.1)).toFixed(2),
    ay: +(phase.ay + noise(0.1)).toFixed(2),
    az: +(phase.az + noise(0.15)).toFixed(2),
    gx: +(phase.gx + noise(5)).toFixed(2),
    gy: +(phase.gy + noise(5)).toFixed(2),
    gz: +(phase.gz + noise(8)).toFixed(2),
    trick: phase.trick,
    f1: phase.trick === 'none' && !isPop ? 1200 + noise(150) : 200 + noise(80),
    f2: phase.trick === 'none' && !isPop ? 1100 + noise(150) : 180 + noise(80),
    f3: 150 + noise(60),
    f4: isPop ? 2400 + noise(300) : 150 + noise(60),
  };
}

const IDLE_PHASE = { ax: 0, ay: 0, az: 9.8, gx: 0, gy: 0, gz: 0, trick: 'none' };

export function startMockSensor(onData) {
  let cancelled = false;
  const timers = [];

  function tick(interval, phase) {
    if (cancelled) return;
    onData(makeFrame(phase));
    const id = setInterval(() => {
      if (cancelled) { clearInterval(id); return; }
      onData(makeFrame(phase));
    }, interval);
    timers.push(id);
    return id;
  }

  function runCycle() {
    if (cancelled) return;

    // IDLE
    const idleId = tick(10, IDLE_PHASE);
    const cycleTimer = setTimeout(() => {
      if (cancelled) return;
      clearInterval(idleId);

      // Pick a random trick
      const trickName = TRICK_NAMES[Math.floor(Math.random() * TRICK_NAMES.length)];
      const phases = TRICK_SEQUENCES[trickName];
      let delay = 0;

      phases.forEach((phase, i) => {
        const t = setTimeout(() => {
          if (cancelled) return;
          const intervalId = tick(10, phase);
          const stopPhase = setTimeout(() => clearInterval(intervalId), phase.ms - 5);
          timers.push(stopPhase);
        }, delay);
        timers.push(t);
        delay += phase.ms;
      });

      // Back to idle cycle after trick done
      const nextCycle = setTimeout(runCycle, delay);
      timers.push(nextCycle);
    }, IDLE_MS);
    timers.push(cycleTimer);
  }

  runCycle();

  return () => {
    cancelled = true;
    timers.forEach((t) => { clearInterval(t); clearTimeout(t); });
  };
}
