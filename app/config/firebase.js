import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBxRKPpTbz-BEm1jRidWqL6L9VYSOMWVAo',
  authDomain: 'skatesense.firebaseapp.com',
  projectId: 'skatesense',
  storageBucket: 'skatesense.firebasestorage.app',
  messagingSenderId: '722104966243',
  appId: '1:722104966243:web:9928ddfd8df79c83daac56',
  measurementId: 'G-Y0493WVGTN',
};

const app = initializeApp(firebaseConfig);
setLogLevel('silent');

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
