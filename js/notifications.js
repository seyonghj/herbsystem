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
  serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── db is passed in by the caller (feed.html already has it) ──
// This avoids the getApp() timing issue where notifications.js
// tries to call getFirestore() before firebase-config.js has run.

export async function createNotification(db, {
  toUid,
  fromUid,
  fromName,
  fromPhoto,
  type,
  postId,
  postSnippet,
  commentId,
  replyId,
  text,
}) {
  if (!toUid || toUid === fromUid) return;
  try {
    await addDoc(collection(db, 'notifications', toUid, 'items'), {
      toUid, fromUid,
      fromName:    fromName    || 'Someone',
      fromPhoto:   fromPhoto   || null,
      type,
      postId:      postId      || null,
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

export function listenNotifications(db, uid, onUpdate) {
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
  }, err => {
    console.warn('listenNotifications error:', err.message);
  });
}

export async function markAllRead(db, uid) {
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

export async function markRead(db, uid, notifId) {
  try {
    await updateDoc(doc(db, 'notifications', uid, 'items', notifId), { read: true });
  } catch(e) {
    console.warn('markRead failed:', e.message);
  }
}

export function notifIcon(type) {
  return {
    like:    'ti-heart',
    comment: 'ti-message-circle',
    reply:   'ti-message-reply',
    mention: 'ti-at',
    share:   'ti-share',
  }[type] || 'ti-bell';
}

export function notifColor(type) {
  return {
    like:    '#e53e3e',
    comment: '#22a06b',
    reply:   '#1a7a55',
    mention: '#7c3aed',
    share:   '#2563eb',
  }[type] || '#22a06b';
}

export function notifMessage(n) {
  const name = n.fromName || 'Someone';
  return {
    like:    `${name} liked your post`,
    comment: `${name} commented on your post`,
    reply:   `${name} replied to your comment`,
    mention: `${name} mentioned you`,
    share:   `${name} shared your post`,
  }[n.type] || `${name} interacted with your post`;
}
