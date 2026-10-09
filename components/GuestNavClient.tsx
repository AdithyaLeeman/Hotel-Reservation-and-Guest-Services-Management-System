'use client';

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
  const [loggingOut, setLoggingOut] = useState(false);
  const menuId = useId();

  /* ── Close mobile menu on route change ── */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local UI state on navigation is a side-effect response to pathname, not cascading render
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
      'relative px-3.5 py-1.5 rounded-sm text-xs uppercase tracking-[0.14em] font-medium transition-colors duration-[var(--duration-fast)]',
      isActive(href)
        ? 'text-[var(--color-primary)] bg-[var(--color-primary-muted)] font-semibold'
        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]',
    ].join(' ');

  const mobileLinkClass = (href: string) =>
    [
      'block px-4 py-3 rounded-sm text-xs uppercase tracking-[0.14em] font-medium transition-colors duration-[var(--duration-fast)]',
      isActive(href)
        ? 'text-[var(--color-primary)] bg-[var(--color-primary-muted)] font-semibold'
        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]',
    ].join(' ');

  return (
    <header
      id="guest-nav"
      className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md shadow-xs"
    >
      <nav
        aria-label="Guest navigation"
        className="container-page flex h-16 items-center justify-between"
      >
        {/* ── Logo ── */}
        <Link
          id="guest-nav-logo"
          href="/"
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity duration-[var(--duration-fast)] no-underline group"
          aria-label="SkyNest Hotels - home"
        >
          {/* Elegant gold crest icon */}
          <div className="flex items-center justify-center w-8 h-8 rounded-sm bg-[#c5a880]/15 border border-[#c5a880]/50 text-[#c5a880]">
            <svg
              aria-hidden="true"
              focusable="false"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-lg tracking-[0.08em] font-semibold text-[var(--color-text)] leading-tight">
              SKYNEST
            </span>
            <span className="text-[9px] uppercase tracking-[0.24em] font-medium text-[#c5a880] leading-none">
              Hotels & Resorts
            </span>
          </div>
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
        <div className="hidden md:flex items-center gap-2.5">
          {isLoggedIn ? (
            <>
              {guestName && (
                <span
                  id="guest-nav-greeting"
                  className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] px-2"
                  aria-label={`Logged in as ${guestName}`}
                >
                  Hi, <span className="font-semibold text-[var(--color-text)]">{guestName}</span>
                </span>
              )}
              <button
                id="guest-nav-logout"
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="btn btn-outline btn-sm text-xs uppercase tracking-wider"
                aria-busy={loggingOut}
              >
                {loggingOut ? <span className="spinner" aria-hidden="true" /> : null}
                {loggingOut ? 'Logging out…' : 'Logout'}
              </button>
            </>
          ) : (
            <>
              <Link id="guest-nav-login" href="/guest/login" className="btn btn-ghost btn-sm text-xs uppercase tracking-wider font-medium text-[var(--color-text)] hover:text-[#c5a880]">
                Login
              </Link>
              <Link id="guest-nav-register" href="/guest/register" className="gold-btn btn-sm text-xs font-semibold tracking-wider uppercase py-1.5 px-3.5">
                Register
              </Link>
            </>
          )}
        </div>

        {/* ── Mobile: hamburger ── */}
        <div className="flex md:hidden items-center gap-2">
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
