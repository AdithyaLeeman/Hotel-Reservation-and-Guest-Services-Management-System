/**
 * Search route layout — provides SEO metadata for all /search pages.
 *
 * Owned by: Member 2 (M2) | Task: P02-M02-T13
 *
 * Metadata is defined here (server component) because page.tsx
 * is a 'use client' component and cannot export metadata.
 */

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Search Available Rooms — SkyNest Hotels',
  description:
    'Check room availability at SkyNest Hotels across our Colombo, Kandy, and Galle branches. ' +
    'Search by date and book your stay instantly.',
};

export default function SearchLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
