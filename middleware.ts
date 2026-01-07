import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const isAuthed = req.cookies.get('work4u_auth')?.value === '1';

    // Prevent accessing signin/signup when authenticated
    if (isAuthed && (pathname === '/signin' || pathname === '/signup')) {
        const url = req.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/signin', '/signup'],
};
