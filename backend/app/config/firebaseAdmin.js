// Firebase Admin singleton bootstrap (skeleton only).
// This keeps all firebase-admin wiring in one place so the rest of the
// codebase can depend on a thin, stable interface.

import dotenv from "dotenv";

dotenv.config();

let firebaseAdminApp = null;

/**
 * Returns a firebase-admin app instance.
 * Implementation TODO: load FIREBASE_SERVICE_ACCOUNT from env and initialize
 * firebase-admin here. For now this safely returns null so callers can
 * gracefully no-op when Firebase is not configured.
 */
export const getFirebaseAdminApp = () => {
  if (firebaseAdminApp) return firebaseAdminApp;

  // TODO: Wire up firebase-admin here using FIREBASE_SERVICE_ACCOUNT.
  // Example shape (pseudocode):
  //
  //   const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  //   firebaseAdminApp = admin.initializeApp({
  //     credential: admin.credential.cert(serviceAccount),
  //     databaseURL: process.env.FIREBASE_DATABASE_URL,
  //   });
  //
  // For the current skeleton, we intentionally avoid throwing if env
  // variables are missing, so that location updates never break.

  return null;
};

/**
 * Returns a Firebase Realtime Database instance when available.
 * Will return null until firebase-admin is fully wired.
 */
export const getFirebaseRealtimeDb = () => {
  const app = getFirebaseAdminApp();
  if (!app) return null;

  // TODO: Uncomment when firebase-admin is installed and configured.
  // return admin.database(app);

  return null;
};

