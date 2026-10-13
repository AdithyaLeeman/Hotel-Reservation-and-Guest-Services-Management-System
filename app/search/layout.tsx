import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import GuestNav from '@/components/GuestNav';

export const metadata: Metadata = {
  title: 'Search Available Rooms - SkyNest Hotels',
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
