import { onValue, ref } from "firebase/database";
import { getRealtimeDb } from "../firebase/client";

export const subscribeToOrderLocation = (orderId, handler) => {
  if (!orderId || typeof handler !== "function") return () => {};

  const db = getRealtimeDb();
  if (!db) {
    console.warn("[tracking] Realtime DB not available; location subscription is disabled.");
    return () => {};
  }

  const r = ref(db, `/orders/${orderId}/rider`);
  const off = onValue(r, (snap) => {
    const val = snap.val();
    if (val) handler(val);
  });

  return () => off();
};

export const subscribeToOrderTrail = (orderId, handler) => {
  if (!orderId || typeof handler !== "function") return () => {};

  const db = getRealtimeDb();
  if (!db) {
    console.warn("[tracking] Realtime DB not available; trail subscription is disabled.");
    return () => {};
  }

  const r = ref(db, `/orders/${orderId}/trail`);
  const off = onValue(r, (snap) => {
    const raw = snap.val() || {};
    const points = Object.values(raw);
    handler(points);
  });

  return () => off();
};

