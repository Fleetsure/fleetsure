import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyB4v-ingfxSqwtqcuBoZgBp8MwsPH586E8",
  authDomain: "fleetsure-fc010.firebaseapp.com",
  projectId: "fleetsure-fc010",
  storageBucket: "fleetsure-fc010.firebasestorage.app",
  messagingSenderId: "874399364699",
  appId: "1:874399364699:android:f1ea672779ed4f6caa317e",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export { auth };
export default app;
