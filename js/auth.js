// ============================================================
//  auth.js — Firebase Authentication
//  Handles: Google login, Email/Password login, signup, logout
//  Import this in every page that needs auth awareness
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

// ── Reuse the app already initialized by firebase-config.js ──
// This prevents "Firebase App named '[DEFAULT]' already exists" error
const app      = getApps().length ? getApp() : initializeApp({
  apiKey: "AIzaSyDK-4CuEL3NqHEwTqV-StBURFS6VMQJOH0",
  authDomain: "herbclass-a2c57.firebaseapp.com",
  projectId: "herbclass-a2c57",
  storageBucket: "herbclass-a2c57.firebasestorage.app",
  messagingSenderId: "724947081379",
  appId: "1:724947081379:web:0455e788675d5b0a8bc716",

});
const auth     = getAuth(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();

// ── Save/update user profile in Firestore ──
async function saveUserProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // First time — create profile
    await setDoc(ref, {
      uid:         user.uid,
      displayName: user.displayName || "",
      email:       user.email,
      photoURL:    user.photoURL || "",
      createdAt:   serverTimestamp(),
      lastLogin:   serverTimestamp(),
    });
  } else {
    // Update last login
    await setDoc(ref, { lastLogin: serverTimestamp() }, { merge: true });
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
export async function signUpWithEmail(name, email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: name });
  await saveUserProfile({ ...result.user, displayName: name });
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
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ── Get current user ──
export function getCurrentUser() {
  return auth.currentUser;
}

export { auth, db };