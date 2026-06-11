/**
 * @param {unknown} error
 * @returns {string}
 */
export function formatFirestoreError(error) {
  const code =
    error && typeof error === "object" && "code" in error ? String(error.code) : "";

  if (code === "permission-denied") {
    return "Permission denied. Deploy firebase/firestore.rules in Firebase Console → Firestore → Rules.";
  }
  if (code === "failed-precondition") {
    return "Database index required. Open the browser console and click the Firebase index link.";
  }

  if (error && typeof error === "object" && "message" in error && error.message) {
    return String(error.message);
  }

  return "Database operation failed. Please try again.";
}
