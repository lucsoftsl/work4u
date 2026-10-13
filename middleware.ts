import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const isAuthed = req.cookies.get('work4u_auth')?.value === '1';

    // Prevent accessing signin/signup when authenticated
    // /signup is not redirected: signed-in users with unfinished onboarding must be able to resume it.
    if (isAuthed && pathname === '/signin' && !req.nextUrl.searchParams.has('redirect')) {
        const url = req.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/signin'],
};
