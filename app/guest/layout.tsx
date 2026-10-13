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
