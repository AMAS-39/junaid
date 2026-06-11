import { supabase } from "../config/supabase.js";
import { auth } from "../config/firebase.js";

/** In-flight sync so parallel storage calls share one sign-in. */
let syncPromise = null;
/** UID last bridged to Supabase (skip redundant signInWithIdToken). */
let bridgedUid = null;

/**
 * Bridge Firebase session to Supabase so Storage RLS sees an authenticated user.
 * Requires Firebase enabled under Supabase Dashboard → Authentication → Providers.
 * @returns {Promise<import("@supabase/supabase-js").Session | null>}
 */
export async function ensureSupabaseSession() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be signed in to access storage.");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user?.id === user.uid && bridgedUid === user.uid) {
    return sessionData.session;
  }

  if (syncPromise) {
    return syncPromise;
  }

  syncPromise = bridgeFirebaseUser(user).finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

/**
 * @param {import("firebase/auth").User} user
 */
async function bridgeFirebaseUser(user) {
  const idToken = await user.getIdToken();

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "firebase",
    token: idToken,
  });

  if (error) {
    bridgedUid = null;
    console.warn("Supabase Firebase auth bridge failed:", error.message);
    return null;
  }

  bridgedUid = user.uid;
  return data.session;
}

/** Clear Supabase session on app logout. */
export async function signOutSupabase() {
  bridgedUid = null;
  syncPromise = null;
  await supabase.auth.signOut();
}
