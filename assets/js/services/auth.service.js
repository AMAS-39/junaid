import { auth, secondaryAuth } from "../config/firebase.js";
import { COLLECTIONS } from "../architecture/firestore-collections.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../config/firebase.js";
import { ROLES } from "../config/constants.js";

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
export function getCurrentUser() {
  return auth.currentUser;
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
 * Get cached session: Firebase user + Firestore profile.
 * @returns {Promise<{ user: import("firebase/auth").User, profile: object } | null>}
 */
export async function getSession() {
  const user = getCurrentUser();
  if (!user) {
    cachedUser = null;
    cachedProfile = null;
    return null;
  }

  if (cachedUser?.uid === user.uid && cachedProfile) {
    return { user, profile: cachedProfile };
  }

  const profile = await getUserProfile(user.uid);
  if (!profile) return null;

  cachedUser = user;
  cachedProfile = profile;
  return { user, profile };
}

/**
 * Sign in with email and password.
 * @param {string} email
 * @param {string} password
 */
export async function login(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  cachedUser = credential.user;
  cachedProfile = await getUserProfile(credential.user.uid);
  return { user: credential.user, profile: cachedProfile };
}

/**
 * Sign out the current user and clear session cache.
 */
export async function logout() {
  cachedUser = null;
  cachedProfile = null;
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
