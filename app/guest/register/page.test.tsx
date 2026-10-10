/** @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import GuestRegisterPage from './page';

/* ─── Mocks ──────────────────────────────────────────────────────────────────── */

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode;[k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice Perera' } });
  fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'alice@example.com' } });
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'alice_p' } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password123' } });
}

function successResponse() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 201,
    json: async () => ({
      data: { userId: 'u1', guestId: 'g1', username: 'alice_p', fullName: 'Alice Perera', email: 'alice@example.com' },
      meta: { requestId: 'req-1' },
    }),
  });
}

/* ─── Tests ──────────────────────────────────────────────────────────────────── */

describe('GuestRegisterPage — rendering', () => {
  beforeEach(() => { mockFetch.mockClear(); mockPush.mockClear(); mockRefresh.mockClear(); });

  it('renders the page heading', () => {
    render(<GuestRegisterPage />);
    expect(screen.getByRole('heading', { level: 1, name: /create your account/i })).toBeTruthy();
  });

  it('renders all required fields', () => {
    render(<GuestRegisterPage />);
    expect(screen.getByLabelText(/full name/i)).toBeTruthy();
    expect(screen.getByLabelText(/email address/i)).toBeTruthy();
    expect(screen.getByLabelText(/username/i)).toBeTruthy();
    expect(screen.getByLabelText(/^password/i)).toBeTruthy();
  });

  it('renders optional phone and identification fields', () => {
    render(<GuestRegisterPage />);
    expect(screen.getByLabelText(/phone/i)).toBeTruthy();
    expect(screen.getByLabelText(/id \/ passport/i)).toBeTruthy();
  });

  it('renders the submit button', () => {
    render(<GuestRegisterPage />);
    expect(screen.getByRole('button', { name: /create account/i })).toBeTruthy();
  });

  it('renders a link to the login page', () => {
    render(<GuestRegisterPage />);
    expect(screen.getByRole('link', { name: /log in/i })).toBeTruthy();
  });
});

describe('GuestRegisterPage — client validation', () => {
  beforeEach(() => mockFetch.mockClear());

  it('shows required-field errors on submit with empty form', async () => {
    render(<GuestRegisterPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    });
    expect(screen.getByText(/full name is required/i)).toBeTruthy();
    expect(screen.getByText(/email is required/i)).toBeTruthy();
    expect(screen.getByText(/username is required/i)).toBeTruthy();
    expect(screen.getByText(/password is required/i)).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows error when username is too short', async () => {
    render(<GuestRegisterPage />);
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'ab' } });
    fireEvent.blur(screen.getByLabelText(/username/i));
    expect(screen.getByText(/at least 3 characters/i)).toBeTruthy();
  });

  it('shows error when username contains spaces', async () => {
    render(<GuestRegisterPage />);
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'alice p' } });
    fireEvent.blur(screen.getByLabelText(/username/i));
    expect(screen.getByText(/must not contain spaces/i)).toBeTruthy();
  });

  it('shows error when password is too short', async () => {
    render(<GuestRegisterPage />);
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'short' } });
    fireEvent.blur(screen.getByLabelText(/^password/i));
    expect(screen.getByText(/at least 8 characters/i)).toBeTruthy();
  });

  it('shows error for invalid email', async () => {
    render(<GuestRegisterPage />);
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'not-an-email' } });
    fireEvent.blur(screen.getByLabelText(/email address/i));
    expect(screen.getByText(/invalid email/i)).toBeTruthy();
  });
});

describe('GuestRegisterPage — password reveal toggle', () => {
  it('toggles password input type between password and text', () => {
    render(<GuestRegisterPage />);
    const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');
    fireEvent.click(screen.getByLabelText(/show password/i));
    expect(passwordInput.type).toBe('text');
    fireEvent.click(screen.getByLabelText(/hide password/i));
    expect(passwordInput.type).toBe('password');
  });
});

describe('GuestRegisterPage — successful submission', () => {
  beforeEach(() => { mockFetch.mockClear(); mockPush.mockClear(); mockRefresh.mockClear(); });

  it('calls POST /api/guest/register with correct payload', async () => {
    successResponse();
    render(<GuestRegisterPage />);
    fillRequiredFields();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/guest/register');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body as string);
    expect(body.username).toBe('alice_p');
    expect(body.email).toBe('alice@example.com');
    expect(body.full_name).toBe('Alice Perera');
    expect(body.password).toBe('password123');
  });

  it('redirects to /guest/reservations on success', async () => {
    successResponse();
    render(<GuestRegisterPage />);
    fillRequiredFields();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/guest/reservations'));
    expect(mockRefresh).toHaveBeenCalled();
  });
});

describe('GuestRegisterPage — server error handling', () => {
  beforeEach(() => { mockFetch.mockClear(); mockPush.mockClear(); });

  it('shows a global error for 409 conflict (duplicate account)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        error: { code: 'CONFLICT', message: 'An account with that username or email already exists' },
      }),
    });
    render(<GuestRegisterPage />);
    fillRequiredFields();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    });
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/already exists/i)).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('surfaces server field errors below the correct field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fields: { username: 'Username is already taken' },
        },
      }),
    });
    render(<GuestRegisterPage />);
    fillRequiredFields();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    });
    await waitFor(() => expect(screen.getByText(/already taken/i)).toBeTruthy());
  });

  it('shows a network error when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    render(<GuestRegisterPage />);
    fillRequiredFields();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    });
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/could not reach the server/i)).toBeTruthy();
  });
});

describe('GuestRegisterPage — submit button state', () => {
  it('is disabled and shows loading text while submitting', async () => {
    // Never resolves so we can inspect mid-flight state
    mockFetch.mockReturnValueOnce(new Promise(() => { }));
    render(<GuestRegisterPage />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    // Mid-flight: button should be disabled
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /creating account/i });
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });
});
