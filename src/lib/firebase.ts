import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Analytics only when explicitly needed (reduces automatic API calls)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const analytics: any = null;

// Only initialize analytics when user consents or when you need it
// Comment out or remove if you don't need Firebase Analytics
// if (typeof window !== 'undefined') {
//     try {
//         analytics = getAnalytics(app);
//     } catch (error) {
//         console.warn('Analytics not available:', error);
//     }
// }

export const getAnalyticsInstance = () => analytics;
