'use client';


import { useState, useId } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

/* ─── Types ──────────────────────────────────────────────────────────────────── */

interface StaffLoginFormState {
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
 * Lightweight UX-only validation — mirrors StaffLoginSchema.
 * The server always re-validates authoritatively.
 */
function validateForm(values: StaffLoginFormState): FieldErrors {
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

/* ─── Inner page (reads searchParams) ────────────────────────────────────────── */

function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = useId();

  const [values, setValues] = useState<StaffLoginFormState>({ username: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof StaffLoginFormState, boolean>>>({});

  const id = (field: string) => `${formId}-${field}`;
  const errId = (field: string) => `${formId}-${field}-error`;

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (touched[name as keyof StaffLoginFormState]) {
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

    setTouched({ username: true, password: true });
    const errors = validateForm(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/staff/login', {
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

        if (apiErr?.fields) {
          setFieldErrors(apiErr.fields as FieldErrors);
          return;
        }
        if (res.status === 401) {
          setSubmitError('Incorrect username or password. Please try again.');
          return;
        }
        if (res.status === 403) {
          setSubmitError('Your account is inactive or does not have staff access. Contact your system administrator.');
          return;
        }
        setSubmitError(apiErr?.message ?? 'Login failed. Please try again.');
        return;
      }

      // Success — session written by server. Redirect.
      const returnTo = searchParams.get('redirect');
      router.push(returnTo && returnTo.startsWith('/') ? returnTo : '/staff/dashboard');
      router.refresh();
    } catch {
      setSubmitError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = (field: keyof FieldErrors) =>
    [
      'block w-full px-4 py-2.5 rounded-xl text-sm',
      'bg-white dark:bg-neutral-900',
      'border',
      fieldErrors[field]
        ? 'border-red-400 dark:border-red-600 focus:ring-red-400'
        : 'border-neutral-300 dark:border-neutral-700 focus:ring-[var(--color-accent)]',
      'text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500',
      'outline-none focus:ring-2 focus:ring-offset-0 transition-colors duration-150',
    ].join(' ');

  return (
    <>
      {/* ── SEO ── */}
      <title>Staff Login — SkyNest Hotels</title>

      <main
        className="
          min-h-screen flex flex-col
          bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50
          dark:from-neutral-950 dark:via-neutral-900 dark:to-stone-900
        "
      >
        {/* ── Hero header — amber/gold for staff, distinct from guest teal ── */}
        <section
          aria-labelledby="staff-login-heading"
          className="
            relative overflow-hidden
            bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700
            dark:from-amber-800 dark:via-orange-900 dark:to-stone-900
            py-12 px-4 md:px-6 lg:px-8
          "
        >
          {/* Decorative blobs */}
          <div aria-hidden="true" className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-lg mx-auto text-center">
            {/* Logo mark */}
            <div className="inline-flex items-center gap-2 mb-4 text-white/80 text-sm font-medium">
              <svg aria-hidden="true" width="24" height="24" viewBox="0 0 28 28" fill="none">
                <rect x="4" y="4" width="20" height="20" rx="5" fill="hsl(196 80% 30%)" />
                <path d="M14 7L19 12L14 21L9 12L14 7Z" fill="hsl(40 80% 55%)" />
              </svg>
              SkyNest Hotels
            </div>

            {/* Staff badge */}
            <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-medium tracking-wide uppercase">
              <svg aria-hidden="true" className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM2 14s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2z" />
              </svg>
              Staff Portal
            </div>

            <h1
              id="staff-login-heading"
              className="text-3xl md:text-4xl font-extrabold text-white leading-tight"
            >
              Staff Sign In
            </h1>
            <p className="mt-2 text-amber-100 text-sm">
              Access the SkyNest Hotels management portal.
            </p>
          </div>
        </section>

        {/* ── Form card ── */}
        <section className="flex-1 flex items-start justify-center px-4 py-10">
          <div className="w-full max-w-md">

            {/* Global submit error */}
            {submitError && (
              <div
                id="staff-login-submit-error"
                role="alert"
                aria-live="assertive"
                className="
                  mb-6 flex items-start gap-3 p-4 rounded-xl
                  bg-red-50 dark:bg-red-950
                  border border-red-200 dark:border-red-800
                  text-red-700 dark:text-red-300 text-sm
                "
              >
                <svg
                  aria-hidden="true"
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
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
              id="staff-login-form"
              onSubmit={handleSubmit}
              noValidate
              aria-label="Staff login form"
              className="
                bg-white dark:bg-neutral-900
                border border-neutral-200 dark:border-neutral-700
                rounded-2xl shadow-sm p-6 md:p-8
                flex flex-col gap-5
              "
            >
              <div>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                  Staff Credentials
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Not a staff member?{' '}
                  <Link
                    id="staff-login-guest-link"
                    href="/guest/login"
                    className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
                  >
                    Guest login
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
                  placeholder="Your staff username"
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
                    id="staff-login-toggle-password"
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
                id="staff-login-submit-btn"
                type="submit"
                disabled={submitting}
                aria-busy={submitting}
                className="
                  w-full inline-flex items-center justify-center gap-2
                  px-6 py-3 rounded-xl
                  bg-amber-600 hover:bg-amber-700
                  disabled:opacity-60 disabled:cursor-not-allowed
                  text-white font-semibold text-sm
                  transition-colors duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2
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

              {/* ── Security notice ── */}
              <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
                Staff accounts are managed by your system administrator.
              </p>
            </form>

            {/* Legal notice */}
            <p className="mt-4 text-center text-xs text-neutral-400 dark:text-neutral-500 leading-relaxed">
              Authorized personnel only. All access is logged and monitored.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

/* ─── Page export — wraps form in Suspense for useSearchParams ───────────────── */

export default function StaffLoginPage() {
  return (
    <Suspense>
      <StaffLoginForm />
    </Suspense>
  );
}
