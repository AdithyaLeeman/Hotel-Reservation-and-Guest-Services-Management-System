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
