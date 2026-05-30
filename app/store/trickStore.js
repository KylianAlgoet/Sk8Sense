import { create } from 'zustand';

const TRICK_DATA = [
  {
    id: 'ollie',
    name: 'Ollie',
    color: '#4CAF50',
    difficulty: 1,
    category: 'Flatground',
    description: 'The foundation of skateboarding. Pop the tail and slide your front foot to level out in the air.',
    steps: [
      { title: 'Foot Position',  tip: 'Your weight should feel centered over the board' },
      { title: 'The Pop',        tip: 'Think about making the tail hit the ground as loud as possible' },
      { title: 'The Slide',      tip: 'Your shoe should feel the grip tape sliding under it' },
      { title: 'Level Out',      tip: 'Imagine pushing the nose away from you at the top' },
      { title: 'The Landing',    tip: 'Stay over the board — land where you took off' },
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
    difficulty: 2,
    category: 'Flatground',
    description: 'An ollie where you flick the board with your toes to spin it 360° under your feet.',
    steps: [
      { title: 'Foot Position',  tip: 'Your front foot angle is everything — find where the flick feels natural' },
      { title: 'The Pop',        tip: "Same pop as your ollie — don't change what already works" },
      { title: 'The Flick',      tip: 'Kick outward like a karate kick, not downward' },
      { title: 'The Catch',      tip: 'Keep your eyes on the grip tape — catch it when you see it' },
      { title: 'The Landing',    tip: 'Commit fully — your body follows where your eyes look' },
    ],
    coachingTips: [
      'Flick harder off the corner',
      'Keep your shoulders over the board',
      'Watch the grip tape — catch it when you see it',
    ],
  },
  {
    id: 'heelflip',
    name: 'Heelflip',
    color: '#FF9800',
    difficulty: 2,
    category: 'Flatground',
    description: 'Like a kickflip but flipped with your heel — the board spins the opposite direction.',
    steps: [
      { title: 'Foot Position',  tip: 'Your toes off the edge give you the leverage to flick' },
      { title: 'The Pop',        tip: "Pop straight down — don't lean backward" },
      { title: 'The Flick',      tip: 'Flick outward AND forward — not just out to the side' },
      { title: 'The Catch',      tip: 'The board comes back to you — trust the rotation' },
      { title: 'The Landing',    tip: "Stay centered — the board lands under you if you don't lean" },
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
    set({ currentTrick: trick, currentStep: 0, sessionAttempts: [] });
  },

  completeStep: () => {
    const { currentStep, currentTrick } = get();
    if (currentStep < currentTrick.steps.length - 1) {
      set({ currentStep: currentStep + 1 });
    }
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
