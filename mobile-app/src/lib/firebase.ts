import { initializeApp, getApps, getApp } from "firebase/app";
// The top-level "firebase" wrapper package's "firebase/auth" subpath has no
// react-native build (its package.json only lists node/browser entries) —
// importing it here would silently pull the browser build, which isn't
// safe in an RN/Hermes environment (no window/localStorage) and doesn't
// export getReactNativePersistence at all. "@firebase/auth" is the
// underlying package and does declare a "react-native" export condition
// that Metro resolves correctly. getReactNativePersistence is imported via
// the namespace + cast below because @firebase/auth's package.json
// "exports" map lists "types" ahead of the "react-native" condition, so
// tsc always types this module from the generic (non-RN) declaration file
// and doesn't know this export exists — even though Metro's runtime
// resolver loads the real RN build where it does.
import { initializeAuth, getAuth, type Auth } from "@firebase/auth";
import * as FirebaseAuth from "@firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const getReactNativePersistence = (FirebaseAuth as any).getReactNativePersistence;

// Same project/config as frontend/lib/firebase.ts and driver-app — one
// Firebase project shared across web + both mobile apps.
const firebaseConfig = {
  apiKey: "AIzaSyB4v-ingfxSqwtqcuBoZgBp8MwsPH586E8",
  authDomain: "fleetsure-fc010.firebaseapp.com",
  projectId: "fleetsure-fc010",
  storageBucket: "fleetsure-fc010.firebasestorage.app",
  messagingSenderId: "874399364699",
  appId: "1:874399364699:web:d67fc91e8f5091adaa317e",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// initializeAuth() must only run once per app instance — Metro Fast Refresh
// re-executes this module on hot reload, and a second call throws
// "already-initialized". Falling back to getAuth() on that error recovers
// the existing instance instead of crashing the app on every edit.
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export { auth };
export default app;
