// Central Firebase write layer for live delivery tracking (skeleton only).
// All backend code should talk to Firebase through this file so that:
// - the data model stays consistent across services, and
// - we can swap underlying storage (RTDB vs Firestore) without touching controllers.

import { getFirebaseRealtimeDb } from "../config/firebaseAdmin.js";

/**
 * Derives canonical RTDB paths for tracking.
 * These are intentionally simple so they can be reused by web / Flutter clients.
 */
export const trackingPaths = {
  deliveryCurrent: (deliveryId) => `/deliveries/${deliveryId}/current`,
  orderRider: (orderId) => `/orders/${orderId}/rider`,
  orderTrail: (orderId) => `/orders/${orderId}/trail`,
  fleetActive: (deliveryId) => `/fleet/active/${deliveryId}`,
};

/**
 * Writes the latest delivery snapshot:
 * - /deliveries/{deliveryId}/current
 * - /orders/{orderId}/rider            (when orderId is present)
 * - /fleet/active/{deliveryId}         (admin-friendly summary)
 *
 * NOTE: This is a skeleton. Until firebase-admin is configured,
 * this function will safely no-op and just echo the payload.
 */
export const writeDeliveryLocation = async (deliveryId, orderId, snapshot) => {
  try {
    const db = getFirebaseRealtimeDb();
    if (!db) {
      // Firebase is not configured yet; keep the request pipeline non-breaking.
      return { deliveryId, orderId, snapshot, skipped: true };
    }

    const updates = {};
    updates[trackingPaths.deliveryCurrent(deliveryId)] = snapshot;
    updates[trackingPaths.fleetActive(deliveryId)] = {
      lat: snapshot.lat,
      lng: snapshot.lng,
      orderId: snapshot.orderId || null,
      status: snapshot.status || "unknown",
      lastUpdatedAt: snapshot.lastUpdatedAt,
    };

    if (orderId) {
      updates[trackingPaths.orderRider(orderId)] = snapshot;
    }

    // TODO: Uncomment when firebase-admin RTDB is wired:
    // await db.ref().update(updates);

    return { deliveryId, orderId, snapshot };
  } catch (err) {
    // Swallow errors here so location updates don't fail
    console.error("writeDeliveryLocation error (stub):", err.message);
    return null;
  }
};

/**
 * Appends a new trail point for an order:
 * - /orders/{orderId}/trail/{autoId}
 *
 * Point shape:
 *   { lat: number, lng: number, t: epochMillis }
 *
 * NOTE: This is a skeleton. It will behave as a safe no-op until
 * firebase-admin is properly configured.
 */
export const appendTrailPoint = async (orderId, point) => {
  try {
    const db = getFirebaseRealtimeDb();
    if (!db) {
      return { orderId, point, skipped: true };
    }

    // TODO: Uncomment when firebase-admin RTDB is wired:
    // await db.ref(trackingPaths.orderTrail(orderId)).push(point);

    return { orderId, point };
  } catch (err) {
    console.error("appendTrailPoint error (stub):", err.message);
    return null;
  }
};
