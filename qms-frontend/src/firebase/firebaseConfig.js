/**
 * Firebase Config Stub
 * Firebase has been replaced with a REST API backend.
 */

export const firebaseConfig = {};

export const appConfig = {
  appId: 'qms-app',
  appName: 'PDI Quality',
  appVersion: '2.0.0',
  features: {
    pdfGeneration: true,
    imageUpload: true,
    consoleLogs: true,
    errorBoundary: true
  },
  limits: {
    maxFileSizeMB: 50,
    maxImageSizeMB: 5
  }
};

export function assertConfigOrExplain() {
  // Always return ok since we're not using Firebase anymore
  return { ok: true };
}
