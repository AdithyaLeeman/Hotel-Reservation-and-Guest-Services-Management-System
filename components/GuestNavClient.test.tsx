/**
 * GuestNavClient — Unit tests for the interactive guest navigation bar.
 *
 * @vitest-environment jsdom
 *
 * Task: P01-M01-T24
 * Framework: Vitest + @testing-library/react (JSDOM)
 *
 * What is tested:
 *  1. Logo and static links always render
 *  2. Public nav links (Search Rooms) always render
 *  3. Login/Register shown when NOT logged in; hidden when logged in
 *  4. My Reservations + greeting shown when logged in
 *  5. Logout button calls POST /api/guest/logout and navigates to /
 *  6. Hamburger toggle opens / closes mobile menu (ARIA attributes)
 *  7. Mobile menu: correct links for logged-in / logged-out states
 *  8. Theme toggle button is present and has correct aria-label
 *  9. Active route link gets active class
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import GuestNavClient from './GuestNavClient';

/* ─── Mock next/navigation ──────────────────────────────────────────────────── */

const mockPush = vi.fn();
const mockRefresh = vi.fn();
let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

/* ─── Mock next/link ────────────────────────────────────────────────────────── */

vi.mock('next/link', () => ({
  default: ({ href, children, id, className, 'aria-label': ariaLabel }: {
    href: string;
    children: React.ReactNode;
    id?: string;
    className?: string;
    'aria-label'?: string;
  }) => (
    <a href={href} id={id} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

/* ─── Mock fetch ────────────────────────────────────────────────────────────── */

const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal('fetch', mockFetch);

/* ─── Mock localStorage + matchMedia ───────────────────────────────────────── */

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function renderNav(props: { isLoggedIn?: boolean; guestName?: string | null } = {}) {
  const { isLoggedIn = false, guestName = null } = props;
  return render(
    <GuestNavClient isLoggedIn={isLoggedIn} guestName={guestName} />
  );
}

/* ─── Test suites ───────────────────────────────────────────────────────────── */

describe('GuestNavClient', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockPathname = '/';
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
    // Reset data-theme attribute
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* 1. Logo always renders */
  it('renders the SkyNest Hotels logo linking to /', () => {
    renderNav();
    const logo = screen.getByRole('link', { name: /SkyNest Hotels/i });
    expect(logo).toBeDefined();
    expect(logo.getAttribute('href')).toBe('/');
  });

  /* 2. Public link — Search Rooms — always renders */
  it('always renders the Search Rooms link', () => {
    renderNav();
    // Desktop and mobile both render links; at least one should be present
    const links = screen.getAllByRole('link', { name: /search rooms/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].getAttribute('href')).toBe('/search');
  });

  /* 3a. Login and Register shown when NOT logged in */
  it('shows Login and Register links when not logged in', () => {
    renderNav({ isLoggedIn: false });
    expect(screen.getAllByRole('link', { name: /login/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /register/i }).length).toBeGreaterThan(0);
  });

  /* 3b. Login and Register hidden when logged in */
  it('hides Login and Register when logged in', () => {
    renderNav({ isLoggedIn: true, guestName: 'Aarav' });
    expect(screen.queryByRole('link', { name: /^login$/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^register$/i })).toBeNull();
  });

  /* 4a. My Reservations link shown when logged in */
  it('shows My Reservations link when logged in', () => {
    renderNav({ isLoggedIn: true, guestName: 'Aarav' });
    const links = screen.getAllByRole('link', { name: /my reservations/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].getAttribute('href')).toBe('/guest/reservations');
  });

  /* 4b. My Reservations NOT shown when logged out */
  it('does not show My Reservations when logged out', () => {
    renderNav({ isLoggedIn: false });
    expect(screen.queryByRole('link', { name: /my reservations/i })).toBeNull();
  });

  /* 4c. Guest name greeting shown when logged in with a name */
  it('shows guest greeting when logged in with a name', () => {
    renderNav({ isLoggedIn: true, guestName: 'Aarav' });
    expect(screen.getByText('Aarav')).toBeDefined();
  });

  /* 4d. No crash when logged in but guestName is null */
  it('renders without error when guestName is null', () => {
    expect(() => renderNav({ isLoggedIn: true, guestName: null })).not.toThrow();
  });

  /* 5. Logout button calls POST /api/guest/logout and pushes to / */
  it('calls logout API and redirects to / on logout click', async () => {
    renderNav({ isLoggedIn: true, guestName: 'Aarav' });
    const logoutBtn = screen.getByRole('button', { name: /logout/i });
    await act(async () => { fireEvent.click(logoutBtn); });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/guest/logout', { method: 'POST' });
      expect(mockPush).toHaveBeenCalledWith('/');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  /* 6a. Hamburger opens mobile menu */
  it('hamburger button opens mobile menu and sets aria-expanded=true', () => {
    renderNav();
    const hamburger = screen.getByRole('button', { name: /open navigation menu/i });
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(hamburger);
    expect(hamburger.getAttribute('aria-expanded')).toBe('true');
  });

  /* 6b. Hamburger closes mobile menu on second click */
  it('hamburger button closes mobile menu on second click', () => {
    renderNav();
    const hamburger = screen.getByRole('button', { name: /open navigation menu/i });
    fireEvent.click(hamburger);
    // After opening, label changes
    const closeBtn = screen.getByRole('button', { name: /close navigation menu/i });
    fireEvent.click(closeBtn);
    // Back to hamburger state
    expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeDefined();
  });

  /* 6c. Escape key closes mobile menu */
  it('Escape key closes the mobile menu', () => {
    renderNav();
    const hamburger = screen.getByRole('button', { name: /open navigation menu/i });
    fireEvent.click(hamburger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeDefined();
  });

  /* 7a. Mobile menu shows login/register when logged out */
  it('mobile menu shows login/register links when logged out', () => {
    renderNav({ isLoggedIn: false });
    fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
    // Both desktop and mobile links exist in DOM; getAllByRole handles duplicates
    const loginLinks = screen.getAllByRole('link', { name: /^login$/i });
    expect(loginLinks.length).toBeGreaterThanOrEqual(1);
    const mobileLogin = loginLinks.find((l) => l.id === 'guest-nav-mobile-login');
    expect(mobileLogin).toBeDefined();
    const registerLinks = screen.getAllByRole('link', { name: /^register$/i });
    const mobileRegister = registerLinks.find((l) => l.id === 'guest-nav-mobile-register');
    expect(mobileRegister).toBeDefined();
  });

  /* 7b. Mobile menu shows logout when logged in */
  it('mobile menu shows logout button when logged in', () => {
    renderNav({ isLoggedIn: true, guestName: 'Aarav' });
    fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
    // Two logout buttons: one desktop, one mobile
    const logoutBtns = screen.getAllByRole('button', { name: /logout/i });
    expect(logoutBtns.length).toBeGreaterThanOrEqual(2);
  });

  /* 8a. Theme toggle button is always present */
  it('renders a theme toggle button', () => {
    renderNav();
    // May be two (desktop + mobile)
    const toggles = screen.getAllByRole('button', { name: /switch to .* mode/i });
    expect(toggles.length).toBeGreaterThan(0);
  });

  /* 8b. Theme toggle sets data-theme on html element */
  it('theme toggle sets data-theme=dark on html when toggling to dark', async () => {
    renderNav();
    const toggleBtns = screen.getAllByRole('button', { name: /switch to dark mode/i });
    await act(async () => { fireEvent.click(toggleBtns[0]); });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorageMock.getItem('skynest-theme')).toBe('dark');
  });

  /* 8c. Theme toggle persists light back */
  it('theme toggle sets data-theme=light when toggling back to light', async () => {
    renderNav();
    const darkToggles = screen.getAllByRole('button', { name: /switch to dark mode/i });
    await act(async () => { fireEvent.click(darkToggles[0]); });
    const lightToggles = screen.getAllByRole('button', { name: /switch to light mode/i });
    await act(async () => { fireEvent.click(lightToggles[0]); });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorageMock.getItem('skynest-theme')).toBe('light');
  });

  /* 9. Active route link receives active CSS classes */
  it('marks the current route link as active', () => {
    mockPathname = '/search';
    renderNav();
    // Desktop link
    const desktopLink = screen.getByRole('link', { name: /search rooms/i });
    // Active link should contain the primary color class
    expect(desktopLink.className).toContain('text-[var(--color-primary)]');
  });

  /* 9b. Non-active link does NOT receive active classes */
  it('does not mark an inactive route as active', () => {
    mockPathname = '/';
    renderNav({ isLoggedIn: true, guestName: 'Aarav' });
    const reservationLinks = screen.getAllByRole('link', { name: /my reservations/i });
    // None should have the active class since pathname is /
    const activeLink = reservationLinks.find((l) =>
      l.className.includes('text-[var(--color-primary)]')
    );
    expect(activeLink).toBeUndefined();
  });
});
