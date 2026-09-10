// ============================================================
//  notifications.js
//  Handles creating, reading, and real-time listening to
//  notifications stored in Firestore under /notifications/{uid}/items/{id}
//
//  Notification types:
//    like      — someone liked your post
//    comment   — someone commented on your post
//    reply     — someone replied to your comment
//    share     — someone shared your post to community
//    mention   — someone @mentioned you in a comment or reply
// ============================================================

import {
  collection, addDoc, query, orderBy, limit,
  onSnapshot, updateDoc, doc, where, getDocs,
  serverTimestamp, writeBatch, getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

const db = getFirestore(getApp());

// ── Create a notification ─────────────────────────────────
// Called whenever a like/comment/reply/mention/share happens.
// Does nothing if the target user is the same as the actor
// (you don't notify yourself).

export async function createNotification({
  toUid,          // uid of the user being notified
  fromUid,        // uid of the user who triggered it
  fromName,       // display name of the actor
  fromPhoto,      // photoURL of the actor (nullable)
  type,           // 'like' | 'comment' | 'reply' | 'mention' | 'share'
  postId,         // always included so the UI can deep-link
  postSnippet,    // short preview of the post caption (optional)
  commentId,      // included for comment/reply/mention
  replyId,        // included for reply
  text,           // the comment/reply text that triggered this (optional)
}) {
  if (!toUid || toUid === fromUid) return;   // no self-notifications

  try {
    await addDoc(collection(db, 'notifications', toUid, 'items'), {
      toUid, fromUid, fromName, fromPhoto: fromPhoto || null,
      type, postId,
      postSnippet: postSnippet ? postSnippet.slice(0, 80) : null,
      commentId:   commentId   || null,
      replyId:     replyId     || null,
      text:        text        ? text.slice(0, 120) : null,
      read:        false,
      createdAt:   serverTimestamp(),
    });
  } catch(e) {
    console.warn('createNotification failed:', e.message);
  }
}

// ── Real-time listener ────────────────────────────────────
// Calls onUpdate(notifications, unreadCount) whenever new
// notifications arrive for the given uid.
// Returns the unsubscribe function.

export function listenNotifications(uid, onUpdate) {
  const q = query(
    collection(db, 'notifications', uid, 'items'),
    orderBy('createdAt', 'desc'),
    limit(30)
  );
  return onSnapshot(q, snap => {
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    const unread = items.filter(n => !n.read).length;
    onUpdate(items, unread);
  });
}

// ── Mark all as read ──────────────────────────────────────
export async function markAllRead(uid) {
  try {
    const q    = query(
      collection(db, 'notifications', uid, 'items'),
      where('read', '==', false),
      limit(30)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  } catch(e) {
    console.warn('markAllRead failed:', e.message);
  }
}

// ── Mark single notification read ─────────────────────────
export async function markRead(uid, notifId) {
  try {
    await updateDoc(doc(db, 'notifications', uid, 'items', notifId), { read: true });
  } catch(e) {
    console.warn('markRead failed:', e.message);
  }
}

// ── Notification label helpers ────────────────────────────
export function notifIcon(type) {
  const icons = {
    like:    'ti-heart',
    comment: 'ti-message-circle',
    reply:   'ti-message-reply',
    mention: 'ti-at',
    share:   'ti-share',
  };
  return icons[type] || 'ti-bell';
}

export function notifColor(type) {
  const colors = {
    like:    '#e53e3e',
    comment: '#22a06b',
    reply:   '#1a7a55',
    mention: '#7c3aed',
    share:   '#2563eb',
  };
  return colors[type] || '#22a06b';
}

export function notifMessage(n) {
  const name = n.fromName || 'Someone';
  switch(n.type) {
    case 'like':    return `${name} liked your post`;
    case 'comment': return `${name} commented on your post`;
    case 'reply':   return `${name} replied to your comment`;
    case 'mention': return `${name} mentioned you`;
    case 'share':   return `${name} shared your post`;
    default:        return `${name} interacted with your post`;
  }
}
