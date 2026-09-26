'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useId } from 'react';
import type { StaffRole } from '@/types/enums';

/* ─── Types ──────────────────────────────────────────────────────────────────── */

export interface StaffNavClientProps {
  role: StaffRole;
  /** Display name for the logged-in staff member. */
  staffName: string | null;
  /** Branch name for display (Receptionist only; null for Manager / Admin). */
  branchName: string | null;
}

/* ─── Nav link definitions ───────────────────────────────────────────────────── */

interface NavLink {
  href: string;
  label: string;
  /** Minimum role required to see this link. */
  minRole: StaffRole;
}


const STAFF_LINKS: NavLink[] = [
  { href: '/staff/reservations', label: 'Reservations', minRole: 'Receptionist' },
  { href: '/staff/rooms', label: 'Rooms', minRole: 'Receptionist' },
  { href: '/staff/reports', label: 'Reports', minRole: 'Manager' },
  { href: '/staff/admin', label: 'Admin', minRole: 'Admin' },
];

/** Returns true if the acting role meets or exceeds the required minimum. */
function hasAccess(actingRole: StaffRole, minRole: StaffRole): boolean {
  const RANK: Record<StaffRole, number> = {
    Receptionist: 1,
    Manager: 2,
    Admin: 3,
  };
  return RANK[actingRole] >= RANK[minRole];
}


function SunIcon() {
  return (
    <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/* ─── Role badge colours ─────────────────────────────────────────────────────── */

const ROLE_BADGE: Record<StaffRole, { bg: string; text: string }> = {
  Receptionist: { bg: 'hsl(210 80% 45% / 0.12)', text: 'var(--color-status-booked)' },
  Manager: { bg: 'hsl(142 60% 35% / 0.12)', text: 'var(--color-status-checked-in)' },
  Admin: { bg: 'hsl(40 80% 50% / 0.14)', text: 'var(--color-accent)' },
};


export default function StaffNavClient({ role, staffName, branchName }: StaffNavClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const menuId = useId();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  /* ── Initialise theme from localStorage on mount ── */
  useEffect(() => {
    const stored = localStorage.getItem('skynest-theme');
    if (stored === 'dark') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDark(true);
    } else if (stored === 'light') {
      setIsDark(false);
    } else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  /* ── Close mobile menu on route change ── */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      await fetch('/api/staff/logout', { method: 'POST' });
      router.push('/staff/login');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }, [router]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  /* ── Link class helpers ── */
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

  const visibleLinks = STAFF_LINKS.filter(({ minRole }) => hasAccess(role, minRole));
  const badge = ROLE_BADGE[role];

  return (
    <header
      id="staff-nav"
      className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md"
    >
      <nav
        aria-label="Staff navigation"
        className="container-page flex h-16 items-center justify-between"
      >
        {/* ── Logo ── */}
        <Link
          id="staff-nav-logo"
          href="/staff/dashboard"
          className="flex items-center gap-2 font-semibold text-[var(--color-primary)] text-lg tracking-tight hover:opacity-80 transition-opacity duration-[var(--duration-fast)] no-underline"
          aria-label="SkyNest Hotels Staff Portal — dashboard"
        >
          {/* Diamond icon matching GuestNav */}
          <svg
            aria-hidden="true"
            focusable="false"
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="4" y="4" width="20" height="20" rx="5" fill="hsl(196 80% 30%)" />
            <path d="M14 7L19 12L14 21L9 12L14 7Z" fill="hsl(40 80% 55%)" />
          </svg>
          <span>SkyNest</span>
          <span
            className="hidden sm:inline text-xs font-medium px-2 py-0.5 rounded-[var(--radius-md)]"
            style={{ background: 'var(--color-primary-muted)', color: 'var(--color-primary)' }}
          >
            Staff
          </span>
        </Link>

        {/* ── Desktop Nav Links ── */}
        <div className="hidden md:flex items-center gap-1">
          {visibleLinks.map(({ href, label }) => (
            <Link
              key={href}
              id={`staff-nav-${label.toLowerCase()}`}
              href={href}
              className={navLinkClass(href)}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* ── Desktop: Branch badge + Staff info + Controls ── */}
        <div className="hidden md:flex items-center gap-2">
          {/* Branch badge — shown for Receptionist to reinforce branch scope */}
          {branchName && (
            <span
              id="staff-nav-branch"
              className="text-xs font-medium px-2.5 py-1 rounded-[var(--radius-full)] border border-[var(--color-border)]"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label={`Branch: ${branchName}`}
            >
              📍 {branchName}
            </span>
          )}

          {/* Theme toggle */}
          <button
            id="staff-nav-theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="btn btn-ghost btn-sm px-2"
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Role badge */}
          <span
            id="staff-nav-role-badge"
            className="text-xs font-medium px-2.5 py-1 rounded-[var(--radius-full)]"
            style={{ background: badge.bg, color: badge.text }}
            aria-label={`Role: ${role}`}
          >
            {role}
          </span>

          {/* Staff name greeting */}
          {staffName && (
            <span
              id="staff-nav-greeting"
              className="text-sm text-[var(--color-text-muted)] px-1"
              aria-label={`Logged in as ${staffName}`}
            >
              <span className="font-medium text-[var(--color-text)]">{staffName}</span>
            </span>
          )}

          {/* Logout */}
          <button
            id="staff-nav-logout"
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-busy={loggingOut}
            className="btn btn-outline btn-sm"
          >
            {loggingOut && <span className="spinner" aria-hidden="true" />}
            {loggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </div>

        {/* ── Mobile: theme toggle + hamburger ── */}
        <div className="flex md:hidden items-center gap-2">
          <button
            id="staff-nav-theme-toggle-mobile"
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="btn btn-ghost btn-sm px-2"
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            id="staff-nav-hamburger"
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="btn btn-ghost btn-sm px-2"
          >
            {menuOpen ? (
              /* X icon */
              <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              /* Hamburger icon */
              <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
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
          aria-label="Mobile staff navigation"
          className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 space-y-1 animate-fade-in"
        >
          {visibleLinks.map(({ href, label }) => (
            <Link
              key={href}
              id={`staff-nav-mobile-${label.toLowerCase()}`}
              href={href}
              className={mobileLinkClass(href)}
            >
              {label}
            </Link>
          ))}

          <div className="divider" />

          {/* Staff identity in mobile menu */}
          <div className="px-4 py-2 flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-[var(--radius-full)]"
              style={{ background: badge.bg, color: badge.text }}
            >
              {role}
            </span>
            {staffName && (
              <span className="text-sm text-[var(--color-text-muted)]">
                <span className="font-medium text-[var(--color-text)]">{staffName}</span>
              </span>
            )}
          </div>

          {/* Branch in mobile menu */}
          {branchName && (
            <p className="px-4 py-1 text-xs text-[var(--color-text-muted)]">
              📍 Branch: <span className="font-medium text-[var(--color-text)]">{branchName}</span>
            </p>
          )}

          {/* Logout */}
          <button
            id="staff-nav-mobile-logout"
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-busy={loggingOut}
            className="w-full text-left px-4 py-3 rounded-[var(--radius-lg)] text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-colors duration-[var(--duration-fast)]"
          >
            {loggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      )}
    </header>
  );
}
