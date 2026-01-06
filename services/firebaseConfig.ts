/**
 * Firebase Configuration
 * 
 * Configure your Firebase project credentials in .env file:
 * VITE_FIREBASE_API_KEY=your-api-key
 * VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
 * VITE_FIREBASE_PROJECT_ID=your-project-id
 * VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
 * VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
 * VITE_FIREBASE_APP_ID=your-app-id;
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase is configured
export const isFirebaseConfigured = (): boolean => {
    return !!(
        firebaseConfig.apiKey &&
        firebaseConfig.projectId &&
        firebaseConfig.apiKey !== 'undefined'
    );
};

// Initialize Firebase only if configured
let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured()) {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);

        // Enable offline persistence for Firestore
        enableIndexedDbPersistence(db).catch((err) => {
            if (err.code === 'failed-precondition') {
                // Multiple tabs open, persistence can only be enabled in one tab at a time
                console.warn('Firebase persistence failed: Multiple tabs open');
            } else if (err.code === 'unimplemented') {
                // The current browser does not support offline persistence
                console.warn('Firebase persistence not supported in this browser');
            }
        });

        console.log('✅ Firebase initialized successfully');
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
    }
} else {
    console.log('ℹ️ Firebase not configured - running in local-only mode');
}

export { app, db };
export default db;
