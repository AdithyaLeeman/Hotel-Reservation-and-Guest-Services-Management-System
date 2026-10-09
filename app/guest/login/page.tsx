'use client';

/**
 * Guest Login Page - P01-M01-T27
 *
 * - Calls POST /api/guest/login with { username, password }
 * - On success: server writes iron-session; page redirects to /guest/reservations
 *   (or the ?redirect= return URL if present)
 * - Mirrors the design system used in /guest/register/page.tsx (T26)
 * - All styling uses CSS custom properties defined in app/globals.css
 * - Accessible: unique ids via useId(), aria-invalid, aria-describedby, role="alert"
 */

import { useState, useId } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

/* ─── Types ──────────────────────────────────────────────────────────────────── */

interface LoginFormState {
  username: string;
  password: string;
}

interface FieldErrors {
  username?: string;
  password?: string;
}

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

/* ─── Client-side validation ─────────────────────────────────────────────────── */

/**
 * Lightweight UX-only validation - mirrors GuestLoginSchema.
 * The server always re-validates authoritatively.
 */
function validateForm(values: LoginFormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.username.trim()) {
    errors.username = 'Username is required';
  }

  if (!values.password) {
    errors.password = 'Password is required';
  }

  return errors;
}

/* ─── Sub-components ─────────────────────────────────────────────────────────── */

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
      <svg aria-hidden="true" className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 4.25a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5zm-.75 6a.875.875 0 1 0 0-1.75.875.875 0 0 0 0 1.75z" />
      </svg>
      {message}
    </p>
  );
}

/* ─── Inner Page (reads searchParams) ────────────────────────────────────────── */

function GuestLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = useId();

  const [values, setValues] = useState<LoginFormState>({ username: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof LoginFormState, boolean>>>({});

  const id = (field: string) => `${formId}-${field}`;
  const errId = (field: string) => `${formId}-${field}-error`;

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    // Re-validate on change for already-touched fields
    if (touched[name as keyof LoginFormState]) {
      const newErrors = validateForm({ ...values, [name]: value });
      setFieldErrors((prev) => ({ ...prev, [name]: newErrors[name as keyof FieldErrors] }));
    }
  }

  function handleBlur(e: ChangeEvent<HTMLInputElement>) {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const newErrors = validateForm(values);
    setFieldErrors((prev) => ({ ...prev, [name]: newErrors[name as keyof FieldErrors] }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Mark all fields touched so errors appear
    setTouched({ username: true, password: true });

    const errors = validateForm(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/guest/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: values.username.trim(),
          password: values.password,
        }),
      });

      const json = await res.json() as ApiErrorResponse | { data: unknown; meta: unknown };

      if (!res.ok) {
        const apiErr = (json as ApiErrorResponse).error;

        // Surface field-level errors returned by the server
        if (apiErr?.fields) {
          setFieldErrors(apiErr.fields as FieldErrors);
          return;
        }
        if (res.status === 401) {
          setSubmitError('Incorrect username or password. Please try again.');
          return;
        }
        if (res.status === 403) {
          setSubmitError('Your account is inactive. Please contact SkyNest Hotels support.');
          return;
        }
        setSubmitError(apiErr?.message ?? 'Login failed. Please try again.');
        return;
      }

      // Success - session written by server. Redirect.
      const returnTo = searchParams.get('redirect');
      router.push(returnTo && returnTo.startsWith('/') ? returnTo : '/guest/reservations');
      router.refresh();
    } catch {
      setSubmitError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Input class helper ── */
  const inputClass = (field: keyof FieldErrors) =>
    [
      'block w-full px-4 py-2.5 rounded-xl text-sm',
      'bg-white dark:bg-neutral-900',
      'border',
      fieldErrors[field]
        ? 'border-red-400 dark:border-red-600 focus:ring-red-400'
        : 'border-neutral-300 dark:border-neutral-700 focus:ring-[var(--color-primary)]',
      'text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500',
      'outline-none focus:ring-2 focus:ring-offset-0 transition-colors duration-150',
    ].join(' ');

  return (
    <>
      {/* ── SEO ── */}
      <title>Guest Login - SkyNest Hotels</title>

      <main
        className="
          min-h-screen flex flex-col
          bg-[#faf8f5] dark:bg-[#121110]
          text-[#1c1917] dark:text-[#f8f6f0]
        "
      >
        {/* ── Hero header ── */}
        <section
          aria-labelledby="login-heading"
          className="
            relative overflow-hidden
            bg-[#141312] text-white
            py-14 px-4 md:px-6 lg:px-8
            border-b border-[#2e2a24]
          "
        >
          <div className="relative max-w-lg mx-auto text-center">
            {/* Logo mark */}
            <div className="inline-flex items-center gap-2 mb-3 text-[#c5a880] text-xs font-semibold uppercase tracking-[0.22em]">
              <div className="w-6 h-6 rounded-xs bg-[#c5a880]/20 border border-[#c5a880]/50 flex items-center justify-center text-[#c5a880]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              SkyNest Hotels &amp; Resorts
            </div>

            <h1
              id="login-heading"
              className="font-serif text-3xl md:text-4xl font-normal text-white leading-tight"
            >
              Welcome Back - Guest Portal
            </h1>
            <p className="mt-2 text-[#c5a880]/80 text-xs uppercase tracking-wider font-light">
              Access your reservations, view itemized charges, and checkout
            </p>
          </div>
        </section>

        {/* ── Form card ── */}
        <section className="flex-1 flex items-start justify-center px-4 py-12">
          <div className="w-full max-w-md">

            {/* Global submit error */}
            {submitError && (
              <div
                id="login-submit-error"
                role="alert"
                aria-live="assertive"
                className="
                  mb-6 flex items-start gap-3 p-4 rounded-xs
                  bg-[#2d1212] border border-[#6b2525]
                  text-[#ff9c9c] text-xs uppercase tracking-wider
                "
              >
                <svg
                  aria-hidden="true"
                  className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#ff7575]"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{submitError}</span>
              </div>
            )}

            <form
              id="guest-login-form"
              onSubmit={handleSubmit}
              noValidate
              aria-label="Guest login form"
              className="
                bg-white dark:bg-[#1a1918]
                border border-[#e7e2d9] dark:border-[#2f2b26]
                rounded-xs shadow-md p-6 md:p-8
                flex flex-col gap-5
              "
            >
              <div className="border-b border-[#f0ece5] dark:border-[#2f2b26] pb-4">
                <h2 className="font-serif text-xl font-medium text-[#1c1917] dark:text-[#f8f6f0]">
                  Guest Sign In
                </h2>
                <p className="text-xs text-[#78716c] dark:text-[#a8a29e] mt-1">
                  Staff member?{' '}
                  <Link
                    id="guest-login-staff-link"
                    href="/staff/login"
                    className="font-medium text-[#c5a880] hover:underline transition-colors"
                  >
                    Staff Login
                  </Link>
                </p>
              </div>

              {/* ── Username ── */}
              <div>
                <label
                  htmlFor={id('username')}
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  Username <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <input
                  id={id('username')}
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={values.username}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-describedby={fieldErrors.username ? errId('username') : undefined}
                  aria-invalid={!!fieldErrors.username}
                  placeholder="Your username"
                  className={inputClass('username')}
                />
                <FieldError id={errId('username')} message={fieldErrors.username} />
              </div>

              {/* ── Password ── */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor={id('password')}
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Password <span aria-hidden="true" className="text-red-500">*</span>
                  </label>
                </div>
                <div className="relative">
                  <input
                    id={id('password')}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-describedby={fieldErrors.password ? errId('password') : undefined}
                    aria-invalid={!!fieldErrors.password}
                    placeholder="Your password"
                    className={inputClass('password') + ' pr-11'}
                  />
                  <button
                    id="login-toggle-password"
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="
                      absolute right-3 top-1/2 -translate-y-1/2
                      text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300
                      transition-colors duration-150
                    "
                  >
                    {showPassword ? (
                      /* Eye-off icon */
                      <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      /* Eye icon */
                      <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <FieldError id={errId('password')} message={fieldErrors.password} />
              </div>

              {/* ── Submit ── */}
              <button
                id="guest-login-submit-btn"
                type="submit"
                disabled={submitting}
                aria-busy={submitting}
                className="
                  w-full inline-flex items-center justify-center gap-2
                  px-6 py-3.5 rounded-xs
                  bg-[#c5a880] hover:bg-[#b59469] active:bg-[#a68042]
                  disabled:opacity-60 disabled:cursor-not-allowed
                  text-[#161514] font-semibold text-xs uppercase tracking-[0.18em]
                  transition-all duration-200 shadow-md cursor-pointer
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a880]
                "
              >
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none" viewBox="0 0 24 24" aria-hidden="true"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              {/* ── Register link ── */}
              <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                Don&apos;t have an account?{' '}
                <Link
                  id="guest-login-register-link"
                  href="/guest/register"
                  className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
                >
                  Create one
                </Link>
              </p>
            </form>

            {/* Legal notice */}
            <p className="mt-4 text-center text-xs text-neutral-400 dark:text-neutral-500 leading-relaxed">
              By signing in you agree to SkyNest Hotels&apos; reservation policies.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

/* ─── Page export - wraps form in Suspense for useSearchParams ───────────────── */

export default function GuestLoginPage() {
  return (
    <Suspense>
      <GuestLoginForm />
    </Suspense>
  );
}
