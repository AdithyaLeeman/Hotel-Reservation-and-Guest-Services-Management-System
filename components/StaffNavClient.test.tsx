
/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StaffNavClient from './StaffNavClient';

/* ─── Mocks ─────────────────────────────────────────────────────────────────── */

// next/navigation mocks
const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockPathname = vi.fn(() => '/staff/dashboard');

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// next/link — render as plain anchor
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode;[k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// fetch
const mockFetch = vi.fn(() => Promise.resolve({ ok: true }));
vi.stubGlobal('fetch', mockFetch);

// localStorage + matchMedia
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn(() => ({ matches: false })),
});

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function renderNav(
  role: 'Receptionist' | 'Manager' | 'Admin',
  staffName: string | null = 'Jane Smith',
  branchName: string | null = null
) {
  return render(
    <StaffNavClient role={role} staffName={staffName} branchName={branchName} />
  );
}

/* ─── Tests ──────────────────────────────────────────────────────────────────── */

describe('StaffNavClient — role-conditional link rendering', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockFetch.mockClear();
  });

  it('Receptionist sees Reservations and Rooms but NOT Reports or Admin', () => {
    renderNav('Receptionist');
    expect(screen.getAllByText('Reservations').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rooms').length).toBeGreaterThan(0);
    expect(screen.queryByText('Reports')).toBeNull();
    expect(screen.queryByText('Admin')).toBeNull();
  });

  it('Manager sees Reservations, Rooms, and Reports but NOT Admin', () => {
    renderNav('Manager');
    expect(screen.getAllByText('Reservations').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rooms').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reports').length).toBeGreaterThan(0);
    expect(screen.queryByText('Admin')).toBeNull();
  });

  it('Admin sees all four links including Admin panel', () => {
    renderNav('Admin');
    expect(screen.getAllByText('Reservations').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rooms').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reports').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
  });
});

describe('StaffNavClient — branch badge', () => {
  it('shows branch badge when branchName is provided', () => {
    renderNav('Receptionist', 'Jane', 'Colombo');
    expect(screen.getAllByText(/Colombo/).length).toBeGreaterThan(0);
  });

  it('hides branch badge when branchName is null', () => {
    renderNav('Manager', 'Bob', null);
    expect(screen.queryByLabelText(/Branch:/)).toBeNull();
  });
});

describe('StaffNavClient — role badge and greeting', () => {
  it('displays the role pill', () => {
    renderNav('Manager');
    // role pill in desktop area
    expect(screen.getByLabelText('Role: Manager')).toBeTruthy();
  });

  it('displays the staff name', () => {
    renderNav('Receptionist', 'Alice Perera');
    expect(screen.getAllByText('Alice Perera').length).toBeGreaterThan(0);
  });

  it('renders without staff name when null', () => {
    const { container } = renderNav('Admin', null, null);
    expect(container.querySelector('#staff-nav-greeting')).toBeNull();
  });
});

describe('StaffNavClient — logout', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockPush.mockClear();
    mockRefresh.mockClear();
  });

  it('calls POST /api/staff/logout and redirects to /staff/login', async () => {
    renderNav('Receptionist');
    const logoutBtn = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutBtn);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/staff/logout', { method: 'POST' });
      expect(mockPush).toHaveBeenCalledWith('/staff/login');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});

describe('StaffNavClient — mobile menu', () => {
  it('opens and closes the mobile menu', () => {
    renderNav('Manager');
    const hamburger = screen.getByRole('button', { name: /open navigation menu/i });
    fireEvent.click(hamburger);
    expect(screen.getByRole('navigation', { name: /mobile staff navigation/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /close navigation menu/i }));
    expect(screen.queryByRole('navigation', { name: /mobile staff navigation/i })).toBeNull();
  });

  it('closes the mobile menu on Escape key', () => {
    renderNav('Admin');
    const hamburger = screen.getByRole('button', { name: /open navigation menu/i });
    fireEvent.click(hamburger);
    expect(screen.getByRole('navigation', { name: /mobile staff navigation/i })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('navigation', { name: /mobile staff navigation/i })).toBeNull();
  });
});

describe('StaffNavClient — theme toggle', () => {
  afterEach(() => {
    localStorageMock.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('sets data-theme="dark" and persists to localStorage', () => {
    renderNav('Manager');
    const toggle = screen.getAllByLabelText(/switch to dark mode/i)[0];
    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorageMock.getItem('skynest-theme')).toBe('dark');
  });

  it('initialises isDark=true when localStorage has "dark"', () => {
    localStorageMock.setItem('skynest-theme', 'dark');
    renderNav('Admin');
    // After mounting, both theme buttons should say "switch to light mode"
    expect(screen.getAllByLabelText(/switch to light mode/i).length).toBeGreaterThan(0);
  });
});
