/**
 * Firebase Stub - Provides mock implementations during migration
 * All functionality has moved to REST API via AppContext
 */

export const auth = {
  currentUser: null,
  onAuthStateChanged: (callback) => {
    callback(null);
    return () => {};
  },
};

export const db = {};
export const storage = {};
export const appId = 'qms-app';

console.warn('Firebase is disabled. Use AppContext for all data operations.');

