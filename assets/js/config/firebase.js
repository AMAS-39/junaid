import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDy3INU0WmDO5ch-pu2iWvPTJYOwS79kpQ",
  authDomain: "junaid-2d4e6.firebaseapp.com",
  projectId: "junaid-2d4e6",
  storageBucket: "junaid-2d4e6.firebasestorage.app",
  messagingSenderId: "183479671250",
  appId: "1:183479671250:web:dbe97fbc1e3b8b45f2900b",
  measurementId: "G-NFRWX8RQSD",
};

const app = initializeApp(firebaseConfig);
const secondaryApp = initializeApp(firebaseConfig, "secondary");

export const auth = getAuth(app);
export const secondaryAuth = getAuth(secondaryApp);
export const db = getFirestore(app);
