/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from './firebase';
import type { SignUpData, SignInData, AuthUser, ApiUser } from '../types/auth';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
} from 'firebase/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function parseAddress(addressValue?: string | null) {
    if (!addressValue) {
        return { country: null, state: null, addressLine: null, city: null, postcode: null, number: null };
    }
    try {
        const parsed = JSON.parse(addressValue);
        return {
            country: parsed.country ?? null,
            state: parsed.state ?? null,
            addressLine: parsed.address ?? null,
            city: parsed.city ?? null,
            postcode: parsed.postcode ?? null,
            number: parsed.number ?? null,
        };
    } catch {
        return { country: null, state: null, addressLine: addressValue, city: null, postcode: null, number: null };
    }
}

async function setLoggedInStateApi(userId: string, token: string, loggedInData: Record<string, any>): Promise<void> {
    try {
        const response = await fetch(`${API_URL}/api/users/${userId}/login-state`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ loggedInData }),
        });

        if (!response.ok) {
            const bodyText = await response.text().catch(() => '');
            throw new Error(`Failed to set logged-in state: ${response.status} ${response.statusText} ${bodyText}`.trim());
        }
    } catch (error) {
        console.warn('Failed to sync logged-in state:', error);
    }
}

async function clearLoggedInStateApi(userId: string, token: string): Promise<void> {
    try {
        const response = await fetch(`${API_URL}/api/users/${userId}/login-state`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const bodyText = await response.text().catch(() => '');
            throw new Error(`Failed to clear logged-in state: ${response.status} ${response.statusText} ${bodyText}`.trim());
        }
    } catch (error) {
        console.warn('Failed to clear logged-in state:', error);
    }
}

function buildLoggedInData(loginMethod: string, extraData?: Record<string, any>) {
    return {
        loginMethod,
        loggedInAt: new Date().toISOString(),
        pageUrl: typeof window !== 'undefined' ? window.location.href : null,
        pagePath: typeof window !== 'undefined' ? window.location.pathname : null,
        referrer: typeof window !== 'undefined' ? document.referrer : null,
        deviceType: getDeviceType(),
        browserName: getBrowserName(),
        osName: getOSName(),
        ...extraData,
    };
}

/**
 * Get Firebase ID token for API calls
 */
export async function getIdToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    return await user.getIdToken();
}

/**
 * Sign up new user with Firebase and create user record in backend
 */
export async function signUp(data: SignUpData): Promise<AuthUser> {
    try {
        // 1. Create Firebase user
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const firebaseUser = userCredential.user;

        // 2. Get Firebase ID token
        const token = await firebaseUser.getIdToken();

        // 3. Create user record in backend (basic fields only)
        const response = await fetch(`${API_URL}/api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                email: data.email,
                displayName: data.displayName,
                userType: data.userType,
            }),
        });

        if (!response.ok) {
            throw new Error(`Backend error: ${response.statusText}`);
        }

        await response.json();

        // 4. Patch full workerTypes as array of strings
        if (Array.isArray(data.workerTypes)) {
            try {
                await updateUserProfile(firebaseUser.uid, { workerTypes: data.workerTypes });
            } catch (err) {
                console.warn('Failed to patch workerTypes on signup:', err);
            }
        }

        // 5. Track signup event in backend
        try {
            await trackEvent('user_signup', {
                userType: data.userType,
                workerTypes: data.workerTypes,
            });
        } catch (error) {
            console.warn('Failed to track signup event:', error);
        }

        await setLoggedInStateApi(firebaseUser.uid, token, buildLoggedInData('password_signup', {
            userType: data.userType,
            workerTypes: data.workerTypes,
        }));

        return {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: data.displayName,
            photoUrl: firebaseUser.photoURL,
            phoneNumber: firebaseUser.phoneNumber,
            status: 'PENDING_VERIFICATION',
            userType: data.userType,
            workerTypes: data.workerTypes,
            country: null,
            state: null,
            address: null,
            postcode: null,
            number: null,
            token,
        };
    } catch (error) {
        console.error('Sign up failed:', error);
        throw error;
    }
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(): Promise<AuthUser> {
    try {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        const firebaseUser = userCredential.user;

        // Get Firebase ID token
        const token = await firebaseUser.getIdToken();

        // Check if user exists in backend
        const response = await fetch(`${API_URL}/api/users/${firebaseUser.uid}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            // Existing user - return their profile
            const apiUser: ApiUser = await response.json();

            const parsedAddress = parseAddress(apiUser.address as any);

            // Get worker types from profile; handle array or CSV string
            let workerTypes: string[] = [];
            if (Array.isArray(apiUser.workerTypes)) {
                workerTypes = apiUser.workerTypes as string[];
            } else if (typeof apiUser.workerTypes === 'string') {
                workerTypes = apiUser.workerTypes
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean);
            }

            // Track login event
            try {
                await trackEvent('user_login', { method: 'google' });
            } catch (error) {
                console.warn('Failed to track login event:', error);
            }

            await setLoggedInStateApi(firebaseUser.uid, token, buildLoggedInData('google_signin', {
                userType: apiUser.userType,
                workerTypes,
            }));

            return {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: apiUser.displayName || firebaseUser.displayName,
                photoUrl: apiUser.photoUrl || firebaseUser.photoURL,
                phoneNumber: apiUser.phoneNumber || firebaseUser.phoneNumber,
                status: apiUser.status as any,
                userType: apiUser.userType as any,
                workerTypes: workerTypes as any,
                country: parsedAddress.country,
                state: parsedAddress.state,
                address: apiUser.address ?? null,
                city: parsedAddress.city,
                postcode: parsedAddress.postcode,
                number: parsedAddress.number,
                token,
            };
        } else {
            // New user - return partial profile, frontend will need to complete registration
            throw new Error('USER_NOT_FOUND');
        }
    } catch (error) {
        console.error('Google sign in failed:', error);
        throw error;
    }
}

/**
 * Sign up with Google OAuth (for new users)
 */
export async function signUpWithGoogle(userType: 'PERSONAL' | 'ENTERPRISE', workerTypes: Array<'WORKER' | 'REQUESTOR'>): Promise<AuthUser> {
    try {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        const firebaseUser = userCredential.user;

        // Get Firebase ID token
        const token = await firebaseUser.getIdToken();

        // Create user record in backend (basic fields only)
        const response = await fetch(`${API_URL}/api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                userType,
            }),
        });

        if (!response.ok) {
            throw new Error(`Backend error: ${response.statusText}`);
        }

        await response.json();

        // Patch full workerTypes as array of strings
        try {
            await updateUserProfile(firebaseUser.uid, { workerTypes: workerTypes });
        } catch (err) {
            console.warn('Failed to patch workerTypes on Google signup:', err);
        }

        // Track signup event
        try {
            await trackEvent('user_signup', {
                method: 'google',
                userType,
                workerTypes,
            });
        } catch (error) {
            console.warn('Failed to track signup event:', error);
        }

        await setLoggedInStateApi(firebaseUser.uid, token, buildLoggedInData('google_signup', {
            userType,
            workerTypes,
        }));

        return {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoUrl: firebaseUser.photoURL,
            phoneNumber: firebaseUser.phoneNumber,
            status: 'PENDING_VERIFICATION',
            userType,
            workerTypes,
            country: null,
            state: null,
            address: null,
            postcode: null,
            number: null,
            token,
        };
    } catch (error) {
        console.error('Google sign up failed:', error);
        throw error;
    }
}

/**
 * Sign in existing user
 */
export async function signIn(data: SignInData): Promise<AuthUser> {
    try {
        // 1. Sign in with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
        const firebaseUser = userCredential.user;

        // 2. Get Firebase ID token
        const token = await firebaseUser.getIdToken();

        // 3. Get user profile from backend
        const response = await fetch(`${API_URL}/api/users/${firebaseUser.uid}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch user profile: ${response.statusText}`);
        }

        const apiUser: ApiUser = await response.json();

        const parsedAddress = parseAddress(apiUser.address as any);

        // 4. Get worker types from profile; handle array or CSV string
        let workerTypes: string[] = [];
        if (Array.isArray(apiUser.workerTypes)) {
            workerTypes = apiUser.workerTypes as string[];
        } else if (typeof apiUser.workerTypes === 'string') {
            workerTypes = apiUser.workerTypes
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
        }

        // 5. Track login event
        try {
            await trackEvent('user_login', {});
        } catch (error) {
            console.warn('Failed to track login event:', error);
        }

        await setLoggedInStateApi(firebaseUser.uid, token, buildLoggedInData('password_signin', {
            userType: apiUser.userType,
            workerTypes,
        }));

        return {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: apiUser.displayName || firebaseUser.displayName,
            photoUrl: apiUser.photoUrl || firebaseUser.photoURL,
            phoneNumber: apiUser.phoneNumber || firebaseUser.phoneNumber,
            status: apiUser.status as any,
            userType: apiUser.userType as any,
            workerTypes: workerTypes as any,
            country: parsedAddress.country,
            state: parsedAddress.state,
            address: apiUser.address ?? null,
            city: parsedAddress.city,
            postcode: parsedAddress.postcode,
            number: parsedAddress.number,
            token,
        };
    } catch (error) {
        console.error('Sign in failed:', error);
        throw error;
    }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
    const currentUser = auth.currentUser;
    const userId = currentUser?.uid || null;
    const token = currentUser ? await currentUser.getIdToken() : null;

    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error('Sign out failed:', error);
        throw error;
    }

    if (userId && token) {
        await clearLoggedInStateApi(userId, token);
    }
}

/**
 * Get current user
 */
export function getCurrentUser(): Promise<AuthUser | null> {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            unsubscribe();

            if (!firebaseUser) {
                resolve(null);
                return;
            }

            try {
                const token = await firebaseUser.getIdToken();

                // Get user profile from backend
                const response = await fetch(`${API_URL}/api/users/${firebaseUser.uid}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    resolve(null);
                    return;
                }

                const apiUser: ApiUser = await response.json();

                const parsedAddress = parseAddress(apiUser.address as any);

                // Get worker types from profile; handle array or CSV string
                let workerTypes: string[] = [];
                if (Array.isArray(apiUser.workerTypes)) {
                    workerTypes = apiUser.workerTypes as string[];
                } else if (typeof apiUser.workerTypes === 'string') {
                    workerTypes = apiUser.workerTypes
                        .split(',')
                        .map(s => s.trim())
                        .filter(Boolean);
                }

                resolve({
                    id: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: apiUser.displayName || firebaseUser.displayName,
                    photoUrl: apiUser.photoUrl || firebaseUser.photoURL,
                    phoneNumber: apiUser.phoneNumber || firebaseUser.phoneNumber,
                    status: apiUser.status as any,
                    userType: apiUser.userType as any,
                    workerTypes: workerTypes as any,
                    country: parsedAddress.country,
                    state: parsedAddress.state,
                    address: apiUser.address ?? null,
                    city: parsedAddress.city,
                    postcode: parsedAddress.postcode,
                    number: parsedAddress.number,
                    token,
                });
            } catch (error) {
                console.error('Failed to get current user:', error);
                resolve(null);
            }
        }, reject);
    });
}

/**
 * Update user profile
 */
export async function updateUserProfile(
    userId: string,
    data: Partial<{
        displayName: string;
        photoUrl: string;
        phoneNumber: string;
        userType: string;
        workerTypes: string[];
        address?: string | null;
    }>
): Promise<ApiUser> {
    const token = await getIdToken();

    const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.statusText}`);
    }

    return response.json();
}

// Note: worker-type endpoints are deprecated; use user PATCH with 'workerTypes'.

/**
 * Track analytics event via backend
 */
export async function trackEvent(
    eventName: string,
    eventData?: Record<string, any>
): Promise<void> {
    try {
        const user = auth.currentUser;
        const userId = user?.uid || null;

        // Gather client-side context
        const payload: any = {
            userId,
            sessionId: getSessionId(),
            eventType: 'user_action',
            eventName,
            eventData: eventData || {},

            // Page context
            pageUrl: typeof window !== 'undefined' ? window.location.href : null,
            pagePath: typeof window !== 'undefined' ? window.location.pathname : null,
            pageTitle: typeof window !== 'undefined' ? document.title : null,
            referrer: typeof window !== 'undefined' ? document.referrer : null,

            // Device info (basic client-side detection)
            deviceType: getDeviceType(),
            browserName: getBrowserName(),
            osName: getOSName(),
        };

        const response = await fetch(`${API_URL}/api/analytics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.warn(`Failed to track event: ${response.statusText}`);
        }
    } catch (error) {
        console.warn('Error tracking event:', error);
    }
}

/**
 * Get or create session ID (stored in sessionStorage)
 */
function getSessionId(): string {
    if (typeof window === 'undefined') return 'server';

    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
}

/**
 * Detect device type
 */
function getDeviceType(): string {
    if (typeof window === 'undefined') return 'unknown';

    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'mobile';
    }
    return 'desktop';
}

/**
 * Detect browser name
 */
function getBrowserName(): string {
    if (typeof window === 'undefined') return 'unknown';

    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    return 'unknown';
}

/**
 * Detect OS name
 */
function getOSName(): string {
    if (typeof window === 'undefined') return 'unknown';

    const ua = navigator.userAgent;
    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'unknown';
}
