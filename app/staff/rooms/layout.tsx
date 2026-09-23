/**
 * Staff Rooms route layout — provides SEO metadata for /staff/rooms.
 *
 * Metadata is defined here (server component) because page.tsx
 * is a 'use client' component and cannot export metadata.
 */

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Room Management — SkyNest Hotels Staff Portal',
  description:
    'Manage hotel room inventory across SkyNest Hotels branches. ' +
    'View availability, update room status, and add new rooms.',
};

export default function StaffRoomsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
