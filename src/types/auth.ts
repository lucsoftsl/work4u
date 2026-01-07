import { User as FirebaseUser, UserCredential } from 'firebase/auth';

export interface AuthUser {
    id: string;
    email: string | null;
    displayName: string | null;
    photoUrl: string | null;
    phoneNumber: string | null;
    status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'PENDING_DELETION';
    userType: 'PERSONAL' | 'ENTERPRISE' | 'ADMIN';
    workerTypes: ('WORKER' | 'REQUESTOR')[];
    country?: string | null;
    state?: string | null;
    address?: string | null;
    city?: string | null;
    postcode?: string | null;
    number?: string | null;
    token?: string;
}

export interface SignUpData {
    email: string;
    password: string;
    displayName: string;
    userType: 'PERSONAL' | 'ENTERPRISE' | 'ADMIN';
    workerTypes: ('WORKER' | 'REQUESTOR')[];
    country?: string;
    state?: string;
    address?: string;
    city?: string;
    postcode?: string;
    number?: string;
}

export interface SignInData {
    email: string;
    password: string;
}

export interface ApiUser {
    id: string;
    email: string;
    status: string;
    userType: string;
    dateTimeCreated: string;
    dateTimeUpdated: string;
    displayName?: string;
    photoUrl?: string;
    phoneNumber?: string;
    // Worker types for the user; API returns array or comma-separated string
    workerTypes?: string[] | string;
    country?: string | null;
    state?: string | null;
    address?: string | null;
    city?: string | null;
    postcode?: string | null;
    number?: string | null;
}
