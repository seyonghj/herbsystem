// ============================================================
//  REPLACE these values with your actual Firebase project config
//  Firebase Console → Project Settings → Your Apps → SDK setup
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, doc, query, where, orderBy }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "👍",
  authDomain: "herbclass-a2c57.firebaseapp.com",
  projectId: "herbclass-a2c57",
  storageBucket: "herbclass-a2c57.firebasestorage.app",
  messagingSenderId: "724947081379",
  appId: "1:724947081379:web:0455e788675d5b0a8bc716",
};

const app     = initializeApp(firebaseConfig);
const db      = getFirestore(app);
const storage = getStorage(app);

export { db, storage, collection, getDocs, getDoc, doc, query, where, orderBy };
