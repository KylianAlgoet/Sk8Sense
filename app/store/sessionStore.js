import { create } from 'zustand';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { computeCleanScore, estimateLanded } from '../services/trickScore';
import useAuthStore from './authStore';

function makeDemoSessions() {
  const now = Date.now();
  const minute = 60 * 1000;
  const day = 24 * 60 * minute;
  return [
    {
      id: 'demo-session-004',
      startTime: now - 32 * minute,
      endTime: now - 21 * minute,
      duration: 11 * 60,
      tricks: [
        { trick: 'ollie', time: now - 31 * minute, landed: true, cleanScore: 82, cleanLabel: 'Solid', weakestFactor: 'air' },
        { trick: 'kickflip', time: now - 29 * minute, landed: false, cleanScore: 36, cleanLabel: 'Needs work', weakestFactor: 'landing' },
        { trick: 'kickflip', time: now - 26 * minute, landed: true, cleanScore: 91, cleanLabel: 'Clean', weakestFactor: 'air' },
      ],
    },
    {
      id: 'demo-session-003',
      startTime: now - day,
      endTime: now - day + 9 * minute,
      duration: 9 * 60,
      tricks: [
        { trick: 'ollie', time: now - day + minute, landed: true, cleanScore: 76, cleanLabel: 'Solid', weakestFactor: 'air' },
        { trick: 'pop_shuvit', time: now - day + 3 * minute, landed: true, cleanScore: 84, cleanLabel: 'Solid', weakestFactor: 'rotation' },
        { trick: 'kickflip', time: now - day + 6 * minute, landed: true, cleanScore: 87, cleanLabel: 'Clean', weakestFactor: 'landing' },
      ],
    },
    {
      id: 'demo-session-002',
      startTime: now - 2 * day,
      endTime: now - 2 * day + 7 * minute,
      duration: 7 * 60,
      tricks: [
        { trick: 'ollie', time: now - 2 * day + minute, landed: true, cleanScore: 73, cleanLabel: 'Solid', weakestFactor: 'air' },
        { trick: 'kickflip', time: now - 2 * day + 4 * minute, landed: false, cleanScore: 42, cleanLabel: 'Needs work', weakestFactor: 'landing' },
      ],
    },
  ];
}

const useSessionStore = create((set, get) => ({
  isActive: false,
  startTime: null,
  tricks: [],
  sessions: [],

  startSession: () => set({ isActive: true, startTime: Date.now(), tricks: [] }),

  // meta = { peakGx, peakGy, peakGz, airtime, tailFsr, landingImpact } captured from sensor data during the trick
  addTrick: (trick, meta = {}) => {
    const { score, label, breakdown, weakestFactor } = computeCleanScore({ trick, ...meta });
    const landed = estimateLanded(meta);
    set((state) => ({
      tricks: [...state.tricks, {
        trick,
        time: Date.now(),
        landed,
        cleanScore: score,
        cleanLabel: label,
        weakestFactor,
        breakdown,
        ...meta,
      }],
    }));
  },

  stopSession: () => {
    const { startTime, tricks } = get();
    const endTime = Date.now();
    const session = {
      id: endTime.toString(),
      startTime,
      endTime,
      duration: Math.floor((endTime - startTime) / 1000),
      tricks,
    };

    set((state) => ({
      isActive: false,
      startTime: null,
      tricks: [],
      sessions: [session, ...state.sessions],
    }));

    // Fire-and-forget save to Firestore
    const appUser = useAuthStore.getState().user;
    const user = auth.currentUser;
    if (user) {
      addDoc(collection(db, 'sessions'), {
        ...session,
        userId: user.uid,
        createdAt: serverTimestamp(),
      }).catch(() => {});
    } else if (appUser?.isDemo) {
      // Demo sessions stay local; the preloaded stats already make the account feel lived-in.
    }

    return session;
  },

  loadSessions: async () => {
    const appUser = useAuthStore.getState().user;
    if (appUser?.isDemo) {
      const sessions = get().sessions;
      const hasDemoData = sessions.some((session) => String(session.id).startsWith('demo-session-'));
      set({ sessions: hasDemoData ? sessions : makeDemoSessions() });
      return;
    }

    const user = auth.currentUser;
    if (!user) return;
    try {
      const q = query(collection(db, 'sessions'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const sessions = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => b.startTime - a.startTime);
      set({ sessions });
    } catch (e) {
      // Firestore is optional for the demo path; keep local session data usable offline.
    }
  },
}));

export default useSessionStore;
