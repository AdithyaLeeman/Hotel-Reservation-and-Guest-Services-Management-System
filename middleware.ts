import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getIronSession, nextProxyCookies } from 'iron-session';
import type { SessionData } from '@/types/session';
import { sessionOptions } from '@/lib/auth/session';


const PUBLIC_EXACT: readonly string[] = [
  '/',
  '/search',
  '/guest/login',
  '/guest/register',
  '/staff/login',
];

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
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/|api/).*)',
  ],
};
