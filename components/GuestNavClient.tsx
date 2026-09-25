'use client';

/**
 * GuestNavClient — Interactive client layer for GuestNav.
 *
 * Handles:
 *  - Mobile hamburger menu toggle (ARIA-compliant)
 *  - Dark/light theme toggle (persisted to localStorage as 'skynest-theme')
 *  - Logout form submission
 *
 * Props are injected by the parent GuestNav Server Component which reads
 * the iron-session server-side. NEVER accept isLoggedIn from a query param.
 *
 * Task: P01-M01-T24
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useId } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface GuestNavClientProps {
  isLoggedIn: boolean;
  guestName: string | null;
}

/* ─── Nav links ─────────────────────────────────────────────────────────────── */

const PUBLIC_LINKS = [
  { href: '/search', label: 'Search Rooms' },
] as const;

const GUEST_LINKS = [
  { href: '/guest/reservations', label: 'My Reservations' },
] as const;

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function GuestNavClient({ isLoggedIn, guestName }: GuestNavClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuId = useId();

  /* ── Initialise theme from localStorage on mount ── */
  useEffect(() => {
    const stored = localStorage.getItem('skynest-theme');
    if (stored === 'dark') {
      setIsDark(true);
    } else if (stored === 'light') {
      setIsDark(false);
    } else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  /* ── Close mobile menu on route change ── */
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  /* ── Close menu on Escape key ── */
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [menuOpen]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      const token = next ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', token);
      localStorage.setItem('skynest-theme', token);
      return next;
    });
  }, []);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/guest/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }, [router]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  /* ── Link class helper ── */
  const navLinkClass = (href: string) =>
    [
      'relative px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors duration-[var(--duration-fast)]',
      isActive(href)
        ? 'text-[var(--color-primary)] bg-[var(--color-primary-muted)]'
        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]',
    ].join(' ');

  const mobileLinkClass = (href: string) =>
    [
      'block px-4 py-3 rounded-[var(--radius-lg)] text-sm font-medium transition-colors duration-[var(--duration-fast)]',
      isActive(href)
        ? 'text-[var(--color-primary)] bg-[var(--color-primary-muted)]'
        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]',
    ].join(' ');

  return (
    <header
      id="guest-nav"
      className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md"
    >
      <nav
        aria-label="Guest navigation"
        className="container-page flex h-16 items-center justify-between"
      >
        {/* ── Logo ── */}
        <Link
          id="guest-nav-logo"
          href="/"
          className="flex items-center gap-2 font-semibold text-[var(--color-primary)] text-lg tracking-tight hover:opacity-80 transition-opacity duration-[var(--duration-fast)] no-underline"
          aria-label="SkyNest Hotels — home"
        >
          {/* Diamond icon representing a luxury hotel */}
          <svg
            aria-hidden="true"
            focusable="false"
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="4"
              y="4"
              width="20"
              height="20"
              rx="5"
              fill="hsl(196 80% 30%)"
            />
            <path
              d="M14 7L19 12L14 21L9 12L14 7Z"
              fill="hsl(40 80% 55%)"
            />
          </svg>
          <span>SkyNest Hotels</span>
        </Link>

        {/* ── Desktop Nav Links ── */}
        <div className="hidden md:flex items-center gap-1">
          {PUBLIC_LINKS.map(({ href, label }) => (
            <Link key={href} id={`guest-nav-${label.toLowerCase().replace(/\s+/g, '-')}`} href={href} className={navLinkClass(href)}>
              {label}
            </Link>
          ))}
          {isLoggedIn &&
            GUEST_LINKS.map(({ href, label }) => (
              <Link key={href} id={`guest-nav-${label.toLowerCase().replace(/\s+/g, '-')}`} href={href} className={navLinkClass(href)}>
                {label}
              </Link>
            ))}
        </div>

        {/* ── Desktop Auth Controls ── */}
        <div className="hidden md:flex items-center gap-2">
          {/* Theme toggle */}
          <button
            id="guest-nav-theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="btn btn-ghost btn-sm px-2"
          >
            {isDark ? (
              /* Sun icon */
              <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              /* Moon icon */
              <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {isLoggedIn ? (
            <>
              {guestName && (
                <span
                  id="guest-nav-greeting"
                  className="text-sm text-[var(--color-text-muted)] px-2"
                  aria-label={`Logged in as ${guestName}`}
                >
                  Hi, <span className="font-medium text-[var(--color-text)]">{guestName}</span>
                </span>
              )}
              <button
                id="guest-nav-logout"
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="btn btn-outline btn-sm"
                aria-busy={loggingOut}
              >
                {loggingOut ? <span className="spinner" aria-hidden="true" /> : null}
                {loggingOut ? 'Logging out…' : 'Logout'}
              </button>
            </>
          ) : (
            <>
              <Link id="guest-nav-login" href="/guest/login" className="btn btn-ghost btn-sm">
                Login
              </Link>
              <Link id="guest-nav-register" href="/guest/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </>
          )}
        </div>

        {/* ── Mobile: theme + hamburger ── */}
        <div className="flex md:hidden items-center gap-2">
          <button
            id="guest-nav-theme-toggle-mobile"
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="btn btn-ghost btn-sm px-2"
          >
            {isDark ? (
              <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <button
            id="guest-nav-hamburger"
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="btn btn-ghost btn-sm px-2"
          >
            {menuOpen ? (
              /* X icon */
              <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              /* Hamburger icon */
              <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* ── Mobile Menu Panel ── */}
      {menuOpen && (
        <div
          id={menuId}
          role="navigation"
          aria-label="Mobile guest navigation"
          className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 space-y-1 animate-fade-in"
        >
          {PUBLIC_LINKS.map(({ href, label }) => (
            <Link key={href} id={`guest-nav-mobile-${label.toLowerCase().replace(/\s+/g, '-')}`} href={href} className={mobileLinkClass(href)}>
              {label}
            </Link>
          ))}
          {isLoggedIn &&
            GUEST_LINKS.map(({ href, label }) => (
              <Link key={href} id={`guest-nav-mobile-${label.toLowerCase().replace(/\s+/g, '-')}`} href={href} className={mobileLinkClass(href)}>
                {label}
              </Link>
            ))}

          <div className="divider" />

          {isLoggedIn ? (
            <>
              {guestName && (
                <p className="px-4 py-2 text-sm text-[var(--color-text-muted)]">
                  Signed in as <span className="font-medium text-[var(--color-text)]">{guestName}</span>
                </p>
              )}
              <button
                id="guest-nav-mobile-logout"
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                aria-busy={loggingOut}
                className="w-full text-left px-4 py-3 rounded-[var(--radius-lg)] text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-colors duration-[var(--duration-fast)]"
              >
                {loggingOut ? 'Logging out…' : 'Logout'}
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              <Link id="guest-nav-mobile-login" href="/guest/login" className="btn btn-outline w-full justify-center">
                Login
              </Link>
              <Link id="guest-nav-mobile-register" href="/guest/register" className="btn btn-primary w-full justify-center">
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
