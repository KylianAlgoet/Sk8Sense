import { create } from 'zustand';

const useSessionStore = create((set, get) => ({
  isActive: false,
  startTime: null,
  tricks: [],
  sessions: [],

  startSession: () =>
    set({ isActive: true, startTime: Date.now(), tricks: [] }),

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
    return session;
  },
}));

export default useSessionStore;
