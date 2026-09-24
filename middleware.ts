import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Next.js middleware — route protection and session enforcement.
 *
 * Owned by: Member 1 (M1) | Implemented in: P01-M01-T20
 *
 * Rules:
 * - /guest/* routes: require role = 'Guest' in session
 * - /staff/* routes: require any staff role (Receptionist/Manager/Admin)
 * - /staff/reports/* and /staff/admin/*: require Manager or Admin
 * - Public routes (/search, /guest/login, /guest/register, /staff/login): no auth
 *
 * Implementation note (P01-M01-T20):
 * - Read iron-session cookie from the request headers
 * - Verify session is valid and contains required role
 * - Return 401 redirect to login for missing session
 * - Return 403 for wrong role
 *
 * See docs/11_security-and-rbac.md for the full RBAC matrix.
 * Lecture alignment: L07 (RBAC, application security)
 *
 * TODO (P01-M01-T20): Implement with iron-session. Current stub passes all requests.
 */

const PUBLIC_PATHS = [
  '/',
  '/search',
  '/guest/login',
  '/guest/register',
  '/staff/login',
];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // TODO (P01-M01-T20): Replace this stub with real iron-session validation.
  // Until implemented, all routes pass through (development only).
  // The real implementation must:
  //   1. Read SESSION_COOKIE_NAME from the request
  //   2. Decrypt with iron-session using sessionOptions
  //   3. Check session.role against the required role for the route
  //   4. Redirect to login if unauthenticated, return 403 if wrong role

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public/ directory files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
