/** @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import StaffLoginPage from './page';

/* ─── Mocks ──────────────────────────────────────────────────────────────────── */

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockGet = vi.fn().mockReturnValue(null);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => ({ get: mockGet }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode;[k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function fillForm(username = 'receptionist_01', password = 'staffpass123') {
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: username } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: password } });
}

function successResponse() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      data: { userId: 'u2', role: 'Receptionist', employeeId: 'e1', branchId: 'b1' },
      meta: { requestId: 'req-2' },
    }),
  });
}

/* ─── Tests ──────────────────────────────────────────────────────────────────── */

describe('StaffLoginPage - rendering', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockGet.mockReturnValue(null);
  });

  it('renders the page heading', () => {
    render(<StaffLoginPage />);
    expect(screen.getByRole('heading', { level: 1, name: /staff sign in/i })).toBeTruthy();
  });

  it('renders the username field', () => {
    render(<StaffLoginPage />);
    expect(screen.getByLabelText(/username/i)).toBeTruthy();
  });

  it('renders the password field', () => {
    render(<StaffLoginPage />);
    expect(screen.getByLabelText(/^password/i)).toBeTruthy();
  });

  it('renders the sign in submit button', () => {
    render(<StaffLoginPage />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy();
  });

  it('renders the Staff Portal badge text', () => {
    render(<StaffLoginPage />);
    expect(screen.getByText(/staff portal/i)).toBeTruthy();
  });

  it('renders a link back to guest login', () => {
    render(<StaffLoginPage />);
    const link = screen.getByRole('link', { name: /guest login/i });
    expect(link).toBeTruthy();
    expect((link as HTMLAnchorElement).href).toContain('/guest/login');
  });

  it('password field starts as type="password"', () => {
    render(<StaffLoginPage />);
    const input = screen.getByLabelText(/^password/i) as HTMLInputElement;
    expect(input.type).toBe('password');
  });
});

describe('StaffLoginPage - client validation', () => {
  beforeEach(() => mockFetch.mockClear());

  it('shows required-field errors when form is submitted empty', async () => {
    render(<StaffLoginPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    expect(screen.getByText(/username is required/i)).toBeTruthy();
    expect(screen.getByText(/password is required/i)).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows username error on blur when empty', async () => {
    render(<StaffLoginPage />);
    const input = screen.getByLabelText(/username/i);
    fireEvent.blur(input);
    expect(screen.getByText(/username is required/i)).toBeTruthy();
  });

  it('shows password error on blur when empty', async () => {
    render(<StaffLoginPage />);
    const input = screen.getByLabelText(/^password/i);
    fireEvent.blur(input);
    expect(screen.getByText(/password is required/i)).toBeTruthy();
  });

  it('does not show errors when both fields are filled', async () => {
    render(<StaffLoginPage />);
    fillForm();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    expect(screen.queryByText(/username is required/i)).toBeNull();
    expect(screen.queryByText(/password is required/i)).toBeNull();
  });
});

describe('StaffLoginPage - password reveal toggle', () => {
  it('toggles password input type between password and text', () => {
    render(<StaffLoginPage />);
    const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');
    fireEvent.click(screen.getByLabelText(/show password/i));
    expect(passwordInput.type).toBe('text');
    fireEvent.click(screen.getByLabelText(/hide password/i));
    expect(passwordInput.type).toBe('password');
  });
});

describe('StaffLoginPage - successful submission', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockGet.mockReturnValue(null);
  });

  it('calls POST /api/staff/login with the correct payload', async () => {
    successResponse();
    render(<StaffLoginPage />);
    fillForm('receptionist_01', 'staffpass123');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/staff/login');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body as string);
    expect(body.username).toBe('receptionist_01');
    expect(body.password).toBe('staffpass123');
  });

  it('redirects to /staff/dashboard on success when no redirect param', async () => {
    successResponse();
    render(<StaffLoginPage />);
    fillForm();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/staff/dashboard'));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('redirects to the ?redirect= return URL when it is a safe relative path', async () => {
    mockGet.mockReturnValue('/staff/reservations');
    successResponse();
    render(<StaffLoginPage />);
    fillForm();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/staff/reservations')
    );
  });

  it('ignores an unsafe (external) ?redirect= value and falls back to /staff/dashboard', async () => {
    mockGet.mockReturnValue('https://evil.example.com');
    successResponse();
    render(<StaffLoginPage />);
    fillForm();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/staff/dashboard'));
  });
});

describe('StaffLoginPage - server error handling', () => {
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
    render(<StaffLoginPage />);
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
    render(<StaffLoginPage />);
    fillForm();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/inactive or does not have staff access/i)).toBeTruthy();
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
    render(<StaffLoginPage />);
    fillForm();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    await waitFor(() => expect(screen.getByText(/username not found/i)).toBeTruthy());
  });

  it('shows a generic error message on 500', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        error: { code: 'INTERNAL_ERROR', message: 'Login failed' },
      }),
    });
    render(<StaffLoginPage />);
    fillForm();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/login failed/i)).toBeTruthy();
  });

  it('shows a network error when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    render(<StaffLoginPage />);
    fillForm();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/could not reach the server/i)).toBeTruthy();
  });
});

describe('StaffLoginPage - submit button state', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockGet.mockReturnValue(null);
  });

  it('is disabled and shows loading text while submitting', async () => {
    // Promise that never resolves - keeps the component mid-flight
    mockFetch.mockReturnValueOnce(new Promise(() => { }));
    render(<StaffLoginPage />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /signing in/i });
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });
});
