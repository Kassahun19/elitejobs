import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const isVite = typeof import.meta !== 'undefined' && !!import.meta.env;

const getEnv = (key: string) => {
  if (isVite) return import.meta.env[key];
  return process.env[key];
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY") || "AIzaSyAqxUAwkkycEboqWHBjBnTkN1cHOY-1cMk",
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN") || "gen-lang-client-0103377395.firebaseapp.com",
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID") || "gen-lang-client-0103377395",
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET") || "gen-lang-client-0103377395.firebasestorage.app",
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID") || "199334627513",
  appId: getEnv("VITE_FIREBASE_APP_ID") || "1:199334627513:web:ebb35d2fc1091dae17f368",
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID") || "G-C3KG7N9B44"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser)
export const analytics = typeof window !== 'undefined' ? isSupported().then(yes => yes ? getAnalytics(app) : null) : null;

// Initialize Firestore and Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
