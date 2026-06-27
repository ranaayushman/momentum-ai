import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { firebaseConfig } from './config';

let app: FirebaseApp;

// Implement singleton initialization to avoid duplicate initialization errors during Next.js hot-reloads and SSR
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export { app };
export type { FirebaseApp };
