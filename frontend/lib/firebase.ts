import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyB4v-ingfxSqwtqcuBoZgBp8MwsPH586E8",
  authDomain: "fleetsure-fc010.firebaseapp.com",
  projectId: "fleetsure-fc010",
  storageBucket: "fleetsure-fc010.firebasestorage.app",
  messagingSenderId: "874399364699",
  appId: "1:874399364699:web:d67fc91e8f5091adaa317e",
  measurementId: "G-J1J5GG2HZ6",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

if (typeof window !== "undefined") {
  isSupported().then((yes) => {
    if (yes) getAnalytics(app);
  });
}

export default app;
