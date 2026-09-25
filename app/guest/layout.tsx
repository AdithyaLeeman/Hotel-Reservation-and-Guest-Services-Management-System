/**
 * Guest route layout — renders GuestNav for all /guest/* pages.
 *
 * GuestNav is a React Server Component that reads the iron-session via
 * next/headers. It MUST live in a Server Component (this layout), not be
 * imported from any 'use client' page beneath it.
 *
 * This layout covers:
 *   /guest/reservations
 *   /guest/reservations/[id]
 *   /guest/reservations/new
 *   /guest/book/confirm
 */

import type { ReactNode } from 'react';
import GuestNav from '@/components/GuestNav';

export default function GuestLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <GuestNav />
      {children}
    </>
  );
}
