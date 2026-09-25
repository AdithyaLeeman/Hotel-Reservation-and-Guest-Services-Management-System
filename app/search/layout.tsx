/**
 * Search route layout — provides SEO metadata and guest navigation for /search.
 *
 * Owned by: Member 2 (M2) | Task: P02-M02-T13
 *
 * GuestNav is a React Server Component that reads the iron-session via
 * next/headers. It MUST live in a Server Component (this layout), not be
 * imported from the 'use client' page.tsx below it. Placing it here keeps
 * the server/client boundary correct: layout (server) → children (client).
 *
 * Metadata is defined here because page.tsx is 'use client' and cannot
 * export metadata directly.
 */

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import GuestNav from '@/components/GuestNav';

export const metadata: Metadata = {
  title: 'Search Available Rooms — SkyNest Hotels',
  description:
    'Check room availability at SkyNest Hotels across our Colombo, Kandy, and Galle branches. ' +
    'Search by date and book your stay instantly.',
};

export default function SearchLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <GuestNav />
      {children}
    </>
  );
}
