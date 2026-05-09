import { create } from 'zustand';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const useSessionStore = create((set, get) => ({
  isActive: false,
  startTime: null,
  tricks: [],
  sessions: [],

  startSession: () => set({ isActive: true, startTime: Date.now(), tricks: [] }),

  addTrick: (trick) =>
    set((state) => ({
      tricks: [...state.tricks, { trick, time: Date.now() }],
    })),

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
    const user = auth.currentUser;
    if (user) {
      addDoc(collection(db, 'sessions'), {
        ...session,
        userId: user.uid,
        createdAt: serverTimestamp(),
      }).catch((e) => console.error('Failed to save session to Firestore:', e));
    }

    return session;
  },

  loadSessions: async () => {
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
      console.error('Failed to load sessions from Firestore:', e);
    }
  },
}));

export default useSessionStore;
