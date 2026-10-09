/**
 * Staff segment layout - /staff/* pages.
 *
 * This is a React Server Component (no 'use client' directive).
 * It renders <StaffNav />, which reads the iron-session via next/headers.
 *
 * Having the nav in a layout instead of individual client pages avoids the
 * Next.js App Router constraint that Server Components using next/headers
 * cannot be imported into Client Components.
 *
 * Pages underneath this layout must NOT import or render <StaffNav /> directly.
 */

import type { ReactNode } from 'react';
import StaffNav from '@/components/StaffNav';

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <StaffNav />
      {children}
    </>
  );
}
