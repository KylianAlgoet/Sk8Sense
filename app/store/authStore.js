import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../config/firebase';

export const DEMO_USER = {
  uid: 'demo-user',
  email: 'demo@sk8sense.local',
  displayName: 'Demo',
  isDemo: true,
};

const isDemoLogin = (email, password) => email.trim().toLowerCase() === 'demo' && password === '123456';

const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  error: null,

  init: () => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      set({ user: firebaseUser, loading: false });
    });
    return unsubscribe;
  },

  register: async (email, password, displayName) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName });
    await setDoc(doc(db, 'users', user.uid), {
      displayName,
      email,
      createdAt: serverTimestamp(),
    });
  },

  login: async (email, password) => {
    if (isDemoLogin(email, password)) {
      await AsyncStorage.removeItem(`sk8sense_onboarded_${DEMO_USER.uid}`);
      set({ user: DEMO_USER, loading: false, error: null });
      return;
    }
    await signInWithEmailAndPassword(auth, email, password);
  },

  logout: async () => {
    const user = get().user;
    if (user?.uid) await AsyncStorage.removeItem(`sk8sense_onboarded_${user.uid}`);
    set({ user: null, error: null });
    if (auth.currentUser) await signOut(auth);
  },

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));

export default useAuthStore;
