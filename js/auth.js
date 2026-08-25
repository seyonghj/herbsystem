// ============================================================
//  auth.js — Firebase Authentication
//  Handles: Google login, Email/Password login, signup, logout
// ============================================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const app = getApps().length ? getApp() : initializeApp({
  apiKey:            "AIzaSyDK-4CuEL3NqHEwTqV-StBURFS6VMQJOH0",
  authDomain:        "herbclass-a2c57.firebaseapp.com",
  projectId:         "herbclass-a2c57",
  storageBucket:     "herbclass-a2c57.firebasestorage.app",
  messagingSenderId: "724947081379",
  appId:             "1:724947081379:web:0455e788675d5b0a8bc716",
});

const auth     = getAuth(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();

// ── Save/update user profile in Firestore ──
// FIX 1: Always write to Firestore on every login using merge:true
// FIX 2: Accept optional overrides (for signUp where displayName is new)
async function saveUserProfile(user, overrides = {}) {
  try {
    const ref      = doc(db, "users", user.uid);
    const isGoogle = user.providerData?.some(p => p.providerId === "google.com") ?? false;

    // Check if doc exists to preserve createdAt
    const snap = await getDoc(ref);

    const data = {
      uid:         user.uid,
      displayName: overrides.displayName || user.displayName || "",
      email:       overrides.email       || user.email       || "",
      photoURL:    overrides.photoURL    || user.photoURL    || "",
      provider:    isGoogle ? "google" : "email",
      lastLogin:   serverTimestamp(),
      blocked:     false,
    };

    // Only set createdAt if this is the first time
    if (!snap.exists()) {
      data.createdAt = serverTimestamp();
    }

    // merge:true so we never accidentally overwrite existing fields
    await setDoc(ref, data, { merge: true });

  } catch(e) {
    // Don't crash the login flow if Firestore save fails
    console.warn("saveUserProfile failed:", e.message);
  }
}

// ── Google Sign-In ──
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  await saveUserProfile(result.user);
  return result.user;
}

// ── Email Sign-In ──
export async function signInWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  await saveUserProfile(result.user);
  return result.user;
}

// ── Email Sign-Up ──
// FIX 3: Pass displayName as override — spread on Firebase user object doesn't work
export async function signUpWithEmail(name, email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: name });
  // Pass name as override since updateProfile is async and
  // result.user.displayName may not be updated yet at this point
  await saveUserProfile(result.user, { displayName: name });
  return result.user;
}

// ── Sign Out ──
export async function logOut() {
  await signOut(auth);
}

// ── Reset Password ──
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ── Auth state listener ──
// FIX 4: Also save profile on every auth state change
// This catches users who are already logged in when the page loads
// AND syncs existing Auth users who never got a Firestore doc
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Save/update Firestore profile on every page load while logged in
      await saveUserProfile(user);
    }
    callback(user);
  });
}

// ── Get current user ──
export function getCurrentUser() {
  return auth.currentUser;
}

export { auth, db };