/** @vitest-environment jsdom */

/**
 * Unit tests for Guest Login Page — P01-M01-T27
 *
 * Strategy:
 *   - Rendering: all fields, button, navigation links
 *   - Client validation: required-field errors, no fetch on bad input
 *   - Password reveal toggle: type switches between 'password' and 'text'
 *   - Successful submission: correct API call, redirect to /guest/reservations
 *   - Return-URL redirect: respects ?redirect= query param for safe relative URLs
 *   - Server error handling: 401 → wrong credentials, 403 → inactive, 500 → generic
 *   - Submit button state: disabled + loading text while in-flight
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import GuestLoginPage from './page';

/* ─── Mocks ──────────────────────────────────────────────────────────────────── */

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockGet = vi.fn().mockReturnValue(null);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => ({ get: mockGet }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function fillForm(username = 'alice_p', password = 'password123') {
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: username } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: password } });
}

function successResponse() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      data: { userId: 'u1', role: 'Guest', guestId: 'g1' },
      meta: { requestId: 'req-1' },
    }),
  });
}

/* ─── Tests ──────────────────────────────────────────────────────────────────── */

describe('GuestLoginPage — rendering', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockGet.mockReturnValue(null);
  });

  it('renders the page heading', () => {
    render(<GuestLoginPage />);
    expect(screen.getByRole('heading', { level: 1, name: /welcome back/i })).toBeTruthy();
  });

  it('renders the username field', () => {
    render(<GuestLoginPage />);
    expect(screen.getByLabelText(/username/i)).toBeTruthy();
  });

  it('renders the password field', () => {
    render(<GuestLoginPage />);
    expect(screen.getByLabelText(/^password/i)).toBeTruthy();
  });

  it('renders the sign in submit button', () => {
    render(<GuestLoginPage />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy();
  });

  it('renders a link to the register page', () => {
    render(<GuestLoginPage />);
    const link = screen.getByRole('link', { name: /create one/i });
    expect(link).toBeTruthy();
    expect((link as HTMLAnchorElement).href).toContain('/guest/register');
  });

  it('renders a link to the staff login page', () => {
    render(<GuestLoginPage />);
    const link = screen.getByRole('link', { name: /staff login/i });
    expect(link).toBeTruthy();
    expect((link as HTMLAnchorElement).href).toContain('/staff/login');
  });

  it('password field starts as type="password"', () => {
    render(<GuestLoginPage />);
    const input = screen.getByLabelText(/^password/i) as HTMLInputElement;
    expect(input.type).toBe('password');
  });
});

describe('GuestLoginPage — client validation', () => {
  beforeEach(() => mockFetch.mockClear());

  it('shows required-field errors when form is submitted empty', async () => {
    render(<GuestLoginPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    expect(screen.getByText(/username is required/i)).toBeTruthy();
    expect(screen.getByText(/password is required/i)).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows username error on blur when empty', async () => {
    render(<GuestLoginPage />);
    const input = screen.getByLabelText(/username/i);
    fireEvent.blur(input);
    expect(screen.getByText(/username is required/i)).toBeTruthy();
  });

  it('shows password error on blur when empty', async () => {
    render(<GuestLoginPage />);
    const input = screen.getByLabelText(/^password/i);
    fireEvent.blur(input);
    expect(screen.getByText(/password is required/i)).toBeTruthy();
  });

  it('does not show errors when both fields are filled', async () => {
    render(<GuestLoginPage />);
    fillForm();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    expect(screen.queryByText(/username is required/i)).toBeNull();
    expect(screen.queryByText(/password is required/i)).toBeNull();
  });
});

describe('GuestLoginPage — password reveal toggle', () => {
  it('toggles password input type between password and text', () => {
    render(<GuestLoginPage />);
    const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');
    fireEvent.click(screen.getByLabelText(/show password/i));
    expect(passwordInput.type).toBe('text');
    fireEvent.click(screen.getByLabelText(/hide password/i));
    expect(passwordInput.type).toBe('password');
  });
});

describe('GuestLoginPage — successful submission', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockGet.mockReturnValue(null);
  });

  it('calls POST /api/guest/login with the correct payload', async () => {
    successResponse();
    render(<GuestLoginPage />);
    fillForm('alice_p', 'password123');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/guest/login');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body as string);
    expect(body.username).toBe('alice_p');
    expect(body.password).toBe('password123');
  });

  it('redirects to /guest/reservations on success when no redirect param', async () => {
    successResponse();
    render(<GuestLoginPage />);
    fillForm();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/guest/reservations'));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('redirects to the ?redirect= return URL when it is a safe relative path', async () => {
    mockGet.mockReturnValue('/guest/reservations/res-uuid-123');
    successResponse();
    render(<GuestLoginPage />);
    fillForm();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/guest/reservations/res-uuid-123')
    );
  });

  it('ignores an unsafe (external) ?redirect= value and falls back to /guest/reservations', async () => {
    mockGet.mockReturnValue('https://evil.example.com');
    successResponse();
    render(<GuestLoginPage />);
    fillForm();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/guest/reservations'));
  });
});

describe('GuestLoginPage — server error handling', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockPush.mockClear();
    mockGet.mockReturnValue(null);
  });

  it('shows wrong-credentials message on 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        error: { code: 'NOT_AUTHENTICATED', message: 'Invalid credentials' },
      }),
    });
    render(<GuestLoginPage />);
    fillForm();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/incorrect username or password/i)).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows inactive-account message on 403', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        error: { code: 'INSUFFICIENT_ROLE', message: 'Account is inactive' },
      }),
    });
    render(<GuestLoginPage />);
    fillForm();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/account is inactive/i)).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('surfaces server field-level errors under the correct field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fields: { username: 'Username not found' },
        },
      }),
    });
    render(<GuestLoginPage />);
    fillForm();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    await waitFor(() => expect(screen.getByText(/username not found/i)).toBeTruthy());
  });

  it('shows a network error when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    render(<GuestLoginPage />);
    fillForm();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/could not reach the server/i)).toBeTruthy();
  });
});

describe('GuestLoginPage — submit button state', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockGet.mockReturnValue(null);
  });

  it('is disabled and shows loading text while submitting', async () => {
    // Promise that never resolves — keeps the component mid-flight
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    render(<GuestLoginPage />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /signing in/i });
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });
});
