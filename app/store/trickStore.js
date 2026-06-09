import { create } from 'zustand';

const ACCENT_SHUV = '#9C27B0';

// FSR press threshold — mirrors DashboardScreen's "pressed" convention (idle floats ~150-300,
// a real foot press reads 600+). `f1`=nose, `f2`=toe, `f3`=heel, `f4`=tail (firmware/src/main.cpp).
const FSR_PRESS = 550;

// Each Learning step carries a `detect` spec so PracticeScreen can read it live off the
// board instead of asking the rider to jump and hope the full-trick detector fires:
//   - 'pose'  → a single held foot position (e.g. tail pressed down) — checks ONE FSR
//               that must stay past `min` for `holdMs` straight before the step goes green.
//               Deliberately single-sensor: piling on extra "and the nose must be light"
//               conditions just made the step harder to read and easier to false-negative.
//   - 'drag'  → a press-peak on the sensor that captures this trick's flick/scoop/slide —
//               performed slowly, standing still, no jump yet. Only that one sensor matters;
//               we don't also require the tail to still be down (the rider may shift weight
//               mid-motion, and re-checking it just made an already-felt motion feel unrecognized).
//   - 'trick' → the existing full live-trick detector (pop, airtime, landing) — used
//               for the final "put it all together" step where the rider actually goes for it.
const TAIL_DOWN = { sensor: 'f4', min: FSR_PRESS };
const SHUV_SCOOP = { anyOf: [{ sensor: 'gy', absMin: 70 }, { sensor: 'gz', absMin: 70 }] };

const TRICK_DATA = [
  {
    id: 'ollie',
    name: 'Ollie',
    color: '#4CAF50',
    difficulty: 1,
    category: 'Flatground',
    description: 'The foundation of skateboarding. Pop the tail and slide your front foot to level out in the air.',
    steps: [
      {
        title: 'Load the Tail',
        tip: 'Back foot on the tail — press it to the ground until the nose lifts. Hold it there.',
        detect: { type: 'pose', sensor: TAIL_DOWN, holdMs: 500 },
        liveLabel: 'Press your tail to the floor and hold',
      },
      {
        title: 'Find the Slide',
        tip: 'From that same loaded stance, drag your front foot up across the toe edge — the motion that levels the board out.',
        detect: { type: 'drag', trigger: [{ sensor: 'f2', min: FSR_PRESS }] },
        liveLabel: 'Drag your front foot over the toe edge',
      },
      {
        title: 'Put It Together',
        tip: 'Now go for the real thing — load, pop, slide your foot, land it. We\'re reading the whole trick live.',
        detect: { type: 'trick' },
        liveLabel: 'Pop, slide, land — go for it',
      },
    ],
    coachingTips: [
      'Stay over the board on landing',
      'Get the tail louder on the pop',
      'Push the nose forward at the top',
    ],
  },
  {
    id: 'kickflip',
    name: 'Kickflip',
    color: '#2196F3',
    difficulty: 3,
    category: 'Flatground',
    description: 'An ollie where you flick the board with your toes to spin it 360° under your feet.',
    steps: [
      {
        title: 'Load the Tail',
        tip: 'Back foot on the tail, angled slightly — press it down until the nose lifts. Hold that loaded stance.',
        detect: { type: 'pose', sensor: TAIL_DOWN, holdMs: 500 },
        liveLabel: 'Press your tail to the floor and hold',
      },
      {
        title: 'Find the Flick',
        tip: 'From that same stance, drag your front foot off the corner across the toe edge — that\'s the flick motion, in slow motion.',
        detect: { type: 'drag', trigger: [{ sensor: 'f2', min: FSR_PRESS }] },
        liveLabel: 'Drag your front foot off the toe edge',
      },
      {
        title: 'Put It Together',
        tip: 'Now go for the real thing — load, pop, flick, catch, land. We\'re reading the whole trick live.',
        detect: { type: 'trick' },
        liveLabel: 'Pop, flick, catch, land — go for it',
      },
    ],
    coachingTips: [
      'Flick harder off the corner',
      'Keep your shoulders over the board',
      'Watch the grip tape — catch it when you see it',
    ],
  },
  {
    id: 'pop_shuvit',
    name: 'Pop Shove-it',
    color: ACCENT_SHUV,
    difficulty: 2,
    category: 'Flatground',
    // The board detects this as a backside or frontside shove-it (bs_shuv / fs_shuv) —
    // both register as "Pop Shove-it" here since the spin direction doesn't change the trick name.
    detectAs: ['bs_shuv', 'fs_shuv'],
    description: 'Pop the tail and scoop it back to spin the board 180° horizontally beneath you — no flip, just rotation.',
    steps: [
      {
        title: 'Load the Tail',
        tip: 'Back foot on the tail — press it straight down until the nose lifts. Hold it there.',
        detect: { type: 'pose', sensor: TAIL_DOWN, holdMs: 500 },
        liveLabel: 'Press your tail to the floor and hold',
      },
      {
        title: 'Find the Scoop',
        tip: 'Keep the deck on the ground and scoop the tail left with your back foot — slow and static, like the start of a pop shove-it.',
        detect: { type: 'drag', trigger: [SHUV_SCOOP] },
        liveLabel: 'Scoop the deck left on the ground',
      },
      {
        title: 'Put It Together',
        tip: 'Now put both together — press the tail down, scoop it left, then pop, catch it spinning, and land.',
        detect: { type: 'trick' },
        liveLabel: 'Load, scoop left, pop, catch, land',
      },
    ],
    coachingTips: [
      'Scoop back and off — not just back',
      'Pop first, spin second',
      'Catch it with both feet at once',
    ],
  },
  {
    id: 'heelflip',
    name: 'Heelflip',
    color: '#FF9800',
    difficulty: 3,
    category: 'Flatground',
    description: 'Like a kickflip but flipped with your heel — the board spins the opposite direction.',
    steps: [
      {
        title: 'Load the Tail',
        tip: 'Back foot on the tail, angled slightly — press it down until the nose lifts. Hold that loaded stance.',
        detect: { type: 'pose', sensor: TAIL_DOWN, holdMs: 500 },
        liveLabel: 'Press your tail to the floor and hold',
      },
      {
        title: 'Find the Flick',
        tip: 'From that same stance, drag your front foot off the corner across the heel edge — that\'s the flick motion, in slow motion.',
        detect: { type: 'drag', trigger: [{ sensor: 'f3', min: FSR_PRESS }] },
        liveLabel: 'Drag your front foot off the heel edge',
      },
      {
        title: 'Put It Together',
        tip: 'Now go for the real thing — load, pop, flick, catch, land. We\'re reading the whole trick live.',
        detect: { type: 'trick' },
        liveLabel: 'Pop, flick, catch, land — go for it',
      },
    ],
    coachingTips: [
      'Kick out more with your heel',
      "Stay centered — don't lean back",
      'Trust the flip — it comes back to you',
    ],
  },
];

const useTrickStore = create((set, get) => ({
  tricks: TRICK_DATA,
  currentTrick: null,
  currentStep: 0,
  sessionAttempts: [],
  sessionStartTime: null,

  selectTrick: (trickId) => {
    const trick = TRICK_DATA.find((t) => t.id === trickId);
    set({ currentTrick: trick, currentStep: 0, sessionAttempts: [], sessionStartTime: null });
  },

  resetPracticeSession: () => set({ currentStep: 0, sessionAttempts: [], sessionStartTime: null }),

  completeStep: () => {
    const { currentStep, currentTrick } = get();
    if (currentStep < currentTrick.steps.length - 1) {
      set({ currentStep: currentStep + 1 });
    }
  },

  // Step back one — used by Practice's back-arrow so a rider can re-watch/redo
  // the previous step instead of only ever moving forward.
  goToPreviousStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) set({ currentStep: currentStep - 1 });
  },

  addAttempt: (landed) => {
    set((state) => ({
      sessionAttempts: [...state.sessionAttempts, { landed, time: Date.now() }],
    }));
  },

  startSession: () => set({ sessionAttempts: [], sessionStartTime: Date.now() }),

  endSession: () => {
    const { sessionAttempts, sessionStartTime } = get();
    const duration = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
    const landed = sessionAttempts.filter((a) => a.landed).length;
    return { duration, total: sessionAttempts.length, landed };
  },

  calculateProgress: () => {
    const { sessionAttempts } = get();
    if (!sessionAttempts.length) return 0;
    return Math.round((sessionAttempts.filter((a) => a.landed).length / sessionAttempts.length) * 100);
  },

  getRandomCoachingTip: () => {
    const { currentTrick } = get();
    if (!currentTrick) return '';
    const tips = currentTrick.coachingTips;
    return tips[Math.floor(Math.random() * tips.length)];
  },
}));

export default useTrickStore;
