import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
<<<<<<< HEAD
import { getIronSession, nextProxyCookies } from 'iron-session';
import type { SessionData } from '@/types/session';
import { sessionOptions } from '@/lib/auth/session';


const PUBLIC_EXACT: readonly string[] = [
=======

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
>>>>>>> feat/service-usage-mock
  '/',
  '/search',
  '/guest/login',
  '/guest/register',
  '/staff/login',
];

<<<<<<< HEAD
const PUBLIC_PREFIXES: readonly string[] = [
  '/search/',
];

type RoleRule = {
  prefix: string;
  allowed: Set<SessionData['role']>;
  loginRedirect: string;
};

const ROLE_RULES: readonly RoleRule[] = [
  {
    prefix: '/staff/reports/',
    allowed: new Set(['Manager', 'Admin']),
    loginRedirect: '/staff/login',
  },
  {
    prefix: '/staff/admin/',
    allowed: new Set(['Manager', 'Admin']),
    loginRedirect: '/staff/login',
  },
  {
    prefix: '/staff/',
    allowed: new Set(['Receptionist', 'Manager', 'Admin']),
    loginRedirect: '/staff/login',
  },
  {
    prefix: '/guest/',
    allowed: new Set(['Guest']),
    loginRedirect: '/guest/login',
  },
];

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // 1. Allow exact public paths
  if (PUBLIC_EXACT.includes(pathname)) {
    return NextResponse.next();
  }

  // 2. Allow public prefix paths
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // 3. Find the matching role rule (most specific match wins — rules are ordered)
  const matchedRule = ROLE_RULES.find((rule) => pathname.startsWith(rule.prefix));
  if (!matchedRule) {
    // No rule for this path — allow through (API routes, static, etc.)
    return NextResponse.next();
  }

  // 4. Read session — use nextProxyCookies so cookie writes propagate correctly
  //    (rotation, if ever needed in middleware). Read only here; no save().
  const response = NextResponse.next();

  let session: Awaited<ReturnType<typeof getIronSession<SessionData>>>;
  try {
    session = await getIronSession<SessionData>(
      nextProxyCookies(request, response),
      sessionOptions
    );
  } catch {
    // Decryption failure = treat as unauthenticated
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = matchedRule.loginRedirect;
    return NextResponse.redirect(loginUrl);
  }

  // 5. Unauthenticated — no userId in session
  if (!session.userId || !session.role) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = matchedRule.loginRedirect;
    return NextResponse.redirect(loginUrl);
  }

  // 6. Insufficient role
  if (!matchedRule.allowed.has(session.role)) {
    // Guest trying to hit /staff or staff trying to hit /guest → send to their login
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = matchedRule.loginRedirect;
    return NextResponse.redirect(loginUrl);
  }

  // 7. Authenticated + authorized — pass through
  return response;
=======
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
>>>>>>> feat/service-usage-mock
}

export const config = {
  matcher: [
<<<<<<< HEAD
    '/((?!_next/static|_next/image|favicon.ico|public/|api/).*)',
=======
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public/ directory files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
>>>>>>> feat/service-usage-mock
  ],
};
