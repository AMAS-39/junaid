import { auth, secondaryAuth } from "../config/firebase.js";
import { COLLECTIONS } from "../architecture/firestore-collections.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../config/firebase.js";
import { ROLES } from "../config/constants.js";
import { FirestoreService } from "./firestore.service.js";
import { signOutSupabase } from "./supabase-auth.service.js";

export const AUTH_ERRORS = Object.freeze({
  PROFILE_NOT_FOUND: "auth/profile-not-found",
});

let cachedProfile = null;
let cachedUser = null;

/**
 * Subscribe to authentication state changes.
 * @param {(user: import("firebase/auth").User | null) => void} callback
 * @returns {import("firebase/auth").Unsubscribe}
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get the currently signed-in Firebase user (sync, may be null).
 * @returns {import("firebase/auth").User | null}
 */
export function waitForAuthReady() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function getSession() {
  const user = await waitForAuthReady();

  if (!user) {
    cachedUser = null;
    cachedProfile = null;
    return null;
  }

  if (cachedUser?.uid === user.uid && cachedProfile) {
    return { user, profile: cachedProfile };
  }

  const profile = await getUserProfile(user.uid);

  if (!profile) {
    cachedUser = null;
    cachedProfile = null;
    return null;
  }

  cachedUser = user;
  cachedProfile = profile;

  return { user, profile };
}

/**
 * Fetch the Firestore user profile for a given UID.
 * @param {string} uid
 * @returns {Promise<{ id: string, role: string, [key: string]: unknown } | null>}
 */
export async function getUserProfile(uid) {
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    role: String(data.role || "").trim().toLowerCase(),
  };
}



/**
 * Map Firebase Auth errors to readable messages.
 * @param {unknown} error
 * @returns {string}
 */
export function formatAuthError(error) {
  const code =
    error && typeof error === "object" && "code" in error ? String(error.code) : "";

  const messages = {
    "auth/invalid-credential": "Invalid email or password.",
    "auth/invalid-login-credentials": "Invalid email or password.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/email-already-in-use": "This email is already registered. Try logging in or reset your password.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-role": "Invalid staff role selected.",
    "permission-denied": "Could not load your profile. Check Firestore rules.",
    [AUTH_ERRORS.PROFILE_NOT_FOUND]:
      "Account exists but has no profile. Use staff setup or contact admin.",
  };

  if (code && messages[code]) return messages[code];

  if (error && typeof error === "object" && "message" in error && error.message) {
    return String(error.message);
  }

  return "Login failed. Please try again.";
}

/**
 * Sign in with email and password.
 * @param {string} email
 * @param {string} password
 */
export async function login(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getUserProfile(credential.user.uid);

  if (!profile?.role) {
    await signOut(auth);
    cachedUser = null;
    cachedProfile = null;
    const err = new Error("User profile not found in Firestore.");
    err.code = AUTH_ERRORS.PROFILE_NOT_FOUND;
    throw err;
  }

  cachedUser = credential.user;
  cachedProfile = profile;
  return { user: credential.user, profile };
}

/**
 * Register a staff account (doctor or secretary) on the primary auth app.
 * @param {{ name: string, email: string, password: string, phone?: string, role: string }}
 */
export async function registerStaffAccount({ name, email, password, phone = "", role }) {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole || normalizedRole === ROLES.PATIENT) {
    const err = new Error("Staff role must be doctor or secretary.");
    err.code = "auth/invalid-role";
    throw err;
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;

  await FirestoreService.create(
    COLLECTIONS.USERS,
    {
      name,
      email,
      phone,
      role: normalizedRole,
      status: "active",
    },
    uid
  );

  cachedUser = credential.user;
  cachedProfile = await getUserProfile(uid);
  return { user: credential.user, profile: cachedProfile };
}

/**
 * Send a password reset email.
 * @param {string} email
 */
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Sign out the current user and clear session cache.
 */
export async function logout() {
  cachedUser = null;
  cachedProfile = null;
  await signOutSupabase();
  await signOut(auth);
}

/**
 * Create a new auth account on the secondary Firebase app (e.g. patient creation by staff).
 * Does not affect the current staff session.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import("firebase/auth").UserCredential>}
 */
export async function createSecondaryAccount(email, password) {
  const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  await signOut(secondaryAuth);
  return credential;
}

/**
 * Normalize and validate a role string.
 * @param {string} role
 * @returns {string | null}
 */
export function normalizeRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return Object.values(ROLES).includes(normalized) ? normalized : null;
}

/**
 * Clear in-memory session cache (use after profile updates).
 */
export function clearSessionCache() {
  cachedUser = null;
  cachedProfile = null;
}
