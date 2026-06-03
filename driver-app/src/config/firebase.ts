import rnAuth from "@react-native-firebase/auth";

// Pre-called instance — callers use auth.currentUser, auth.signOut(), etc.
export const auth = rnAuth();
export default auth;
